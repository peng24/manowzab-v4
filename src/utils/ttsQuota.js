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

const PT_MONTH_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Los_Angeles",
  year: "numeric",
  month: "2-digit",
});

const THAI_RESET_FORMATTER = new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
  timeZone: "Asia/Bangkok",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/**
 * Google Cloud Billing & Text-to-Speech monthly free tiers reset on the 1st of each
 * calendar month at 00:00 US/Pacific Time (America/Los_Angeles: 14:00 PDT or 15:00 PST in Thailand).
 */
export function getCurrentTtsQuotaMonth(date = new Date()) {
  try {
    const parts = PT_MONTH_FORMATTER.formatToParts(date);
    const year = parts.find((p) => p.type === "year")?.value;
    const month = parts.find((p) => p.type === "month")?.value;
    if (year && month) return `${year}-${month}`;
  } catch {
    /* fallback below if Intl timeZone unsupported */
  }
  const pstDate = new Date(date.getTime() - 8 * 3600 * 1000);
  const year = pstDate.getUTCFullYear();
  const month = String(pstDate.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function getNextTtsResetTimestamp(date = new Date()) {
  const [y, m] = getCurrentTtsQuotaMonth(date).split("-").map(Number);
  const nextYear = m === 12 ? y + 1 : y;
  const nextMonth = m === 12 ? 1 : m + 1;
  const targetMonthKey = `${nextYear}-${String(nextMonth).padStart(2, "0")}`;
  // 00:00 PT is either 07:00 UTC (PDT) or 08:00 UTC (PST) on the 1st of the month.
  const pdtCandidate = new Date(Date.UTC(nextYear, nextMonth - 1, 1, 7, 0, 0));
  if (getCurrentTtsQuotaMonth(pdtCandidate) === targetMonthKey) {
    return pdtCandidate.getTime();
  }
  return Date.UTC(nextYear, nextMonth - 1, 1, 8, 0, 0);
}

const THAI_MONTH_FORMATTER = new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
  timeZone: "Asia/Bangkok",
  month: "short",
  year: "numeric",
});

export function formatThaiQuotaMonth(monthKey = "") {
  const match = /^(\d{4})-(\d{2})$/.exec(String(monthKey));
  if (!match) return String(monthKey);
  try {
    const dt = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 15, 12, 0, 0));
    return THAI_MONTH_FORMATTER.format(dt);
  } catch {
    return String(monthKey);
  }
}

export function getNextTtsResetLabel(date = new Date()) {
  const ts = getNextTtsResetTimestamp(date);
  try {
    return `${THAI_RESET_FORMATTER.format(new Date(ts))} น. (เวลาไทย)`;
  } catch {
    return new Date(ts).toISOString();
  }
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
