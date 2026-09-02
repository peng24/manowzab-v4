---
description: Mandatory verification checklist after every code change
---

# ✅ Post-Edit Verification Checklist

> **ต้องตรวจสอบทุกครั้งหลังแก้ไขโค้ด** — หากข้อใดเสียหาย ต้องแก้ไขก่อน commit

---

## 🔌 1. การเชื่อมต่อ YouTube Live

| # | ฟังก์ชัน | ไฟล์ | ต้องทำงานได้ |
|---|---|---|---|
| 1.1 | `connectVideo(videoId)` | `src/composables/useYouTube.js` | เชื่อมต่อ YouTube Video + เริ่ม polling แชท + นับผู้ชม |
| 1.2 | `disconnect()` | `src/composables/useYouTube.js` | ตัดการเชื่อมต่อ หยุด polling ทั้งหมด |
| 1.3 | `smartFetch(url)` | `src/composables/useYouTube.js` | Round-Robin API Key — key หมดโควตาต้องหมุนไป key ถัดไปอัตโนมัติ |
| 1.4 | `updateViewerCount(videoId)` | `src/composables/useYouTube.js` | อัปเดตจำนวนผู้ชมสด + ตรวจจับว่าไลฟ์จบหรือยัง |

---

## 💬 2. ระบบประมวลผลแชท

| # | ฟังก์ชัน | ไฟล์ | ต้องทำงานได้ |
|---|---|---|---|
| 2.1 | `processMessage(item)` | `src/composables/useChatProcessor.js` | วิเคราะห์แชทแล้วจัดประเภท: ซื้อ/ยกเลิก/ถามคำถาม/แจ้งส่ง/แชททั่วไป |
| 2.2 | Regex Patterns (ทั้ง 9 แบบ) | `src/composables/useChatProcessor.js` | รองรับ: Multi-Buy, Pure Number, Explicit, Polite, Dash, Customer Name, Admin Proxy, Cancel, Implicit |
| 2.3 | `thaiToArabic(text)` | `src/composables/useChatProcessor.js` | แปลงเลขไทย → อารบิก (เช่น "๕๖" → "56") |
| 2.4 | Admin Proxy | `src/composables/useChatProcessor.js` | แอดมินจองให้ลูกค้าได้ ทั้ง "26 พี่อ้อย" และ "พี่อ้อย 26" |

---

## 🛒 3. ระบบจัดการสต็อก

| # | ฟังก์ชัน | ไฟล์ | ต้องทำงานได้ |
|---|---|---|---|
| 3.1 | `processOrder(num, owner, uid, source, price, method)` | `src/stores/stock.js` | ตัดสต็อก + Firebase Transaction ป้องกันชน + จองซ้ำ=เข้าคิว |
| 3.2 | `processCancel(num)` | `src/stores/stock.js` | ยกเลิก + เลื่อนคนถัดไปในคิวขึ้นมาเป็นเจ้าของ |
| 3.3 | `connectToStock(videoId)` | `src/stores/stock.js` | sync สต็อก real-time + คำนวณยอดขาย + trigger เฉลิมฉลอง 50%/80%/100% |
| 3.4 | `clearAllStock()` | `src/stores/stock.js` | ล้างสต็อกทั้งหมด + reset milestones |
| 3.5 | `updateStockSize(newSize)` | `src/stores/stock.js` | ขยาย/ย่อ grid + auto-expand เมื่อจองเกินจำนวน |
| 3.6 | `updateItemData(num, newData)` | `src/stores/stock.js` | อัปเดตราคา/ไซส์ + sync Overlay |
| 3.7 | `saveQueueChanges()` | `src/components/StockGrid.vue` | เวลายกเลิกจอง (ลบรายชื่อทิ้งทั้งหมด) หากมีการตั้งราคาไว้ ต้องเคลียร์ข้อมูลเจ้าของ/คิวเป็น null แต่ยังคงราคาไว้ (แก้บั๊กชื่อค้าง) |
| 3.8 | Throttled History Sync | `src/stores/stock.js` | การบันทึกสถิติลง `history/${videoId}` ต้องใช้ Throttle (5s debounce) ป้องกันการยิง Firebase ถี่เกินไป |

---

## 🔊 4. ระบบเสียง TTS & SFX

| # | ฟังก์ชัน | ไฟล์ | ต้องทำงานได้ |
|---|---|---|---|
| 4.1 | `queueAudio(sfxType, author, message)` | `src/composables/useAudio.js` | SFX + TTS เข้าคิวเรียงลำดับ ไม่ทับกัน |
| 4.2 | `playSfx(type)` | `src/composables/useAudio.js` | เล่น success/error/cancel ด้วย Web Audio API |
| 4.3 | `resetVoice()` | `src/composables/useAudio.js` | หยุดเสียงทั้งหมดทันที ล้างคิว |
| 4.4 | `unlockAudio()` | `src/composables/useAudio.js` | ปลดล็อกเสียงบน iOS/iPad |
| 4.5 | `ttsService.speak(author, message)` | `src/services/TextToSpeech.js` | อ่านข้อความด้วย Google Cloud TTS / fallback Native TTS |
| 4.6 | TTS ต้องอ่านทุกข้อความ | `src/composables/useChatProcessor.js` | ต้องมี `queueAudio()` ก่อน early return ทุกจุดใน buy logic |
| 4.7 | Cross-Device Audio Playback | `src/stores/chat.js`, `src/composables/useChatProcessor.js` | ห้ามเรียก `queueAudio()` ตรงๆ ใน `useChatProcessor.js` (ยกเว้นเสียงต้อนรับ) เสียงทั้งหมดต้องถูกทริกเกอร์ผ่าน Firebase sync listener ใน chat store และเล่นเฉพาะแชทใหม่ (`timestamp >= syncStartTime - 5000` และ `isNew`) |
| 4.8 | Emoji and Run Fallback | `src/composables/useChatProcessor.js` | อ่านสติกเกอร์เป็น "ส่งสติกเกอร์" เมื่อ sanitizes เป็นค่าว่าง, fallback ไป `messageRuns` เมื่อ `displayMessage` ว่าง |
| 4.9 | เว้นวรรคหน่วงเวลาในคิวเสียง (`delayAfter`) | `src/composables/useAudio.js` | คิวเสียง `queueAudio` รองรับ `options.delayAfter` (เช่น 800ms) เพื่อเว้นจังหวะอ่านชื่อลูกค้าแต่ละคนให้ชัดเจน ไม่รัวติดกัน |
| 4.10 | ออกเสียงชื่อลูกค้าจริงเมื่อแอดมินจองแทน (Admin Proxy TTS) | `src/composables/useChatProcessor.js` | เมื่อแอดมินพิมพ์จองให้ลูกค้า เสียง TTS จะอ่านเป็นชื่อลูกค้าเท่านั้น ไม่นำชื่อแอดมินมาอ่าน |
| 4.11 | Microsoft Edge TTS Proxy (`th-TH-PremwadeeNeural`) | `src/services/TextToSpeech.js`, `scripts/cloudflare-edge-tts-worker.js` | สังเคราะห์เสียงเปรมวดี (`th-TH-PremwadeeNeural`) ผ่าน Cloudflare Worker proxy พร้อมคำนวณ `Sec-MS-GEC` token และตัด metadata binary header length (uint16 big-endian) ออกเพื่อสตรีม MP3 สมบูรณ์ |
| 4.12 | TTS 4-State Toggle Switcher | `src/components/Header.vue`, `src/stores/system.js` | ปุ่มสลับเสียงรองรับ 4 โหมดวนลูป (`P` เปรมวดี ➡️ `N` Google Neural2 ➡️ `S` Google Standard ➡️ `🤖` Native TTS) พร้อมจำค่าลง `localStorage` |
| 4.13 | Multi-Tier TTS Fallback System | `src/services/TextToSpeech.js` | หากโหมด `P` ขัดข้องหรือไม่สามารถเชื่อมต่อได้ ระบบต้อง Fallback อัตโนมัติไปยัง Google Neural2 ➡️ Google Standard ➡️ Native TTS โดยคิวเสียงไม่ค้างและไม่สะดุด |


---

## 💾 5. ระบบแชท & Sync ข้ามอุปกรณ์

| # | ฟังก์ชัน | ไฟล์ | ต้องทำงานได้ |
|---|---|---|---|
| 5.1 | `syncFromFirebase(videoId)` | `src/stores/chat.js` | sync แชท real-time ข้ามอุปกรณ์ (ใช้ Firebase v9 Direct Unsubscribe Cleanup) |
| 5.2 | `sendMessageToFirebase(videoId, data)` | `src/stores/chat.js` | ส่งข้อความเก็บ Firebase |
| 5.3 | `addMessage(message)` | `src/stores/chat.js` | เพิ่มข้อความ UI + deduplication + UI Message Trimming (`MAX_MESSAGES=500`, `MAX_SEEN_IDS=2000`) ป้องกัน Memory Leak |
| 5.4 | `downloadChatCSV(videoId)` | `src/stores/chat.js` | ดาวน์โหลดแชทเป็น CSV (ต้องไม่ถูกกระทบจาก UI trimming) |
| 5.5 | `clearChat()` | `src/stores/chat.js` | ล้างแชท UI ทั้งหมด |

---

## 📜 6. ระบบประวัติ

| # | ฟังก์ชัน | ไฟล์ | ต้องทำงานได้ |
|---|---|---|---|
| 6.1 | `fetchHistoryList()` | `src/composables/useHistory.js` | ดึงรายการไลฟ์ทั้งหมด (เรียงจากล่าสุด) |
| 6.2 | `fetchHistoryDetails(videoId)` | `src/composables/useHistory.js` | ดึงรายละเอียดออเดอร์ |
| 6.3 | `updateHistoryItem(videoId, itemId, data)` | `src/composables/useHistory.js` | แก้ไข/ล้างสินค้าในประวัติ |
| 6.4 | `deleteHistory(videoId)` | `src/composables/useHistory.js` | ลบประวัติไลฟ์ (history + chats) |
| 6.5 | `recalculateAllHistory()` | `src/composables/useHistory.js` | คำนวณยอดขายใหม่ทั้งหมด |

---

## 🌙 7. ระบบ Away Mode

| # | ฟังก์ชัน | ไฟล์ | ต้องทำงานได้ |
|---|---|---|---|
| 7.1 | `initAwayListener()` | `src/composables/useAwayMode.js` | sync สถานะพักข้ามอุปกรณ์ + อ่านข้อความประกาศ (แชร์ `awayTimer` และ `awayInterval` ที่ Module Scope) |
| 7.2 | `closeAwayMode()` | `src/composables/useAwayMode.js` | ปิดโหมดพัก |

---

## 🧹 8. ระบบทำความสะอาดอัตโนมัติ

| # | ฟังก์ชัน | ไฟล์ | ต้องทำงานได้ |
|---|---|---|---|
| 8.1 | `initAutoCleanup()` | `src/composables/useAutoCleanup.js` | ลบแชทเก่าอัตโนมัติ (เฉพาะ Admin) |

---

## 🎆 9. ระบบเฉลิมฉลอง & UI

| # | ฟังก์ชัน | ไฟล์ | ต้องทำงานได้ |
|---|---|---|---|
| 9.1 | `triggerCelebration(percentage)` | `src/utils/celebration.js` | เอฟเฟกต์ดอกไม้ไฟ 50%/80%/100% |
| 9.2 | Animated Sales % | `src/components/StockGrid.vue` | แสดง % ยอดขาย real-time + animated counting + progress bar |

---

## 📦 10. ระบบจัดการจัดส่ง (Shipping Manager)

| # | ฟังก์ชัน | ไฟล์ | ต้องทำงานได้ |
|---|---|---|---|
| 10.1 | Firebase CRUD (`delivery_customers/{uid}`) | `src/components/ShippingManager.vue` | เพิ่ม/แก้ไข/ลบลูกค้า + real-time listener |
| 10.2 | `addToShipping()` + Auto-Sync | `src/components/Dashboard.vue` | เพิ่มลงคิวส่ง + auto-create delivery_customers + session breakdown |
| 10.3 | `syncAllToDelivery()` | `src/components/Dashboard.vue` | Sync ลูกค้าทั้ง shipping list ไป delivery_customers ทีเดียว |
| 10.4 | `recalcItemCount(uid)` | `src/components/Dashboard.vue` | คำนวณ itemCount ใหม่จาก sessions ทั้งหมด |
| 10.5 | Real-time Stock Watcher | `src/components/ShippingManager.vue` | watch stockData → auto-update จำนวนสินค้าใน delivery_customers |
| 10.6 | Delivery Strip (Header) | `src/components/Header.vue` | แถบรายชื่อลูกค้า real-time บน header (pills สี overdue/today/soon/later) |
| 10.7 | Countdown + Thai Date | `src/components/ShippingManager.vue` | นับถอยหลัง (เลย/วันนี้/พรุ่งนี้/อีก X วัน) + วันที่ไทย (24 มี.ค. 69) |
| 10.8 | Mark Done + Reset | `src/components/ShippingManager.vue` | เสร็จ → status=done, itemCount=0, sessions=null + สะสม totalBookings |
| 10.9 | กรองเฉพาะคนที่แจ้งส่ง (Requested Delivery Filter) | `src/components/ShippingManager.vue`, `src/pages/ShippingPage.vue` | แสดงเฉพาะคนที่ระบุวันจัดส่งแล้วเป็นค่าเริ่มต้น (`deliveryDate !== null`) |
| 10.10 | แท็บสลับดู "ฝากสินค้า" (Unassigned Filter) | `src/components/ShippingManager.vue`, `src/pages/ShippingPage.vue` | สลับดูคนที่ฝากสินค้า (ยังไม่ระบุวันส่ง) และดูทั้งหมดได้อย่างถูกต้อง |
| 10.11 | Delivery Strip Filter | `src/components/StockGrid.vue` | กรองแสดงเฉพาะลูกค้าที่มีวันจัดส่งแล้ว (`!!c.deliveryDate`) |
| 10.12 | ตรวจจับแชทแจ้งส่ง ("ส่ง", "ส่งเลย", ฯลฯ) | `src/composables/useChatProcessor.js` | เมื่อลูกค้าพิมพ์ "ส่ง", "ส่งเลย", "ส่งครับ", "ส่งค่ะ" ฯลฯ ให้ตั้งวันส่งเป็นวันนี้อัตโนมัติ |
| 10.13 | ระบบอ่านรายชื่อจัดส่งเมื่อไลฟ์จบ (`announceShippingCustomers`, `getShippingRequestedCustomers`) | `src/utils/deliverySync.js`, `src/composables/useYouTube.js`, `src/components/Header.vue` | อ่านเฉพาะรายชื่อลูกค้าที่บันทึกใน `delivery_customers` ที่มีวันจัดส่ง (`deliveryDate`) และสถานะยังไม่เสร็จ (`status !== 'done'`) ตรงกับตารางหน้าจอ "เฉพาะคนที่แจ้งส่ง" 100% พร้อมเรียงลำดับตามวันส่ง และตัดชื่อแอดมินออก |
| 10.14 | ปุ่มอ่านรายชื่อจัดส่ง TTS ซ้ำใน Live Summary Modal | `src/components/LiveSummaryModal.vue` | มีปุ่ม `🔊 อ่านรายชื่อจัดส่ง (TTS)` ในหน้าต่างสรุปผลการขาย ให้กดฟังรายชื่อลูกค้าที่ต้องส่งซ้ำได้ตลอดเวลา |

---

## 🛒 11. ระบบนับจำนวนจอง (Booking Count Tracker)

| # | ฟังก์ชัน | ไฟล์ | ต้องทำงานได้ |
|---|---|---|---|
| 11.1 | `bookingCount` ใน `shippingList` computed | `src/components/Dashboard.vue` | ดึง `order.items.length` จาก `customerOrders` (real-time จาก stockData) แสดงจำนวนจอง |
| 11.2 | Badge 🛒 หลังชื่อลูกค้า | `src/components/Dashboard.vue` | แสดง badge สีม่วง `🛒X` หลังชื่อในตาราง Dashboard เมื่อ bookingCount > 0 |
| 11.3 | Real-time Update | `src/components/Dashboard.vue` | จองเพิ่ม → ตัวเลข badge เพิ่มทันที, ยกเลิก → ลดทันที (ใช้ stockData ที่ sync อยู่แล้ว ไม่ต้องเพิ่ม listener) |
| 11.4 | `totalBookings` สะสมใน `markDone()` | `src/components/ShippingManager.vue` | เมื่อกด ✅ เสร็จ → `runTransaction` บวก itemCount เข้า totalBookings ก่อน reset เป็น 0 |
| 11.5 | แสดง "ลูกค้าประจำ" | `src/components/ShippingManager.vue` | แสดงข้อความ "ลูกค้าประจำ • เคยสั่งรวม X ชิ้น" ใต้ชื่อลูกค้าเมื่อ totalBookings > 0 |
| 11.6 | Owner Count Badge `👗 N ตัว` | `src/components/StockGrid.vue` | แสดง 👗 N ตัว สีฟ้าหลังชื่อ owner ในตาราง StockGrid เมื่อมียอดจองสะสม >= 1 ชิ้น |
| 11.7 | ยอดจองสะสมรวมทุกวัน (Badge Count Sync) | `src/components/StockGrid.vue` | `getOwnerCount()` ต้องรวมยอดจองวันนี้ (local) + อดีตที่ค้างส่ง (database) เสมอ |
| 11.8 | แสดงรายละเอียดจองสะสมย้อนหลังและลบข้ามเซสชั่น | `src/components/StockGrid.vue` | `showOwnerItems()` ดึงรายการของวันนี้ + อดีตที่ยังไม่จัดส่ง (แสดงแค่วันที่สั้นๆ เช่น "26 พ.ค. 69") และลบออกจากอดีตพร้อมปรับลด itemCount/totalPrice ได้ถูกต้อง |
| 11.9 | Normalized Name Grouping (`normalizeCustomerName`) | `src/utils/deliverySync.js`, `src/components/StockGrid.vue` | จับคู่และสะสมยอดจองตามชื่อที่ normalize แล้ว ทำให้จองเองและแอดมินจองแทน (`proxy-uid`) รวมยอดจองสะสมตรงกัน 100% |
| 11.10 | Exclude Shipped Sessions (`status === "done"`) | `src/utils/deliverySync.js`, `src/components/StockGrid.vue`, `src/components/Dashboard.vue` | เมื่อกดส่งสินค้าเสร็จ (`status = "done"`) ยอดจองสะสมจากอดีตต้องถูกยกเว้น และรีเซ็ตยอดของลูกค้ารายนั้นเป็น 0 |
| 11.11 | Real-time Modal/Stock Edit Auto-Sync | `src/stores/stock.js` | การแก้ไข/ล้างข้อมูลสต็อกผ่าน Modal (`updateItemData`, `clearAllStock`) ต้อง Auto-sync ไปยัง `delivery_customers` ทันที |

---

## 🔔 12. ข้อกำหนดการเตือนและการจับ Error (SweetAlert2 & Error Invariants)

| # | ฟังก์ชัน | ไฟล์ | ต้องทำงานได้ |
|---|---|---|---|
| 12.1 | Toast Configurations | `main.js`, `shipping-main.js`, `history-main.js` | Toast จาก `Swal.mixin` ต้องไม่มีการใส่ popup config (`allowOutsideClick` / `showCloseButton`) และ global wrapper ต้องเช็ค `this.defaultParams?.toast` ควบคู่ `opts.toast` เพื่อแยกแยะว่าเป็น toast |
| 12.2 | Multi-Entry Error Handlers | `main.js`, `shipping-main.js`, `history-main.js` | ทุก entry point ต้องลงทะเบียน `app.config.errorHandler = globalErrorHandler` และรับฟัง `unhandledrejection` |

---

## ⚡ 13. ประสิทธิภาพและการทดสอบ (Performance & Optimization Verification)

| # | ฟังก์ชัน | ไฟล์ | ต้องทำงานได้ |
|---|---|---|---|
| 13.1 | Batched History Recalculation | `src/components/HistoryModal.vue` | `updateDeliveryAndHistoryTotals` ต้องใช้ Batched Multi-Path Update (`update(dbRef(db), multiPathUpdates)`) ห้ามวนลูปยิง N+1 Queries |
| 13.2 | Delivery Customer TTL Cache | `src/utils/deliverySync.js` | `resolveDeliveryUid` ต้องใช้ In-Memory Cache (TTL: 3s) เพื่อลดการยิงเครือข่ายดึงข้อมูลทั้งฐานข้อมูลเมื่อมีคำสั่งจองรัวๆ |
| 13.3 | Fast Instant Chat Scroll | `src/components/ChatPanel.vue` | สกรอลล์แชทสดต้องใช้ `requestAnimationFrame` (`scrollTop = scrollHeight`) ห้ามสั่ง Smooth Scroll ซ้ำซ้อน เพื่อคงความเร็ว 100 FPS |
| 13.4 | O(1) Stock Queue Map | `src/components/StockGrid.vue` | การเรนเดอร์ Stock Grid ต้องใช้ `queueLengthsMap` (computed) ห้ามเรียกฟังก์ชันสืบค้นคิวซ้ำในทุกลูป Template |
| 13.5 | Fast Thai-to-Arabic Conversion | `src/utils/chatParserUtils.js` | `thaiToArabic` ต้องใช้ Static Lookup Map `THAI_TO_ARABIC_MAP` เพื่อความเร็วสูงสุดในการสืบค้นแบบ $O(1)$ |
| 13.6 | Execution Time Tracking | `src/utils/logger.js` | `logger.time` และ `logger.timeAsync` ต้องสามารถวัดและแสดงเวลาการทำงานเป็นมิลลิวินาที (ms) ได้ถูกต้อง |
| 13.7 | Benchmark Test Suite | `src/__tests__/benchmark.test.js` | ชุดทดสอบ Benchmark ops/sec ต้องรันและผ่านผ่านคำสั่ง `npm test` |
| 13.8 | Throttled History DB Writes | `src/stores/stock.js` | การเขียนสถิติประวัติ ต้องใช้ Throttling 5 วินาที ลดภาระการเขียน Firebase Database ในช่วงพีค |

---

## 🛡️ 14. ความปลอดภัยและความคงทนของระบบ (Security & Crash Prevention Invariants)

| # | ฟังก์ชัน | ไฟล์ | ต้องทำงานได้ |
|---|---|---|---|
| 14.1 | XSS HTML Escaping | `src/utils/dbUtils.js`, `StockGrid.vue`, `HistoryModal.vue`, `ChangelogModal.vue` | ฟังก์ชันไฮไลท์คำค้นหา (`highlightMatch`, `highlightSearch`) และ SweetAlert Modal HTML templates ต้องใช้ `escapeHtml` ก่อนฉีด `v-html` หรือ `html:` เพื่อป้องกัน Stored XSS |
| 14.2 | TTS Safety Timer & Cleanup | `src/services/TextToSpeech.js` | `utterance.onerror` ต้องเรียก `cleanupAndAdvance()` เสมอ และมี Retry limit (20 รอบ / 2s) ป้องกัน Native TTS ค้าง |
| 14.3 | Firebase Key Sanitization | `src/utils/dbUtils.js`, `src/stores/voiceLearning.js` | ข้อความที่ถูกนำไปใช้เป็น Firebase DB Path Key ต้องผ่าน `sanitizeDbKey()` เพื่อป้องกัน Exception อักขระต้องห้าม |
| 14.4 | Financial NaN Safeguard | `src/utils/deliverySync.js`, `src/stores/stock.js` | การคำนวณราคาต้องมี `isNaN()` Check เพื่อป้องกันค่า `NaN` รั่วไหลเข้าฐานข้อมูล |
| 14.5 | Firebase Atomic Transactions | `src/stores/voiceLearning.js`, `src/stores/system.js` | การอัปเดตคะแนนคำเรียนรู้เสียง และการแย่งชิงสิทธิ์ Price Detector ต้องใช้ `runTransaction` ป้องกัน Data Race Condition |
| 14.6 | Offline Queue Lock | `src/composables/useOfflineQueue.js` | `flushQueue` ต้องมี `isFlushing` guard lock + `try/finally` ป้องกันการประมวลผลซ้ำคิวออฟไลน์พร้อมกัน |


---

## 🏷️ 15. ระบบพิมพ์ใบปะหน้าพัสดุและจัดการที่อยู่อัจฉริยะ (Shipping Labels & Smart Address Parser)

| # | ฟังก์ชัน | ไฟล์ | ต้องทำงานได้ |
|---|---|---|---|
| 15.1 | `parseSingleAddress(text)` | `src/utils/addressParser.js` | แยกชื่อผู้รับ, เบอร์โทร, ที่อยู่ และรหัสไปรษณีย์จากข้อความแชท/Note ที่วางด่วน (Smart Quick Paste) |
| 15.2 | `extractPhone(text)` (Strict Thai Phone Regex) | `src/utils/addressParser.js` | ตรวจจับเบอร์โทรศัพท์ (06x, 08x, 09x, 02x, 03-07x, +66) โดยไม่จับตัวเลขข้ามบรรทัด และไม่จับเลข 0 จากท้ายรหัสไปรษณีย์มารวม (เช่น `20000 0875374130` แยกเป็นเบอร์ `087-537-4130` และรหัส `20000`) |
| 15.3 | `extractPostalCode(text)` | `src/utils/addressParser.js` | สกัดรหัสไปรษณีย์ 5 หลัก และไม่สับสนกับบ้านเลขที่เศษส่วน เช่น `10123/45` |
| 15.4 | `getCustomerCleanAddress(customer)` | `src/components/ShippingLabelModal.vue` | ตัดรหัสไปรษณีย์ที่ติดอยู่ในข้อความที่อยู่ออกอัตโนมัติ เพื่อป้องกันการแสดงรหัสไปรษณีย์ซ้ำซ้อนบนใบปะหน้า |
| 15.5 | Isolated Direct Print Engine (`handlePrint`) | `src/components/ShippingLabelModal.vue` | พิมพ์ผ่าน hidden iframe แยกขาด 100% บังคับตัดหน้ากระดาษ 1 ใบ = 1 แผ่น ไม่ให้หน้าต่างแชทหรือ UI หลักแทรกเข้ามาในหน้าพิมพ์ |
| 15.6 | สั่งพิมพ์รายบุคคล (`openPrintForCustomer`) | `src/components/ShippingManager.vue`, `src/pages/ShippingPage.vue`, `src/components/ShippingLabelModal.vue` | เมื่อกดปุ่ม `🖨️` ที่แถวลูกค้า ต้องเปิดหน้าต่างพิมพ์และเลือกเฉพาะลูกค้ารายนั้น (1 คน) เสมอ แม้ลูกค้าจะยังไม่ได้ระบุวันส่ง |
| 15.7 | บันทึกสถานะ "พิมพ์แล้ว" (`togglePrinted`, `toggleCustomerPrinted`) | `src/components/ShippingManager.vue`, `src/pages/ShippingPage.vue`, `src/components/ShippingLabelModal.vue` | อัปเดต `labelPrinted: boolean` และ `labelPrintedAt: timestamp` ลง Firebase ทันทีเมื่อคลิกสลับ หรือเมื่อสั่งพิมพ์ใบปะหน้าเสร็จสิ้น |
| 15.8 | Customer Selector & Filter Chips | `src/components/ShippingLabelModal.vue` | ค้นหาชื่อผู้รับ, เลือก/ยกเลิกทั้งหมด, กรองเฉพาะที่ยังไม่พิมพ์ (`unprinted`) และสลับเลือกรายชื่อแบบ Checkbox ได้อย่างอิสระ |
| 15.9 | Clean Borderless Label Layout (130x76mm / 76x130mm) | `src/components/ShippingLabelModal.vue` | ดีไซน์สะอาดตา ไร้กรอบดำ ผู้ส่งอยู่ซ้าย ผู้รับอยู่ขวา (เว้นขอบล่าง 10%) และข้อความขอบคุณอยู่กึ่งกลางล่างสุด |
| 15.10 | Multi-Address & Custom Recipient Name | `src/components/CustomerAddressModal.vue` | แยกชื่อผู้รับจริง (`recipientName`) จากชื่อ CF และรองรับการบันทึกหลายที่อยู่ต่อ 1 ลูกค้าลง Address Book |


## How to Verify

1. Review the diff of changed files
2. For each changed file, check which checklist items (by number) it relates to
3. **Read the actual source code** of affected functions to verify logic is still intact
4. If any function may be broken, **fix it immediately** before proceeding
5. Report verification results in this format:
   ```
   ✅ 1.1 connectVideo — ไม่กระทบ
   ✅ 2.1 processMessage — ตรวจสอบแล้ว ยังทำงานถูกต้อง
   ⚠️ 4.1 queueAudio — ต้องตรวจสอบเพิ่ม (มีการแก้ไขใกล้เคียง)
   ❌ 3.1 processOrder — เสียหาย! แก้ไขแล้ว
   ```
