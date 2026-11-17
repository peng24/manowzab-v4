import { escapeHtml } from "./dbUtils";
import {
  extractAdminCustomerName,
  getCustomerColorTheme,
  backdatedNoteRegex,
  adminSizeSelectionNoteRegex,
  shippingRegex,
} from "./chatParserUtils";
import { parseYouTubeEmotesToRuns, hasYouTubeEmotes } from "../data/youtubeEmotes";

const CUSTOMER_ROW_COLOR_CACHE = new Map();
const proxyHighlightRegexCache = new Map();

const PILL_NOTE_FALLBACK_REGEX = /โน้ต|ฝากโน้ต|เมื่อวาน|เมือวาน|เมี่อวาน|ยอดเก่า|ค้าง|ติดไว้/i;
const PILL_SHIPPING_FALLBACK_REGEX = /ส่ง|ที่อยู่|ฝาก/i;
const REGEX_ESCAPE_CHARS = /[.*+?^${}()|[\]\\]/g;

const thaiTimeFormatter = new Intl.DateTimeFormat("th-TH", {
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Format timestamp into Thai 24-hour HH:mm clock text.
 * @param {number|string} timestamp
 * @returns {string}
 */
export function formatChatClockTime(timestamp) {
  if (!timestamp) return "";
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) return "";
  return thaiTimeFormatter.format(d);
}

/**
 * Deterministic 360-degree FNV-1a personal accent color per customer name.
 * @param {Object} chat
 * @returns {string|null}
 */
export function getCustomerRowColor(chat) {
  if (!chat) return null;
  const key = String(chat.realName || chat.displayName || chat.authorName || chat.uid || "")
    .trim()
    .toLowerCase()
    .replace(/^@+/, "");
  if (!key) return chat.color || null;

  if (CUSTOMER_ROW_COLOR_CACHE.has(key)) {
    return CUSTOMER_ROW_COLOR_CACHE.get(key);
  }

  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const mixed = Math.imul(h, 2654435761) >>> 0;
  const hue = mixed % 360;
  const color = `hsl(${hue}, 76%, 64%)`;

  if (CUSTOMER_ROW_COLOR_CACHE.size >= 500) {
    const oldest = CUSTOMER_ROW_COLOR_CACHE.keys().next().value;
    CUSTOMER_ROW_COLOR_CACHE.delete(oldest);
  }
  CUSTOMER_ROW_COLOR_CACHE.set(key, color);
  return color;
}

/**
 * Apply alpha transparency to hsl(), rgb(), or #RRGGBB color strings.
 * @param {string} colorStr
 * @param {number} alpha
 * @returns {string}
 */
export function applyColorAlpha(colorStr, alpha) {
  if (!colorStr || typeof colorStr !== "string") return `rgba(148, 163, 184, ${alpha})`;
  const c = colorStr.trim();
  const hslMatch = c.match(/^hsla?\(\s*([\d.]+)\s*,\s*([\d.]+%)\s*,\s*([\d.]+%)/i);
  if (hslMatch) {
    return `hsla(${hslMatch[1]}, ${hslMatch[2]}, ${hslMatch[3]}, ${alpha})`;
  }
  const rgbMatch = c.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgbMatch) {
    return `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${alpha})`;
  }
  if (c.startsWith("#")) {
    const hex = c.slice(1);
    if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  }
  return `rgba(148, 163, 184, ${alpha})`;
}

/**
 * Hybrid chat row styling:
 * - Admin cards keep Champagne Gold background with intent-colored 4.5px left stripe.
 * - Customer cards keep each speaker's 360-degree personal background gradient while
 *   priority intents (buy/shipping/cancel) stand out via 4.5px left stripe & border.
 * @param {Object} chat
 * @param {boolean} isBanned
 * @returns {Object}
 */
export function getChatRowStyle(chat, isBanned = false) {
  if (!chat || isBanned) return {};

  if (chat.isAdmin) {
    const adminStripe =
      chat.type === "buy" ? "#10b981" :
      chat.type === "cancel" ? "#f43f5e" :
      chat.type === "shipping" ? "#a855f7" :
      "#e5b869";
    return {
      borderLeft: `4.5px solid ${adminStripe}`,
    };
  }

  const rawColor = getCustomerRowColor(chat) || chat.color;
  if (!rawColor) return {};

  const tintStart = applyColorAlpha(rawColor, 0.24);
  const tintEnd = applyColorAlpha(rawColor, 0.09);

  if (chat.type === "buy") {
    return {
      borderColor: "rgba(52, 211, 153, 0.58)",
      borderLeft: "4.5px solid #10b981",
      background: `linear-gradient(135deg, ${tintStart} 0%, ${tintEnd} 60%, rgba(13, 18, 28, 0.9) 100%)`,
    };
  }

  if (chat.type === "shipping") {
    return {
      borderColor: "rgba(192, 132, 252, 0.58)",
      borderLeft: "4.5px solid #a855f7",
      background: `linear-gradient(135deg, ${tintStart} 0%, ${tintEnd} 60%, rgba(13, 18, 28, 0.9) 100%)`,
    };
  }

  if (chat.type === "cancel") {
    return {
      borderColor: "rgba(251, 113, 133, 0.68)",
      borderLeft: "4.5px solid #f43f5e",
      background: `linear-gradient(135deg, rgba(244, 63, 94, 0.22) 0%, ${tintEnd} 60%, rgba(24, 13, 18, 0.92) 100%)`,
    };
  }

  const tintBorder = applyColorAlpha(rawColor, 0.40);
  return {
    borderColor: tintBorder,
    borderLeft: `3.5px solid ${rawColor}`,
    background: `linear-gradient(135deg, ${tintStart} 0%, ${tintEnd} 60%, rgba(13, 18, 28, 0.9) 100%)`,
  };
}

/**
 * Resolve intent badge metadata for avatar sub-badge.
 * @param {string} type
 * @returns {{icon: string, label: string, class: string}|null}
 */
export function getIntentBadge(type) {
  switch (type) {
    case "buy":
      return { icon: "🛒", label: "จอง", class: "badge-buy" };
    case "shipping":
      return { icon: "🚚", label: "ส่ง", class: "badge-shipping" };
    case "cancel":
      return { icon: "❌", label: "ยกเลิก", class: "badge-cancel" };
    case "banned":
      return { icon: "🚫", label: "แบน", class: "badge-banned" };
    case "question":
      return { icon: "💬", label: "ถาม", class: "badge-question" };
    case "note":
      return { icon: "📝", label: "โน้ต", class: "badge-note" };
    default:
      return null;
  }
}

export function getChannelLabel(channel) {
  if (channel === "line") return "Line";
  if (channel === "lineoa") return "OA";
  if (channel === "phone") return "โทรศัพท์";
  return channel;
}

export function getChannelShortText(channel) {
  if (channel === "line") return "Line";
  if (channel === "lineoa") return "OA";
  if (channel === "phone") return "โทร";
  return channel;
}

export function getChannelIcon(channel) {
  if (channel === "line") return "fa-brands fa-line";
  if (channel === "lineoa") return "fa-solid fa-comment-dots";
  if (channel === "phone") return "fa-solid fa-phone";
  return "fa-solid fa-comments";
}

function getProxyHighlightRegex(escapedName) {
  let cached = proxyHighlightRegexCache.get(escapedName);
  if (!cached) {
    if (proxyHighlightRegexCache.size >= 200) {
      const oldestKey = proxyHighlightRegexCache.keys().next().value;
      proxyHighlightRegexCache.delete(oldestKey);
    }
    const regexSafe = escapedName.replace(REGEX_ESCAPE_CHARS, "\\$&");
    cached = new RegExp(`(${regexSafe})`, "gi");
    proxyHighlightRegexCache.set(escapedName, cached);
  }
  return cached;
}

export function getAdminProxyPillCategory(chat) {
  if (!chat) return "buy";
  if (chat.isAdminNote || chat.type === "note" || chat.noteCategory) {
    return "note";
  }
  const text = chat.text || "";
  if (
    backdatedNoteRegex.test(text) ||
    adminSizeSelectionNoteRegex.test(text) ||
    PILL_NOTE_FALLBACK_REGEX.test(text)
  ) {
    return "note";
  }
  if (chat.type === "shipping" || shippingRegex.test(text) || PILL_SHIPPING_FALLBACK_REGEX.test(text)) {
    return "shipping";
  }
  return "buy";
}

/**
 * Safely render HTML highlighting the target proxy customer name inside an admin message.
 * @param {Object} chat
 * @param {string|null} proxyName
 * @returns {string}
 */
export function renderAdminProxyHtml(chat, proxyName) {
  const text = chat?.text || "";
  if (!proxyName || !text) return escapeHtml(text);

  const escapedText = escapeHtml(text);
  const escapedName = escapeHtml(proxyName);
  const themeIdx = getCustomerColorTheme(proxyName);
  const pillCategory = getAdminProxyPillCategory(chat);

  let iconClass = "fa-cart-shopping";
  let titlePrefix = "จองให้ลูกค้า";
  if (pillCategory === "shipping") {
    iconClass = "fa-truck-fast";
    titlePrefix = "สั่งส่งให้ลูกค้า";
  } else if (pillCategory === "note") {
    iconClass = "fa-note-sticky";
    titlePrefix = "โน้ตลูกค้า";
  }

  const regex = getProxyHighlightRegex(escapedName);
  return escapedText.replace(
    regex,
    `<span class="chat-highlight-name pill-${pillCategory} theme-${themeIdx}" title="${titlePrefix}: $1"><i class="fa-solid ${iconClass} name-icon"></i>$1</span>`
  );
}

/**
 * Resolve message runs including YouTube official custom emotes.
 * @param {Object} chat
 * @returns {Array|null}
 */
export function resolveChatRuns(chat) {
  if (!chat) return null;
  if (chat.messageRuns && chat.messageRuns.length > 0) {
    if (chat.messageRuns.some((r) => r.text && hasYouTubeEmotes(r.text))) {
      return chat.messageRuns.flatMap((run) => {
        if (run.text && hasYouTubeEmotes(run.text)) {
          return parseYouTubeEmotesToRuns(run.text);
        }
        return [run];
      });
    }
    return chat.messageRuns;
  }
  if (chat.text && hasYouTubeEmotes(chat.text)) {
    return parseYouTubeEmotesToRuns(chat.text);
  }
  return null;
}

/**
 * Cleanly extract admin proxy target customer name from stored chat record.
 * @param {Object} chat
 * @returns {string|null}
 */
export function resolveStoredProxyName(chat) {
  if (!chat || !chat.proxyCustomerName) return null;
  return extractAdminCustomerName(chat.proxyCustomerName) || chat.proxyCustomerName;
}
