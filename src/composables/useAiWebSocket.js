import { ref, onUnmounted, getCurrentInstance } from "vue";
import { useStockStore } from "../stores/stock";

/**
 * Composable for handling real-time WebSocket connection to Local AI Agent.
 * Listens for JSON price updates: { "item": number, "price": number }
 *
 * @param {Object} [options]
 * @param {string} [options.url="ws://localhost:8765"] - WebSocket server URL
 * @param {number} [options.reconnectInterval=4000] - Reconnect interval in ms
 * @param {boolean} [options.autoStart=true] - Connect automatically on setup
 */
export function useAiWebSocket(options = {}) {
  const url = options.url || "ws://localhost:8765";
  const reconnectInterval = options.reconnectInterval || 4000;
  const autoStart = options.autoStart !== false;

  const isConnected = ref(false);
  const status = ref("disconnected"); // 'connecting' | 'connected' | 'disconnected' | 'error'

  let socket = null;
  let reconnectTimer = null;
  let isIntentionallyClosed = false;

  const stockStore = useStockStore();

  /**
   * Initializes WebSocket connection to the AI server.
   */
  function connect() {
    // Prevent duplicate connections
    if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)) {
      return;
    }

    isIntentionallyClosed = false;
    status.value = "connecting";
    console.log(`🤖 [AI Local Agent] Connecting to ${url}...`);

    try {
      socket = new WebSocket(url);

      socket.onopen = () => {
        isConnected.value = true;
        status.value = "connected";
        console.log(`🤖 [AI Local Agent] ✅ Connected to WebSocket (${url})`);
        clearReconnectTimer();
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          console.log("🤖 [AI Local Agent] 📩 Message received:", payload);

          if (payload && payload.item !== undefined && payload.price !== undefined) {
            const itemNum = parseInt(payload.item, 10);
            const priceVal = parseInt(payload.price, 10);

            if (!isNaN(itemNum) && itemNum > 0 && !isNaN(priceVal) && priceVal >= 0) {
              stockStore.updateStockPrice(itemNum, priceVal, true);
              console.log(
                `🤖 [AI Local Agent] 🏷️ Price updated for Item #${itemNum} -> ${priceVal} ฿`
              );
            } else {
              console.warn(
                "🤖 [AI Local Agent] ⚠️ Invalid item number or price in payload:",
                payload
              );
            }
          }
        } catch (parseError) {
          console.warn("🤖 [AI Local Agent] ⚠️ Non-JSON or malformed payload received:", event.data);
        }
      };

      socket.onerror = (err) => {
        status.value = "error";
        // Soft log to prevent console spam when server is offline
        console.warn("🤖 [AI Local Agent] ⚠️ WebSocket error (Server may be offline).");
      };

      socket.onclose = (event) => {
        isConnected.value = false;
        status.value = "disconnected";
        socket = null;

        if (!isIntentionallyClosed) {
          console.log(`🤖 [AI Local Agent] 🔌 Disconnected. Will retry in ${reconnectInterval / 1000}s...`);
          scheduleReconnect();
        } else {
          console.log("🤖 [AI Local Agent] 🔌 Disconnected cleanly.");
        }
      };
    } catch (err) {
      status.value = "error";
      console.warn("🤖 [AI Local Agent] ❌ Failed to initiate WebSocket connection:", err.message);
      if (!isIntentionallyClosed) {
        scheduleReconnect();
      }
    }
  }

  /**
   * Cleanly closes the WebSocket connection and stops auto-reconnect.
   */
  function disconnect() {
    isIntentionallyClosed = true;
    clearReconnectTimer();

    if (socket) {
      socket.close();
      socket = null;
    }
    isConnected.value = false;
    status.value = "disconnected";
  }

  /**
   * Schedules a reconnection attempt.
   */
  function scheduleReconnect() {
    clearReconnectTimer();
    reconnectTimer = setTimeout(() => {
      if (!isIntentionallyClosed) {
        connect();
      }
    }, reconnectInterval);
  }

  /**
   * Clears active reconnection timer.
   */
  function clearReconnectTimer() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  }

  if (autoStart) {
    connect();
  }

  if (getCurrentInstance()) {
    onUnmounted(() => {
      disconnect();
    });
  }

  return {
    isConnected,
    status,
    connect,
    disconnect,
  };
}
