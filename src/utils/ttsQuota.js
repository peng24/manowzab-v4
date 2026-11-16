export const TTS_QUOTA_LIMITS = {
  chirp3: {
    label: "Chirp 3: HD (Achernar / Aoede)",
    shortLabel: "Chirp 3",
    monthlyLimit: 1_000_000,
    autoSwitchThreshold: 900_000, // 90% — keep 100k safety buffer
    warnRatio: 0.7,
    switchRatio: 0.9,
  },
  standard: {
    label: "Google Standard (สำรอง)",
    shortLabel: "Standard",
    monthlyLimit: 4_000_000,
    autoSwitchThreshold: 3_600_000, // 90% — keep 400k safety buffer
    warnRatio: 0.7,
    switchRatio: 0.9,
  },
};

/**
 * Google Cloud Billing resets monthly free tiers on the 1st of each calendar month (UTC).
 */
export function getCurrentTtsQuotaMonth(date = new Date()) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function getVoiceQuotaTier(voiceName = "") {
  return String(voiceName).includes("Chirp3-HD") ? "chirp3" : "standard";
}

export function normalizeUsageCounts(raw, currentMonth = getCurrentTtsQuotaMonth()) {
  if (!raw || typeof raw !== "object" || raw.month !== currentMonth) {
    return { month: currentMonth, chirp3: 0, standard: 0, updatedAt: 0 };
  }
  return {
    month: currentMonth,
    chirp3: Math.max(0, Number(raw.chirp3) || 0),
    standard: Math.max(0, Number(raw.standard) || 0),
    updatedAt: Number(raw.updatedAt) || 0,
  };
}

export function getTierStatus(tier, usedChars = 0) {
  const cfg = TTS_QUOTA_LIMITS[tier] || TTS_QUOTA_LIMITS.chirp3;
  const used = Math.max(0, Number(usedChars) || 0);
  const ratio = cfg.monthlyLimit > 0 ? used / cfg.monthlyLimit : 0;
  const percent = Math.min(100, Math.round(ratio * 1000) / 10);
  const isNearLimit = used >= cfg.autoSwitchThreshold;
  const isWarning = !isNearLimit && ratio >= cfg.warnRatio;
  const level = isNearLimit ? "danger" : isWarning ? "warn" : "ok";
  const remainingBeforeSwitch = Math.max(0, cfg.autoSwitchThreshold - used);
  const remainingFree = Math.max(0, cfg.monthlyLimit - used);

  return {
    tier,
    used,
    monthlyLimit: cfg.monthlyLimit,
    autoSwitchThreshold: cfg.autoSwitchThreshold,
    ratio,
    percent,
    isNearLimit,
    isWarning,
    level,
    remainingBeforeSwitch,
    remainingFree,
  };
}

export function formatCompactChars(count = 0) {
  const n = Math.max(0, Number(count) || 0);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2).replace(/\.00$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(Math.round(n));
}
