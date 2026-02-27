"""
Pytest test suite for the Price Detection extraction engine.
Tests the full pipeline (Layer 1 + Layer 2) against complex live stream edge cases.
LLM fallback is disabled to test deterministic regex accuracy.
"""
import json
import sys
import os
from pathlib import Path

import pytest
import pytest_asyncio

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.nlp.normalizer import normalize_text
from app.nlp.regex_engine import extract_with_regex, _is_valid_price, _is_valid_item_code
from app.nlp.pipeline import run_pipeline


# --- Load test fixtures ---
FIXTURES_PATH = Path(__file__).parent / "mock_transcripts.json"
with open(FIXTURES_PATH, encoding="utf-8") as f:
    TEST_CASES = json.load(f)


# ============================================
# Layer 1: Normalizer Unit Tests
# ============================================
class TestNormalizer:
    def test_empty_input(self):
        assert normalize_text("") == ""
        assert normalize_text("   ") == ""

    def test_word_to_digit_50(self):
        result = normalize_text("ราคา ห้าสิบ บาท")
        assert "50" in result

    def test_word_to_digit_150(self):
        result = normalize_text("ร้อยห้าสิบ")
        assert "150" in result

    def test_word_to_digit_100(self):
        result = normalize_text("หนึ่งร้อย")
        assert "100" in result

    def test_noise_removal(self):
        result = normalize_text("ลูกค้า ครับ เบอร์ 5")
        assert "5" in result
        # Noise words should be stripped
        assert "ลูกค้า" not in result
        assert "ครับ" not in result

    def test_whitespace_collapse(self):
        result = normalize_text("รหัส   5   ราคา   50")
        assert "  " not in result


# ============================================
# Layer 2: Regex Engine Unit Tests
# ============================================
class TestRegexEngine:
    def test_explicit_id_and_price(self):
        result = extract_with_regex("รายการที่ 15 ราคา 120")
        assert result.item_code == 15
        assert result.price == 120
        assert result.confidence >= 0.7

    def test_price_with_baht_suffix(self):
        result = extract_with_regex("60 บาท")
        assert result.price == 60

    def test_freebie(self):
        result = extract_with_regex("ตัวที่ 3 ฟรี")
        assert result.item_code == 3
        assert result.price == 0

    def test_dimension_quarantine(self):
        """อก 40 and ยาว 30 should NOT be extracted as price or ID."""
        result = extract_with_regex("อก 40 ยาว 30 60 บาท")
        assert result.price == 60
        # 40 and 30 should be quarantined, not treated as item code
        assert result.item_code != 40
        assert result.item_code != 30

    def test_implicit_pair(self):
        result = extract_with_regex("12 90")
        assert result.item_code == 12
        assert result.price == 90

    def test_valid_price_boundaries(self):
        assert _is_valid_price(0) == True     # freebie
        assert _is_valid_price(5) == False     # too low
        assert _is_valid_price(50) == True     # ends in 0
        assert _is_valid_price(199) == True    # ends in 9
        assert _is_valid_price(37) == False    # odd price
        assert _is_valid_price(6000) == False  # too high

    def test_valid_id_boundaries(self):
        assert _is_valid_item_code(0) == False
        assert _is_valid_item_code(1) == True
        assert _is_valid_item_code(1000) == True
        assert _is_valid_item_code(1001) == False


# ============================================
# Full Pipeline Integration Tests (from mock_transcripts.json)
# ============================================
class TestPipelineIntegration:
    """Test the full pipeline (Layer 1 + Layer 2) against all edge cases."""

    @pytest.mark.asyncio
    @pytest.mark.parametrize("case", TEST_CASES, ids=[c["id"] for c in TEST_CASES])
    async def test_extraction(self, case):
        """
        Run each test case through the full pipeline with LLM disabled.
        Validate item_code and price match expected values.
        """
        result = await run_pipeline(
            raw_text=case["input"],
            enable_llm_fallback=False,
        )

        expected_code = case["expected_item_code"]
        expected_price = case["expected_price"]

        # Validate item_code
        if expected_code is not None:
            assert result.item_code == expected_code, (
                f"[{case['id']}] item_code: expected={expected_code}, got={result.item_code}\n"
                f"  Input: {case['input']}\n"
                f"  Normalized: {result.normalized_text}\n"
                f"  Method: {result.extraction_method}"
            )

        # Validate price
        if expected_price is not None:
            assert result.price == expected_price, (
                f"[{case['id']}] price: expected={expected_price}, got={result.price}\n"
                f"  Input: {case['input']}\n"
                f"  Normalized: {result.normalized_text}\n"
                f"  Method: {result.extraction_method}"
            )


# ============================================
# Specific Edge Case Tests (required by spec)
# ============================================
class TestRequiredEdgeCases:
    """Tests specifically required by the mission control directive."""

    @pytest.mark.asyncio
    async def test_case_a_isan_dialect(self):
        """Case A: High-velocity Isan dialect."""
        result = await run_pipeline(
            "รหัส 5 บ่มีตำหนิ เอาไป 50 บาทพอ",
            enable_llm_fallback=False,
        )
        assert result.item_code == 5
        assert result.price == 50
        assert result.confidence > 0

    @pytest.mark.asyncio
    async def test_case_b_code_switching(self):
        """Case B: Code-switching and phonetics."""
        result = await run_pipeline(
            "คอตตอนเบอร์ 10 ราคา 80 บาท",
            enable_llm_fallback=False,
        )
        assert result.item_code == 10
        assert result.price == 80
        assert result.confidence > 0

    @pytest.mark.asyncio
    async def test_case_c_dimension_interference(self):
        """Case C: Ambiguous dimension interference."""
        result = await run_pipeline(
            "อก 40 ยาว 30 ตัวนี้ 60 บาท",
            enable_llm_fallback=False,
        )
        # The price MUST be 60, not 40 or 30
        assert result.price == 60
        # item_code may or may not be detected (no explicit ID anchor)
        assert result.confidence > 0
