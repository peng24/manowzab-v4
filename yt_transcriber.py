import os
import sys
import time
import subprocess
import threading
import numpy as np
from dotenv import load_dotenv
import requests

# Enable ANSI escape sequences on Windows command prompt natively
os.system('')

# ANSI escape codes for rich terminal styling
class Colors:
    CYAN = '\033[96m'
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'
    MAGENTA = '\033[95m'
    ENDC = '\033[0m'

def get_timestamp():
    return time.strftime("%H:%M:%S")

def log_banner():
    banner = f"""{Colors.CYAN}{Colors.BOLD}
  __  ___                                  __ 
  /  |/  /__ ____  ___ _    ____ ___ _ ___ / / 
 / /|_/ / _ `/ _ \\/ _ \\ |/|/ / _ `(_-</ _ `(_-< 
/_/  /_/\\_,_/_//_/\\___/|/|/  \\_,_/___/\\_,_/___/ 
{Colors.ENDC}{Colors.MAGENTA}{Colors.BOLD}       🎙️  MANOWZAB LIVE SPEECH TRANSCRIBER v4.45.0
==================================================={Colors.ENDC}
"""
    print(banner)

def log_info(msg):
    print(f"[{get_timestamp()}] {Colors.BLUE}{Colors.BOLD}[INFO]{Colors.ENDC} {msg}")

def log_success(msg):
    print(f"[{get_timestamp()}] {Colors.GREEN}{Colors.BOLD}[SUCCESS]{Colors.ENDC} {msg}")

def log_warning(msg):
    print(f"[{get_timestamp()}] {Colors.YELLOW}{Colors.BOLD}[WARN]{Colors.ENDC} {msg}")

def log_error(msg):
    print(f"[{get_timestamp()}] {Colors.RED}{Colors.BOLD}[ERROR]{Colors.ENDC} {msg}")

def log_transcript(text):
    print(f"[{get_timestamp()}] {Colors.CYAN}{Colors.BOLD}[🗣️ SPEECH]{Colors.ENDC} \"{Colors.BOLD}{text}{Colors.ENDC}\"")

# Load environment variables from .env
load_dotenv()

log_banner()

FIREBASE_DB_URL = os.getenv("VITE_FIREBASE_DATABASE_URL")
if not FIREBASE_DB_URL:
    log_error("VITE_FIREBASE_DATABASE_URL is missing in .env")
    sys.exit(1)

# Format database URL
FIREBASE_DB_URL = FIREBASE_DB_URL.rstrip('/')

# Try importing faster-whisper
try:
    from faster_whisper import WhisperModel
except ImportError:
    log_error("'faster-whisper' package is not installed.")
    print(f"{Colors.YELLOW}👉 Please run: pip install faster-whisper numpy requests python-dotenv{Colors.ENDC}")
    sys.exit(1)

# Check if ffmpeg is available
def check_ffmpeg():
    try:
        subprocess.run(["ffmpeg", "-version"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return True
    except FileNotFoundError:
        return False

if not check_ffmpeg():
    log_error("'ffmpeg' is not found on your system.")
    print(f"{Colors.YELLOW}👉 Please install ffmpeg and add it to your Windows PATH, or place ffmpeg.exe in this directory.{Colors.ENDC}")
    sys.exit(1)

# Setup Whisper Model
log_info("Initializing faster-whisper model...")
try:
    # Try using GPU (CUDA) with Float16 for RTX 4060
    log_info("Attempting to load model on NVIDIA GPU (CUDA)...")
    model = WhisperModel("small", device="cuda", compute_type="float16")
    log_success("Model loaded successfully on GPU (CUDA)! 🚀")
    print(f"{Colors.GREEN}📍 Running on: NVIDIA GeForce RTX 4060 Laptop GPU{Colors.ENDC}")
except Exception as e:
    log_warning(f"CUDA loading failed: {e}")
    log_info("Falling back to CPU mode (compute_type=int8)...")
    model = WhisperModel("small", device="cpu", compute_type="int8")
    log_success("Model loaded successfully on CPU! 💻")

print(f"{Colors.MAGENTA}==================================================={Colors.ENDC}\n")

# Global controls
active_video_id = None
transcription_thread = None
stop_event = threading.Event()

def get_direct_audio_url(video_id):
    """Get direct audio stream URL using yt-dlp."""
    log_info(f"Fetching audio stream URL for video: {Colors.BOLD}{video_id}{Colors.ENDC}...")
    try:
        # Run yt-dlp to get direct audio URL
        cmd = ["yt-dlp", "-f", "bestaudio", "-g", f"https://www.youtube.com/watch?v={video_id}"]
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
        url = result.stdout.strip()
        if url:
            return url
    except Exception as e:
        log_error(f"Failed to get audio URL with yt-dlp: {e}")
    return None

def push_transcript_to_firebase(video_id, text):
    """Pushes a transcript segment to Firebase."""
    if not text:
        return
    url = f"{FIREBASE_DB_URL}/voice_chats/{video_id}.json"
    payload = {
        "text": text,
        "timestamp": int(time.time() * 1000),
        "authorDetails": {
            "displayName": "เสียงพูดแม่ค้า (AI)",
            "channelId": "voice-chat-ai"
        }
    }
    try:
        res = requests.post(url, json=payload, timeout=5)
        if res.status_code == 200:
            log_transcript(text)
        else:
            log_warning(f"Firebase returned status: {res.status_code}")
    except Exception as e:
        log_error(f"Failed to sync to Firebase: {e}")

def transcribe_live_stream(video_id, audio_url):
    """Reads audio stream, chunks it, and transcribes in real-time."""
    log_success(f"Connected! Starting real-time transcription stream... 🎙️")
    
    # ffmpeg command to read stream and output 16kHz 16-bit mono PCM
    ffmpeg_cmd = [
        "ffmpeg",
        "-y",
        "-loglevel", "quiet",
        "-i", audio_url,
        "-f", "s16le",
        "-ac", "1",
        "-ar", "16000",
        "-acodec", "pcm_s16le",
        "-"
    ]
    
    try:
        process = subprocess.Popen(ffmpeg_cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    except Exception as e:
        log_error(f"Failed to start ffmpeg process: {e}")
        return

    # Buffer parameters
    chunk_length_sec = 4  # Read audio in 4-second increments
    sample_rate = 16000
    bytes_per_sample = 2  # 16-bit
    chunk_bytes = chunk_length_sec * sample_rate * bytes_per_sample

    audio_buffer = np.array([], dtype=np.float32)
    last_text = ""
    silence_counter = 0

    try:
        while not stop_event.is_set():
            # Read chunk from ffmpeg stdout
            raw_data = process.stdout.read(chunk_bytes)
            if not raw_data:
                log_info("🏁 End of audio stream reached.")
                break

            # Convert bytes to float32 numpy array
            audio_chunk = np.frombuffer(raw_data, dtype=np.int16).astype(np.float32) / 32768.0
            audio_buffer = np.append(audio_buffer, audio_chunk)

            # Keep buffer size maximum to 20 seconds to prevent growing latency
            max_buffer_samples = 20 * sample_rate
            if len(audio_buffer) > max_buffer_samples:
                audio_buffer = audio_buffer[-max_buffer_samples:]

            # Run transcription on buffer
            # Use Thai language setting and VAD filter for high precision
            segments, info = model.transcribe(
                audio_buffer, 
                language="th", 
                beam_size=5,
                vad_filter=True,
                vad_parameters=dict(min_silence_duration_ms=500)
            )
            
            segments = list(segments)
            if not segments:
                continue

            current_text = " ".join([seg.text.strip() for seg in segments]).strip()
            
            # Simple text diff to find new additions
            if current_text and current_text != last_text:
                new_text = current_text
                # If the previous text is a prefix of current text, extract only the new suffix
                if last_text and current_text.startswith(last_text):
                    new_text = current_text[len(last_text):].strip()

                if len(new_text) > 1:
                    push_transcript_to_firebase(video_id, new_text)
                    last_text = current_text
                    silence_counter = 0
            else:
                silence_counter += 1

            # If we detect prolonged silence (e.g., 3 chunks/12s of no new text), reset buffer to prevent drift
            if silence_counter >= 3 and len(audio_buffer) > 0:
                audio_buffer = np.array([], dtype=np.float32)
                last_text = ""
                silence_counter = 0

    except Exception as e:
        log_error(f"Exception in transcription loop: {e}")
    finally:
        log_info(f"Stopping transcriber thread for {video_id}...")
        process.terminate()
        try:
            process.wait(timeout=2)
        except subprocess.TimeoutExpired:
            process.kill()

def sync_active_video():
    """Poll Firebase to watch activeVideo."""
    global active_video_id, transcription_thread, stop_event
    log_info("Watching Firebase system/activeVideo for updates...")
    
    url = f"{FIREBASE_DB_URL}/system/activeVideo.json"
    
    while True:
        try:
            res = requests.get(url, timeout=5)
            if res.status_code == 200:
                vid = res.json()
                if vid and vid != active_video_id:
                    print(f"\n{Colors.MAGENTA}🔄 Livestream Switch Detected!{Colors.ENDC}")
                    log_info(f"Active Video ID: {Colors.BOLD}{vid}{Colors.ENDC}")
                    
                    # Stop active transcription thread if running
                    if transcription_thread and transcription_thread.is_alive():
                        log_info("Stopping current transcriber...")
                        stop_event.set()
                        transcription_thread.join()
                        log_success("Transcriber stopped.")
                    
                    active_video_id = vid
                    
                    # Start new transcription thread
                    audio_url = get_direct_audio_url(vid)
                    if audio_url:
                        stop_event.clear()
                        transcription_thread = threading.Thread(
                            target=transcribe_live_stream, 
                            args=(vid, audio_url),
                            daemon=True
                        )
                        transcription_thread.start()
                    else:
                        log_warning("Could not retrieve direct audio URL. Waiting...")
            else:
                log_error(f"Error reading from Firebase: HTTP {res.status_code}")
        except Exception as e:
            log_error(f"Sync loop error: {e}")
            
        time.sleep(4)

if __name__ == "__main__":
    try:
        sync_active_video()
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}👋 Exiting transcriber. Goodbye!{Colors.ENDC}")
        sys.exit(0)
