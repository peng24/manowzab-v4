const isDev = import.meta.env.DEV;

const BADGES = {
  system: {
    emoji: "🚀",
    label: "SYSTEM",
    bgStart: "#00F260",
    bgEnd: "#0575E6",
    textColor: "#ffffff",
    alwaysShow: true
  },
  youtube: {
    emoji: "📺",
    label: "YOUTUBE",
    bgStart: "#ff0844",
    bgEnd: "#ffb199",
    textColor: "#ffffff"
  },
  firebase: {
    emoji: "🔥",
    label: "FIREBASE",
    bgStart: "#f6d365",
    bgEnd: "#fda085",
    textColor: "#ffffff"
  },
  chat: {
    emoji: "💬",
    label: "CHAT",
    bgStart: "#7F00FF",
    bgEnd: "#E100FF",
    textColor: "#ffffff"
  },
  tts: {
    emoji: "🔊",
    label: "TTS",
    bgStart: "#11998e",
    bgEnd: "#38ef7d",
    textColor: "#ffffff"
  },
  stock: {
    emoji: "📦",
    label: "STOCK",
    bgStart: "#f093fb",
    bgEnd: "#f5576c",
    textColor: "#ffffff"
  },
  auth: {
    emoji: "🔑",
    label: "AUTH",
    bgStart: "#fbc2eb",
    bgEnd: "#a6c1ee",
    textColor: "#333333"
  },
  presence: {
    emoji: "🟢",
    label: "PRESENCE",
    bgStart: "#43e97b",
    bgEnd: "#38f9d7",
    textColor: "#111111"
  },
  away: {
    emoji: "🌙",
    label: "AWAY",
    bgStart: "#30cfd0",
    bgEnd: "#330867",
    textColor: "#ffffff"
  },
  success: {
    emoji: "✅",
    label: "SUCCESS",
    bgStart: "#11998e",
    bgEnd: "#38ef7d",
    textColor: "#ffffff"
  },
  warn: {
    emoji: "⚠️",
    label: "WARN",
    bgStart: "#f9d423",
    bgEnd: "#ff4e50",
    textColor: "#ffffff",
    alwaysShow: true,
    level: "warn"
  },
  error: {
    emoji: "🚨",
    label: "ERROR",
    bgStart: "#eb5757",
    bgEnd: "#000000",
    textColor: "#ffffff",
    alwaysShow: true,
    level: "error"
  },
  debug: {
    emoji: "🔍",
    label: "DEBUG",
    bgStart: "#717d84",
    bgEnd: "#4e5d66",
    textColor: "#ffffff"
  },
  log: {
    emoji: "📝",
    label: "LOG",
    bgStart: "#e0e0e0",
    bgEnd: "#9e9e9e",
    textColor: "#333333"
  },
  info: {
    emoji: "ℹ️",
    label: "INFO",
    bgStart: "#4facfe",
    bgEnd: "#00f2fe",
    textColor: "#ffffff"
  }
};

const printLog = (badgeName, args) => {
  const badge = BADGES[badgeName];
  if (!badge) return;

  const alwaysShow = badge.alwaysShow || false;
  if (!isDev && !alwaysShow) return;

  const level = badge.level || "log";
  const ts = new Date();
  const timeStr = ts.toTimeString().split(" ")[0];
  const ms = String(ts.getMilliseconds()).padStart(3, "0");
  const tsPrefix = `%c[${timeStr}.${ms}]`;
  const tsStyle = "color: #888888; font-size: 9px; font-family: monospace; font-weight: normal;";

  const badgePrefix = `%c${badge.emoji} ${badge.label}`;
  const badgeStyle = `background: linear-gradient(135deg, ${badge.bgStart} 0%, ${badge.bgEnd} 100%); color: ${badge.textColor}; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px; text-shadow: 0 1px 1px rgba(0,0,0,0.15); margin: 0 4px; display: inline-block;`;

  const logFn = console[level] || console.log;

  if (args.length > 0 && typeof args[0] === "string") {
    const firstArg = args[0];
    const restArgs = args.slice(1);
    const msgPrefix = `%c ${firstArg}`;
    const msgStyle = "font-weight: bold;";
    logFn(`${tsPrefix}${badgePrefix}${msgPrefix}`, tsStyle, badgeStyle, msgStyle, ...restArgs);
  } else {
    logFn(`${tsPrefix}${badgePrefix}`, tsStyle, badgeStyle, ...args);
  }
};

export const logger = {
  log: (...args) => printLog("log", args),
  info: (...args) => printLog("info", args),
  warn: (...args) => printLog("warn", args),
  error: (...args) => printLog("error", args),
  debug: (...args) => printLog("debug", args),
  system: (...args) => printLog("system", args),
  youtube: (...args) => printLog("youtube", args),
  firebase: (...args) => printLog("firebase", args),
  chat: (...args) => printLog("chat", args),
  tts: (...args) => printLog("tts", args),
  stock: (...args) => printLog("stock", args),
  auth: (...args) => printLog("auth", args),
  presence: (...args) => printLog("presence", args),
  away: (...args) => printLog("away", args),
  success: (...args) => printLog("success", args)
};
