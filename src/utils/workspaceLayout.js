export function clampChatWidth(value, viewport = Infinity) {
  const maximum = Math.max(280, Math.min(600, viewport - 360));
  const width = Number(value);
  return Math.round(Math.max(280, Math.min(maximum, Number.isFinite(width) && width > 0 ? width : 400)));
}
