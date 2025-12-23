import { ref } from "vue";
import { ref as dbRef, get, remove, child } from "firebase/database";
import { db } from "./useFirebase";

export function useHistory() {
    const historyList = ref([]);
    const isLoading = ref(false);

    /**
     * Fetch History List
     * Query: history/{videoId} (Ordered by timestamp desc in client)
     */
    async function fetchHistoryList() {
        isLoading.value = true;
        historyList.value = [];

        try {
            const historyRef = dbRef(db, "history");
            const snapshot = await get(historyRef);

            if (snapshot.exists()) {
                const data = snapshot.val();
                // Convert object to array
                const list = Object.keys(data).map((key) => ({
                    videoId: key,
                    ...data[key],
                }));

                // Sort by timestamp Descending (Newest first)
                // Ensure timestamp exists, otherwise use 0
                list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

                historyList.value = list;
            }
        } catch (error) {
            console.error("❌ Fetch History Error:", error);
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Delete History
     * Removes from both 'history/' and 'chats/' nodes
     */
    async function deleteHistory(videoId) {
        if (!videoId) return;

        try {
            // 1. Remove from history node
            await remove(child(dbRef(db, "history"), videoId));

            // 2. Remove relevant chats (Clean up)
            await remove(child(dbRef(db, "chats"), videoId));

            // Refresh list
            await fetchHistoryList();
        } catch (error) {
            console.error("❌ Delete History Error:", error);
            throw error;
        }
    }

    return {
        historyList,
        isLoading,
        fetchHistoryList,
        deleteHistory,
    };
}
