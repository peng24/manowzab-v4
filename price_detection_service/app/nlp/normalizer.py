"""
Layer 1: PyThaiNLP-based Text Normalization.
Handles Thai numeral conversion, word tokenization, and noise removal
optimized for live commerce speech patterns.
"""
import re
import logging

logger = logging.getLogger(__name__)

# Try importing pythainlp; graceful fallback if not installed
try:
    from pythainlp.tokenize import word_tokenize
    from pythainlp.util import normalize as thai_normalize
    from pythainlp.util import thai_digit_to_arabic_digit
    HAS_PYTHAINLP = True
except ImportError:
    HAS_PYTHAINLP = False
    logger.warning("⚠️ PyThaiNLP not installed. Using fallback normalization.")


# -- Thai word-to-digit mapping for spoken numbers --
WORD_TO_DIGIT = [
    (re.compile(r"ร้อยนึง|ร้อยบาท|หนึ่งร้อย"), "100"),
    (re.compile(r"สองร้อย"), "200"),
    (re.compile(r"สามร้อย"), "300"),
    (re.compile(r"สี่ร้อย"), "400"),
    (re.compile(r"ห้าร้อย"), "500"),
    (re.compile(r"ร้อยยี่สิบ"), "120"),
    (re.compile(r"ร้อยห้าสิบ"), "150"),
    (re.compile(r"ร้อยเก้าสิบเก้า"), "199"),
    (re.compile(r"ร้อยเก้าสิบ"), "190"),
    (re.compile(r"เก้าสิบเก้า"), "99"),
    (re.compile(r"เก้าสิบ"), "90"),
    (re.compile(r"แปดสิบ"), "80"),
    (re.compile(r"เจ็ดสิบ"), "70"),
    (re.compile(r"หกสิบ"), "60"),
    (re.compile(r"ห้าสิบ"), "50"),
    (re.compile(r"สี่สิบ"), "40"),
    (re.compile(r"สามสิบ"), "30"),
    (re.compile(r"ยี่สิบ"), "20"),
]

# Noise patterns to strip from live speech
NOISE_PATTERNS = [
    re.compile(r"(?:ค่าส่ง|โอน|ปลายทาง|ทั้งหมด|เหลืออีก)\s*\d+", re.IGNORECASE),
    re.compile(r"(?:กระดุม|ตำหนิ|สำรอง)\s*\d+", re.IGNORECASE),
    re.compile(r"(?:ลูกค้า|ครับ|ค่ะ|จ้า|นะคะ|นะครับ|จ้ะ)", re.IGNORECASE),
]


def normalize_text(raw_text: str) -> str:
    """
    Full normalization pipeline:
    1. PyThaiNLP normalize (character-level fixes)
    2. Thai digit → Arabic digit
    3. Word-to-digit conversion (spoken numbers)
    4. Noise removal
    5. Whitespace normalization
    
    Args:
        raw_text: Raw transcript from STT
    
    Returns:
        Cleaned, normalized text ready for regex extraction
    """
    if not raw_text or not raw_text.strip():
        return ""

    text = raw_text.strip()

    # Step 1: PyThaiNLP character normalization
    if HAS_PYTHAINLP:
        text = thai_normalize(text)
        text = thai_digit_to_arabic_digit(text)

    # Step 2: Word-to-digit conversion (long phrases first)
    for pattern, digit in WORD_TO_DIGIT:
        text = pattern.sub(f" {digit} ", text)

    # Step 3: Remove noise patterns
    for noise in NOISE_PATTERNS:
        text = noise.sub("", text)

    # Step 4: Collapse whitespace
    text = re.sub(r"\s+", " ", text).strip()

    return text


def tokenize_thai(text: str) -> list[str]:
    """
    Tokenize Thai text into word boundaries using PyThaiNLP.
    Falls back to simple whitespace split if PyThaiNLP unavailable.
    """
    if HAS_PYTHAINLP:
        return word_tokenize(text, engine="newmm")
    return text.split()
