---
description: Mandatory verification checklist after every code change
---

# ✅ Post-Edit Verification Checklist

> **ต้องตรวจสอบทุกครั้งหลังแก้ไขโค้ด** — หากข้อใดเสียหาย ต้องแก้ไขก่อน commit
> รายการด้านล่างเป็นเกณฑ์ที่ต้องตรวจ ไม่ใช่หลักฐานว่าผ่านทุกฟังก์ชันแล้ว ต้องระบุวิธีตรวจและขอบเขตผลจริงเสมอ
> ผลอ้างอิงล่าสุด: **v5.4.16 — 2026-10-31** ดู [Chat regex review](../../docs/chat-regex-review-2026-10-31.md) และ [release report](../../docs/release-5.4.16.md)

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
| 2.5 | Admin Proxy Cancel, Multi-Cancel & Safety Guard | `src/composables/useChatProcessor.js`, `src/utils/chatParserUtils.js` | รองรับยกเลิกเดี่ยวและหลายรหัสพร้อมกัน ("ยกเลิก 12 15", "12 มะระ ยกเลิก", "12 15 มะระ ยกเลิก", "มะระ ยกเลิก 12", "ยกเลิก 12 มะระ"), ห้าม Fallback เป็น `null` (Wildcard) เมื่อแอดมินระบุชื่อลูกค้าไม่ตรงกับเจ้าของรหัส, บล็อกเงื่อนไขหลอก (`conditionalCancelGuardRegex`) และใช้ `!isMultiBuyBlocked()` ป้องกัน `multiBuyRegex` แย่งจับประโยคยกเลิก/ขอดู/ถามไซส์ที่มีเลขหลายตัว |
| 2.6 | Buy vs Question/Try/Price Disambiguation | `src/composables/useChatProcessor.js`, `src/utils/chatParserUtils.js` | อนุญาตจองเมื่อระบุสีหรือคำชม ("สีขาว34ค่ะพี่นัน", "ไม่ต้องลองก็ได้12"), บล็อกคำบ่นไซส์ (`negationGuardRegex` เช่น "40 ใส่ไม่ได้"), บล็อกตัวระบุราคา/ลักษณนาม ("ตัว 100"), และบล็อกคำบอกจำนวน (`quantityUnitRegex` เช่น "4ชิ้น", "3สี") |
| 2.7 | Admin Notes Parity, Date Mismatch Sync & Clean Shipping Name | `src/composables/useChatProcessor.js`, `src/utils/chatParserUtils.js` | สกัดชื่อลูกค้าสะอาดจากคำสั่งแจ้งส่ง ("วิระวัลย์ รวมยอด" ➡️ "วิระวัลย์"), ใช้ `isAdminSizeSelectionNote()` ร่วมกันทั้ง 2 ไฟล์สำหรับ Admin Notes ("อำไพ เอาตัวอก56", "3xl อำไพ", "เสื้อเชิ้ต อก56 สมฤทธิ์"), และส่งข้อความขึ้น Firebase เสมอเมื่อพบ `isDateMismatch` เพื่อไม่ให้แชทหายจากหน้าจอ |
| 2.8 | Strict Self-Name Auto-Learn Hardening (`extractCustomerSelfName`) | `src/utils/chatParserUtils.js` | บล็อกคำสนทนา/คำบ่น/คำทักทาย ("สวัดดีค่ะ", "ใข่ค่ะ", "เก่าค่ะ", "สบายดีค่ะ", "ลายดอก", "ตัวเล็กๆ", "เมื่อคืน", "บ่") ไม่ให้จำเข้าเป็นชื่อลูกค้า แต่ยังคงจำชื่อแนะนำตัวจริง ("บุญญาภาค่ะ", "40 บุญญาภา", "ต่าย") ผ่านตัวอย่างที่ระบุ โดยไม่รับประกันชื่อทุกรูปแบบ |
| 2.9 | Backdated Orders / Yesterday Debt Notes Audio & Extraction Invariant | `src/composables/useChatProcessor.js`, `src/utils/chatParserUtils.js`, `src/services/TextToSpeech.js` | รองรับการจองย้อนหลัง/โน้ตยอดเมื่อวานทั้งแบบชื่อนำหน้าและรหัสนำหน้า ("มะระ 39 เมื่อวาน", "39 เมื่อวาน มะระ", "ของมะระ 39 เมื่อวาน", "หนิง เมื่อวาน 41 43"): ต้องไม่งัดตัดสต็อกของไลฟ์สดปัจจุบัน, ต้องส่งขึ้น Firebase พร้อมเล่นเสียงครบทั้ง SFX chime และ TTS อ่านออกเสียง (`sfxType: isNewCustomerChat ? 'bell' : 'success'`, `ttsText: isVoiceChat ? '' : ttsMessage`), และ `ttsService.speak()` ต้องตัดชื่อลูกค้าที่ซ้ำกันตรงต้นข้อความเพื่อไม่ให้อ่านชื่อเบิ้ล 2 ครั้ง |
| 2.10 | October 20–24, 2569 CSV Log Regex Hardening (`ยกเริก`/`ยอเลิก`, `ไม่รับ+เลข`, `บอก`/`ดอก`/`คอกลม`, `ส่งรูป`, Garment/Question Admin Notes) | `src/utils/chatParserUtils.js`, `src/composables/useChatProcessor.js` | รองรับคำพิมพ์ผิดยกเลิก ("64ยกเริก", "ม้นบางยอเลิกก่อน") และ "ไม่รับ25นะคะ"/"นาวพี่ไม่เอา38" เป็น `CANCEL_ITEM`, บล็อกเงื่อนไขรอยเปื้อน ("ผ้าเปื้อนก็ยังไม่เอา..."), รองรับการจอง ("พี่เอาใบที่120", "ใช่คะ25", "70นาว"), ป้องกันคำที่มี "อก" ("บอก", "ดอก", "คอกลม", "ออก", "นอก") ไปติด `questionRegex`, ป้องกัน "ส่งรูป"/"พรุ่งนี้ส่งรูป" ไปสร้างรอบส่งพัสดุ, และรองรับโน้ตแอดมินที่ลงท้ายด้วยชื่อลูกค้า ("กางเกงยีนส์ กุญสิญา", "ลายเขียวๆ กุญสิญา", "21 อกเท่าไหร่ สมฤทธิ์", "66 อกเท่าไหร่ วรรณี เบญ") |

| 2.11 | Shared request guards | chatParserUtils.js, useChatProcessor.js | คำถามฝาก/ส่ง/ปลายทางไม่เขียน readiness/history/date; คำถามยกเลิกและโน้ตที่หลุดจองไม่ยกเลิกรายการ ใช้ helpers ร่วมกันทั้ง parser/processor |
| 2.12 | Hold and explicit cancel IDs | chatProcessorLogRegression.test.js | ยังไม่ส่งวันเสาร์/ฝากไว้ก่อนแต่ส่งพรุ่งนี้ไม่ตั้ง deliveryDate; คืน15/ถอน15/สละสิทธิ์15 ต้องยกเลิก 15 ไม่ใช้รายการล่าสุด; คง owner/blacklist/transaction guards |
| 2.13 | Number and name boundaries | chatLogRegression.test.js | พุง54/เอา54นิ้ว/รับ31ตัวไม่ตัดเลขบางหลักมาจอง; ได้คะ43/เอาๆ6 จองได้; คำขอลอง/เงื่อนไขจริงไม่จอง; ตัดขอบ/แอดใด้แล้วไม่เรียนเป็นชื่อ; เลขไทยและ zero-width ให้ intent เดียวกัน |
| 2.14 | First batch and video switch | chatProcessorLogRegression.test.js | enqueue หลายข้อความก่อน reset ครั้งแรกแล้วทำครบตาม timestamp; ทุก Promise ต้องจบ; queued old-video ไม่เขียนใน new-video; ห้ามล้าง active batch ใน processSingleMessage |
| 2.15 | Reviewed corpus and Smart Answer | reviewedChatCorpus.test.js, smartAnswerLogRegression.test.js | replay ครบ 307 แถวด้วยวันที่คงที่และ expected labels ที่ตรวจทาน แยกจาก actual processor side effects; รองรับไซด์/พุง/กี่ตัวแลว/COD และไม่ใช้สัดส่วนเป็น item ID; ไม่เก็บ raw IDs/contact ใน Git ไม่ตีความผลผ่านว่า accuracy 100% |

---

## 🛒 3. ระบบจัดการสต็อก

| # | ฟังก์ชัน | ไฟล์ | ต้องทำงานได้ |
|---|---|---|---|
| 3.1 | `processOrder(num, owner, uid, source, price, method)` | `src/stores/stock.js` | ตัดสต็อก + Firebase Transaction ป้องกันชน + จองซ้ำ=เข้าคิว |
| 3.2 | `processCancel(num, uid, ownerName)` | `src/stores/stock.js`, `src/components/StockGrid.vue` | ยกเลิก + เลื่อนคนถัดไปในคิวขึ้นมาเป็นเจ้าของ + เก็บ `previousUid` และ `nextUid` ส่งเข้า `syncDeliveryCustomerForOwner` + เปรียบเทียบชื่อแบบตัดคำนำหน้า (`isMatchingCancelOwner`) + หากไม่มีคิวต่อท้ายและมี `price > 0` ต้องคงค่า `{ price }` ไว้ไม่ให้ราคาหาย (รวมถึงการลบรายการในป๊อปอัป `👗 showOwnerItems`) |
| 3.3 | `connectToStock(videoId)` | `src/stores/stock.js` | sync สต็อก real-time + คำนวณยอดขาย + trigger เฉลิมฉลอง 50%/80%/100% |
| 3.4 | `clearAllStock()` | `src/stores/stock.js`, `src/utils/deliverySync.js` | `await remove()` ล้างสต็อกทั้งหมด + reset milestones + กรองชื่อลูกค้าไม่ให้ซ้ำและส่ง `{}` เข้า `syncDeliveryCustomerForOwner` โดยไม่ยิง `get()` ซ้ำ |
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
| 4.6 | TTS ต้องอ่านทุกข้อความที่เข้าเกณฑ์ | `src/composables/useChatProcessor.js`, `src/stores/chat.js` | Processor ต้องบันทึก `sfxType`, `phoneticName`, `ttsText` ก่อนจบเส้นทางซื้อ/ยกเลิก/โน้ต; ให้ Firebase listener ใน `chat.js` เรียก `queueAudio()` เฉพาะข้อความใหม่ตาม time guard ข้อ 4.7 ห้ามเพิ่มเสียงตรงจาก processor; ยกเว้นข้อความต้อนรับที่อนุญาตไว้, ผู้ถูกแบน และ voice-chat ตามเงื่อนไขเดิม |
| 4.7 | Cross-Device Audio Playback | `src/stores/chat.js`, `src/composables/useChatProcessor.js` | ห้ามเรียก `queueAudio()` ตรงๆ ใน `useChatProcessor.js` (ยกเว้นเสียงต้อนรับ) เสียงทั้งหมดต้องถูกทริกเกอร์ผ่าน Firebase sync listener ใน chat store และเล่นเฉพาะแชทใหม่ (`timestamp >= syncStartTime - 5000` และ `isNew`) |
| 4.8 | Emoji and Run Fallback | `src/composables/useChatProcessor.js` | อ่านสติกเกอร์เป็น "ส่งสติกเกอร์" เมื่อ sanitizes เป็นค่าว่าง, fallback ไป `messageRuns` เมื่อ `displayMessage` ว่าง |
| 4.9 | เว้นวรรคหน่วงเวลาในคิวเสียง (`delayAfter`) | `src/composables/useAudio.js` | คิวเสียง `queueAudio` รองรับ `options.delayAfter` (เช่น 800ms) เพื่อเว้นจังหวะอ่านชื่อลูกค้าแต่ละคนให้ชัดเจน ไม่รัวติดกัน |
| 4.10 | ออกเสียงชื่อลูกค้าจริงเมื่อแอดมินจองแทน (Admin Proxy TTS) | `src/composables/useChatProcessor.js` | เมื่อแอดมินพิมพ์จองให้ลูกค้า เสียง TTS จะอ่านเป็นชื่อลูกค้าเท่านั้น ไม่นำชื่อแอดมินมาอ่าน |
| 4.11 | Shared Singleton `AudioContext` & LRU Cache | `src/services/TextToSpeech.js`, `src/composables/useAudio.js` | ใช้ `AudioContext` ร่วมกันตัวเดียว (`ttsService.getAudioContext()`) ทั้งระบบ TTS / SFX / Celebration พร้อม LRU Audio Buffer Cache (สูงสุด 200 รายการ) ลดเวลาถอดรหัสเสียงซ้ำ |
| 4.12 | Zero-Mute Admin Notes & TTS Fallback Guarantee | `src/composables/useChatProcessor.js`, `src/stores/chat.js`, `src/services/TextToSpeech.js` | แชทโน้ตแอดมิน (`admin-note`) และคำเฉพาะแอดมิน (`admin-stopword`) ต้องส่ง `ttsText: isVoiceChat ? "" : ttsMessage` ขึ้น Firebase เสมอ และ `chat.js` ต้องมี fallback ไปที่ `messageData.text` หาก `ttsText` ว่างเปล่า เพื่อรับประกันว่าจะไม่มีข้อความใดถูกตัดเสียงอ่านทิ้ง รวมถึงตัดชื่อซ้ำที่ท้ายข้อความใน TTS (`suffixRegex`) |
| 4.13 | TTS 2-State Toggle Switcher (`S` / `🤖`) | `src/components/Header.vue`, `src/stores/system.js` | ปุ่มสลับเสียงรองรับ 2 โหมด (`S` Google Cloud Standard `th-TH-Standard-A` ➡️ `🤖` Native TTS) พร้อมจำค่าลง `localStorage` |
| 4.14 | Zero-Stall TTS Auto-Fallback System | `src/services/TextToSpeech.js` | หากโหมด `S` (Google Cloud TTS) ขัดข้อง หมดโควตา หรือเกิด Timeout ระบบต้องหมุน API Key และ Fallback อัตโนมัติไปยัง Native TTS (`🤖`) โดยคิวเสียงไม่ค้างและไม่สะดุด |
| 4.15 | Thai Cardinal Number Pronunciation (`numberToThaiWords`) | `src/utils/thaiNumberWords.js`, `src/services/TextToSpeech.js`, `src/composables/useChatProcessor.js` | อ่านตัวเลขจองสินค้าเป็นจำนวนนับภาษาไทย เช่น "15" -> "สิบห้า" ไม่ใช่อ่านแยกทีละตัว "หนึ่งห้า" พร้อมแปลง CF, ตัวเลขทับลำดับ, และปกป้องเบอร์โทรศัพท์ (08x/09x)/เวลา (13:11) |


---

## 💾 5. ระบบแชท & Sync ข้ามอุปกรณ์

| # | ฟังก์ชัน | ไฟล์ | ต้องทำงานได้ |
|---|---|---|---|
| 5.1 | `syncFromFirebase(videoId)` | `src/stores/chat.js` | รับข้อความใหม่ผ่าน `onChildAdded` และ query `limitToLast(200)`; เปลี่ยนไลฟ์/ยกเลิก listener ต้อง cleanup, ไม่สร้าง listener ซ้ำ และไม่เล่นเสียงข้อความเก่าซ้ำหลังเชื่อมต่อใหม่ |
| 5.2 | `sendMessageToFirebase(videoId, data)` | `src/stores/chat.js` | ส่งข้อความเก็บ Firebase |
| 5.3 | `addMessage(message)` | `src/stores/chat.js` | เพิ่มข้อความ UI + deduplication + UI Message Trimming (`MAX_MESSAGES=500`, `MAX_SEEN_IDS=2000`) ป้องกัน Memory Leak |
| 5.4 | `downloadChatCSV(videoId)` | `src/stores/chat.js` | ดาวน์โหลดแชทเป็น CSV (ต้องไม่ถูกกระทบจาก UI trimming) |
| 5.5 | `clearChat()` | `src/stores/chat.js` | ล้างแชท UI ทั้งหมด |
| 5.6 | ขอบเขตการซิงก์ข้ามเครื่อง | `src/stores/customer.js`, `src/stores/stock.js`, `src/stores/system.js` | ข้อมูลส่วนกลางรับอัตโนมัติเมื่อออนไลน์และมีสิทธิ์ใน Firebase เดียวกัน; stock/chat ต้องเลือก videoId เดียวกัน ส่วนเปิด–ปิดเสียง โหมด TTS ซ่อนแชต และคำค้นหาเป็นการตั้งค่าเฉพาะเครื่อง |
| 5.7 | ความหน่วงและทดสอบสองเครื่อง | `src/composables/useDeliveryReconciliation.js`, `src/stores/stock.js`, `scripts/verify-firebase.mjs` | แยก Firebase listener ออกจาก reconciliation debounce 1 วินาที และ history debounce 5 วินาที ไม่รับประกันเวลาตายตัวเมื่อเครือข่ายช้า; ตรวจ A แก้/B รับ, จองชนกัน, เลื่อนคิว, complete/undo พร้อมกัน และ logout/revoke โดยแยกผล SDK emulator ออกจาก UI สองเครื่องจริง |

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
| 10.1 | Firebase CRUD (`delivery_customers/{uid}`) | `src/components/ShippingManager.vue`, `src/pages/ShippingPage.vue`, `src/stores/customer.js` | เพิ่ม/แก้ไข/ลบลูกค้าได้ตามสิทธิ์; modal ใช้ข้อมูลจาก shared customer store ห้ามเพิ่ม listener ของ delivery_customers/address_book ซ้ำใน component |
| 10.2 | `addToShipping()` + Auto-Sync | `src/components/Dashboard.vue` | เพิ่มลงคิวส่ง + auto-create delivery_customers + session breakdown |
| 10.3 | `syncAllToDelivery()` | `src/components/Dashboard.vue` | Sync ลูกค้าทั้ง shipping list ไป delivery_customers ทีเดียว |
| 10.4 | `recalcItemCount(uid)` | `src/utils/deliverySync.js`, `src/utils/deliveryState.js` | คำนวณ itemCount/totalPrice จาก sessions ที่ยังไม่ done ภายใน transaction บน customer ทั้ง record ห้ามนำยอดรวมจาก cache เก่ามาเขียนทับ |
| 10.5 | Selective stock-to-delivery reconciliation | `src/App.vue`, `src/composables/useDeliveryReconciliation.js`, `src/utils/deliverySync.js` | จัดกลุ่ม booking fields ครั้งเดียวแล้ว sync เฉพาะเจ้าของที่เปลี่ยน; ต้องรวมเจ้าของเดิมเมื่อยกเลิก/เปลี่ยนมือ และส่ง items ที่เตรียมไว้เข้า transaction กลาง; queue-only ไม่กระตุ้น delivery sync ดูข้อ 22 |
| 10.6 | Delivery Strip (`deliveryStrip`) | `src/components/StockGrid.vue`, `src/assets/style.css` | แถบรายชื่อลูกค้า real-time บนหัวตาราง StockGrid แสดง Icon อยู่หน้าชื่อและแยกสี/Icon ชัดเจนตามประเภท โดยทุกประเภทไม่ต้องใส่ข้อความต่อท้าย (`overdue`: 🚨 สีแดงกะพริบ, `today`: 🚚 สีเขียวมรกต, `pack-tonight`: 📦 สีส้ม) ยกเว้น `soon` (⏳ สีม่วง + อีก X วัน) และ `later` (📅 สีฟ้า + วันที่จัดส่ง) |
| 10.7 | Countdown + Thai Date | `src/components/ShippingManager.vue` | นับถอยหลัง (เลย/วันนี้/พรุ่งนี้/อีก X วัน) + วันที่ไทย (24 มี.ค. 69) |
| 10.8 | Mark Done + Undo Done | `src/components/ShippingManager.vue`, `src/pages/ShippingPage.vue`, `src/utils/deliveryActions.js` | ทั้งสองหน้าใช้ helper กลางและ transaction บน customer ทั้ง record: ปรับ status/sessions/totalBookings พร้อมเก็บ lastDoneId, lastDoneSnapshot, lastDoneCount, lastDoneSessions; ปฏิเสธ snapshot เก่าและ complete/undo ซ้ำจากหลายเครื่อง คืนเฉพาะรอบล่าสุดโดยคงรายการใหม่ไว้ ดูข้อ 21.3–21.4 |
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
| 11.4 | `totalBookings` สะสมใน `markDone()` | `src/utils/deliveryActions.js`, `src/utils/deliveryState.js` | เพิ่มยอดสะสมพร้อมปิดรอบใน transaction เดียวบน customer ทั้ง record; undo หักเฉพาะรอบล่าสุดได้ครั้งเดียว ห้ามแยก increment ออกจากการเปลี่ยน status/sessions |
| 11.5 | แสดง "ลูกค้าประจำ" | `src/components/ShippingManager.vue` | แสดงข้อความ "ลูกค้าประจำ • เคยสั่งรวม X ชิ้น" ใต้ชื่อลูกค้าเมื่อ totalBookings > 0 |
| 11.6 | Owner Count Badge `👗 N ตัว` | `src/components/StockGrid.vue` | แสดง 👗 N ตัว สีฟ้าหลังชื่อ owner ในตาราง StockGrid เมื่อมียอดจองสะสม >= 1 ชิ้น |
| 11.7 | ยอดจองสะสมรวมทุกวัน (Badge Count Sync) | `src/components/StockGrid.vue`, `src/utils/deliveryState.js` | getOwnerCount รวมรายการวันนี้ที่ยังค้างส่งกับอดีตที่ยังค้างส่ง โดยไม่นับ session ซ้ำและไม่นับ bookingKey ที่อยู่ใน fulfilledItems; สถิติยอดขายวันนี้ยังแสดงรายการที่ขายแล้วตามเดิม |
| 11.8 | แสดงรายละเอียดจองสะสมย้อนหลังและลบข้ามเซสชั่น | `src/components/StockGrid.vue` | `showOwnerItems()` ดึงรายการของวันนี้ + อดีตที่ยังไม่จัดส่ง (แสดงแค่วันที่สั้นๆ เช่น "26 พ.ค. 69") และลบออกจากอดีตพร้อมปรับลด itemCount/totalPrice ได้ถูกต้อง |
| 11.9 | Normalized Name Grouping (`normalizeCustomerName`) | `src/utils/deliverySync.js`, `src/components/StockGrid.vue` | จับคู่และสะสมยอดจองตามชื่อที่ normalize แล้ว ทำให้จองเองและแอดมินจองแทน (`proxy-uid`) รวมยอดจองสะสมตรงกัน 100% |
| 11.10 | Exclude Shipped Bookings | `src/utils/deliveryState.js`, `src/components/StockGrid.vue`, `src/components/Dashboard.vue`, `src/utils/smartAnswerUtils.js` | ยอดค้างส่งไม่รวม session ที่ done และรายการใน fulfilledItems แม้อยู่ในไลฟ์ปัจจุบัน; แก้ราคา/ชื่อ/UID ไม่เปิดของเก่ากลับมา แต่การจองใหม่เวลาใหม่ในไลฟ์เดิมต้องนับได้ |
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
| 13.1 | History Recalculation + Canonical Delivery Transactions | `src/components/HistoryModal.vue`, `src/utils/deliverySync.js` | updateDeliveryAndHistoryTotals อ่าน stock snapshot ของไลฟ์ครั้งเดียวและรวมเจ้าของไม่ซ้ำ ส่ง snapshot เดิมเข้า syncDeliveryCustomerForOwner เพื่อคำนวณยอดจัดส่งด้วย transaction รายลูกค้า; เขียนเฉพาะสถิติ history ด้วย multi-path update ห้ามใช้ยอดรวมจัดส่งจาก cache เก่าทำ batched overwrite |
| 13.2 | Centralized Customer Store & Live Cache (`useCustomerStore`) | `src/stores/customer.js`, `src/utils/deliverySync.js` | รวมศูนย์ listener ของ `delivery_customers` และ `address_book` ไว้ที่ `useCustomerStore` จุดเดียว (Reference-Counted) พร้อมซิงค์เข้า `setLiveDeliveryCustomersCache` / `setLiveAddressBookCache` และค้นหาข้อมูลลูกค้าด้วยดัชนี $O(1)$ (`deliveryByNormKey`, `getCustomerMetaByName`) |
| 13.3 | Fast Instant Chat Scroll, Initial Bottom Pinning & Zero Forced Reflow | `src/components/ChatPanel.vue`, `src/utils/chatParserUtils.js`, `src/App.vue` | สกรอลล์แชทสดต้องใช้ Double-`requestAnimationFrame` (`scrollTop = scrollHeight`), ใช้ `evaluateChatScrollState()` แยกแยะการเลื่อนขึ้นจริงของผู้ใช้ออกจากกรณีเนื้อหาขยายตัว, ใช้ `ResizeObserver` บน `#chat-list`/`#chat-viewport` เพื่อดึงลงข้อความล่าสุดเสมอเมื่อเปิดหน้าเว็บหรือเมื่อป้ายสถานะลูกค้าโหลดเสร็จ, ห้ามใส่ `contain-intrinsic-size: 55px` บน `.chat-row` หรือ `scroll-behavior: smooth` บน `#chat-viewport`, และห้ามสั่ง Forced Synchronous Layout (`offsetWidth`) ขณะสลับย่อ/ขยายแชท |
| 13.4 | O(1) Stock Queue Map & Conditional Modal Watch | `src/components/StockGrid.vue` | การเรนเดอร์ Stock Grid ต้องใช้ `queueLengthsMap` (computed) และเฝ้าดู `stockData` สำหรับอัปเดต Modal เฉพาะเมื่อเปิด `currentViewingOwnerUid` อยู่เท่านั้น |
| 13.5 | Fast Thai-to-Arabic Conversion | `src/utils/chatParserUtils.js` | `thaiToArabic` ต้องใช้ Static Lookup Map `THAI_TO_ARABIC_MAP` เพื่อความเร็วสูงสุดในการสืบค้นแบบ $O(1)$ |
| 13.6 | Execution Time Tracking | `src/utils/logger.js` | `logger.time` และ `logger.timeAsync` ต้องสามารถวัดและแสดงเวลาการทำงานเป็นมิลลิวินาที (ms) ได้ถูกต้อง |
| 13.7 | Benchmark Test Suite | `src/__tests__/benchmark.test.js` | ชุดทดสอบ Benchmark ops/sec ต้องรันและผ่านผ่านคำสั่ง `npm test` |
| 13.8 | Throttled & Deduplicated History DB Writes | `src/stores/stock.js` | บันทึกสถิติ history ด้วย debounce 5 วินาที และใช้ lastHistorySales/lastHistoryItems ข้ามเมื่อยอดไม่เปลี่ยน; ยกเลิก timeout เมื่อหยุด sync; writer จอง/ยกเลิก/แก้ข้อมูลส่ง committed stock snapshot เข้า syncDeliveryCustomerForOwner โดยไม่อ่าน stock ซ้ำ |
| 13.9 | Zero-Delay Concurrent Poll Batching | `src/services/YouTubeLiveChat.js`, `src/composables/useChatProcessor.js` | `YouTubeLiveChat.js` ต้องส่งข้อความใหม่ทั้งหมดในรอบ Poll เข้าคิวพร้อมกัน (`Promise.allSettled`) เพื่อให้ `incomingBatchQueue` รวบประมวลผลและเรียงตาม `publishedAt` ภายในหน้าต่าง 80ms เดียว ไม่หน่วงสะสม `80ms × N` |
| 13.10 | Lazy Short-Circuit Regex, Cached Runs & Bounded Voice Sync | `src/composables/useChatProcessor.js` | ประมวลผล 7 Buy Regex แบบ Lazy Short-Circuit (หยุดทันทีเมื่อเจอแพทเทิร์นที่ตรง), แคชผลลัพธ์ `getMessageRuns()`, และจำกัดการดึง `voice_chats/${videoId}` ด้วย `limitToLast(10)` |
| 13.11 | Shared Singleton `AudioContext` & Idle Celebration Preload | `src/composables/useAudio.js`, `src/services/TextToSpeech.js`, `src/utils/celebration.js` | แชร์ `AudioContext` ตัวเดียวทั่วทั้งแอป และโหลดไฟล์เสียงพลุฉลองล่วงหน้าในช่วงเบราว์เซอร์ว่าง (`requestIdleCallback`) เพื่อไม่ให้แย่งแบนด์วิดท์ขณะเริ่มไลฟ์ |
| 13.12 | Service Worker Real-Time API Bypass, Queue Badge Containment & GPU/Touch Hygiene | `vite.config.js`, `src/components/StockItemCard.vue`, `src/components/StockGrid.vue`, `src/composables/usePullToRefresh.js` | ยกเว้น `/liveChat/messages` และ `texttospeech.googleapis.com` จาก Workbox `runtimeCaching`, วาง `.queue-badge` ไว้ภายในขอบการ์ด (`top: 5px; right: 5px;`) เพื่อไม่ให้ถูกตัดขอบจาก `content-visibility: auto`, เปิด `will-change` เฉพาะการ์ดที่กำลังแสดงแอนิเมชัน, และตัดจบ `touchstart` ทันทีเมื่อ `scrollTop > 5` |
| 13.13 | Module Scope Regex, ReDoS Prevention & Unicode Property Escapes | `src/utils/addressParser.js`, `src/services/TextToSpeech.js`, `src/stores/voiceLearning.js`, `src/components/ChatPanel.vue` | รวม regex ทั้งหมดเป็นค่าคงที่ระดับ Module Scope, ใช้ Non-overlapping Token Partitioning ป้องกัน Catastrophic Backtracking (`adminProxyNameFirstRegex`), ใช้ LRU Cache สำหรับ Dynamic RegExp ใน `ChatPanel.vue` (`proxyHighlightRegexCache`), อัปเกรด `TTS_EMOJI_REGEX` ด้วย `\p{Extended_Pictographic}`, และเรียงความยาวคำค้นหาใน `voiceLearning.js` ก่อน compile |

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

---

## ⚡ 16. ประสบการณ์ผู้ใช้และการสืบค้นข้อมูลหน้างาน (Operational UX/UI & Search Invariants v5.4.4+)

| # | ฟังก์ชัน | ไฟล์ | ต้องทำงานได้ |
|---|---|---|---|
| 16.1 | Stock Quick Search & Jump (`stockSearchQuery`, `handleStockSearchEnter`) | `src/components/StockGrid.vue` | ค้นหาแบบเรียลไทม์รองรับทั้งตัวเลขเบอร์สต็อก (กด Enter กระโดดไปเบอร์นั้นทันทีผ่าน `scrollToItem`) และชื่อลูกค้า/ชื่อเล่น/คิวสำรอง โดยข้าม Window Capping limit (แสดงผลแม้เบอร์ > 120) |
| 16.2 | Missing Address Indicator (`no-addr-indicator`, `hasCustomerAddress`) | `src/components/StockItemCard.vue`, `src/components/StockGrid.vue` | แสดงหมุดเตือนสีแดง "📍 รอที่อยู่" ทันทีเมื่อลูกค้าที่ได้ของยังไม่มีที่อยู่ในระบบ โดยต้องใส่ `hasCustomerAddress(owner)` ใน `v-memo` เพื่อรักษาประสิทธิภาพการเรนเดอร์ |
| 16.3 | Shipping Real-Time Search & Sub-Filter Pills | `src/components/ShippingManager.vue` | ค้นหาชื่อลูกค้า/โน้ต/ที่อยู่แบบเรียลไทม์ และปุ่มกรองด่วน "⚠️ ยังไม่มีที่อยู่" และ "🖨️ ยังไม่พิมพ์" ต้องกรองตารางได้แม่นยำทั้งแบบ Desktop Table และ Mobile Cards |
| 16.4 | Compact Connected Stream State | `src/components/Header.vue`, `src/assets/style.css` | เมื่อเชื่อมต่อไลฟ์สำเร็จ ช่อง YouTube Video ID ต้องยุบขนาดเหลือ ~95px และขยายกลับอัตโนมัติเมื่อ Hover หรือ Focus (`Shift+F` autofocus ด้วย `id="yt-video-id-input"`) |
| 16.5 | Keyboard Shortcuts Cheat Sheet Modal (`ShortcutsModal.vue`) | `src/components/ShortcutsModal.vue`, `src/components/Header.vue`, `src/App.vue` | เปิดดูตารางคีย์ลัดระบบทั้งหมดได้ผ่านปุ่ม `⚡ Tools` หรือกด `?` / `F1` บนคีย์บอร์ด |

---

## 🛡️ 17. ระบบจัดการบัญชีดำ (Customer Blacklist & Ban Protection v5.4.5+)

| # | ฟังก์ชัน | ไฟล์ | ต้องทำงานได้ |
|---|---|---|---|
| 17.1 | `isBanned(uid, name)` | `src/stores/blacklist.js` | ซิงค์ฐานข้อมูล real-time ผ่านพาธ `settings/blacklist` และตรวจสอบสถานะแบนตาม channelId หรือชื่อลูกค้าแบบ Space-Agnostic (เช่น "สมชาย ใจดี" และ "สมชายใจดี") |
| 17.2 | Zero Audio Leakage | `src/stores/chat.js` | ข้อความจากผู้ใช้ที่ถูกแบนต้องไม่ส่งเสียงอ่าน TTS หรือ SFX ข้ามอุปกรณ์ 100% |
| 17.3 | Anti-Stock Stealing | `src/composables/useChatProcessor.js` | ผู้ใช้ที่ถูกแบนต้องไม่สามารถจองสินค้า (CF), ยกเลิก, หรือแจ้งส่งได้ บันทึกแชตเป็น `type: "banned"` พร้อม `isBanned: true` |
| 17.4 | Option A Dimmed Display & 🚫 Avatar Overlay | `src/components/ChatPanel.vue` | ข้อความของผู้ใช้ที่ถูกแบนต้องแสดงผลแบบสีจาง 45% ขอบแดง มีสัญลักษณ์ `🚫` ทับบนรูปโปรไฟล์ และขยายชัดเจนเมื่อเมาส์ชี้ |
| 17.5 | Admin Quick Ban & Unban via Avatar Click | `src/composables/useChatProcessor.js`, `src/components/ChatPanel.vue` | แอดมินสามารถพิมพ์คำสั่ง `!แบน` / `!ปลดแบน` ในแชต หรือคลิกที่รูปโปรไฟล์ของลูกค้า (Avatar) เพื่อเปิดเมนูแบนได้ทันที |
| 17.6 | Modal Blacklist & Customer Edit | `src/components/BlacklistModal.vue`, `src/components/CustomerQuickEditModal.vue` | ค้นหารายชื่อแบนและจัดการแบน/ปลดแบนได้ทั้งจากเมนู ⚡ Tools และหน้าต่างแก้ไขข้อมูลลูกค้า |
| 17.7 | No Auto-Release of Prior Stock | `src/composables/useChatProcessor.js`, `src/stores/blacklist.js` | การแบนลูกค้าต้องไม่ล้างหรือปล่อยสต็อกที่เคยจองไว้ก่อนหน้าโดยอัตโนมัติ (แอดมินเป็นผู้ดำเนินการเองตามต้องการ) |

## 🕒 18. การแสดงเวลาจองย้อนหลัง (Backdated Booking Time Display)

| # | ฟังก์ชัน | ไฟล์ | ต้องทำงานได้ |
|---|---|---|---|
| 18.1 | ormatBackdatedCard(ts) | src/utils/timeFormatUtils.js, src/components/StockItemCard.vue | แสดงเฉพาะไอคอนย้อนเวลา (.backdated-inline-icon) ต่อท้ายชื่อลูกค้าโดยตรง ไม่แสดงข้อความเวลา เพื่อความกะทัดรัดและคลีนตา |
| 18.2 | ormatBackdatedDetail(ts) & ormatNormalBookingTime(ts) | src/utils/timeFormatUtils.js, src/components/StockGrid.vue, src/components/HistoryModal.vue | ในหน้าต่างจัดการคิว (Modal) แสดงป้าย ⏳ ย้อนหลัง • วันนี้/เมื่อวาน/วันที่ HH:mm เด่นชัด และรายการปกติแสดงเวลาสะอาด 🕒 HH:mm |
| 18.3 | getBookingTooltip(ts, isBackdated) | src/utils/timeFormatUtils.js | แสดง Tooltip สุภาพและชัดเจนเมื่อนำเมาส์ชี้ (จองย้อนหลัง: วันนี้ เวลา 13:11 น.) |
| 18.4 | UI Sunset Amber Gradient Pill Badge | src/components/StockItemCard.vue, src/components/StockGrid.vue, src/components/HistoryModal.vue | ดีไซน์ป้ายรูปทรง Pill โทนสี Amber/Sunset เกรเดียนต์ ขอบเรืองแสง พร้อมไอคอนย้อนเวลา `fa-clock-rotate-left` |

---

## 💡 19. ระบบผู้ช่วยแสดงคำตอบอัจฉริยะให้แม่ค้า (Smart Seller Answer Assistant v5.4.9+)

| # | ฟังก์ชัน | ไฟล์ | ต้องทำงานได้ |
|---|---|---|---|
| 19.1 | `resolveSmartAnswer(chat, context)` & `isSmartQuestionText(text)` | `src/utils/smartAnswerUtils.js`, `src/composables/useChatProcessor.js` | ตรวจจับคำถามลูกค้า 5 หมวดหมู่ (`item`, `orders`, `yesterday`, `hold`, `profile`) แบบ $O(1)$ / Single-pass จากหน่วยความจำ ไม่ยิง Firebase ซ้ำ ไม่ส่งเสียงอ่าน TTS แทรก และติด `type: "question"` ให้ข้อความคำถาม |
| 19.2 | Claimed Count Verification (`CLAIMED_COUNT_REGEX`) & Non-Redundant Copy | `src/utils/smartAnswerUtils.js` | เมื่อลูกค้าพิมพ์ทวนจำนวนชิ้น (เช่น `"ของพี่ได้2ตัวใช่ไหม"`, `"พี่นับได่8"`, `"ใช่14ตัว"`) ต้องเทียบกับยอดในระบบและแสดงป้ายกระชับ `✅ ยอดตรง (X ตัว)` หรือ `⚠️ แจ้ง X (ในระบบ Y ตัว)` โดยห้ามแสดงชื่อลูกค้าซ้ำ (ยกเว้นถามแทน `isProxyTarget`), ห้ามพิมพ์รหัสสินค้าซ้ำในบรรทัดหัวข้อ, และห้ามใส่ป้ายที่อยู่/COD ซ้ำกับ `.chat-meta` ในหมวด `orders`/`item`/`yesterday`/`hold` |
| 19.3 | Full-Width Smart Answer Card & v-memo | `src/components/ChatPanel.vue` | smart-answer-card เป็น direct child ของ chat-row อยู่ใต้และนอก chat-bubble/chat-bubble-container; ใช้ grid-column 1 / -1 กว้างเต็มด้านในกรอบหลักรวมคอลัมน์รูป เว้นขอบซ้าย–ขวาเท่ากัน; หัวข้อกับปักหมุดอยู่แถวเดียว และ getSmartAnswerKey ยังใช้ใน v-memo เพื่ออัปเดตคำตอบจริงทุก field |
| 19.4 | 25s Pinned Smart HUD Banner (`pinnedSmartHud`, `pinnedHudTimer`) | `src/components/ChatPanel.vue` | เมื่อมีคำถามใหม่ที่มีข้อมูลในระบบเข้ามา ต้องปักหมุดแถบ `.smart-hud-banner` ด้านบนสุดของช่องแชทนาน 25 วินาที พร้อมปุ่มปิด `✕` และล้าง `pinnedHudTimer` ใน `onUnmounted` |
| 19.5 | แท็บกรอง `💡 คำถาม` & Cross-Panel Jump Actions | `src/components/ChatPanel.vue`, `src/components/StockGrid.vue` | แท็บ `💡 คำถาม` กรองเฉพาะคำถามลูกค้าพร้อมแสดงตัวเลขจำนวน และปุ่มคลิกรหัสสินค้า (`manowzab:jump-to-item`) / ดูรายการสะสม (`manowzab:show-owner-items`) เชื่อมต่อไปยัง `StockGrid.vue` ได้ถูกต้องพร้อมล้าง Event Listener เมื่อ Unmount |
| 19.6 | Text outline & narrow layout | `src/components/ChatPanel.vue` | ชื่อ เวลา ข้อความ และคำตอบมีขอบดำบางจาก text-shadow; ตรวจ panel กว้าง 200/280/390/440 px พร้อมชื่อยาว metadata หลายป้าย และคำตอบหลายบรรทัด ให้แผงคำตอบเต็มกรอบและไม่มี horizontal overflow; ป้ายชื่อยาวใช้ ellipsis ได้โดยยังแก้ข้อมูลลูกค้าได้ |
| 19.7 | Answer controls & scroll | `src/components/ChatPanel.vue`, `src/utils/smartAnswerUtils.js` | ปุ่มดูสินค้า #N → ส่ง manowzab:jump-to-item ถูกหมายเลข, pin/HUD ยังอัปเดตเมื่อ stock เปลี่ยน, ปิด HUD ได้ และยังหมดอายุ 25 วินาที; quick-order มี accessible name และอยู่ในกรอบ, คำตอบแยกแล้วไม่รบกวน bottom pinning หรือการเลื่อนขึ้นอ่านของผู้ใช้ |

---

## 🌊 20. ระบบเลื่อนหน้าจอเนียนนุ่ม Lenis Smooth Scrolling (v5.4.12+)

| # | ฟังก์ชัน | ไฟล์ | ต้องทำงานได้ |
|---|---|---|---|
| 20.1 | `useSmoothScroll(containerRef, options)` | `src/composables/useSmoothScroll.js` | เริ่มต้น Lenis กับคอนเทนเนอร์ ปรับแต่ง lerp/duration, ติดตั้ง ResizeObserver & MutationObserver สำหรับ auto-resize และคืนค่า lenis, scrollTo, resize, destroy |
| 20.2 | `v-smooth-scroll` Directive | `src/composables/useSmoothScroll.js`, `src/main.js` | ไดเรกทิฟ Vue ติดตั้ง Lenis บนคอนเทนเนอร์ใดๆ ผ่าน `<div v-smooth-scroll>` พร้อม cleanup อัตโนมัติเมื่อ unmounted |
| 20.3 | Layout 100dvh Preservation (`html.lenis, html.lenis body`) | `src/assets/style.css` | ป้องกันไม่ให้ `lenis.css` (ที่มี `height: auto`) ทำลายโครงสร้าง 100dvh และ overflow: hidden ของหน้าจอหลัก |
| 20.4 | Real-Time Chat Isolation (`data-lenis-prevent`) | `src/components/ChatPanel.vue` | ช่องแชทสด `#chat-viewport` ต้องมี `data-lenis-prevent` รับประกันว่าการเลื่อนแชทอัตโนมัติ การตรึงหมุดล่างสุด และการตรวจจับ `isUserScrolling` จะไม่ถูกดักจับหรือรบกวน 100% |
| 20.5 | Buttery-Smooth Stock Grid & Jump (`scrollToItem`) | `src/components/StockGrid.vue` | ตารางสินค้า `.stock-grid` เชื่อมต่อ Lenis เลื่อนล้อเมาส์นุ่มนวล และการกระโดดไปยังหมายเลขสินค้า (`scrollToItem`) เลื่อนแบบนุ่มนวลกึ่งกลางจออย่างแม่นยำ |
| 20.6 | Shipping Table Isolation | `src/components/ShippingManager.vue` | ตารางขนส่ง `.sm-table-wrap` ต้องมี `data-lenis-prevent` เพื่อความเร็วและการเลื่อนตารางแบบ native ที่เสถียร |

---

## 🔐 21. Firebase Authentication & Atomic Delivery Cycles (2026-10-30)

| # | ฟังก์ชัน | ไฟล์ | ต้องทำงานได้ |
|---|---|---|---|
| 21.1 | Firebase identity + administrator grants | `auth.js`, `useFirebase.js`, `database.rules.json` | ไม่ยอมรับ session ที่สร้างใน browser หรือ anonymous user; อ่าน/เขียนข้อมูลธุรกิจได้เฉพาะ UID ที่มี `admin_users/<UID> = true`; client แก้ grant ไม่ได้ |
| 21.2 | Login lifecycle | `App.vue`, `authStore.test.js` | เริ่ม listeners หลังตรวจสิทธิ์; logout/revoke หยุด listeners และ sign out จริง; countdown lockout ลดและปลดล็อกได้; ห้ามฝังรหัสผ่านใน `VITE_*` |
| 21.3 | Shared complete/undo transactions | `deliveryActions.js`, `deliveryState.js` | ทั้งหน้าต่างจัดส่งและหน้า shipping ใช้ helper เดียวกัน; สองเครื่องยืนยัน/ย้อนรอบเดียวกันได้เพียงครั้งเดียว; ปรับ status, sessions และ totalBookings ใน transaction เดียว |
| 21.4 | Shipped-item tracking and legacy records | `deliveryState.test.js`, `deliveryActions.test.js` | แก้ราคา/ชื่อ/UID ไม่ปลุกรายการส่งแล้ว; จองใหม่ในไลฟ์เดิมนับเฉพาะของใหม่; คืนได้เฉพาะรอบล่าสุดโดยคงรายการใหม่ไว้; ข้อมูลเก่าที่มี cycle metadata และประวัติ stock ที่ถูกล้างแล้วยังใช้งานได้ |
| 21.5 | Canonical delivery sync | `deliverySync.js`, `App.vue`, `Dashboard.vue`, `HistoryModal.vue` | ทุก writer ใช้ transaction helper กลาง; sync คนละ session พร้อมกันแล้วยอดรวมถูกต้อง; เก็บ fulfilledItems และ undo snapshot ไว้; ไม่เขียนซ้ำเมื่อค่าไม่เปลี่ยน |
| 21.6 | Firebase data representation | `deliveryState.test.js`, `scripts/verify-firebase.mjs` | รองรับ numeric-key maps ที่ Firebase คืนเป็น sparse/JSON arrays และลำดับ field ต่างกัน; ตรวจ state ฝั่ง server แยกจาก client cache ที่ตามหลังอีกเครื่องได้ |
| 21.7 | Python transcriber auth | `yt_transcriber.py`, `scripts/test_transcriber_auth.py` | ใช้บัญชีที่ได้รับสิทธิ์ผ่านตัวแปรฝั่ง Python ที่ไม่มี VITE_ เท่านั้น; ไม่ reuse token ที่หมดอายุ และไม่ส่ง transcript หากไม่มี token |
| 21.8 | Verification scope | `docs/verification-2026-10-30.md` | รัน npm test, test:transcriber, build และ test:firebase กับ Emulator; แยกผล automated ออกจาก live YouTube, เสียงจริง/iOS และเครื่องพิมพ์จริง ห้ามรายงานว่าทดสอบฮาร์ดแวร์แล้วจาก unit tests |

## ⚡ 22. Selective Reconciliation & Reactive Answer Cache (2026-10-30)

| # | ฟังก์ชัน | ไฟล์ | ต้องทำงานได้ |
|---|---|---|---|
| 22.1 | Selective delivery sync | `src/composables/useDeliveryReconciliation.js`, `src/__tests__/deliveryReconciliation.test.js` | ชุดจำลอง 300 คน: sync เริ่มต้น 300 ครั้ง, แก้ราคาหนึ่งรายการ 1 ครั้ง, เพิ่มคิวอย่างเดียว 0 ครั้ง; items ที่จัดกลุ่มตรงกับ bookingItems และยังผ่าน transaction guards เดิม ตัวเลขนี้นับ helper calls ไม่ใช่ HTTP requests |
| 22.2 | Cancellation/lifecycle | `src/__tests__/deliveryReconciliation.test.js` | sync เจ้าของเดิมและคนที่เลื่อนขึ้นคิว รวมการยกเลิกชิ้นสุดท้าย/ล้าง stock, รวมชื่อที่ normalize แล้ว, ซ่อม session ที่มาหลัง stock, ยกเลิก timer เมื่อ logout/unmount และ reset เมื่อเปลี่ยน video/login |
| 22.3 | Reactive Smart Answer cache | `src/composables/useSmartAnswerLookup.js`, `src/__tests__/smartAnswerLookup.test.js`, `src/components/ChatPanel.vue` | เรียกคำตอบซ้ำใช้ computed เดียว; nested price/chat edits และการแทน customer/address snapshots ต้องอัปเดตคำตอบ; ตรวจ blacklist/type ล่าสุดก่อนคืนค่า และให้ v-memo ใช้คำตอบครบทุก field เพื่อไม่ซ่อนการแก้ราคา/ที่อยู่; WeakMap ไม่เก็บ chat ที่ถูกตัดออกไว้ถาวร |
| 22.4 | Reproducible performance evidence | `scripts/benchmark-performance.mjs`, `docs/performance-2026-10-30.md` | รัน npm run benchmark:performance: สินค้า 300 รายการ/คำถาม 200 ข้อ/อ่าน 12 ครั้งต่อข้อความ ต้องลด resolver calls จาก 2,400 เหลือ 200; เวลาจริงขึ้นกับเครื่อง ไม่บังคับ timing เดิม และแยก synthetic, local production login, development dashboard กับ production field metrics |
| 22.5 | Dashboard proxy shipping | `src/components/Dashboard.vue` | import resolveDeliveryUid ครบ; เลือกลูกค้าแบบ proxy แล้วเพิ่มเข้าคิวส่งสำเร็จด้วย canonical key และ name key โดยไม่มี ReferenceError |

---

## 🚀 23. Release & Production Verification

| # | รายการตรวจ | หลักฐานที่ต้องบันทึก |
|---|---|---|
| 23.1 | Version/changelog | package.json, package-lock.json และ root package ใน lockfile ต้องเป็น version เดียวกัน; changelog ล่าสุดตรง version/date และเหลือประมาณ 15–20 entries; Header ใช้ ChangelogModal ที่อ่าน src/data/changelog.js ไม่เพิ่มรายการซ้ำใน Header |
| 23.2 | Firebase readiness | ระบุ project/database เป้าหมาย ตรวจ Email/Password, บัญชีไม่ disabled และ admin_users grant ก่อนเผยแพร่ login ใหม่; การ login CLI ไม่ได้ให้สิทธิ์แอดมินในแอปโดยอัตโนมัติ; การเพิ่ม/เปลี่ยนสิทธิ์ต้องอยู่ในขอบเขตที่ผู้ใช้อนุมัติ และไม่เปลี่ยนรหัสผ่านเดิมโดยพลการ |
| 23.3 | Production rules | ทดสอบ database.rules.json กับ emulator ก่อน deploy; GitHub Pages deploy ไม่ได้ deploy RTDB rules; หากเก็บ snapshot ให้แยก before/after และไม่เขียนทับต้นฉบับ จากนั้นตรวจ deployed rules เทียบ source; ไม่เก็บ token/รหัสผ่าน/ข้อมูลลูกค้าใน Git หรือรายงาน |
| 23.4 | Published artifacts | บันทึก source commit และ gh-pages commit; build ด้วย base /manowzab-v4/; ตรวจ main, shipping/, history/, address/ ได้ HTTP 200 และ HTML/entry scripts ตรงกับ build ล่าสุด |
| 23.5 | Production smoke check | เปิดหน้าเว็บจริงใน browser ตรวจ login inputs, console และ failed resources; ทดสอบ unauthenticated read ของ stock/delivery_customers/address_book ต้องถูกปฏิเสธ; แยกผลโหลดหน้า login ออกจากการเข้าสู่ระบบจริงและการทำงานหลังล็อกอิน |
| 23.6 | PWA และหลายอุปกรณ์ | อัปเดตแต่ละเครื่องเป็น version เดียวกันและเข้าสู่ระบบใหม่; ลอง reload/ปิดเปิดแอป, sync ข้อมูล, revoke และการแจ้งอัปเดตโดยไม่ขัดจังหวะไลฟ์; ระบุว่าทดสอบกับ browser/emulator หรืออุปกรณ์จริง ยังไม่ถือว่าผ่าน PWA/iPad จริงจาก build อย่างเดียว |

---

## How to Verify & Auto-Update Policy (บังคับทำทุกครั้ง)

1. Review the diff of changed files; เริ่มจาก working tree และระบุ version/commit ที่ตรวจ
2. For each changed file, check which checklist items (by number) it relates to
3. **Read the actual source code** of affected functions to verify logic is still intact
4. If any function may be broken, **fix it immediately** before proceeding
5. **🔄 คิดและอัปเดตกฎ + `/verify` อัตโนมัติทุกครั้ง (Proactive Rule & `/verify` Auto-Evolution)**:
   - ทุกครั้งหลังแก้ไขโค้ด เพิ่มฟีเจอร์ หรือปรับปรุงระบบ ให้วิเคราะห์ทันทีว่ามีข้อกำหนดสถาปัตยกรรมใหม่ หรือมีจุดใดในไฟล์กฎ (`AI_RULES.md`, `GEMINI.md`, `.agents/AGENTS.md`, `.agents/skills/manowzab-core/SKILL.md`) และรายการตรวจสอบใน `.agents/workflows/verify.md` ที่ควรเพิ่มหรืออัปเดตหรือไม่
   - **หากมี ต้องอัปเดตไฟล์กฎและ `/verify` ให้ทันทีโดยไม่ต้องรอให้ผู้ใช้สั่ง**
   - **ต้องรายงานให้ผู้ใช้ทราบทุกครั้ง** ว่าได้ตรวจสอบและอัปเดตกฎหรือ `/verify` ในส่วนใดบ้าง (หรือรายงานว่าตรวจสอบแล้วกฎและ `/verify` ปัจจุบันครอบคลุมครบถ้วนแล้ว)
6. เลือกคำสั่งตรวจตามส่วนที่เปลี่ยนและกฎโปรเจกต์:
   - โค้ดแอป: `npm test` และ `npm run build`; release GitHub Pages ใช้ `npm run build:gh`
   - Auth/rules/stock/delivery: เพิ่ม `npm run test:firebase` โดยเปิด Auth/RTDB emulators ก่อน ตาม [คู่มือทดสอบในเครื่อง](../../docs/firebase-auth-migration.md#ทดสอบในเครื่องโดยไม่แตะ-production); ห้ามเปลี่ยน harness ให้ชี้ production
   - Python transcriber: เพิ่ม `npm run test:transcriber`; performance: เพิ่ม `npm run benchmark:performance`
   - แก้เอกสารอย่างเดียว: ตรวจความตรงกับ source, ลิงก์, โครงสร้างตารางและ `git diff --check`; ไม่อ้างผลชุดทดสอบเก่าว่าเป็นการรันใหม่
7. รายงานแยก `ผ่าน automated`, `ผ่าน browser/manual`, `ตรวจ source เท่านั้น`, `ยังไม่ได้ทดสอบ` และ `ไม่เกี่ยวข้อง`; แนบคำสั่ง/ผล/สภาพแวดล้อมที่ใช้จริง ไม่ใช้คำว่า “ไม่กระทบ” แทนผลทดสอบ และไม่อ้างว่าทุกฟังก์ชันผ่านจาก unit tests อย่างเดียว
8. Report verification results in this format:
   ```
   ℹ️ 1.1 connectVideo — ตรวจ source เท่านั้น ยังไม่ได้ลอง live YouTube
   ✅ 21.3 complete/undo — ผ่าน Firebase emulator สอง clients ดู log/รายงานที่แนบ
   ⚠️ 4.1 queueAudio — ต้องตรวจสอบเพิ่ม (มีการแก้ไขใกล้เคียง)
   ❌ 3.1 processOrder — ระบุเคสที่ล้มเหลว; หลังแก้ต้องรันเคสเดิมซ้ำและบันทึกผล
   📋 อัปเดตกฎ & /verify — (ระบุรายการกฎและ /verify ที่อัปเดต หรือระบุว่าตรวจสอบแล้วเป็นปัจจุบัน)
   ```

---

## 📋 ผลอ้างอิงย้อนหลัง — v5.4.14 (2026-10-30)

ผลชุดนี้มาจากรอบแก้ไขและ release ก่อนหน้า การอัปเดตเอกสารครั้งนี้ไม่ได้รันทดสอบแอปใหม่ จำนวน tests/เวลาเป็นหลักฐาน ณ รอบนั้น ไม่ใช่ค่าที่ทุกรุ่นต้องเท่ากัน

| ขอบเขต | ผลที่ตรวจจริง | หลักฐาน |
|---|---|---|
| Unit/regression | npm test ผ่าน 321 tests ใน 24 files; รวม auth, delivery state/actions, selective reconciliation และ Smart Answer cache | [Release](../../docs/release-5.4.14.md), src/__tests__/ |
| Firebase integration | npm run test:firebase ผ่าน 23 checks กับ local Auth/RTDB และ actual stores; สอง clients ทดสอบจอง/คิว/ยอดรวม/complete/undo/revoke | [Verification](../../docs/verification-2026-10-30.md), scripts/verify-firebase.mjs |
| Python/build | Transcriber ผ่าน 3 tests; build:gh สร้างครบ 4 หน้าและ PWA 66 precache entries | [Release](../../docs/release-5.4.14.md) |
| Performance | 300 คน: price change 300 → 1 sync calls, queue-only 300 → 0; คำตอบ 2,400 → 200 resolutions, median งานจำลอง 1,098.23 → 112.61 ms | [Performance](../../docs/performance-2026-10-30.md) |
| Browser จำลอง | 200 answer cards, ราคาเปลี่ยนแล้วคำตอบ/ยอดจัดส่งเปลี่ยน, ค้นหารายการ 300, proxy shipping; local production login LCP 281 ms/CLS 0.00; dev interactions INP 120 ms/CLS 0.01 | [เงื่อนไขการวัด](../../docs/performance-2026-10-30.md) — ไม่ใช่ field metrics ของเว็บจริง |
| Production deploy | Source 9468d7f, gh-pages f20882e; ทั้ง 4 หน้าและ entry scripts ตรง build, rules ตรง source, owner grant พร้อม, unauthenticated data reads ถูกปฏิเสธ; หน้า login จริงไม่มี console errors/failed resources | [Release](../../docs/release-5.4.14.md) |

**ยังต้องตรวจด้วยผู้ใช้/อุปกรณ์จริง:** production password login และทุกหน้าหลังล็อกอิน, UI พร้อมกันสองเครื่องและ reconnect, live YouTube/API key rotation, Google/native TTS กับเสียงจริงและ iOS unlock, เครื่องพิมพ์/ขนาดฉลาก, PWA update บนอุปกรณ์ที่ติดตั้งอยู่ รวมถึงการตั้งค่าบัญชี Python transcriber ของเครื่องใช้งานจริง ห้ามเปลี่ยนสถานะรายการเหล่านี้เป็นผ่านจากหลักฐาน emulator/build เพียงอย่างเดียว

## 🎨 ผลตรวจ UI เพิ่มเติม — Smart Answer (2026-10-30)

- เปลี่ยนเฉพาะโครงสร้าง/สไตล์ ChatPanel และข้อความปุ่มดูสินค้า; คง answer resolver, computed cache และ event handlers เดิม
- ตรวจ component จริงผ่าน local fixture ที่ใช้ข้อมูลจำลองใน memory และ mock customer listeners; ไม่ใช่การทดสอบ Firebase integration หรือ production login
- Panel 200/280/390/440 px: คำตอบอยู่นอกฟองข้อความ เป็นลูกของกรอบหลัก กว้างเต็มด้านใน และไม่ล้นกรอบ; ชื่อยาว/metadata wrap, ตรวจขอบดำจาก computed styles และตรวจภาพ desktop/mobile emulation
- ทดสอบปุ่มดูสินค้าได้ itemId 16, pin เปิด HUD, เปลี่ยนข้อมูล stock แล้วคำตอบในการ์ด/HUD อัปเดต และ bottom gap เป็น 0 เมื่ออยู่ท้ายแชต
- npm test ผ่าน 321 tests; npm run build ผ่านครบ 4 หน้าและ PWA หลังปรับ UI รอบออกแบบ ยังไม่ได้ deploy ณ ตอนนั้น; เผยแพร่ภายหลังใน release 5.4.15 ตามผลล่าสุดด้านล่าง
- ผลบนอุปกรณ์จริง/เสียง/เครื่องพิมพ์และ UI สองเครื่องยังอยู่ในขอบเขตที่ต้องตรวจเพิ่มตามรายการก่อนหน้า

## 🚀 ผลตรวจ release ย้อนหลัง — v5.4.15 (2026-10-30)

- รันใหม่ในรอบ release: npm test ผ่าน 321 tests/24 files, test:firebase ผ่าน 23 checks, test:transcriber ผ่าน 3 tests, build:gh ผ่านครบ 4 หน้าและ PWA
- Benchmark counts ผ่าน: initial 300, price change 1, queue-only 0 sync calls; resolver 2,400 → 200 ครั้ง ตัวเลขเวลาแยกบันทึกใน release report และไม่ใช้แทนความเร็ว production
- Browser fixture: panel 200/280/390/440 px ไม่ล้น; black outlines และ full-width panel ถูกต้อง; jump itemId 16, pin/HUD reactive และหมดอายุ, quick-order dialog เปิด/ยกเลิกได้, question tab กรอง 3 คำถามโดยไม่รวม buy
- Scroll: อยู่ท้ายแชตแล้วข้อความใหม่ตามลงล่าง และเลื่อนขึ้นอ่านแล้วไม่ถูกดึงลงเมื่อมีข้อความใหม่
- ตรวจครบทุกหมวดโดยแยก automated/browser/source review/อุปกรณ์จริงตาม [coverage report](../../docs/release-5.4.15.md#checklist-coverage); production rules และ admin grant ตรวจแบบอ่านอย่างเดียว พร้อมใช้งานเดิม
- Deploy 5.4.15 สำเร็จ: source c4cec82, gh-pages 8ecfc81; HTML/entry JS ทั้ง 4 หน้าตรง build, browser โหลด CSS แผงเต็มความกว้างแล้ว ไม่มี failed resources/console errors ที่หน้า login; unauthenticated data reads ถูกปฏิเสธ ดู [release report](../../docs/release-5.4.15.md#deployment)
- เสียง/เครื่องพิมพ์/iPad จริง, PWA update บนอุปกรณ์ที่ติดตั้งอยู่ และ production password login ยังไม่ได้ทดสอบในรอบนี้


## 💬 ผลตรวจก่อน release — Chat Regex v5.4.16 (2026-10-31)

- วิเคราะห์ 5 CSV ครบ 307 ข้อความ; replay เปลี่ยน 19 แถว (16 ประเภท และ 3 ชื่อ/วิธีประมวลผล) ไม่ส่ง log จริงเข้าฐานข้อมูล
- npm test ผ่าน 730 tests/28 files รวม corpus 307 และ actual-processor side-effect/FIFO guards; npm run build ผ่าน 4 หน้า + PWA
- test:firebase ผ่าน 23 checks กับ local Auth/RTDB; test:transcriber ผ่าน 3 tests; benchmark counts ผ่าน (300/1/0 sync calls, 2,400 → 200 resolutions)
- เก็บ raw logs ใน ignored tmp และย้ายต้นฉบับเข้า old ด้วย hash verification/ไม่เขียนทับตาม archive manifest
- ณ รอบวิเคราะห์ยังไม่มี deploy; เผยแพร่ภายหลังตามผล release ด้านล่าง ส่วน live YouTube/เสียง/อุปกรณ์จริง/production password login ยังไม่ได้ตรวจ ดู [รายงานและขอบเขต](../../docs/chat-regex-review-2026-10-31.md)


## 🚀 ผลตรวจ release ล่าสุด — v5.4.16 (2026-10-31)

- รันใหม่ก่อนเผยแพร่: npm test ผ่าน 730 tests/28 files, test:firebase ผ่าน 23 local emulator checks, test:transcriber ผ่าน 3 tests, build:gh ผ่าน 4 หน้าและ PWA 66 precache entries
- Benchmark counts ผ่าน: sync 300/1/0 ครั้งและ answer resolutions 2,400 → 200; เวลาจำลอง 1,222.85 → 117.14 ms ในรอบนี้ ไม่ใช่ production field metric
- Source 088f143 และ gh-pages 88a66a2 เผยแพร่แล้ว; main/shipping/history/address ได้ HTTP 200 และ HTML/entry JS ตรง build; sw.js กับ manifest ตรง build เช่นกัน
- Browser หน้า login โหลด main-DTiVVHIt.js, มี email/password inputs, 27 network requests สำเร็จ และไม่พบ console warnings/errors; unauthenticated stock/delivery_customers/address_book reads ถูกปฏิเสธ HTTP 401
- กฎ/verify 2.11–2.15 อัปเดตแล้ว; raw logs ไม่อยู่ใน Git; ไฟล์ที่วิเคราะห์ 5 ไฟล์ย้ายเข้า old โดย hash ตรงและรักษาไฟล์ชื่อซ้ำเดิม
- ตรวจครบทุกหมวดโดยแยก automated/browser/source review/ยังไม่ได้ตรวจจริงตาม [coverage report](../../docs/release-5.4.16.md#checklist-coverage); production password login, live YouTube, เสียง/iOS/เครื่องพิมพ์จริง และ installed-device PWA update ยังไม่ได้ทดสอบ
