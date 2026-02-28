"""
Multi-Tier NLP Pipeline Orchestrator.
Coordinates the 3-layer extraction: Normalize → V3 Engine → Regex (safety net).

V3 Engine (XLM-RoBERTa) is the primary extraction layer.
Regex serves as a deterministic fallback when the model is unavailable or uncertain.
LLM fallback (Ollama/Gemini) has been removed for latency and cost savings.
"""
import logging
from typing import Optional
from pydantic import BaseModel
from .normalizer import normalize_text
from .regex_engine import extract_with_regex
from .v3_engine import get_engine

logger = logging.getLogger(__name__)


class PriceDetectionEvent(BaseModel):
    """Standardized output event for the price detection pipeline."""
    event_type: str = "LIVE_PRICE_DETECTED"
    item_code: Optional[int] = None
    price: Optional[int] = None
    size: Optional[str] = None
    confidence: float = 0.0
    extraction_method: str = "none"
    normalized_text: str = ""
    raw_text: str = ""


async def run_pipeline(
    raw_text: str,
    enable_llm_fallback: bool = False,  # Kept for API backward compat, ignored
    llm_provider: str = "none",         # Kept for API backward compat, ignored
) -> PriceDetectionEvent:
    """
    Execute the 3-layer extraction pipeline.

    Flow:
        1. Layer 1: Normalize text (PyThaiNLP)
        2. Layer 2: V3 Engine (XLM-RoBERTa BIO token classification)
        3. Layer 3: Regex extraction (deterministic safety net)

    Args:
        raw_text: Raw transcript from STT or direct text input
        enable_llm_fallback: DEPRECATED — kept for API compat, always ignored
        llm_provider: DEPRECATED — kept for API compat, always ignored

    Returns:
        PriceDetectionEvent with extracted item_code, price, and size
    """
    # --- Layer 1: Normalize ---
    normalized = normalize_text(raw_text)
    logger.info(f"📝 Normalized: '{normalized}' (from: '{raw_text[:100]}')")

    if not normalized:
        return PriceDetectionEvent(raw_text=raw_text, normalized_text="")

    # --- Layer 2: V3 Engine (XLM-RoBERTa) ---
    v3_engine = get_engine()
    v3_result = v3_engine.predict(normalized)

    if v3_result is not None and v3_result.item_code is not None and v3_result.confidence >= 0.6:
        logger.info(
            f"🧠 V3 Engine: code={v3_result.item_code} price={v3_result.price} "
            f"size={v3_result.size} conf={v3_result.confidence:.2f}"
        )
        return PriceDetectionEvent(
            item_code=v3_result.item_code,
            price=v3_result.price,
            size=v3_result.size,
            confidence=v3_result.confidence,
            extraction_method=f"v3:{v3_result.method}",
            normalized_text=normalized,
            raw_text=raw_text,
        )

    # --- Layer 3: Regex Extraction (safety net) ---
    regex_result = extract_with_regex(normalized)
    logger.info(
        f"🔍 Regex: code={regex_result.item_code} price={regex_result.price} "
        f"method={regex_result.method} conf={regex_result.confidence:.2f}"
    )

    # Merge: if V3 found partial data, combine with regex
    final_code = regex_result.item_code
    final_price = regex_result.price
    final_size = None
    final_method = f"regex:{regex_result.method}" if regex_result.method != "none" else "none"
    final_confidence = regex_result.confidence

    if v3_result is not None:
        # V3 had low confidence but may have found something useful
        if v3_result.item_code is not None and final_code is None:
            final_code = v3_result.item_code
            final_method = f"v3+regex:{regex_result.method}"
        if v3_result.price is not None and final_price is None:
            final_price = v3_result.price
        if v3_result.size is not None:
            final_size = v3_result.size
        # Boost confidence if both agree
        if (
            v3_result.item_code is not None
            and regex_result.item_code is not None
            and v3_result.item_code == regex_result.item_code
        ):
            final_confidence = min(0.99, final_confidence + 0.1)
            final_method = f"v3+regex:{regex_result.method}"

    return PriceDetectionEvent(
        item_code=final_code,
        price=final_price,
        size=final_size,
        confidence=final_confidence,
        extraction_method=final_method,
        normalized_text=normalized,
        raw_text=raw_text,
    )
