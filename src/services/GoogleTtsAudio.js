import { isGoogleCloudTtsEnabled } from "../utils/ttsConfig";
import { getTtsEmotionProfile, normalizeTtsEmotion } from "../utils/ttsEmotion";

// Preparing an audio file never plays sound or advances either playback queue.
export class GoogleTtsAudio {
  constructor({ getConfig, getCached, setCached, onKeySuccess = () => {}, onUsage = () => {}, warn = () => {} }) {
    Object.assign(this, { getConfig, getCached, setCached, onKeySuccess, onUsage, warn });
    this.pending = new Map();
    this.controllers = new Set();
    this.generation = 0;
    this.retryAfter = 0;
    this.voiceRetryAfter = new Map();
    this.lastError = null;
    this.totalTimeoutMs = 2000;
    this.keyTimeoutMs = 1500;
  }

  cancel() {
    this.generation++;
    for (const controller of this.controllers) controller.abort();
    this.controllers.clear();
    this.pending.clear();
  }

  retry() {
    this.cancel();
    this.retryAfter = 0;
    this.voiceRetryAfter.clear();
    this.lastError = null;
  }

  async prepare(text, background = false, voiceOverride = null, emotion = "neutral") {
    if (!isGoogleCloudTtsEnabled()) return null;
    const config = this.getConfig();
    if (!config.enabled || !text || !config.keys.length) return null;
    const voice = voiceOverride || config.voice;
    const normalizedEmotion = normalizeTtsEmotion(emotion);
    const isChirp3 = typeof voice === 'string' && voice.includes('Chirp3-HD');
    const key = !isChirp3 && normalizedEmotion !== 'neutral'
      ? `google:${voice}:${normalizedEmotion}:${text}`
      : `google:${voice}:${text}`;
    const cached = this.getCached(key);
    if (cached) return cached;
    let job = this.pending.get(key);
    if (!job) {
      const voiceCooldown = this.voiceRetryAfter.get(voice) || 0;
      const now = Date.now();
      if (now < this.retryAfter || now < voiceCooldown || (background && this.pending.size >= 3)) return null;
      const generation = this.generation;
      job = Promise.resolve().then(() => this.fetchAudio(text, { ...config, voice, emotion: normalizedEmotion }, key, generation));
      this.pending.set(key, job);
      const cleanup = () => { if (this.pending.get(key) === job) this.pending.delete(key); };
      job.then(cleanup, cleanup);
    }
    const buffer = await job;
    // decodeAudioData may detach a buffer: every consumer gets its own copy.
    return buffer?.slice(0) || null;
  }

  async request(text, voice, key, timeoutMs, emotion = "neutral") {
    // Keep the network implementation out of explicitly free builds as well.
    if (!isGoogleCloudTtsEnabled()) return null;
    const controller = new AbortController();
    this.controllers.add(controller);
    let rejectAbort;
    const aborted = new Promise((_, reject) => { rejectAbort = reject; });
    const onAbort = () => rejectAbort(Object.assign(new Error('TTS request aborted'), { name: 'AbortError' }));
    controller.signal.addEventListener('abort', onAbort, { once: true });
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await Promise.race([aborted, (async () => {
        const isChirp3 = typeof voice === 'string' && voice.includes('Chirp3-HD');
        const profile = getTtsEmotionProfile(emotion);
        const audioConfig = isChirp3
          ? { audioEncoding: 'MP3' }
          : { audioEncoding: 'MP3', speakingRate: profile.standardSpeakingRate, pitch: profile.standardPitch };
        const response = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key },
          body: JSON.stringify({ input: { text }, voice: { languageCode: 'th-TH', name: voice },
            audioConfig }),
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) {
          const detail = data.error?.details?.find(item => item.reason)?.reason;
          const reason = /^[A-Z0-9_]{1,80}$/.test(detail || '') ? detail : `HTTP_${response.status}`;
          throw Object.assign(new Error(reason), { status: response.status, reason });
        }
        if (typeof data.audioContent !== 'string' || !data.audioContent) throw new Error('EMPTY_AUDIO');
        const binary = atob(data.audioContent);
        return Uint8Array.from(binary, character => character.charCodeAt(0)).buffer;
      })()]);
    } finally {
      clearTimeout(timeout);
      controller.signal.removeEventListener('abort', onAbort);
      this.controllers.delete(controller);
    }
  }

  async fetchAudio(text, config, cacheKey, generation) {
    const deadline = Date.now() + this.totalTimeoutMs;
    const start = ((config.activeKey || 1) - 1 + config.keys.length) % config.keys.length;
    let failure = null;
    for (let offset = 0; offset < config.keys.length; offset++) {
      if (generation !== this.generation) return null;
      const remaining = deadline - Date.now();
      if (remaining <= 0) break;
      const index = (start + offset) % config.keys.length;
      try {
        const buffer = await this.request(text, config.voice, config.keys[index], Math.min(remaining, this.keyTimeoutMs), config.emotion);
        if (generation !== this.generation) return null;
        this.setCached(cacheKey, buffer);
        this.retryAfter = 0;
        this.voiceRetryAfter.delete(config.voice);
        this.lastError = null;
        try { this.onUsage({ voice: config.voice, chars: text.length }); } catch { /* usage tracking must not block playback */ }
        try { this.onKeySuccess(index + 1); } catch { /* presence must not block playback */ }
        return buffer;
      } catch (error) {
        if (generation !== this.generation) return null;
        failure = error;
        this.warn(`Google TTS key ${index + 1}: ${error.reason || (error.name === 'AbortError' ? 'TIMEOUT' : 'REQUEST_FAILED')}`);
        // A disabled billing account and quota errors need recovery, not key churn.
        if (error.reason === 'BILLING_DISABLED' || error.status === 429) break;
      }
    }
    this.lastError = failure?.reason || (failure?.name === 'AbortError' ? 'TIMEOUT' : 'REQUEST_FAILED');
    const isAccountWideLimit = failure?.reason === 'BILLING_DISABLED' || failure?.status === 429;
    if (isAccountWideLimit) {
      this.retryAfter = Date.now() + (failure?.reason === 'BILLING_DISABLED' ? 60000 : 10000);
    } else if (config.voice && config.voice !== 'th-TH-Standard-A') {
      // Voice-specific failure (e.g. Chirp3-HD unavailable/timeout): cool down this voice so Standard-A fallback runs immediately.
      this.voiceRetryAfter.set(config.voice, Date.now() + 30000);
    } else {
      this.retryAfter = Date.now() + 10000;
    }
    return null;
  }
}
