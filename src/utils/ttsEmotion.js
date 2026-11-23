/**
 * Subtle TTS Emotion Profiles & Intent Mapping
 *
 * - buy (จอง)               -> 'happy'   (เสียงดีใจแบบพอดีๆ)
 * - question/general/chat   -> 'neutral' (เสียงปรกติ)
 * - cancel (ยกเลิก)         -> 'sad'     (เสียงเศร้าแบบพอดีๆ)
 */

export const TTS_EMOTION_PROFILES = Object.freeze({
  happy: Object.freeze({
    // Subtle upbeat lift (+3.5% rate/pitch via Web Audio for Chirp 3: HD)
    playbackRate: 1.035,
    gain: 1.04,
    // Google Cloud Standard-A native API parameters
    standardSpeakingRate: 1.05,
    standardPitch: 1.5,
    // Native SpeechSynthesis parameters
    nativeRate: 1.05,
    nativePitch: 1.12,
  }),
  neutral: Object.freeze({
    playbackRate: 1.0,
    gain: 1.0,
    standardSpeakingRate: 1.0,
    standardPitch: 0,
    nativeRate: 1.0,
    nativePitch: 1.0,
  }),
  sad: Object.freeze({
    // Subtle downcast drop (-5.5% rate/pitch + slightly softer via Web Audio for Chirp 3: HD)
    playbackRate: 0.945,
    gain: 0.92,
    // Google Cloud Standard-A native API parameters
    standardSpeakingRate: 0.92,
    standardPitch: -2.0,
    // Native SpeechSynthesis parameters
    nativeRate: 0.92,
    nativePitch: 0.88,
  }),
});

/**
 * Normalize an emotion name to a supported key ('happy' | 'neutral' | 'sad').
 * @param {string} [emotion]
 * @returns {'happy' | 'neutral' | 'sad'}
 */
export function normalizeTtsEmotion(emotion) {
  if (emotion === "happy" || emotion === "sad") return emotion;
  return "neutral";
}

/**
 * Resolve subtle TTS emotion from a chat message object or intent type string.
 * @param {Object|string|null|undefined} messageOrType
 * @returns {'happy' | 'neutral' | 'sad'}
 */
export function resolveTtsEmotion(messageOrType) {
  if (!messageOrType) return "neutral";
  if (typeof messageOrType === "string") {
    if (messageOrType === "buy" || messageOrType === "happy") return "happy";
    if (messageOrType === "cancel" || messageOrType === "sad") return "sad";
    return "neutral";
  }

  const type = messageOrType.type;
  if (type === "buy") return "happy";
  if (type === "cancel") return "sad";
  if (!type && messageOrType.sfxType === "cancel") return "sad";
  return "neutral";
}

/**
 * Get the acoustic profile for an emotion.
 * @param {string} [emotion]
 */
export function getTtsEmotionProfile(emotion) {
  return TTS_EMOTION_PROFILES[normalizeTtsEmotion(emotion)];
}

/**
 * Apply subtle punctuation cue for generative voices (Chirp 3: HD) without introducing dots ("...").
 * - 'happy': adds a single trailing '!' if not already ending in '!' or '?'
 * - 'neutral' / 'sad': leaves text unchanged (sad uses acoustic prosody; never adds '...')
 * @param {string} text
 * @param {string} [emotion]
 * @returns {string}
 */
export function applyEmotionTextCue(text, emotion) {
  if (!text) return "";
  const normalized = normalizeTtsEmotion(emotion);
  if (normalized === "happy") {
    const trimmed = text.trim();
    if (!trimmed) return "";
    return /[!?]$/.test(trimmed) ? trimmed : `${trimmed}!`;
  }
  return text;
}
