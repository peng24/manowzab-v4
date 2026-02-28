"""
Smart Hunter V3 NLU Engine — XLM-RoBERTa Token Classification.
Performs BIO-tagged sequence labeling to extract item_code, price, and size
from Thai live commerce transcripts in <100ms.

Singleton pattern: call get_engine() to get or initialize the shared instance.
Downloads from Hugging Face Hub on first load; cached for subsequent calls.
If model is unavailable, predict() returns None (graceful degradation).
"""
import logging
import re
from typing import Optional

from pydantic import BaseModel

logger = logging.getLogger(__name__)

# Hugging Face Model Hub ID (auto-downloaded and cached)
MODEL_ID = "peng24/smart-hunter-v3"

# Thai phonetic → standard size mapping (same as frontend)
SIZE_MAP = {
    "เอส": "S", "เอ็ม": "M", "แอล": "L", "แอลไซส์": "L",
    "เอ็กแอล": "XL", "เอ็กซ์แอล": "XL",
    "ทูเอ็กแอล": "2XL", "สองเอ็กแอล": "2XL", "สองเอ็กซ์แอล": "2XL",
    "สามเอ็กแอล": "3XL", "สามเอ็กซ์แอล": "3XL", "ทรีเอ็กแอล": "3XL",
    "สี่เอ็กแอล": "4XL", "สี่เอ็กซ์แอล": "4XL",
    "ฟรีไซส์": "Free Size", "โอเวอร์ไซส์": "Oversize",
}


class V3PredictionResult(BaseModel):
    """Standardized result from the V3 NLU engine."""
    item_code: Optional[int] = None
    price: Optional[int] = None
    size: Optional[str] = None
    confidence: float = 0.0
    method: str = "v3-bio"
    raw_tags: list[str] = []


class SmartHunterV3:
    """
    XLM-RoBERTa Token Classification engine.
    Loads model once on first call, keeps it in memory for fast inference.
    """

    def __init__(self):
        self.model = None
        self.tokenizer = None
        self.id2label: dict[int, str] = {}
        self._loaded = False
        self._load_failed = False

    def _load_model(self):
        """Lazy-load the model and tokenizer from Hugging Face Hub."""
        if self._load_failed:
            return

        try:
            import torch
            from transformers import AutoModelForTokenClassification, AutoTokenizer

            logger.info(f"🔧 Loading Smart Hunter V3 model from HF Hub: {MODEL_ID}...")

            self.tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
            self.model = AutoModelForTokenClassification.from_pretrained(MODEL_ID)
            self.model.eval()

            # Build id → label mapping from config
            self.id2label = self.model.config.id2label
            self._loaded = True

            logger.info(
                f"✅ Smart Hunter V3 loaded. "
                f"Labels: {list(self.id2label.values())}"
            )
        except Exception as e:
            logger.error(f"❌ Failed to load V3 model: {e}")
            self._load_failed = True

    def predict(self, text: str) -> Optional[V3PredictionResult]:
        """
        Run BIO-tagged token classification on the input text.

        Returns:
            V3PredictionResult if successful, None if model unavailable.
        """
        if not self._loaded:
            self._load_model()
        if not self._loaded:
            return None

        import torch

        try:
            # Tokenize
            inputs = self.tokenizer(
                text,
                return_tensors="pt",
                truncation=True,
                max_length=128,
                return_offsets_mapping=True,
            )

            offset_mapping = inputs.pop("offset_mapping")[0].tolist()

            # Inference (no grad for speed)
            with torch.no_grad():
                outputs = self.model(**inputs)

            logits = outputs.logits[0]  # shape: (seq_len, num_labels)
            probabilities = torch.softmax(logits, dim=-1)
            predictions = torch.argmax(logits, dim=-1).tolist()
            max_probs = probabilities.max(dim=-1).values.tolist()

            # Decode BIO tags
            tokens = self.tokenizer.convert_ids_to_tokens(inputs["input_ids"][0])
            tags = [self.id2label.get(p, "O") for p in predictions]

            # Reconstruct entities from BIO tags
            entities = self._extract_entities(
                text, tokens, tags, offset_mapping, max_probs
            )

            # Build result
            item_code = None
            price = None
            size = None
            confidences = []

            for ent in entities:
                value_str = ent["text"].strip()
                if ent["label"] == "id":
                    nums = re.findall(r"\d+", value_str)
                    if nums:
                        item_code = int(nums[0])
                        confidences.append(ent["confidence"])
                elif ent["label"] == "price":
                    nums = re.findall(r"\d+", value_str)
                    if nums:
                        price = int(nums[0])
                        confidences.append(ent["confidence"])
                elif ent["label"] == "size":
                    # Normalize Thai phonetic sizes
                    size = SIZE_MAP.get(value_str, value_str.upper())
                    confidences.append(ent["confidence"])

            if not item_code and not price and not size:
                return None

            avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0

            return V3PredictionResult(
                item_code=item_code,
                price=price,
                size=size,
                confidence=round(avg_confidence, 4),
                method="v3-bio",
                raw_tags=tags,
            )

        except Exception as e:
            logger.error(f"V3 prediction error: {e}")
            return None

    def _extract_entities(
        self,
        original_text: str,
        tokens: list[str],
        tags: list[str],
        offsets: list[list[int]],
        probs: list[float],
    ) -> list[dict]:
        """
        Reconstruct entities from BIO tags using offset mapping.
        Groups B-xxx + I-xxx sequences into single entities.
        """
        entities = []
        current = None

        for i, (token, tag, offset, prob) in enumerate(
            zip(tokens, tags, offsets, probs)
        ):
            # Skip special tokens ([CLS], [SEP], [PAD])
            if offset == [0, 0] and i > 0:
                continue

            if tag.startswith("B-"):
                # Save previous entity
                if current:
                    entities.append(current)

                label = tag[2:]
                start, end = offset
                current = {
                    "label": label,
                    "start": start,
                    "end": end,
                    "text": original_text[start:end],
                    "confidence": prob,
                    "token_count": 1,
                }
            elif tag.startswith("I-") and current:
                label = tag[2:]
                if label == current["label"]:
                    _, end = offset
                    current["end"] = end
                    current["text"] = original_text[current["start"]:end]
                    current["confidence"] = (
                        current["confidence"] * current["token_count"] + prob
                    ) / (current["token_count"] + 1)
                    current["token_count"] += 1
                else:
                    # Label mismatch — save current, ignore I- tag
                    entities.append(current)
                    current = None
            else:
                # O tag — save current entity if any
                if current:
                    entities.append(current)
                    current = None

        # Don't forget the last entity
        if current:
            entities.append(current)

        return entities


# ============================================
# SINGLETON
# ============================================
_engine_instance: Optional[SmartHunterV3] = None


def get_engine() -> SmartHunterV3:
    """Get or create the singleton SmartHunterV3 engine instance."""
    global _engine_instance
    if _engine_instance is None:
        _engine_instance = SmartHunterV3()
    return _engine_instance
