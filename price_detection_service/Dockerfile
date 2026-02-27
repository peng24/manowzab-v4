# === Stage 1: Build ===
FROM python:3.11-slim AS builder

WORKDIR /build

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# === Stage 2: Runtime ===
FROM python:3.11-slim

# Hugging Face Spaces requires a non-root user
RUN useradd -m -u 1000 appuser

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /root/.local /home/appuser/.local
ENV PATH="/home/appuser/.local/bin:$PATH"

# Copy application code
COPY app/ ./app/

# Switch to non-root user (required by HF Spaces)
USER appuser

# Hugging Face Spaces requires port 7860
EXPOSE 7860

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:7860/health')" || exit 1

# Launch
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
