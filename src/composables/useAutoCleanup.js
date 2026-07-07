import { ref } from "vue";
import { ref as dbRef, get, query, orderByChild, endAt, remove } from "firebase/database";
import { db } from "../composables/useFirebase";
import { useSystemStore } from "../stores/system";
import { CONSTANTS } from "../config/constants";
import { logger } from "../utils/logger";

export function useAutoCleanup() {
    const systemStore = useSystemStore();
    const isCleaning = ref(false);

    async function initAutoCleanup() {
        // 1. Safety Check: Run only if Admin
        const isAdmin = localStorage.getItem("isAdmin") === "true";

        if (!isAdmin) {
            // Silent skip - no need to log this
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

            // 4. Query 'history' node for old videos
            const historyRef = dbRef(db, "history");
            const oldHistoryQuery = query(historyRef, orderByChild("timestamp"), endAt(cutoffTimestamp));

            const snapshot = await get(oldHistoryQuery);

            if (!snapshot.exists()) {
                logger.system("Auto Cleanup: No old history found.");
                return;
            }

            const updates = {};
            let count = 0;

            // 5. Iterate and delete corresponding 'chats' node
            snapshot.forEach((childSnapshot) => {
                const videoId = childSnapshot.key;
                const data = childSnapshot.val();

                // Double check timestamp just in case
                if (data.timestamp <= cutoffTimestamp) {
                    logger.system(`Deleting chat for: ${data.title || videoId} (${new Date(data.timestamp).toLocaleDateString()})`);

                    // ✅ Delete all related nodes for old sessions (matching deleteHistory logic)
                    Promise.all([
                        remove(dbRef(db, `chats/${videoId}`)),
                        remove(dbRef(db, `stock/${videoId}`)),
                        remove(dbRef(db, `settings/${videoId}`)),
                        remove(dbRef(db, `voice_chats/${videoId}`)),
                        remove(dbRef(db, `shipping/${videoId}`)),
                    ])
                        .then(() => logger.success(`Cleaned up all data for ${videoId}`))
                        .catch((err) => logger.error(`Failed to cleanup ${videoId}:`, err));

                    count++;
                }
            });

            if (count > 0) {
                logger.system(`Auto Cleanup: Removed chat history for ${count} old videos.`);
            } else {
                logger.system("Auto Cleanup: No chats needed deletion.");
            }

        } catch (error) {
            logger.error("Auto Cleanup Error:", error);
        } finally {
            isCleaning.value = false;
        }
    }

    return { initAutoCleanup };
}
