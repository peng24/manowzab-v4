import { ref } from "vue";
import { ref as dbRef, get, query, orderByChild, endAt, remove } from "firebase/database";
import { db } from "../composables/useFirebase";
import { useSystemStore } from "../stores/system";

export function useAutoCleanup() {
    const systemStore = useSystemStore();
    const isCleaning = ref(false);

    async function initAutoCleanup() {
        // 1. Safety Check: Run only if Admin (AI Commander)
        // We check both systemStore (if synced) and localStorage (for local override)
        const isAdmin = systemStore.isAiCommander || localStorage.getItem("isAdmin") === "true";

        if (!isAdmin) {
            console.log("🧹 Auto Cleanup: Skipped (Not Admin)");
            return;
        }

        // 2. Delay to avoid network contention at startup
        console.log("⏳ Auto Cleanup: Waiting 20s before check...");
        const timerId = setTimeout(async () => {
            await performCleanup();
        }, 20000);

        return () => clearTimeout(timerId);
    }

    async function performCleanup() {
        if (isCleaning.value) return;
        isCleaning.value = true;

        try {
            console.log("🧹 Auto Cleanup: Checking for old chats...");

            // 3. Calculate Cutoff Date (30 days ago)
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - 30);
            const cutoffTimestamp = cutoffDate.getTime();

            console.log(`📅 Cutoff Date: ${cutoffDate.toLocaleDateString()} (${cutoffTimestamp})`);

            // 4. Query 'history' node for old videos
            const historyRef = dbRef(db, "history");
            const oldHistoryQuery = query(historyRef, orderByChild("timestamp"), endAt(cutoffTimestamp));

            const snapshot = await get(oldHistoryQuery);

            if (!snapshot.exists()) {
                console.log("✅ Auto Cleanup: No old history found.");
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
                    console.log(`🗑️ Deleting chat for: ${data.title || videoId} (${new Date(data.timestamp).toLocaleDateString()})`);

                    // Delete only the chat node, keep history
                    const chatRef = dbRef(db, `chats/${videoId}`);
                    remove(chatRef)
                        .then(() => console.log(`✅ Deleted chats/${videoId}`))
                        .catch((err) => console.error(`❌ Failed to delete chats/${videoId}:`, err));

                    count++;
                }
            });

            if (count > 0) {
                console.log(`🎉 Auto Cleanup: Removed chat history for ${count} old videos.`);
            } else {
                console.log("✅ Auto Cleanup: No chats needed deletion.");
            }

        } catch (error) {
            console.error("❌ Auto Cleanup Error:", error);
        } finally {
            isCleaning.value = false;
        }
    }

    return { initAutoCleanup };
}
