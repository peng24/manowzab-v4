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
    /**
     * Delete History
     * Removes all nodes associated with a videoId cleanly (no orphaned data)
     */
    async function deleteHistory(videoId) {
        if (!videoId) return;

        try {
            await Promise.all([
                remove(dbRef(db, `history/${videoId}`)),
                remove(dbRef(db, `chats/${videoId}`)),
                remove(dbRef(db, `stock/${videoId}`)),
                remove(dbRef(db, `settings/${videoId}`)),
                remove(dbRef(db, `voice_chats/${videoId}`)),
                remove(dbRef(db, `shipping/${videoId}`))
            ]);

            // Refresh list
            await fetchHistoryList();
        } catch (error) {
            console.error("❌ Delete History Error:", error);
            throw error;
        }
    }

    /**
     * Get preview of history items older than 3 months (90 days)
     * @returns {Promise<Object>} Preview details
     */
    async function getCleanupPreview() {
        const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
        
        // Ensure historyList is up to date
        await fetchHistoryList();
        
        const totalLives = historyList.value.length;
        const olderLives = historyList.value.filter(item => (item.timestamp || 0) < ninetyDaysAgo);
        const olderLivesCount = olderLives.length;
        
        let totalBytes = 0;
        
        if (olderLivesCount > 0) {
            // Fetch size details in parallel
            const sizePromises = olderLives.map(async (item) => {
                const vid = item.videoId;
                let bytes = 0;
                try {
                    const [historySnap, chatsSnap, stockSnap, settingsSnap, voiceSnap, shippingSnap] = await Promise.all([
                        get(dbRef(db, `history/${vid}`)),
                        get(dbRef(db, `chats/${vid}`)),
                        get(dbRef(db, `stock/${vid}`)),
                        get(dbRef(db, `settings/${vid}`)),
                        get(dbRef(db, `voice_chats/${vid}`)),
                        get(dbRef(db, `shipping/${vid}`))
                    ]);
                    
                    if (historySnap.exists()) bytes += JSON.stringify(historySnap.val()).length;
                    if (chatsSnap.exists()) bytes += JSON.stringify(chatsSnap.val()).length;
                    if (stockSnap.exists()) bytes += JSON.stringify(stockSnap.val()).length;
                    if (settingsSnap.exists()) bytes += JSON.stringify(settingsSnap.val()).length;
                    if (voiceSnap.exists()) bytes += JSON.stringify(voiceSnap.val()).length;
                    if (shippingSnap.exists()) bytes += JSON.stringify(shippingSnap.val()).length;
                } catch (err) {
                    console.error(`Error estimating size for video ${vid}:`, err);
                }
                return bytes;
            });
            
            const sizes = await Promise.all(sizePromises);
            totalBytes = sizes.reduce((sum, size) => sum + size, 0);
        }
        
        return {
            totalLives,
            olderLivesCount,
            olderLives,
            estimatedSizeInBytes: totalBytes
        };
    }

    /**
     * Delete multiple history sessions cleanly
     * @param {Array<string>} videoIds 
     */
    async function deleteMultipleHistory(videoIds) {
        if (!videoIds || !videoIds.length) return;
        
        const deletePromises = videoIds.map(async (videoId) => {
            try {
                await Promise.all([
                    remove(dbRef(db, `history/${videoId}`)),
                    remove(dbRef(db, `chats/${videoId}`)),
                    remove(dbRef(db, `stock/${videoId}`)),
                    remove(dbRef(db, `settings/${videoId}`)),
                    remove(dbRef(db, `voice_chats/${videoId}`)),
                    remove(dbRef(db, `shipping/${videoId}`))
                ]);
            } catch (err) {
                console.error(`❌ Error deleting history for ${videoId}:`, err);
            }
        });
        
        await Promise.all(deletePromises);
        await fetchHistoryList();
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
        getCleanupPreview, // ✅ Export
        deleteMultipleHistory, // ✅ Export
        recalculateAllHistory // ✅ Export
    };
}
