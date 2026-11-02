// Cloud synthesis is opt-in at build time. Existing keys/preferences never enable it.
export function isGoogleCloudTtsEnabled() {
  return import.meta.env.VITE_ENABLE_GOOGLE_CLOUD_TTS === "true";
}
