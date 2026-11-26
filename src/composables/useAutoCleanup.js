import { ref } from "vue";
import { ref as dbRef, get, query, orderByChild, endAt, remove } from "firebase/database";
import { db } from "../composables/useFirebase";
import { useSystemStore } from "../stores/system";
import { useAuthStore } from "../stores/auth";
import { CONSTANTS } from "../config/constants";
import { logger } from "../utils/logger";

export function useAutoCleanup() {
    const systemStore = useSystemStore();
    const authStore = useAuthStore();
    const isCleaning = ref(false);

    async function initAutoCleanup() {
        // 1. Safety Check: Run only for authenticated Firebase Admins
        if (!authStore.isAuthenticated) {
            return;
        }

        // 2. Delay to avoid network contention at startup
        logger.debug(`Auto Cleanup: Waiting ${CONSTANTS.CLEANUP.STARTUP_DELAY_MS / 1000}s before check...`);
        const timerId = setTimeout(async () => {
            await performCleanup();
        }, CONSTANTS.CLEANUP.STARTUP_DELAY_MS);

        return () => clearTimeout(timerId);
    }

    async function performCleanup() {
        if (isCleaning.value) return;
        isCleaning.value = true;

        try {
            logger.system("Auto Cleanup: Checking for old chats...");

            // 3. Calculate Cutoff Date
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - CONSTANTS.CLEANUP.HISTORY_RETENTION_DAYS);
            const cutoffTimestamp = cutoffDate.getTime();

            logger.system(`Cutoff Date: ${cutoffDate.toLocaleDateString()} (${cutoffTimestamp})`);

            // 4. Query 'history' node for old videos (with graceful fallback if '.indexOn: timestamp' is not deployed yet)
            const historyRef = dbRef(db, "history");
            let snapshot;
            try {
                const oldHistoryQuery = query(historyRef, orderByChild("timestamp"), endAt(cutoffTimestamp));
                snapshot = await get(oldHistoryQuery);
            } catch (queryErr) {
                const errMsg = String(queryErr?.message || queryErr || "");
                if (errMsg.includes("Index not defined")) {
                    logger.debug("Auto Cleanup: '/history' timestamp index not deployed yet; falling back to client-side filter.");
                    snapshot = await get(historyRef);
                } else {
                    throw queryErr;
                }
            }

            if (!snapshot.exists()) {
                logger.system("Auto Cleanup: No old history found.");
                return;
            }

            const cleanupTasks = [];
            let count = 0;

            // 5. Iterate and delete corresponding old session nodes safely
            snapshot.forEach((childSnapshot) => {
                const videoId = childSnapshot.key;
                const data = childSnapshot.val();

                // Guard against null/undated records and never wipe the currently active session
                if (
                    !videoId ||
                    videoId === systemStore.currentVideoId ||
                    !data ||
                    typeof data.timestamp !== "number" ||
                    data.timestamp <= 0 ||
                    data.timestamp > cutoffTimestamp
                ) {
                    return;
                }

                logger.system(`Deleting old session: ${data.title || videoId} (${new Date(data.timestamp).toLocaleDateString()})`);

                // ✅ Delete all related nodes for old sessions including history metadata
                cleanupTasks.push(
                    Promise.all([
                        remove(dbRef(db, `chats/${videoId}`)).catch((e) => logger.warn(`Chat cleanup error (${videoId}):`, e)),
                        remove(dbRef(db, `stock/${videoId}`)).catch((e) => logger.warn(`Stock cleanup error (${videoId}):`, e)),
                        remove(dbRef(db, `settings/${videoId}`)).catch((e) => logger.warn(`Settings cleanup error (${videoId}):`, e)),
                        remove(dbRef(db, `voice_chats/${videoId}`)).catch((e) => logger.warn(`Voice chats cleanup error (${videoId}):`, e)),
                        remove(dbRef(db, `system/shipping/${videoId}`)).catch((e) => logger.warn(`Shipping cleanup error (${videoId}):`, e)),
                        remove(dbRef(db, `history/${videoId}`)).catch((e) => logger.warn(`History cleanup error (${videoId}):`, e)),
                    ])
                        .then(() => logger.success(`Cleaned up all data for ${videoId}`))
                        .catch((err) => logger.error(`Failed to cleanup ${videoId}:`, err))
                );

                count++;
            });

            if (cleanupTasks.length > 0) {
                await Promise.all(cleanupTasks);
            }

            if (count > 0) {
                logger.system(`Auto Cleanup: Removed data for ${count} old videos.`);
            } else {
                logger.system("Auto Cleanup: No old sessions needed deletion.");
            }

        } catch (error) {
            logger.error("Auto Cleanup Error:", error);
        } finally {
            isCleaning.value = false;
        }
    }

    return { initAutoCleanup };
}
