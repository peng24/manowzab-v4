import { logger } from "../utils/logger";
import { parseYouTubeEmotesToRuns, hasYouTubeEmotes } from "../data/youtubeEmotes";

export class YouTubeLiveChat {
  constructor(apiKeys, initialKeyIndex = 0) {
    this.apiKeys = Array.isArray(apiKeys) ? apiKeys : [apiKeys];
    const safeInitial = Number.isFinite(initialKeyIndex) && initialKeyIndex >= 0 ? initialKeyIndex : 0;
    this.currentKeyIndex = this.apiKeys.length > 0 ? safeInitial % this.apiKeys.length : 0;
    this.liveChatId = null;
    this.nextPageToken = null;
    this.pollingInterval = 5000;
    this.isPolling = false;
    this.pollGeneration = 0;
    this.seenIds = new Set();
    this.timeoutId = null;
    this.onMessage = null; // Callback function
    this.onError = null; // Callback for errors
    this.onStatusChange = null; // Callback for status updates ('ok' | 'err')
    this.onRecovery = null; // Callback when polling recovers after errors
    this.onKeyRotate = null; // ✅ Callback to sync key index externally

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

  /**
   * ✅ Rotate to next API key with wrap-around
   * Returns true if there's a different key to try, false if all keys exhausted in this cycle
   */
  rotateKey() {
    if (!this.apiKeys || this.apiKeys.length === 0) return false;
    const prevIndex = this.currentKeyIndex;
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
    logger.auth(`Rotating API Key: #${prevIndex + 1} → #${this.currentKeyIndex + 1} (of ${this.apiKeys.length})`);

    // ✅ Notify external listener to sync key index
    if (this.onKeyRotate) this.onKeyRotate(this.currentKeyIndex);

    // If we wrapped back to the starting point, all keys have been tried
    return this.currentKeyIndex !== prevIndex;
  }

  /**
   * 1. API Connection: Connect to YouTube API to get liveChatId
   */
  async fetchLiveChatId(videoId, _triedKeys = 0, expectedGen = null) {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${encodeURIComponent(videoId)}&key=${encodeURIComponent(this.apiKey)}`;

    const response = await fetch(url);
    const data = await response.json();

    if (expectedGen !== null && expectedGen !== this.pollGeneration) {
      return null;
    }

    if (data.error) {
      if (_triedKeys < this.apiKeys.length - 1 && this.rotateKey()) {
        return this.fetchLiveChatId(videoId, _triedKeys + 1, expectedGen);
      }
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

    if (expectedGen === null || expectedGen === this.pollGeneration) {
      this.liveChatId = details.activeLiveChatId;
    }
    return details.activeLiveChatId;
  }

  /**
   * 2. Fetching Loop: Poll messages from endpoint
   */
  async startPolling(videoId, callback) {
    if (this.isPolling) return;

    const gen = ++this.pollGeneration;
    this.nextPageToken = null;
    this.retryCount = 0;
    this.wasInErrorState = false;

    try {
      if (!this.liveChatId) {
        const fetchedChatId = await this.fetchLiveChatId(videoId, 0, gen);
        if (gen !== this.pollGeneration || !fetchedChatId) return;
        this.liveChatId = fetchedChatId;
      }
      if (gen !== this.pollGeneration) return;

      this.isPolling = true;
      this.onMessage = callback;
      this.loadChat(0, gen);
    } catch (error) {
      if (gen !== this.pollGeneration) return;
      logger.error("Failed to start polling:", error);
      if (this.onError) this.onError(error);
      if (this.onStatusChange) this.onStatusChange("err");
    }
  }

  stopPolling() {
    this.pollGeneration++;
    this.isPolling = false;
    this.liveChatId = null;
    this.nextPageToken = null;
    this.retryCount = 0;
    this.wasInErrorState = false;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  /**
   * Main Polling Loop (Renamed to loadChat as per requirements)
   */
  async loadChat(_rotationAttempts = 0, _gen = this.pollGeneration) {
    if (!this.isPolling || !this.liveChatId || _gen !== this.pollGeneration) return;

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
      if (!this.isPolling || _gen !== this.pollGeneration) return;

      if (data.error) {
        logger.error(
          "API Error during poll:",
          data.error.message,
          "Code:",
          data.error.code,
        );
        if (this.onStatusChange) this.onStatusChange("err");
        this.wasInErrorState = true;

        // ✅ Smarter Rotation Logic (with cycle limit)
        const errorCode = data.error.code;
        const shouldRotate = errorCode === 403 || errorCode === 429;

        if (shouldRotate && _rotationAttempts < this.apiKeys.length - 1) {
          this.rotateKey();
          // Retry immediately with new key
          this.loadChat(_rotationAttempts + 1, _gen);
          return;
        } else if (!shouldRotate) {
          logger.warn(
            `API Error ${errorCode}: Retrying without rotation...`,
          );
        }

        this.retryCount++;
        if (this.retryCount > this.maxRetries) {
          logger.error(
            `Max retries (${this.maxRetries}) exceeded. Polling stopped.`,
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
        logger.warn(
          `Retry ${this.retryCount}/${this.maxRetries} in ${(backoffDelay / 1000).toFixed(0)}s...`,
        );
        if (this.isPolling && _gen === this.pollGeneration) {
          this.timeoutId = setTimeout(() => this.loadChat(0, _gen), backoffDelay);
        }
        return;
      }

      // ✅ Success — reset retry count and notify recovery
      if (this.retryCount > 0 || this.wasInErrorState) {
        logger.success(`Polling recovered after ${this.retryCount} retries`);
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

        const newItems = [];
        for (const item of data.items) {
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

            newItems.push(item);
          }
        }

        // ✅ Enqueue all new messages into useChatProcessor's micro-batch queue in the same tick
        // useChatProcessor sorts the batch by publishedAt + arrival sequence and processes them strictly sequentially,
        // eliminating the 80ms * N per-message artificial stall!
        if (this.onMessage && newItems.length > 0) {
          const results = await Promise.allSettled(
            newItems.map((item) => Promise.resolve(this.onMessage(item))),
          );
          for (const res of results) {
            if (res.status === "rejected") {
              logger.error("Message processing error:", res.reason);
            }
          }
        }
      }
    } catch (error) {
      logger.error("Network error fetching chat:", error);
      if (this.onError) this.onError(error);
      if (this.onStatusChange) this.onStatusChange("err");
      this.wasInErrorState = true;

      // ✅ Exponential backoff on network errors too
      this.retryCount++;
      if (this.retryCount > this.maxRetries) {
        logger.error(
          `Max retries (${this.maxRetries}) exceeded. Stopping polling.`,
        );
        this.stopPolling();
        return;
      }

      const backoffDelay = Math.min(
        this.baseRetryDelay * Math.pow(2, this.retryCount - 1),
        this.maxRetryDelay,
      );
      if (this.isPolling && _gen === this.pollGeneration) {
        this.timeoutId = setTimeout(() => this.loadChat(0, _gen), backoffDelay);
      }
      return;
    }

    // Schedule next poll
    if (this.isPolling && _gen === this.pollGeneration) {
      this.timeoutId = setTimeout(
        () => this.loadChat(0, _gen),
        Math.max(this.pollingInterval, 1000),
      );
    }
  }
}

/**
 * Extract and normalize message content into a runs array for emoji support.
 * Exported as standalone helper so any consumer (ChatProcessor, etc.) can use it.
 *
 * @param {Object} item - YouTube API liveChatMessage item
 * @returns {Array<{text?: string, emoji?: {emojiId: string, image: Object}}>}
 */
export function extractMessageRuns(item) {
  // Check if textMessageDetails exists with message runs
  if (item.snippet?.textMessageDetails?.messageText) {
    const messageText = item.snippet.textMessageDetails.messageText;

    // Case A: Simple string → parse YouTube emotes if present, otherwise single text run
    if (typeof messageText === 'string') {
      return parseYouTubeEmotesToRuns(messageText);
    }

    // Case B: Array of runs (text + emojis)
    if (Array.isArray(messageText)) {
      return messageText.flatMap(run => {
        if (run.text) {
          if (hasYouTubeEmotes(run.text)) {
            return parseYouTubeEmotesToRuns(run.text);
          }
          return [{ text: run.text }];
        } else if (run.emoji) {
          return [{
            emoji: {
              emojiId: run.emoji.emojiId,
              image: run.emoji.image
            }
          }];
        }
        return [{ text: '' }];
      });
    }
  }

  // Super Sticker Support
  if (item.snippet?.superStickerDetails) {
    const altText = item.snippet.superStickerDetails.superStickerMetadata?.altText || 'ส่งสติกเกอร์';
    return [{ text: altText }];
  }

  // Super Chat / Milestone Chat Support
  if (item.snippet?.superChatDetails?.userComment) {
    return [{ text: item.snippet.superChatDetails.userComment }];
  }
  if (item.snippet?.memberMilestoneChatDetails?.userComment) {
    return [{ text: item.snippet.memberMilestoneChatDetails.userComment }];
  }

  // Fallback to displayMessage
  return [{ text: item.snippet?.displayMessage || '' }];
}
