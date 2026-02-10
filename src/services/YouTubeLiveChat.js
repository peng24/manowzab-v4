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
    this.onError = null; // Callback for errors
    this.onStatusChange = null; // Callback for status updates ('ok' | 'err')
    this.onRecovery = null; // Callback when polling recovers after errors

    // ✅ Exponential backoff state
    this.retryCount = 0;
    this.maxRetries = 10; // Stop retrying after 10 consecutive failures
    this.baseRetryDelay = 10000; // 10 seconds base
    this.maxRetryDelay = 120000; // 2 minutes cap
    this.wasInErrorState = false; // Track error-to-recovery transitions
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
        throw new Error(
          "No active live chat found (Stream might be offline or chat disabled)",
        );
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

    const url = new URL(
      "https://www.googleapis.com/youtube/v3/liveChat/messages",
    );
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
        console.error(
          "API Error during poll:",
          data.error.message,
          "Code:",
          data.error.code,
        );
        if (this.onStatusChange) this.onStatusChange("err");
        this.wasInErrorState = true;

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
          console.warn(
            `⚠️ API Error ${errorCode}: Retrying without rotation...`,
          );
        }

        // ✅ Exponential backoff with retry limit
        this.retryCount++;
        if (this.retryCount > this.maxRetries) {
          console.error(
            `❌ Max retries (${this.maxRetries}) exceeded. Stopping polling.`,
          );
          if (this.onError)
            this.onError(
              new Error(
                `Polling stopped: ${this.maxRetries} consecutive failures`,
              ),
            );
          this.stopPolling();
          return;
        }

        const backoffDelay = Math.min(
          this.baseRetryDelay * Math.pow(2, this.retryCount - 1),
          this.maxRetryDelay,
        );
        console.warn(
          `⏳ Retry ${this.retryCount}/${this.maxRetries} in ${(backoffDelay / 1000).toFixed(0)}s...`,
        );
        this.timeoutId = setTimeout(() => this.loadChat(), backoffDelay);
        return;
      }

      // ✅ Success — reset retry count and notify recovery
      if (this.retryCount > 0 || this.wasInErrorState) {
        console.log(`✅ Polling recovered after ${this.retryCount} retries`);
        if (this.onRecovery) this.onRecovery(this.retryCount);
      }
      this.retryCount = 0;
      this.wasInErrorState = false;

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
          return (
            new Date(a.snippet.publishedAt).getTime() -
            new Date(b.snippet.publishedAt).getTime()
          );
        });

        data.items.forEach((item) => {
          // 3. Deduplication: Check Message ID
          if (!this.seenIds.has(item.id)) {
            this.seenIds.add(item.id);

            // ✅ Batch cleanup: remove oldest 200 when exceeding 1000
            if (this.seenIds.size > 1000) {
              const iterator = this.seenIds.values();
              for (let i = 0; i < 200; i++) {
                const oldest = iterator.next().value;
                this.seenIds.delete(oldest);
              }
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
      this.wasInErrorState = true;

      // ✅ Exponential backoff on network errors too
      this.retryCount++;
      if (this.retryCount > this.maxRetries) {
        console.error(
          `❌ Max retries (${this.maxRetries}) exceeded. Stopping polling.`,
        );
        this.stopPolling();
        return;
      }

      const backoffDelay = Math.min(
        this.baseRetryDelay * Math.pow(2, this.retryCount - 1),
        this.maxRetryDelay,
      );
      this.timeoutId = setTimeout(() => this.loadChat(), backoffDelay);
      return;
    }

    // Schedule next poll
    if (this.isPolling) {
      this.timeoutId = setTimeout(
        () => this.loadChat(),
        Math.max(this.pollingInterval, 1000),
      );
    }
  }
}
