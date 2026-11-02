// Prefer an installed Thai voice; browser-provided Thai voices are the fallback.
export function selectThaiVoice(voices = []) {
  const thai = voices.filter((voice) => /^th(?:[-_]|$)/i.test(voice.lang || ""));
  return thai.find((voice) => voice.localService === true) ||
    thai.find((voice) => /Google/i.test(voice.name || "")) || thai[0] || null;
}
