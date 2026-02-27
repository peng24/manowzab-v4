"""
Price Detection Microservice — FastAPI Application.
Event-driven API that accepts text or base64 audio and emits
standardized LIVE_PRICE_DETECTED events.
"""
import base64
import logging
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .nlp.pipeline import run_pipeline, PriceDetectionEvent
from .stt.typhoon import TyphoonASRProvider

# Logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(message)s")
logger = logging.getLogger("price_detection")

# FastAPI App
app = FastAPI(
    title="Price Detection Service",
    description="Thai Live Commerce Price & Item Code Extraction API",
    version="3.0.0",
)

# CORS — allow Vue.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# STT Provider (singleton)
stt_provider = TyphoonASRProvider()


# --- Request / Response Models ---

class TextRequest(BaseModel):
    """Direct text input for extraction."""
    text: str
    enable_llm_fallback: bool = False
    llm_provider: str = "ollama"


class AudioRequest(BaseModel):
    """Base64 encoded audio input for STT + extraction."""
    audio_base64: str
    format: str = "wav"  # wav, mp3, ogg
    enable_llm_fallback: bool = False
    llm_provider: str = "ollama"


class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "3.0.0"
    stt_provider: str = ""


# --- Endpoints ---

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        stt_provider=stt_provider.get_provider_name()
    )


@app.post("/extract/text", response_model=PriceDetectionEvent)
async def extract_from_text(request: TextRequest):
    """
    Extract item_code and price from raw Thai text.
    This is the primary endpoint for the Vue.js frontend.
    
    Returns a standardized LIVE_PRICE_DETECTED event.
    """
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    result = await run_pipeline(
        raw_text=request.text,
        enable_llm_fallback=request.enable_llm_fallback,
        llm_provider=request.llm_provider,
    )

    logger.info(
        f"📤 Event: code={result.item_code} price={result.price} "
        f"method={result.extraction_method} conf={result.confidence:.2f}"
    )

    return result


@app.post("/detect_price", response_model=PriceDetectionEvent)
async def detect_price(request: TextRequest):
    """
    Primary endpoint for the Vue.js frontend.
    Alias for /extract/text — extracts item_code and price from Thai text.
    """
    return await extract_from_text(request)


@app.post("/extract/audio", response_model=PriceDetectionEvent)
async def extract_from_audio(request: AudioRequest):
    """
    Extract item_code and price from base64 encoded audio.
    Uses the configured STT provider (Typhoon ASR) to transcribe first,
    then runs the NLP pipeline on the transcript.
    """
    # Validate base64
    try:
        audio_bytes = base64.b64decode(request.audio_base64)
        if len(audio_bytes) < 100:
            raise ValueError("Audio too short")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid audio data: {e}")

    # Step 1: STT
    transcription = await stt_provider.transcribe_audio(request.audio_base64)

    if not transcription.text:
        return PriceDetectionEvent(
            raw_text="[audio: no transcription]",
            extraction_method="stt:no-result",
        )

    # Step 2: NLP Pipeline
    result = await run_pipeline(
        raw_text=transcription.text,
        enable_llm_fallback=request.enable_llm_fallback,
        llm_provider=request.llm_provider,
    )

    return result


@app.post("/extract/batch", response_model=list[PriceDetectionEvent])
async def extract_batch(texts: list[str]):
    """
    Batch extraction for multiple text inputs.
    Useful for processing chat log dumps.
    """
    results = []
    for text in texts[:50]:  # Cap at 50 to prevent abuse
        result = await run_pipeline(raw_text=text, enable_llm_fallback=False)
        results.append(result)
    return results
