export class YouTubeLiveChat {
    constructor(apiKeys) {
        this.apiKeys = Array.isArray(apiKeys) ? apiKeys : [apiKeys];
        this.currentKeyIndex = 0;
        this.liveChatId = null;
        this.nextPageToken = null;
        this.pollingInterval = 5000;
        this.isPolling = false;
        this.seenIds = new Set();
        this.timeoutId = null;
        this.onMessage = null; // Callback function
        this.onError = null;   // Callback for errors
        this.onStatusChange = null; // Callback for status updates ('ok' | 'err')
    }

    /**
     * Get current API Key with rotation support
     */
    get apiKey() {
        return this.apiKeys[this.currentKeyIndex];
    }

    rotateKey() {
        if (this.currentKeyIndex < this.apiKeys.length - 1) {
            this.currentKeyIndex++;
            console.warn(`🔑 Switching to API Key #${this.currentKeyIndex + 1}`);
            return true;
        }
        return false;
    }

    /**
     * 1. API Connection: Connect to YouTube API to get liveChatId
     */
    async fetchLiveChatId(videoId) {
        const url = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${videoId}&key=${this.apiKey}`;

        try {
            const response = await fetch(url);
            const data = await response.json();

            if (data.error) {
                if (this.rotateKey()) return this.fetchLiveChatId(videoId);
                throw new Error(data.error.message);
            }

            if (!data.items || data.items.length === 0) {
                throw new Error("Video not found");
            }

            const details = data.items[0].liveStreamingDetails;
            if (!details || !details.activeLiveChatId) {
                throw new Error("No active live chat found (Stream might be offline or chat disabled)");
            }

            this.liveChatId = details.activeLiveChatId;
            return this.liveChatId;
        } catch (error) {
            if (this.onError) this.onError(error);
            throw error;
        }
    }

    /**
     * 2. Fetching Loop: Poll messages from endpoint
     */
    async startPolling(videoId, callback) {
        if (this.isPolling) return;

        try {
            if (!this.liveChatId) {
                await this.fetchLiveChatId(videoId);
            }

            this.isPolling = true;
            this.onMessage = callback;
            this.loadChat();

        } catch (error) {
            console.error("Failed to start polling:", error);
            if (this.onError) this.onError(error);
            if (this.onStatusChange) this.onStatusChange("err");
        }
    }

    stopPolling() {
        this.isPolling = false;
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
    }

    /**
     * Main Polling Loop (Renamed to loadChat as per requirements)
     */
    async loadChat() {
        if (!this.isPolling || !this.liveChatId) return;

        const url = new URL("https://www.googleapis.com/youtube/v3/liveChat/messages");
        url.searchParams.append("liveChatId", this.liveChatId);
        url.searchParams.append("part", "snippet,authorDetails");
        url.searchParams.append("key", this.apiKey);

        // Manage nextPageToken
        if (this.nextPageToken) {
            url.searchParams.append("pageToken", this.nextPageToken);
        }

        try {
            const response = await fetch(url.toString());
            const data = await response.json();

            if (data.error) {
                console.error("API Error during poll:", data.error.message, "Code:", data.error.code);
                if (this.onStatusChange) this.onStatusChange("err");

                // ✅ Smarter Rotation Logic
                const errorCode = data.error.code;
                const shouldRotate = errorCode === 403 || errorCode === 429;

                if (shouldRotate) {
                    if (this.rotateKey()) {
                        // Retry immediately with new key
                        this.loadChat();
                        return;
                    }
                } else {
                    console.warn(`⚠️ API Error ${errorCode}: Retrying without rotation...`);
                }

                // If critical error or no keys, wait 10s and retry (same key if not rotated, or next/same if rotated failed/skipped)
                this.timeoutId = setTimeout(() => this.loadChat(), 10000);
                return;
            }

            // Success
            if (this.onStatusChange) this.onStatusChange("ok");

            // Update Polling Interval from API
            if (data.pollingIntervalMillis) {
                this.pollingInterval = data.pollingIntervalMillis;
            }

            // Update Next Page Token
            if (data.nextPageToken) {
                this.nextPageToken = data.nextPageToken;
            }

            // Process Messages
            if (data.items && data.items.length > 0) {
                // ✅ Sort by timestamp to ensure order
                data.items.sort((a, b) => {
                    return new Date(a.snippet.publishedAt).getTime() - new Date(b.snippet.publishedAt).getTime();
                });

                data.items.forEach(item => {
                    // 3. Deduplication: Check Message ID
                    if (!this.seenIds.has(item.id)) {
                        this.seenIds.add(item.id);

                        // Keep Set size manageable
                        if (this.seenIds.size > 1000) {
                            const first = this.seenIds.values().next().value;
                            this.seenIds.delete(first);
                        }

                        // Send to callback
                        if (this.onMessage) this.onMessage(item);
                    }
                });
            }

        } catch (error) {
            console.error("Network error fetching chat:", error);
            if (this.onError) this.onError(error);
            if (this.onStatusChange) this.onStatusChange("err");
        }

        // Schedule next poll
        if (this.isPolling) {
            this.timeoutId = setTimeout(() => this.loadChat(), Math.max(this.pollingInterval, 1000));
        }
    }
}
