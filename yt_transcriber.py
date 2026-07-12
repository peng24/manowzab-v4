import os
import sys
import time
import subprocess
import threading
import numpy as np
from dotenv import load_dotenv
import requests
import socket

# Port lock to prevent multiple concurrent instances from running
try:
    _lock_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    # Bind to a local high port
    _lock_socket.bind(('127.0.0.1', 28482))
except OSError:
    print("\n\033[93m⚠️  แจ้งเตือน: ตรวจพบว่ามีโปรแกรม yt_transcriber.py ทำงานอยู่แล้วในเครื่อง!\033[0m")
    print("👉 ระบบปิดตัวโปรแกรมตัวนี้ลงอัตโนมัติเพื่อหลีกเลี่ยงการส่งคำถอดเสียงซ้ำซ้อน")
    sys.exit(0)

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

FIREBASE_API_KEY = os.getenv("VITE_FIREBASE_API_KEY")
if not FIREBASE_API_KEY:
    log_error("VITE_FIREBASE_API_KEY is missing in .env")
    sys.exit(1)

# Format database URL
FIREBASE_DB_URL = FIREBASE_DB_URL.rstrip('/')

# Token caching variables
id_token = None
token_expiry_time = 0

def refresh_auth_token():
    """Authenticate with Firebase Auth REST API anonymously to acquire ID Token."""
    global id_token, token_expiry_time
    log_info("Authenticating with Firebase Auth anonymously...")
    auth_url = f"https://identitytoolkit.googleapis.com/v1/accounts:signUp?key={FIREBASE_API_KEY}"
    try:
        res = requests.post(auth_url, json={"returnSecureToken": True}, timeout=10)
        if res.status_code == 200:
            data = res.json()
            id_token = data.get("idToken")
            expires_in = int(data.get("expiresIn", 3600))
            token_expiry_time = time.time() + expires_in - 300 # refresh 5 mins early
            log_success("Authenticated successfully with Firebase! 🔑")
            return id_token
        else:
            log_error(f"Authentication failed: HTTP {res.status_code} - {res.text}")
    except Exception as e:
        log_error(f"Authentication exception: {e}")
    return None

def get_auth_token():
    """Get active ID Token, refreshing if expired."""
    global id_token, token_expiry_time
    if not id_token or time.time() >= token_expiry_time:
        refresh_auth_token()
    return id_token

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
    token = get_auth_token()
    url = f"{FIREBASE_DB_URL}/voice_chats/{video_id}.json"
    if token:
        url += f"?auth={token}"
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
    buffer_start_time = 0.0
    last_pushed_end_time = 0.0

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

            buffer_len_sec = len(audio_buffer) / sample_rate

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
                # If buffer gets too long with no speech, truncate it to prevent bloat
                if buffer_len_sec > 20.0:
                    audio_buffer = audio_buffer[-int(5.0 * sample_rate):]
                    buffer_start_time += (buffer_len_sec - 5.0)
                continue

            # Identify completed segments
            # A segment is considered finalized if it ends at least 2.5s before the buffer ends (speech pause)
            # or if the buffer is getting close to full (18 seconds)
            grace_period = 2.5
            completed_segments = []
            
            for seg in segments:
                abs_start = buffer_start_time + seg.start
                abs_end = buffer_start_time + seg.end
                
                is_finalized = seg.end < (buffer_len_sec - grace_period) or buffer_len_sec > 18.0
                if is_finalized:
                    if abs_end > last_pushed_end_time + 0.1:
                        completed_segments.append(seg)
            
            if completed_segments:
                for seg in completed_segments:
                    text = seg.text.strip()
                    if len(text) > 1:
                        push_transcript_to_firebase(video_id, text)
                    last_pushed_end_time = max(last_pushed_end_time, buffer_start_time + seg.end)
                
                # Discard completed audio to keep buffer small and fresh
                last_completed_end_in_buffer = completed_segments[-1].end
                samples_to_discard = int(last_completed_end_in_buffer * sample_rate)
                
                if samples_to_discard < len(audio_buffer):
                    audio_buffer = audio_buffer[samples_to_discard:]
                    buffer_start_time += last_completed_end_in_buffer
                else:
                    audio_buffer = np.array([], dtype=np.float32)
                    buffer_start_time += buffer_len_sec

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
    
    while True:
        try:
            token = get_auth_token()
            url = f"{FIREBASE_DB_URL}/system/activeVideo.json"
            if token:
                url += f"?auth={token}"
            
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
