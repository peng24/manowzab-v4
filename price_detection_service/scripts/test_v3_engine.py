"""
test_v3_engine.py
=================
Standalone test script to verify the SmartHunterV3 NLU engine
against tricky Thai live commerce sentences.

Usage:
    python scripts/test_v3_engine.py
"""
import sys
import json
from pathlib import Path

# Setup path so we can import from app
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.nlp.normalizer import normalize_text

# Try importing v3 engine — may fail if torch not installed
try:
    from app.nlp.v3_engine import SmartHunterV3, get_engine
    HAS_V3 = True
except ImportError as e:
    HAS_V3 = False
    V3_IMPORT_ERROR = str(e)


# ============================================
# TEST SENTENCES
# ============================================
TEST_SENTENCES = [
    # 1. Thai word numbers + Thai phonetic size
    "รายการที่สิบห้า ไซส์แอล เอาไปร้อยนึง",
    # 2. Explicit ID + Thai phonetic XL + full Thai price
    "รหัส 88 เอ็กแอล ราคาหนึ่งร้อยยี่สิบบาทถ้วน",
    # 3. Explicit everything + Free Size + .- suffix
    "ตัวที่ 102 ฟรีไซส์ จัดไป 50.- จ้า",
    # 4. No prefix + Thai S + Thai price 60
    "เก้าสิบเก้า ไซส์เอส หกสิบบาท",
    # 5. Simple pair
    "รหัส 5 ราคา 80",
    # 6. Dimension interference
    "อก 40 ยาว 30 ตัวที่ 7 เหลือ 199 บาท",
    # 7. Bare numbers (implicit pair)
    "15 120",
    # 8. Thai 2XL + freebie
    "รายการที่ 33 ทูเอ็กแอล ฟรี",
    # 9. Complex stream chatter
    "คอตตอนเบอร์ 10 ราคา 80 บาท",
    # 10. Oversize variant
    "รหัส 55 โอเวอร์ไซส์ เอาไป 150",
]


def main():
    print("=" * 60)
    print("🧠 Smart Hunter V3 Engine — Live Test")
    print("=" * 60)

    engine = None

    if not HAS_V3:
        print(f"\n⚠️  V3 engine import failed: {V3_IMPORT_ERROR}")
        print("   Install dependencies: pip install transformers torch sentencepiece accelerate")
        print("   Running normalization-only test (engine.predict will return None).\n")
    else:
        engine = get_engine()
        if engine._load_failed:
            print("\n⚠️  Model not loaded (files missing from app/models/smart_hunter_v3/).")
            print("   Running tests against the normalizer + engine.predict() graceful fallback.\n")

    results = []
    for i, sentence in enumerate(TEST_SENTENCES, 1):
        # Normalize first (same as pipeline does)
        normalized = normalize_text(sentence)
        result = engine.predict(normalized) if engine else None

        print(f"\n{'─' * 60}")
        print(f"  Test #{i}")
        print(f"  Input:      {sentence}")
        print(f"  Normalized: {normalized}")

        if result:
            print(f"  ✅ item_code:  {result.item_code}")
            print(f"     price:     {result.price}")
            print(f"     size:      {result.size}")
            print(f"     confidence: {result.confidence:.4f}")
            print(f"     method:    {result.method}")
            print(f"     tags:      {result.raw_tags[:20]}{'...' if len(result.raw_tags) > 20 else ''}")
            results.append({
                "input": sentence,
                "item_code": result.item_code,
                "price": result.price,
                "size": result.size,
                "confidence": result.confidence,
            })
        else:
            print(f"  ❌ No result (model returned None)")
            results.append({
                "input": sentence,
                "item_code": None,
                "price": None,
                "size": None,
                "confidence": 0.0,
            })

    # Summary table
    print(f"\n{'=' * 60}")
    print("📊 Summary")
    print(f"{'=' * 60}")
    print(f"{'#':<4} {'ID':<6} {'Price':<8} {'Size':<12} {'Conf':<8} Input")
    print(f"{'─' * 60}")
    for i, r in enumerate(results, 1):
        id_str = str(r["item_code"]) if r["item_code"] is not None else "—"
        price_str = str(r["price"]) if r["price"] is not None else "—"
        size_str = r["size"] or "—"
        conf_str = f"{r['confidence']:.2f}"
        # Truncate input for display
        inp = r["input"][:30] + "..." if len(r["input"]) > 30 else r["input"]
        print(f"{i:<4} {id_str:<6} {price_str:<8} {size_str:<12} {conf_str:<8} {inp}")

    detected = sum(1 for r in results if r["item_code"] is not None)
    print(f"\n✅ Detected: {detected}/{len(results)} sentences")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
