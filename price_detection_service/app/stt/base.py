"""
Abstract base class for Speech-to-Text providers.
Designed for easy swapping between STT engines (Typhoon ASR, Google, Whisper, etc.)
"""
from abc import ABC, abstractmethod
from typing import Optional
from pydantic import BaseModel


class TranscriptionResult(BaseModel):
    """Standardized STT output."""
    text: str
    language: str = "th"
    confidence: float = 0.0
    is_final: bool = True
    provider: str = "unknown"


class STTProvider(ABC):
    """
    Abstract STT Provider interface.
    All STT backends must implement this contract.
    """

    @abstractmethod
    async def transcribe_audio(self, audio_base64: str) -> TranscriptionResult:
        """
        Transcribe a base64-encoded audio chunk.
        
        Args:
            audio_base64: Base64 encoded audio data (WAV/MP3/OGG)
        
        Returns:
            TranscriptionResult with transcribed text
        """
        ...

    @abstractmethod
    async def transcribe_stream(self, audio_chunks: list[str]) -> TranscriptionResult:
        """
        Transcribe a stream of base64-encoded audio chunks (for real-time).
        
        Args:
            audio_chunks: List of base64 encoded audio segments
            
        Returns:
            TranscriptionResult with aggregated transcription
        """
        ...

    @abstractmethod
    def get_provider_name(self) -> str:
        """Return the name of this STT provider."""
        ...
