# 🛡️ Manowzab Command Center Engineering Invariants & Safety Protocols

This guide documents the critical invariants that protect the live commerce system against race conditions, audio corruption, memory leaks, and billing/stock discrepancies.

---

## 1. Inventory & Booking Queues

1. **Atomic Stock Allocation**:
   All operations in `src/stores/stock.js` (`processOrder`, `processCancel`) MUST use `runTransaction` on `stock/${videoId}/items/${num}`.
   ```javascript
   await runTransaction(itemRef, (currentData) => {
     if (!currentData) {
       return { owner, uid, bookedAt: Date.now(), queue: [] };
     }
     if (!currentData.owner) {
       currentData.owner = owner;
       currentData.uid = uid;
       return currentData;
     }
     // Already claimed: push to queue
     currentData.queue = currentData.queue || [];
     currentData.queue.push({ name: owner, uid, timestamp: Date.now() });
     return currentData;
   });
   ```

2. **Price Preservation on Clear**:
   When clearing owner details via `saveQueueChanges()` in `StockGrid.vue`, if a price or size was already configured for the item, preserve `price` and `size` while setting `owner = null` and `queue = []`.

3. **Stock Grid Auto-Expansion**:
   If an incoming order exceeds the current grid size, `updateStockSize(num)` must be automatically called to expand the grid without blocking the order.

---

## 2. Audio & Speech Sequencing

1. **Single-Threaded Audio Pipeline**:
   SFX and TTS must never overlap or interrupt each other. `queueAudio` must strictly resolve the previous sound effect before calling `ttsService.speak()`.

2. **AudioContext Recovery**:
   Browsers (especially iOS WebKit / iPadOS Safari) suspend `AudioContext` after idle periods.
   - `useAudio.js` must capture the first user interaction (`click`, `touchstart`, `keydown`) to resume `audioCtx`.
   - `TextToSpeech.js` must call `ensureAudioContextReady()` before every speech attempt.

3. **Multi-Tier Zero-Stall Fallback**:
   - Primary: Google Cloud Standard TTS (`th-TH-Standard-A`).
   - Fallback: Native Browser `SpeechSynthesis` (`🤖`).
   - On network error, API quota exhaustion, or 3-second timeout, the engine must immediately fall back to Native TTS without leaving unhandled promises in the queue.

4. **Sanitization & Double-Speaking Guard**:
   - `sanitize(text)` replaces emojis and punctuation.
   - If a message had characters but sanitized to empty (e.g. pure sticker/emoji), pronounce `"ส่งสติกเกอร์"`.
   - Avoid reading proxy admin names: when an admin orders for a customer (`26 พี่อ้อย`), announce only the customer's name (`"พี่อ้อย เบอร์ 26"`).

---

## 3. Shipping & Thermal Label Printing

1. **Phone Number Regex Boundary**:
   Strict regex `/(?:0[689]\d{8}|0[2-57]\d{7})/` must be used. It must NOT extract characters across newlines and must NOT accidentally prepend a trailing `'0'` from a 5-digit postal code to the phone number.

2. **Postal Code Fractional Number Protection**:
   Do not mistake fractional house numbers (`10123/45`) for 5-digit postal codes.

3. **Isolated Thermal Print Engine**:
   `ShippingLabelModal.vue` must render the printable HTML into a dynamically created, hidden `<iframe>` and invoke `contentWindow.print()`. Never trigger global `window.print()` which corrupts the main dashboard UI.

---

## 4. UI Stability & Memory Management

1. **SweetAlert2 Mixin Invariant**:
   Toasts must not be configured with `allowOutsideClick` or `showCloseButton`.
   The global wrapper in `main.js`, `shipping-main.js`, and `history-main.js` must check `this.defaultParams?.toast` in addition to `opts.toast`.

2. **XSS Protection**:
   Never pass raw search queries or user input directly into `v-html`. Use `escapeHtml(str)` before any HTML highlight transformations.
