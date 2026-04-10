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

---

## 💾 5. ระบบแชท & Sync ข้ามอุปกรณ์

| # | ฟังก์ชัน | ไฟล์ | ต้องทำงานได้ |
|---|---|---|---|
| 5.1 | `syncFromFirebase(videoId)` | `src/stores/chat.js` | sync แชท real-time ข้ามอุปกรณ์ |
| 5.2 | `sendMessageToFirebase(videoId, data)` | `src/stores/chat.js` | ส่งข้อความเก็บ Firebase |
| 5.3 | `addMessage(message)` | `src/stores/chat.js` | เพิ่มข้อความ UI + deduplication |
| 5.4 | `downloadChatCSV(videoId)` | `src/stores/chat.js` | ดาวน์โหลดแชทเป็น CSV |
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
| 7.1 | `initAwayListener()` | `src/composables/useAwayMode.js` | sync สถานะพักข้ามอุปกรณ์ + อ่านข้อความประกาศ |
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
| 10.8 | Mark Done + Reset | `src/components/ShippingManager.vue` | เสร็จ → status=done, itemCount=0, sessions=null |

---

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
