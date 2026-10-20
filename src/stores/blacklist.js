import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { ref as dbRef, onValue, set, remove, serverTimestamp } from "firebase/database";
import { db } from "../composables/useFirebase";
import { sanitizeDbKey } from "../utils/dbUtils";
import { normalizeCustomerName } from "../utils/deliverySync";
import { logger } from "../utils/logger";

// 🛡️ Firebase RTDB Path: Store under 'settings/blacklist' to inherit read/write permissions from settings node
const BLACKLIST_DB_PATH = "settings/blacklist";

export const useBlacklistStore = defineStore("blacklist", () => {
  const blacklistMap = ref({});
  const isLoaded = ref(false);
  let blacklistListenerUnsub = null;

  /**
   * ✅ Initialize real-time Firebase listener for blacklist
   */
  function initBlacklistListener() {
    if (blacklistListenerUnsub) return blacklistListenerUnsub;

    const bRef = dbRef(db, BLACKLIST_DB_PATH);
    blacklistListenerUnsub = onValue(
      bRef,
      (snapshot) => {
        blacklistMap.value = snapshot.val() || {};
        isLoaded.value = true;
        logger.debug("🛡️ Blacklist synchronized:", Object.keys(blacklistMap.value).length, "entries");
      },
      (error) => {
        logger.error("❌ Blacklist listener error:", error);
      }
    );

    return () => {
      if (blacklistListenerUnsub) {
        blacklistListenerUnsub();
        blacklistListenerUnsub = null;
      }
    };
  }

  /**
   * ✅ Check whether a user is banned by channelId/uid or name
   * @param {string} uid - YouTube channelId or internal UID
   * @param {string} name - Display name or customer real name
   * @returns {boolean}
   */
  function isBanned(uid, name) {
    const list = blacklistMap.value;
    if (!list || Object.keys(list).length === 0) return false;

    // 1. Direct channelId/uid check
    if (uid) {
      const safeUid = sanitizeDbKey(uid);
      if (list[safeUid]) return true;
    }

    // 2. Normalized name check (with space-agnostic Thai fallback)
    if (name) {
      const norm = normalizeCustomerName(name);
      const compactNorm = norm ? norm.replace(/\s+/g, "") : "";
      if (norm && list[norm]) return true;
      if (compactNorm && list[compactNorm]) return true;

      // 3. Scan through entries for matching normName, compact name, or channelId
      for (const key in list) {
        const item = list[key];
        if (item) {
          if (uid && (item.channelId === uid || item.uid === uid)) return true;
          if (norm && (item.normName === norm || (item.displayName && normalizeCustomerName(item.displayName) === norm))) return true;
          if (compactNorm && (
            (item.normName && item.normName.replace(/\s+/g, "") === compactNorm) ||
            (item.displayName && normalizeCustomerName(item.displayName).replace(/\s+/g, "") === compactNorm)
          )) return true;
        }
      }
    }

    return false;
  }

  /**
   * ✅ Get ban details for a user
   * @param {string} uid
   * @param {string} name
   * @returns {Object|null}
   */
  function getBanInfo(uid, name) {
    const list = blacklistMap.value;
    if (!list) return null;

    if (uid) {
      const safeUid = sanitizeDbKey(uid);
      if (list[safeUid]) return list[safeUid];
    }

    if (name) {
      const norm = normalizeCustomerName(name);
      const compactNorm = norm ? norm.replace(/\s+/g, "") : "";
      if (norm && list[norm]) return list[norm];
      if (compactNorm && list[compactNorm]) return list[compactNorm];

      for (const key in list) {
        const item = list[key];
        if (item) {
          if (uid && (item.channelId === uid || item.uid === uid)) return item;
          if (norm && (item.normName === norm || (item.displayName && normalizeCustomerName(item.displayName) === norm))) return item;
          if (compactNorm && (
            (item.normName && item.normName.replace(/\s+/g, "") === compactNorm) ||
            (item.displayName && normalizeCustomerName(item.displayName).replace(/\s+/g, "") === compactNorm)
          )) return item;
        }
      }
    }

    return null;
  }

  /**
   * ✅ Ban a user
   * @param {Object} banData
   * @param {string} banData.channelId - YouTube channel ID or unique key
   * @param {string} banData.displayName - User display name
   * @param {string} [banData.reason] - Reason for ban
   * @param {string} [banData.bannedBy] - Admin ID / device
   */
  async function banUser({ channelId, displayName, reason = "CF แล้วไม่โอน / ก่อกวน", bannedBy = "แอดมิน" }) {
    if (!channelId && !displayName) {
      throw new Error("ต้องระบุ channelId หรือ displayName ในการแบน");
    }

    const key = channelId ? sanitizeDbKey(channelId) : normalizeCustomerName(displayName);
    const norm = displayName ? normalizeCustomerName(displayName) : "";

    const payload = {
      channelId: channelId || "",
      uid: channelId || "",
      displayName: displayName || "ไม่ระบุชื่อ",
      normName: norm,
      reason: reason || "CF แล้วไม่โอน / ก่อกวน",
      bannedAt: Date.now(),
      bannedBy: bannedBy || "แอดมิน",
    };

    const targetRef = dbRef(db, `${BLACKLIST_DB_PATH}/${key}`);
    await set(targetRef, payload);
    logger.success(`🚫 Banned user: ${displayName || channelId} (${payload.reason})`);
    return payload;
  }

  /**
   * ✅ Unban a user
   * @param {string} channelIdOrKey - YouTube channel ID or normalized name key
   */
  async function unbanUser(channelIdOrKey) {
    if (!channelIdOrKey) return;

    const list = blacklistMap.value;
    const safeKey = sanitizeDbKey(channelIdOrKey);
    const norm = normalizeCustomerName(channelIdOrKey);

    const keysToRemove = new Set();

    if (list[safeKey]) keysToRemove.add(safeKey);
    if (norm && list[norm]) keysToRemove.add(norm);

    // Also look for entries matching channelId or normName
    for (const k in list) {
      const item = list[k];
      if (item) {
        if (item.channelId === channelIdOrKey || item.uid === channelIdOrKey) keysToRemove.add(k);
        if (norm && item.normName === norm) keysToRemove.add(k);
        if (item.displayName && normalizeCustomerName(item.displayName) === norm) keysToRemove.add(k);
      }
    }

    if (keysToRemove.size === 0) {
      // Fallback: direct removal of safeKey
      keysToRemove.add(safeKey);
    }

    const promises = Array.from(keysToRemove).map((k) => remove(dbRef(db, `${BLACKLIST_DB_PATH}/${k}`)));
    await Promise.all(promises);
    logger.success(`✅ Unbanned user: ${channelIdOrKey}`);
  }

  /**
   * ✅ List of all blacklisted users as array sorted by bannedAt desc
   */
  const blacklistArray = computed(() => {
    const list = blacklistMap.value;
    if (!list) return [];
    return Object.entries(list)
      .map(([key, data]) => ({
        key,
        ...data,
      }))
      .sort((a, b) => (b.bannedAt || 0) - (a.bannedAt || 0));
  });

  const blacklistCount = computed(() => blacklistArray.value.length);

  return {
    blacklistMap,
    isLoaded,
    initBlacklistListener,
    isBanned,
    getBanInfo,
    banUser,
    unbanUser,
    blacklistArray,
    blacklistCount,
  };
});
