---
title: Price Detection Service
emoji: 🎙️
colorFrom: purple
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# Price Detection Service

A standalone Python microservice for extracting item codes and prices from Thai live commerce audio/text streams.

## Architecture

```
price_detection_service/
├── app/
│   ├── main.py              # FastAPI application (port 7860)
│   ├── stt/
│   │   ├── base.py           # Abstract STT provider interface
│   │   └── typhoon.py        # Typhoon ASR placeholder
│   └── nlp/
│       ├── pipeline.py       # 3-layer extraction pipeline
│       ├── normalizer.py     # Layer 1: PyThaiNLP normalization
│       ├── regex_engine.py   # Layer 2: Deterministic regex extraction
│       └── llm_fallback.py   # Layer 3: LLM fallback routing
├── tests/
│   ├── mock_transcripts.json
│   └── test_extraction.py
├── Dockerfile
├── requirements.txt
└── README.md
```

## Quick Start (Local)

```bash
cd price_detection_service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 7860
```

## Deploy to Hugging Face Spaces

Push this directory as a new HF Space with **Docker SDK** selected.
The `Dockerfile` and YAML frontmatter are pre-configured for port 7860.

## Run Tests

```bash
python -m pytest tests/ -v
```
