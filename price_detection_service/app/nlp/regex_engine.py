"""
Layer 2: Deterministic Regex Extraction Engine.
Highly optimized for Thai live commerce phonetic structures.
Extracts item_code (ID) and price from normalized Thai text.
"""
import re
import logging
from typing import Optional
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class RegexExtractionResult(BaseModel):
    """Result from regex extraction layer."""
    item_code: Optional[int] = None
    price: Optional[int] = None
    confidence: float = 0.0
    method: str = "none"
    is_ambiguous: bool = False


# --- Dimension Quarantine Patterns ---
# These patterns match attribute numbers (bust, length) that should NOT be
# treated as price or item_code. They are removed before price/ID extraction.
QUARANTINE_PATTERNS = [
    # Bust: อก 40, รอบอก 42, หน้าผ้า 38
    re.compile(r"(?:อก|รอบอก|หน้าผ้า)\s*(?:ได้|ถึง|ประมาณ|-)?\s*\d{2,3}", re.IGNORECASE),
    # Length: ยาว 30, ความยาว 25
    re.compile(r"(?:ยาว|ความยาว)\s*(?:ได้|ถึง|ประมาณ|-)?\s*\d{2}", re.IGNORECASE),
    # Size letters
    re.compile(r"\b(?:XXL|XL|2XL|3XL|4XL|L|M|S|XS)\b", re.IGNORECASE),
    # Fabric names
    re.compile(r"\b(?:ผ้าเด้ง|ชีฟอง|โพลิเอสเตอร์|โพลี่|ไนลอน|เรยอน|คอตตอน|ลินิน|ยืด|ไหมพรม|ซาติน|กำมะหยี่)\b", re.IGNORECASE),
]

# --- Anchor Patterns (Explicit) ---
# Pattern: keyword + number (e.g., "รหัส 5", "เบอร์ 10")
ITEM_CODE_ANCHORS = re.compile(
    r"(?:รายการที่|รหัส|เบอร์|ตัวที่|ที่|No\.?)\s*(\d+)",
    re.IGNORECASE,
)

# Pattern: price keyword + number OR number + "บาท"
PRICE_ANCHORS = re.compile(
    r"(?:ราคา|เอาไป|จัดไป|ขาย|ตัวละ|เหลือ|แค่)\s*(\d+)|(\d+)\s*(?:บาท|.-)",
    re.IGNORECASE,
)

# Pattern: freebie markers
FREEBIE_PATTERN = re.compile(r"(?:ฟรี|แถม)", re.IGNORECASE)


def _quarantine_dimensions(text: str) -> str:
    """Remove dimension/attribute numbers to prevent misidentification as price/ID."""
    cleaned = text
    for pattern in QUARANTINE_PATTERNS:
        cleaned = pattern.sub(" ", cleaned)
    return re.sub(r"\s+", " ", cleaned).strip()


def _is_valid_item_code(num: int) -> bool:
    """Validate item code range (1–1000)."""
    return 1 <= num <= 1000


def _is_valid_price(num: int) -> bool:
    """
    Validate price heuristics for Thai live commerce.
    Prices commonly end in 0 or 9, or are specific values.
    """
    if num == 0:
        return True  # Freebie
    if num < 10 or num > 5000:
        return False
    # Common Thai pricing patterns
    if num % 10 == 0 or num % 10 == 9:
        return True
    if num in (55, 65, 75, 85, 95, 120, 150, 199, 250, 290, 350, 390, 450, 490):
        return True
    return False


def extract_with_regex(normalized_text: str) -> RegexExtractionResult:
    """
    Layer 2 deterministic extraction.
    
    Strategy:
    1. Quarantine dimension numbers (bust, length, fabric)
    2. Extract explicit item code via anchor keywords
    3. Extract explicit price via anchor keywords / "บาท" suffix
    4. If still missing, attempt implicit extraction from remaining numbers
    5. Flag as ambiguous if conflicting data found
    
    Args:
        normalized_text: Text after Layer 1 normalization
    
    Returns:
        RegexExtractionResult with extracted data and confidence score
    """
    if not normalized_text:
        return RegexExtractionResult()

    item_code: Optional[int] = None
    price: Optional[int] = None
    method = "none"

    # Step 1: Quarantine dimensions
    working_text = _quarantine_dimensions(normalized_text)

    # Step 2: Check freebie
    if FREEBIE_PATTERN.search(working_text):
        price = 0
        working_text = FREEBIE_PATTERN.sub("", working_text).strip()

    # Step 3: Explicit price extraction
    if price is None:
        price_match = PRICE_ANCHORS.search(working_text)
        if price_match:
            val = int(price_match.group(1) or price_match.group(2))
            if _is_valid_price(val):
                price = val
                working_text = working_text[:price_match.start()] + working_text[price_match.end():]
                method = "explicit-price"

    # Step 4: Explicit item code extraction
    id_match = ITEM_CODE_ANCHORS.search(working_text)
    if id_match:
        val = int(id_match.group(1))
        if _is_valid_item_code(val):
            item_code = val
            working_text = working_text[:id_match.start()] + working_text[id_match.end():]
            method = "explicit-both" if price is not None else "explicit-id"

    # Step 5: Implicit extraction from remaining loose numbers
    if item_code is None or price is None:
        remaining_numbers = [int(m.group(1)) for m in re.finditer(r"\b(\d+)\b", working_text)]

        if item_code is None and price is None and len(remaining_numbers) >= 2:
            n1, n2 = remaining_numbers[0], remaining_numbers[1]
            if _is_valid_item_code(n1) and _is_valid_price(n2):
                item_code = n1
                price = n2
                method = "implicit-pair"
        elif item_code is not None and price is None:
            valid_prices = [n for n in remaining_numbers if _is_valid_price(n)]
            if valid_prices:
                price = valid_prices[-1]
                method = "explicit-id+implicit-price"
        elif price is not None and item_code is None:
            valid_ids = [n for n in remaining_numbers if _is_valid_item_code(n)]
            if valid_ids:
                item_code = valid_ids[0]
                method = "implicit-id+explicit-price"
        elif item_code is None and price is None and len(remaining_numbers) == 1:
            n = remaining_numbers[0]
            if _is_valid_item_code(n):
                item_code = n
                method = "implicit-single-id"

    # Calculate confidence
    confidence = 0.0
    is_ambiguous = False

    if item_code is not None and price is not None:
        confidence = 0.95 if "explicit" in method else 0.75
    elif item_code is not None:
        confidence = 0.6
    elif price is not None:
        confidence = 0.4
        is_ambiguous = True
    else:
        is_ambiguous = True

    return RegexExtractionResult(
        item_code=item_code,
        price=price,
        confidence=confidence,
        method=method,
        is_ambiguous=is_ambiguous,
    )
