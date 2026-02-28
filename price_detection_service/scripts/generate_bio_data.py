"""
generate_bio_data.py
====================
Generates synthetic Thai live commerce order sentences annotated with
BIO (Begin-Inside-Outside) tags and Intent labels for Joint NLP Model training.

Output: ../data/train_bio.json
Format: [{"tokens": [...], "tags": [...], "intent": "buy_item"}, ...]

Usage:
    python generate_bio_data.py                  # 1000 samples (default)
    python generate_bio_data.py --count 5000     # custom count
"""

import json
import random
import os
import argparse
from pathlib import Path

try:
    from pythainlp.tokenize import word_tokenize
except ImportError:
    print("⚠️  pythainlp not installed. Install with: pip install pythainlp")
    print("    Falling back to character-aware splitter.")
    word_tokenize = None


# ============================================
# VOCABULARY
# ============================================
PREFIXES = ["รายการที่ ", "รหัส ", "ตัวที่ ", ""]
IDS = ["15", "88", "102", "999", "1", "55"]
SIZE_PREFIXES = ["ไซส์ ", "ขนาด ", ""]
SIZES = ["เอส", "เอ็ม", "แอล", "เอ็กแอล", "ทูเอ็กแอล", "S", "M", "L", "XL"]
PRICE_PREFIXES = ["เอาไป ", "ราคา ", "จัดไป ", "เหลือ ", ""]
PRICES = ["50", "80", "100", "120", "150", "199"]
PRICE_SUFFIXES = [" บาท", ".-", ""]

# Additional noise for variety
FILLERS = ["นะคะ", "ค่ะ", "ครับ", "จ้า", ""]


# ============================================
# TOKENIZER WRAPPER
# ============================================
def tokenize(text: str) -> list[str]:
    """Tokenize Thai text into a list of tokens."""
    if not text or text.isspace():
        return [text] if text else []

    if word_tokenize is not None:
        tokens = word_tokenize(text, engine="newmm", keep_whitespace=True)
        return [t for t in tokens if t]  # filter empty strings
    else:
        # Minimal fallback: split on whitespace boundaries while keeping spaces
        result = []
        current = ""
        for ch in text:
            if ch == " ":
                if current:
                    result.append(current)
                    current = ""
                result.append(" ")
            else:
                current += ch
        if current:
            result.append(current)
        return result


# ============================================
# BIO TAG HELPER
# ============================================
def tag_tokens(text: str, label: str) -> tuple[list[str], list[str]]:
    """
    Tokenize `text` and assign BIO tags with the given label.
    First token → B-{label}, subsequent → I-{label}.
    If label is "O", all tokens get "O".
    """
    tokens = tokenize(text)
    if not tokens:
        return [], []

    if label == "O":
        tags = ["O"] * len(tokens)
    else:
        tags = []
        for i, tok in enumerate(tokens):
            if tok.isspace():
                tags.append("O")  # whitespace is always O
            elif i == 0 or all(t.isspace() for t in tokens[:i]):
                tags.append(f"B-{label}")
            else:
                tags.append(f"I-{label}")
        # Ensure at least one B- tag exists
        has_begin = any(t.startswith("B-") for t in tags)
        if not has_begin:
            for j, tok in enumerate(tokens):
                if not tok.isspace():
                    tags[j] = f"B-{label}"
                    break

    return tokens, tags


# ============================================
# SENTENCE GENERATOR
# ============================================
def generate_sample() -> dict:
    """Generate one random BIO-tagged sample."""
    all_tokens = []
    all_tags = []

    # --- Part 1: Prefix + ID ---
    prefix = random.choice(PREFIXES)
    item_id = random.choice(IDS)

    if prefix:
        t, g = tag_tokens(prefix, "O")
        all_tokens.extend(t)
        all_tags.extend(g)

    t, g = tag_tokens(item_id, "id")
    all_tokens.extend(t)
    all_tags.extend(g)

    # --- Part 2: Size (optional, ~60% chance) ---
    if random.random() < 0.6:
        size_prefix = random.choice(SIZE_PREFIXES)
        size = random.choice(SIZES)

        # Add spacing
        all_tokens.append(" ")
        all_tags.append("O")

        if size_prefix:
            t, g = tag_tokens(size_prefix, "O")
            all_tokens.extend(t)
            all_tags.extend(g)

        t, g = tag_tokens(size, "size")
        all_tokens.extend(t)
        all_tags.extend(g)

    # --- Part 3: Price (optional, ~70% chance) ---
    if random.random() < 0.7:
        price_prefix = random.choice(PRICE_PREFIXES)
        price = random.choice(PRICES)
        price_suffix = random.choice(PRICE_SUFFIXES)

        # Add spacing
        all_tokens.append(" ")
        all_tags.append("O")

        if price_prefix:
            t, g = tag_tokens(price_prefix, "O")
            all_tokens.extend(t)
            all_tags.extend(g)

        t, g = tag_tokens(price, "price")
        all_tokens.extend(t)
        all_tags.extend(g)

        if price_suffix:
            t, g = tag_tokens(price_suffix, "O")
            all_tokens.extend(t)
            all_tags.extend(g)

    # --- Part 4: Filler (optional, ~30% chance) ---
    filler = random.choice(FILLERS)
    if filler and random.random() < 0.3:
        all_tokens.append(" ")
        all_tags.append("O")
        t, g = tag_tokens(filler, "O")
        all_tokens.extend(t)
        all_tags.extend(g)

    assert len(all_tokens) == len(all_tags), (
        f"Token/tag length mismatch: {len(all_tokens)} vs {len(all_tags)}"
    )

    return {
        "tokens": all_tokens,
        "tags": all_tags,
        "intent": "buy_item",
    }


# ============================================
# MAIN
# ============================================
def main():
    parser = argparse.ArgumentParser(
        description="Generate BIO-tagged Thai live commerce training data"
    )
    parser.add_argument(
        "--count", type=int, default=1000,
        help="Number of samples to generate (default: 1000)"
    )
    parser.add_argument(
        "--seed", type=int, default=42,
        help="Random seed for reproducibility (default: 42)"
    )
    args = parser.parse_args()

    random.seed(args.seed)

    # Resolve output path
    script_dir = Path(__file__).resolve().parent
    data_dir = script_dir.parent / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    output_path = data_dir / "train_bio.json"

    # Generate samples
    print(f"🔧 Generating {args.count} BIO-tagged samples...")
    samples = [generate_sample() for _ in range(args.count)]

    # Save
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(samples, f, ensure_ascii=False, indent=2)

    print(f"✅ Saved {len(samples)} samples to {output_path}")

    # Print a few examples
    print("\n📋 Sample outputs:")
    for i, s in enumerate(samples[:3]):
        text = "".join(s["tokens"])
        print(f"\n  [{i+1}] \"{text}\"")
        print(f"      Tokens: {s['tokens']}")
        print(f"      Tags:   {s['tags']}")
        print(f"      Intent: {s['intent']}")


if __name__ == "__main__":
    main()
