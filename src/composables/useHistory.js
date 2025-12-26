import { ref } from "vue";
import { ref as dbRef, get, remove, child, update } from "firebase/database";
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
     * Fetch Details for a specific Live (from stock node)
     * @param {string} videoId 
     * @returns {Promise<Object>} Object of orders/stock items
     */
    async function fetchHistoryDetails(videoId) {
        if (!videoId) return { orders: {}, stockSize: 70 };
        
        try {
            const stockRef = dbRef(db, `stock/${videoId}`);
            const sizeRef = dbRef(db, `settings/${videoId}/stockSize`);

            const [stockSnap, sizeSnap] = await Promise.all([
                get(stockRef),
                get(sizeRef)
            ]);
            
            return {
                orders: stockSnap.exists() ? stockSnap.val() : {},
                stockSize: sizeSnap.exists() ? sizeSnap.val() : 70
            };
        } catch (error) {
            console.error("❌ Fetch History Details Error:", error);
            return { orders: {}, stockSize: 70 };
        }
    }

    /**
     * Update History Item (Edit/Clear)
     * @param {string} videoId 
     * @param {string|number} itemId 
     * @param {Object|null} data - { owner, price, ... } or null to clear owner
     */
    async function updateHistoryItem(videoId, itemId, data) {
        if (!videoId || !itemId) return;

        try {
            const itemRef = dbRef(db, `stock/${videoId}/${itemId}`);
            
            if (data) {
                // Update existing or set new
                // We use 'update' to merge, but ensuring crucial fields
                const updateData = {
                    ...data,
                    updatedAt: Date.now() // Track edit time
                };
                // If it's a new entry (was empty), ensure time exists if not provided
                if (!updateData.time && !updateData.updatedAt) updateData.time = Date.now();
                
                await update(itemRef, updateData);
            } else {
                // Clear Owner (Soft Delete: Remove owner, uid, but maybe keep history? Or just remove node?)
                // Requirement usually implies making it "Empty".
                // In this system, Empty = No Owner.
                // We can't just remove the node if we want to keep it "in the grid" structure? 
                // The grid is 1..N based on stockSize. Removing the node makes it empty.
                await remove(itemRef);
            }
        } catch (error) {
            console.error("❌ Update Item Error:", error);
            throw error;
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

    /**
     * Recalculate Totals for ALL history items (Batch Fix)
     */
    async function recalculateAllHistory() {
        if (!historyList.value.length) return;
        
        isLoading.value = true;
        try {
            for (const item of historyList.value) {
                const stockRef = dbRef(db, `stock/${item.videoId}`);
                const snap = await get(stockRef);
                
                if (snap.exists()) {
                    const stockData = snap.val();
                    let totalSales = 0;
                    let totalItems = 0;
                    
                    Object.values(stockData).forEach(order => {
                        if (order.owner && order.price) {
                            totalSales += parseInt(order.price);
                            totalItems++;
                        }
                    });

                    // Update History Node
                    await update(dbRef(db, `history/${item.videoId}`), {
                        totalSales,
                        totalItems
                    });
                }
            }
            // Refresh list
            await fetchHistoryList();
            return true;
        } catch (error) {
            console.error("❌ Recalculate Error:", error);
            throw error;
        } finally {
            isLoading.value = false;
        }
    }

    return {
        historyList,
        isLoading,
        fetchHistoryList,
        fetchHistoryDetails,
        updateHistoryItem,
        deleteHistory,
        recalculateAllHistory // ✅ Export
    };
}
