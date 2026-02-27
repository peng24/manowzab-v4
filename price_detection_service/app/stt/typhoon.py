"""
Typhoon ISan ASR Real-time — Placeholder Provider.
This module is pre-wired for the Typhoon ASR streaming API.
Replace the placeholder logic with actual API calls when the SDK is available.
"""
import os
import logging
from .base import STTProvider, TranscriptionResult

logger = logging.getLogger(__name__)

# Configuration (loaded from env for security)
TYPHOON_API_URL = os.getenv("TYPHOON_API_URL", "https://api.typhoon.ai/v1/asr/stream")
TYPHOON_API_KEY = os.getenv("TYPHOON_API_KEY", "")


class TyphoonASRProvider(STTProvider):
    """
    Typhoon ISan ASR Real-time STT Provider.
    
    This is a placeholder implementation. When the Typhoon SDK/API becomes
    available, replace the body of each method with actual API calls.
    The interface contract (input/output types) will remain stable.
    """

    def __init__(self, api_key: str | None = None, api_url: str | None = None):
        self.api_key = api_key or TYPHOON_API_KEY
        self.api_url = api_url or TYPHOON_API_URL

        if not self.api_key:
            logger.warning(
                "⚠️ Typhoon API key not set. "
                "Set TYPHOON_API_KEY env var or pass api_key to constructor. "
                "STT calls will return placeholder results."
            )

    async def transcribe_audio(self, audio_base64: str) -> TranscriptionResult:
        """
        Transcribe a single audio chunk via Typhoon ASR API.
        
        TODO: Replace with actual httpx call:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.api_url,
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    json={"audio": audio_base64, "language": "th"}
                )
                data = response.json()
                return TranscriptionResult(
                    text=data["transcript"],
                    confidence=data.get("confidence", 0.0),
                    is_final=True,
                    provider="typhoon-asr"
                )
        """
        logger.info("🎙️ Typhoon ASR: transcribe_audio called (placeholder)")
        return TranscriptionResult(
            text="",
            confidence=0.0,
            is_final=True,
            provider="typhoon-asr-placeholder",
        )

    async def transcribe_stream(self, audio_chunks: list[str]) -> TranscriptionResult:
        """
        Transcribe streaming audio chunks via Typhoon ASR WebSocket.
        
        TODO: Replace with actual WebSocket streaming:
            async with websockets.connect(self.ws_url) as ws:
                for chunk in audio_chunks:
                    await ws.send(chunk)
                result = await ws.recv()
                ...
        """
        logger.info(
            f"🎙️ Typhoon ASR: transcribe_stream called with {len(audio_chunks)} chunks (placeholder)"
        )
        return TranscriptionResult(
            text="",
            confidence=0.0,
            is_final=True,
            provider="typhoon-asr-placeholder",
        )

    def get_provider_name(self) -> str:
        return "Typhoon ISan ASR Real-time"
