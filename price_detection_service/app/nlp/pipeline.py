"""
Multi-Tier NLP Pipeline Orchestrator.
Coordinates the 3-layer extraction: Normalize → Regex → LLM Fallback.
"""
import logging
from typing import Optional
from pydantic import BaseModel
from .normalizer import normalize_text
from .regex_engine import extract_with_regex
from .llm_fallback import extract_with_ollama, extract_with_gemini

logger = logging.getLogger(__name__)


class PriceDetectionEvent(BaseModel):
    """Standardized output event for the price detection pipeline."""
    event_type: str = "LIVE_PRICE_DETECTED"
    item_code: Optional[int] = None
    price: Optional[int] = None
    confidence: float = 0.0
    extraction_method: str = "none"
    normalized_text: str = ""
    raw_text: str = ""


async def run_pipeline(
    raw_text: str,
    enable_llm_fallback: bool = True,
    llm_provider: str = "ollama",
) -> PriceDetectionEvent:
    """
    Execute the full 3-layer extraction pipeline.
    
    Flow:
        1. Layer 1: Normalize text (PyThaiNLP)
        2. Layer 2: Regex extraction (deterministic)
        3. Layer 3: LLM fallback (only if Layer 2 fails or is ambiguous)
    
    Args:
        raw_text: Raw transcript from STT or direct text input
        enable_llm_fallback: Whether to attempt LLM if regex fails
        llm_provider: "ollama" or "gemini"
    
    Returns:
        PriceDetectionEvent with extracted item_code and price
    """
    # --- Layer 1: Normalize ---
    normalized = normalize_text(raw_text)
    logger.info(f"📝 Normalized: '{normalized}' (from: '{raw_text[:100]}')")

    if not normalized:
        return PriceDetectionEvent(raw_text=raw_text, normalized_text="")

    # --- Layer 2: Regex Extraction ---
    regex_result = extract_with_regex(normalized)
    logger.info(
        f"🔍 Regex: code={regex_result.item_code} price={regex_result.price} "
        f"method={regex_result.method} conf={regex_result.confidence:.2f}"
    )

    # If regex found both with high confidence, return immediately
    if (
        regex_result.item_code is not None
        and regex_result.price is not None
        and regex_result.confidence >= 0.7
    ):
        return PriceDetectionEvent(
            item_code=regex_result.item_code,
            price=regex_result.price,
            confidence=regex_result.confidence,
            extraction_method=f"regex:{regex_result.method}",
            normalized_text=normalized,
            raw_text=raw_text,
        )

    # If regex found at least an ID (partial success), still return
    if regex_result.item_code is not None and not regex_result.is_ambiguous:
        return PriceDetectionEvent(
            item_code=regex_result.item_code,
            price=regex_result.price,
            confidence=regex_result.confidence,
            extraction_method=f"regex:{regex_result.method}",
            normalized_text=normalized,
            raw_text=raw_text,
        )

    # --- Layer 3: LLM Fallback ---
    if enable_llm_fallback and (regex_result.is_ambiguous or regex_result.item_code is None):
        logger.info(f"🤖 Triggering LLM fallback (provider={llm_provider})")

        if llm_provider == "gemini":
            llm_result = await extract_with_gemini(normalized)
        else:
            llm_result = await extract_with_ollama(normalized)

        if llm_result.item_code is not None:
            # Merge: prefer regex price if LLM didn't find one
            final_price = llm_result.price if llm_result.price is not None else regex_result.price
            return PriceDetectionEvent(
                item_code=llm_result.item_code,
                price=final_price,
                confidence=llm_result.confidence,
                extraction_method=f"llm:{llm_result.provider}",
                normalized_text=normalized,
                raw_text=raw_text,
            )

    # Return whatever regex found (may be partial)
    return PriceDetectionEvent(
        item_code=regex_result.item_code,
        price=regex_result.price,
        confidence=regex_result.confidence,
        extraction_method=f"regex:{regex_result.method}" if regex_result.method != "none" else "none",
        normalized_text=normalized,
        raw_text=raw_text,
    )
