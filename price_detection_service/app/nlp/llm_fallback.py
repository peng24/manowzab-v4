"""
Layer 3: LLM Fallback Routing.
Only triggered when Layer 2 regex returns ambiguous or empty results.
Supports Gemini and Ollama backends with strict JSON schema output.
Token-cost optimized prompt design.
"""
import os
import json
import logging
from typing import Optional
from pydantic import BaseModel

logger = logging.getLogger(__name__)

# Try importing httpx for API calls
try:
    import httpx
    HAS_HTTPX = True
except ImportError:
    HAS_HTTPX = False


class LLMExtractionResult(BaseModel):
    """Result from LLM fallback extraction."""
    item_code: Optional[int] = None
    price: Optional[int] = None
    confidence: float = 0.0
    provider: str = "none"
    raw_response: str = ""


# Token-optimized prompt for live commerce extraction
EXTRACTION_PROMPT = """คุณเป็น JSON extractor สำหรับการขายของสด
จากข้อความนี้ ดึง item_code (รหัสสินค้า) และ price (ราคาเป็นบาท) ออกมา
ตอบเฉพาะ JSON เท่านั้น ห้ามมีข้อความอื่น
ถ้าไม่พบให้ใส่ null

ข้อความ: "{text}"

ตอบ: {{"item_code": <int|null>, "price": <int|null>}}"""


def _parse_llm_json(raw: str) -> dict:
    """
    Robustly parse JSON from LLM output.
    Handles markdown code blocks, extra text, etc.
    """
    # Strip markdown code blocks
    cleaned = raw.strip()
    if "```" in cleaned:
        # Extract content between first ``` pair
        parts = cleaned.split("```")
        if len(parts) >= 2:
            cleaned = parts[1]
            if cleaned.startswith("json"):
                cleaned = cleaned[4:]
    
    cleaned = cleaned.strip()
    
    # Find JSON object boundaries
    start = cleaned.find("{")
    end = cleaned.rfind("}") + 1
    if start >= 0 and end > start:
        cleaned = cleaned[start:end]
    
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        logger.warning(f"Failed to parse LLM JSON: {raw[:200]}")
        return {}


async def extract_with_ollama(
    text: str,
    base_url: str = "http://localhost:11434",
    model: str = "gemma3:4b",
) -> LLMExtractionResult:
    """
    Query local Ollama instance for extraction.
    
    Args:
        text: Normalized transcript text
        base_url: Ollama API base URL
        model: Model name to use
    
    Returns:
        LLMExtractionResult
    """
    if not HAS_HTTPX:
        logger.error("httpx not installed — cannot call Ollama")
        return LLMExtractionResult()

    prompt = EXTRACTION_PROMPT.format(text=text)

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{base_url}/api/generate",
                json={
                    "model": model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {"temperature": 0.0, "num_predict": 100},
                },
            )
            response.raise_for_status()
            data = response.json()
            raw = data.get("response", "")

            parsed = _parse_llm_json(raw)
            return LLMExtractionResult(
                item_code=parsed.get("item_code"),
                price=parsed.get("price"),
                confidence=0.65 if parsed.get("item_code") is not None else 0.3,
                provider="ollama",
                raw_response=raw[:500],
            )
    except Exception as e:
        logger.error(f"Ollama fallback error: {e}")
        return LLMExtractionResult(provider="ollama-error", raw_response=str(e)[:200])


async def extract_with_gemini(
    text: str,
    api_key: str | None = None,
) -> LLMExtractionResult:
    """
    Query Google Gemini API for extraction.
    
    Args:
        text: Normalized transcript text
        api_key: Gemini API key (falls back to env GEMINI_API_KEY)
    
    Returns:
        LLMExtractionResult
    """
    key = api_key or os.getenv("GEMINI_API_KEY", "")
    if not key or not HAS_HTTPX:
        logger.warning("Gemini API key not set or httpx not installed")
        return LLMExtractionResult(provider="gemini-unavailable")

    prompt = EXTRACTION_PROMPT.format(text=text)

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={key}",
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {
                        "temperature": 0.0,
                        "maxOutputTokens": 100,
                    },
                },
            )
            response.raise_for_status()
            data = response.json()
            raw = (
                data.get("candidates", [{}])[0]
                .get("content", {})
                .get("parts", [{}])[0]
                .get("text", "")
            )

            parsed = _parse_llm_json(raw)
            return LLMExtractionResult(
                item_code=parsed.get("item_code"),
                price=parsed.get("price"),
                confidence=0.70 if parsed.get("item_code") is not None else 0.3,
                provider="gemini",
                raw_response=raw[:500],
            )
    except Exception as e:
        logger.error(f"Gemini fallback error: {e}")
        return LLMExtractionResult(provider="gemini-error", raw_response=str(e)[:200])
