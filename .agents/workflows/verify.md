---
description: Mandatory verification checklist after every code change
---

# ✅ Post-Edit Verification Checklist

> **ต้องตรวจสอบทุกครั้งหลังแก้ไขโค้ด** — หากข้อใดเสียหาย ต้องแก้ไขก่อน commit
> รายการด้านล่างเป็นเกณฑ์ที่ต้องตรวจ ไม่ใช่หลักฐานว่าผ่านทุกฟังก์ชันแล้ว ต้องระบุวิธีตรวจและขอบเขตผลจริงเสมอ
> ผลอ้างอิงล่าสุด: **v5.8.1 — Auto Cleanup Index Fallback & Silent Chat Dedup Hotfix — 2026-11-26** ดูผลตรวจด้านล่าง; ผลอ้างอิงย้อนหลังดู [release report v5.4.20](../../docs/release-5.4.20.md) และ [v5.4.17](../../docs/release-5.4.17.md)

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
| 2.16 | Oct 31 – Nov 7 CSV Log Regex Hardening (`คนส่ง`/`พิมพ์ส่ง`, `ยังไม่ต้องแพ็ค`, `:emote:` stripping, `ADMIN_NAME_FIRST_QUESTION_NOTE_REGEX`) | `src/utils/chatParserUtils.js`, `src/composables/useChatProcessor.js`, `src/utils/smartAnswerUtils.js` | ป้องกัน `คนส่ง`/`พิมพ์ส่ง` ไปติด `SHIPPING`, รองรับ `ยังไม่ต้องแพ็ค` เป็น `holdRegex`, แยก `พร้อมโอน โอนทางไหนค่ะ` เป็น `QUESTION`, รองรับคำถามภาษาถิ่น/คำถามฝากถาม (`ขายให่แม่มัย`, `52ยายใส่ดัยบ่อนาง`, `65 นะคะคุณอ้อยถามว่า 65`), รองรับการจองที่มีสีคั่น/อีโมจิ YouTube ยาว (`77สีขาวค่ะ 60`, `สนใจรายการที่9`, `ปุยฝ้ายอยากได้เสื้อตัวเบอร์ 5 นะคะ:emote:...`), รองรับโน้ตแอดมินชื่อนำหน้าถามอก (`วาสนา แก้วใหญ่ 31 อกเท่าไหร่`) และพิมพ์ผิดขอลอง (`ลอฃ`), และบล็อกวลีสนทนา (`รอก่อนคะ`, `จอบเบิ่งอยู่เด้อ`, `สไปรท๋ออกมาเลย`, `รับจร้า`) ไม่ให้จำผิดเป็นชื่อลูกค้า |
| 2.17 | Zero Price Announcement Chat & Mute Price TTS Invariant | `src/stores/chat.js`, `src/components/ChatPanel.vue`, `src/composables/useChatProcessor.js` | ข้อความตรวจจับราคา/AI ตั้งราคา (`isPriceAnnouncementMessage`, `isVoiceChat`) ต้องอัปเดตราคาเข้าสต็อกอย่างเงียบเชียบ (Silent Update), ต้องไม่ส่งเสียง TTS หรือ SFX เด็ดขาด, และต้องถูกซ่อนจากหน้าต่างแชตทุกแท็บ 100% |
| 2.18 | Archived & Nov 8–21 Chat CSV (23 files), YouTube SBV/SRT (14 files) & AI Price Detector Regex Hardening (`v1.4.3`) | `src/utils/chatParserUtils.js`, `src/utils/smartAnswerUtils.js`, `live-product-capture-ai/src/engines/*`, `tests/test_nov15_logs_regression.py` | แชท: ป้องกัน `เอ็นดู`/`ดูซี`/`ดูเหมือน`/`รอดู`/`ให้ดู`/`ดูนาน`/`ดูทุกวัน`/`ดูใหม่`/`ดูวันนี้`, กัน `"จะยกให้พี่สาว"` และคำถามลงท้าย `เหรอ`/`หรอ` (`"นาวไม่เอาตัวหลุดมาขายเลยเหรอ"`) จาก `CANCEL_LATEST`, กัน `price-guard` ไม่ให้บังคำถาม (`"ที่ตัวละ20อกเท่าไรค่ะ"`), กัน `"ดู"`/`"โอ"`/`"อ่าน"`/`"รับทราบค่าา"`/`"พี่รับค่ะ ที่"`/`"ใส่ด้วย"`/`"ไม่ใช้แม่"`/`"หราาาา"`/`"น้ำตกที่ไหน"`/`"จะคอยตาม"`/`"ใบ่หายไป"`/`"ใช่ค่ะ"`/`"อ่านด้วย"`/`"จะเอฟต่อ"` ออกจากชื่อลูกค้า, รองรับ `"พี่รับค่ะ ที่2"` เป็น `explicit-keyword` และ `"มะระ สั่งเสื้อสีขาว 2 ตัว"` เป็น `ADMIN_NOTE`, แยก `"รอดูไลฟ์พรุ่งนี้ก่อน...ส่งทีเดียว"` เป็น `hold-keyword`, กัน `"ใหม่"` (`ใหม(?![่้๊๋])`) ออกจาก `QUESTION`, รองรับ `สีอาไร`/`ขายไม่ค่ะ`/`อีกไม่ค่ะ`/`ซักยังนาว`; และ AI จับราคา `v1.4.3`: กันเลขซ้ำล็อกตัวเอง (`20 20`/`40 40`), กันไซส์ US (`18 20 คือไซส์ 2 XL`), กันช่วงอกทั้งขาขึ้นและขาลง (`38 40 ยาว 23`, `42 40`, `40 38`, `5 3 6 40 ค่ะ`, `วัดตึง นาผ้า ได้ 54`), กันจำนวนผู้ชม (`10 20 11 ท่าน`), กันค่าส่งแบบตัดคำเว้นวรรค (`ค่า ส่ง กรณี โอน เงิน 40 บาท`), แปลง `อ 6 40`/`อ 640` เป็น `อก 40`, กันรหัส ASR หลอมรวมกระโดด `> 120` (`#196`/`#246`), กันข้าม `สุดท้ายแล้วนะ`, กัน sold recap (`เอ็ป แล้ว ตัวละ 20 บาท`), แปลง CJK/Whisper (`四 สิบ 六 สิบ`, `แบ่สิบ`, `80 7 80`, `CARDINAL_WORDS_REGEX` `(?!\s*สิบ)`), กรอง `100%`/`รหัส 60`/`ที่ 31 ค่ะ อก 56`, และห้าม rejected Jump-Guard ปิดรายการค้าง |
| 2.19 | Nov 22–23 Chat CSV (`6w97OPxsank`), YouTube SBV & Chrome Live Caption Hardening (`v1.5.1`) | `src/utils/chatParserUtils.js`, `src/__tests__/chatLogRegression.test.js`, `live-product-capture-ai` (`product_parser.py`, `price_resolution.py`, `live_stream_detector.py`, `test_chrome_caption_reader.py`) | แชท: รองรับคำเชื่อมจองหลายรายการ `และ`/`เเละ`/`กับ`/`กะ` (`"รับ12เเละ13"` ➔ `[12, 13]`), กัน `"สีเำหลัง64พี่ใส่ได้ไหคะ"` เป็น `QUESTION`, กัน `"พี่ขอดูไปเรื่อยๆก่อนค่ะ"` และ `"พรุ่งนี้ส่งรูปให้พี่ดูด้วย"` ออกจาก `TRY_ITEM`/`QUESTION`, กรอง `"พึ่งเข้ามา"`/`"นี่ค่ะ"`/`"ของพี่จ่ายวันนี้หมดเลยแต่ฝากไว้ก่อนค่ะ"` ออกจากชื่อลูกค้า; AI จับราคา `v1.5.1`: รวมหลักสิบแยก Chrome (`16 8 10` ➔ `16 80`, `5 7 6 10` ➔ `57 60`), แปลง `อบ 54` ➔ `อก 54` และ `4 7 6 40` ➔ `47 อก 40`, กัน `ประมาณ 38 40`, กันกระโดด `+25` (`รายการที่ 98`), จับ `780` ต่อจาก `#6`, และจำกัดช่วง `record_measurements` (อก 30–70 / ยาว 15–55) |
| 2.20 | Nov 25 Chrome Live Caption (`3xuQJPl0Wt8`), 4 YouTube SRT (`11/13/18/21-11-69.srt`) & Start-at-Item-1 Gate (`v1.5.5`) | `live-product-capture-ai` (`live_stream_detector.py`, `product_parser.py`, `price_resolution.py`, `test_chrome_caption_reader.py`) | **Start-at-Item-1 Gate** (`require_start_item_1=True` ค่าเริ่มต้น): รอ `"รายการที่ 1"` ก่อนเริ่มเปิดรายการ/ล็อกราคา (กัน `"20 100 บาท"`, `"20 ถึง 100 บาท"`, `"20 ไปจนถึง 100 บาท"`, `"รายการที่ 19"` ตอนเกริ่นเปิดร้าน + ปลดล็อกกลางไลฟ์อัตโนมัติเมื่อพบสต็อกเดิมใน Firebase หรือขายเรียงติดกัน 2 รายการชัดเจน); กัน `trailing_text` เก่าและ ASR compound inflation (`"รายการที่ 10 80 บาท"` + `"180 บาท"` คง `#10 = ฿80`); ย้าย `record_measurements()` หลังสลับรายการ + รองรับ `"31  31"` และลำดับถัดไป (`#29`, `#31`, `#52`, `#54`); กันรายการเลขเรียงช่วง 3 ตัว/เช็กว่าง (`"พิมพ์ให้หน่อย 15 20 25"`) และคง `pending_revision_for_item` สำหรับคำลดราคาแบบเปิด |

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
| 3.9 | Live Session Sales Revenue Badge (`totalSales`) | `src/stores/stock.js`, `src/components/StockGrid.vue`, `src/components/HistoryModal.vue` | แสดงป้ายยอดขายรวม `.total-sales-badge` (`ยอด: ฿...`) สีทองเรืองแสง แทนที่ข้อความไฟเริ่มติดแล้วเดิม คำนวณเฉพาะสินค้าที่มีเจ้าของและราคา (`item.owner && item.price > 0`) รองรับแอนิเมชันตัวเลข (`animateValue`), Pulse Effect เมื่อยอดขยับ, Tooltip สรุปจำนวนชิ้น, และ Responsive ซ่อน `ยอด:` บนจอมือถือ (`<= 768px`) |
| 3.9 | Stock Price Pill Badge | src/components/StockItemCard.vue | แสดงป้ายราคาสีเหลืองทอง .stock-price-pill เมื่อ item.price > 0 (ทั้งสินค้าที่จองแล้วและยังว่างอยู่) และซ่อนสนิทเมื่อไม่มีราคา คลิกเพื่อเปิด Queue Modal แก้ไขราคา |
| 3.10 | Queue Modal Price Editor & Quick Pills | src/components/StockGrid.vue | สามารถกรอกแก้ไขราคา editingPrice พร้อมปุ่มลัดราคา 50.-, 60.-, 80.-, 100.-, 120.-, 150.- และปุ่มล้างราคา บันทึกแล้วอัปเดตสต็อกและคำนวณ totalPrice ของลูกค้าอัตโนมัติ |
| 3.11 | Historical Live Session & Replay Price Sync | `src/components/HistoryModal.vue` | ในประวัติย้อนหลัง แสดงป้ายราคา .stock-price สำหรับทั้งสินค้าที่จองแล้วและยังว่างอยู่ (item.price > 0), พร้อมปุ่ม 'เปิดที่หน้าหลัก' (openOnMainBoard) สำหรับสลับ session activeVideo ไปหน้ากระดานหลักทันที |
| 3.12 | Spoken Permutation & Intervening Customer Name Price Detection | `live-product-capture-ai` (`product_parser.py`, `live_stream_detector.py`) | รองรับการพูดสลับลำดับทั้ง 6 รูปแบบของแม่ค้า (เช่น เบอร์+ชื่อ+ราคา, ราคา+เบอร์, ชื่อ+เบอร์+ราคา) พร้อมกรอง False Positive ป้องกันค่าส่ง/จำนวนตัว ไม่ให้ทับเบอร์สินค้า |
| 3.13 | Smart Compact Size Display, Editor & Size Search (`stockSizeUtils.js`) | `src/utils/stockSizeUtils.js`, `src/components/StockItemCard.vue`, `src/components/StockGrid.vue`, `src/components/HistoryModal.vue`, `src/__tests__/stockSizeUtils.test.js` | แสดงไซส์กระชับไร้กรอบ (`.stock-size-meta` สีฟ้าอ่อน เช่น `อก54`, `อก52-54`, `อก44-46`, `ฟรีไซส์`, หรือ `2XL`) ที่แถวล่างของการ์ดสต็อกทั้งหน้าหลัก (พร้อม `item.details`/`item.size` ใน `v-memo`) และหน้าประวัติย้อนหลัง, แสดงสเปกเต็มผ่าน Tooltip และช่องแก้ไข `สเปก/ไซส์` ใน Queue Modal (`v-model.number` + atomic write + ล้าง legacy `size: null`), คงค่าทั้ง `price` และ `details` ไว้ทุกจุดยกเลิก (`processCancel`, `processHistoryCancel`, `showOwnerItems` past-session cancel), และค้นหาตามไซส์ (`อก 52`, `อก52`, `2XL`) ได้โดยไม่กวนการค้นหาเลขรายการล้วน |

---

## 🔊 4. ระบบเสียง TTS & SFX

| # | ฟังก์ชัน | ไฟล์ | ต้องทำงานได้ |
|---|---|---|---|
| 4.1 | `queueAudio(sfxType, author, message)` | `src/composables/useAudio.js` | SFX + TTS เข้าคิวเรียงลำดับ ไม่ทับกัน |
| 4.2 | `playSfx(type)` | `src/composables/useAudio.js` | เล่น success/error/cancel ด้วย Web Audio API |
| 4.3 | `resetVoice()` | `src/composables/useAudio.js` | หยุดเสียงทั้งหมดทันที ล้างคิว |
| 4.4 | `unlockAudio()` | `src/composables/useAudio.js` | ปลดล็อกเสียงบน iOS/iPad |
| 4.5 | `ttsService.speak(author, message)` | `src/services/TextToSpeech.js` | ค่าเริ่มต้นอ่านด้วย Native Thai ฟรี; Cloud/fallback ใช้เฉพาะ build ที่เปิด Cloud อย่างชัดเจน |
| 4.6 | TTS ต้องอ่านทุกข้อความที่เข้าเกณฑ์ | `src/composables/useChatProcessor.js`, `src/stores/chat.js` | Processor ต้องบันทึก `sfxType`, `phoneticName`, `ttsText` ก่อนจบเส้นทางซื้อ/ยกเลิก/โน้ต; ให้ Firebase listener ใน `chat.js` เรียก `queueAudio()` เฉพาะข้อความใหม่ตาม time guard ข้อ 4.7 ห้ามเพิ่มเสียงตรงจาก processor; ยกเว้นข้อความต้อนรับที่อนุญาตไว้, ผู้ถูกแบน และ voice-chat ตามเงื่อนไขเดิม |
| 4.7 | Cross-Device Audio Playback | `src/stores/chat.js`, `src/composables/useChatProcessor.js` | ห้ามเรียก `queueAudio()` ตรงๆ ใน `useChatProcessor.js` (ยกเว้นเสียงต้อนรับ) เสียงทั้งหมดต้องถูกทริกเกอร์ผ่าน Firebase sync listener ใน chat store และเล่นเฉพาะแชทใหม่ (`timestamp >= syncStartTime - 5000` และ `isNew`) |
| 4.8 | Emoji and Run Fallback | `src/composables/useChatProcessor.js` | อ่านสติกเกอร์เป็น "ส่งสติกเกอร์" เมื่อ sanitizes เป็นค่าว่าง, fallback ไป `messageRuns` เมื่อ `displayMessage` ว่าง |
| 4.9 | เว้นวรรคหน่วงเวลาในคิวเสียง (`delayAfter`) | `src/composables/useAudio.js` | คิวเสียง `queueAudio` รองรับ `options.delayAfter` (เช่น 800ms) เพื่อเว้นจังหวะอ่านชื่อลูกค้าแต่ละคนให้ชัดเจน ไม่รัวติดกัน |
| 4.10 | ออกเสียงชื่อลูกค้าจริงเมื่อแอดมินจองแทน (Admin Proxy TTS) | `src/composables/useChatProcessor.js` | เมื่อแอดมินพิมพ์จองให้ลูกค้า เสียง TTS จะอ่านเป็นชื่อลูกค้าเท่านั้น ไม่นำชื่อแอดมินมาอ่าน |
| 4.11 | Shared Singleton `AudioContext` & LRU Cache | `src/services/TextToSpeech.js`, `src/composables/useAudio.js` | ใช้ `AudioContext` ร่วมกันตัวเดียว (`ttsService.getAudioContext()`) ทั้งระบบ TTS / SFX / Celebration พร้อม LRU Audio Buffer Cache (สูงสุด 200 รายการ) ลดเวลาถอดรหัสเสียงซ้ำ |
| 4.12 | Zero-Mute Admin Notes & TTS Fallback Guarantee | `src/composables/useChatProcessor.js`, `src/stores/chat.js`, `src/services/TextToSpeech.js` | แชทโน้ตแอดมิน (`admin-note`) และคำเฉพาะแอดมิน (`admin-stopword`) ต้องส่ง `ttsText: isVoiceChat ? "" : ttsMessage` ขึ้น Firebase เสมอ และ `chat.js` ต้องมี fallback ไปที่ `messageData.text` หาก `ttsText` ว่างเปล่า เพื่อรับประกันว่าจะไม่มีข้อความใดถูกตัดเสียงอ่านทิ้ง รวมถึงตัดชื่อซ้ำที่ท้ายข้อความใน TTS (`suffixRegex`) |
| 4.13 | Free / approved Cloud preference | Header.vue, system.js, ttsStore.test.js | free build คง TH ฟรี/native และไม่มี Cloud keys; Cloud opt-in ย้าย native เป็น standard ครั้งเดียวตาม policy แล้วรักษาการเลือก native ภายหลัง; แต่ละเครื่องตั้งค่าอิสระ |
| 4.14 | Cloud deadline / recovery | GoogleTtsAudio.js, TextToSpeech.js | Cloud opt-in: รอ fetch+body รวมทุกคีย์ไม่เกิน 2s; invalid key/network หมุนภายในงบเวลา; Billing/429 หยุดหมุนและพัก 60s/10s; ใช้ native ต่อคิว แล้ว retry อัตโนมัติ/ปุ่มสลับเสียง |
| 4.15 | Thai Cardinal Number & Multi-Buy Prefix (`numberToThaiWords`, `formatMultiBuyTtsMessage`) | `src/utils/thaiNumberWords.js`, `src/services/TextToSpeech.js`, `src/composables/useChatProcessor.js` | อ่านตัวเลขจองสินค้าเป็นจำนวนนับภาษาไทย เช่น "15" -> "สิบห้า" ไม่ใช่อ่านแยกทีละตัว "หนึ่งห้า", และเมื่อจองหลายรายการพร้อมกัน (`multi-buy`) ต้องอ่านคำว่า "รายการที่" นำหน้าเลขรายการทุกรายการ (เช่น "12 15" -> "รายการที่ สิบสอง รายการที่ สิบห้า ทั้งหมด สอง รายการ") พร้อมแปลง CF, ตัวเลขทับลำดับ, และปกป้องเบอร์โทรศัพท์ (08x/09x)/เวลา (13:11) |
| 4.16 | Zero TTS charges / Native lifecycle | nativeTts.test.js, ttsStore.test.js | free build ไม่มี Cloud endpoint/keys; direct speakOnline และ legacy settings ไม่ยิง HTTP; local Thai มาก่อน browser voice; delayed voices/error/end/reset ไม่ค้าง ไม่ซ้อน; browser บันทึก start/end แยกจากการฟังด้วยหู |
| 4.17 | Prefetch / cache / FIFO | GoogleTtsAudio.js, useAudio.js, cloudTts.test.js | เตรียม current+next2 ไม่เล่นเสียง; dedup ข้อความ/voice และ copy buffer; queueAudio เล่นตามลำดับ ไม่มีเสียงซ้อน/ข้อความหล่น; muted/native ไม่ prefetch |
| 4.18 | Reset / stale callbacks / two clients | cloudTts.test.js, audioQueuePrefetch.test.js | reset ระหว่าง fetch/decode/resume/SFX และ watchdog ต้องกัน callback เก่า; คิวใหม่ไม่ถูก finally เก่ารบกวน; ทดสอบสอง browser contexts แยกผลจากอุปกรณ์จริงและ live Google |
| 4.19 | Chirp 3: HD & Standard-A/Native Fallback | `GoogleTtsAudio.js`, `TextToSpeech.js`, `system.js`, `Header.vue`, `cloudTts.test.js`, `googleTtsAudio.test.js`, `ttsStore.test.js` | โหมด `achernar` (`th-TH-Chirp3-HD-Achernar` ค่าเริ่มต้น) และ `chirp3` (`th-TH-Chirp3-HD-Aoede`) ไม่ส่ง `pitch`/`speakingRate` ใน `audioConfig` และสลับสำรองอัตโนมัติ `Chirp3-HD -> Standard-A -> Native` โดย free build ยังคงเป็น `native` และไม่ยิง HTTP |
| 4.20 | TTS Character Quota Counter & 90% Auto-Switch | `src/utils/ttsQuota.js`, `system.js`, `GoogleTtsAudio.js`, `TextToSpeech.js`, `Header.vue`, `TtsQuotaModal.vue`, `ttsQuota.test.js` | นับตัวอักษรเฉพาะคำขอที่ยิง API สำเร็จจริง (ไม่นับ cache hit), ซิงค์ข้ามเครื่องผ่าน `settings/ttsUsage/{YYYY-MM}`, รีเซ็ตอัตโนมัติวันที่ 1 เวลา 00:00 PT (`America/Los_Angeles`) พร้อมแสดงเดือน/เวลารีเซ็ตเป็นภาษาไทย (`14:00/15:00 น. (เวลาไทย)`) และคืนเสียงหลักที่ถูกสลับออก, แสดงป้าย % บน Header และหน้าต่าง `TtsQuotaModal`, และสลับอัตโนมัติเมื่อถึง 90% (`Chirp3 900k -> Standard-A`, `Standard 3.6M -> Native`) โดย free build ไม่นับ/ไม่แตะ Firebase |
| 4.21 | Natural Thai Spacing & Zero Dot Verbalization (`จุด`) on Chirp 3: HD | `src/services/TextToSpeech.js`, `src/utils/thaiNumberWords.js`, `cloudTts.test.js`, `ttsStore.test.js`, `thaiNumberWords.test.js` | `formatSpeechText()` ใช้เว้นวรรคภาษาไทยล้วน (`${cleanAuthor} ${messageBody}`) ไม่ใช้ `" ... "` (กัน Chirp 3: HD อ่าน `"จุด"`) และไม่ใช้ `", "` (กันน้ำเสียง/จังหวะ Chirp 3: HD เพี้ยน), `formatMultiBuyTtsMessage()` ใช้ `"ทั้งหมด ... รายการ"`, และ `sanitize()` + `cleanAuthor` ล้างจุดไข่ปลาและจุดเดี่ยวที่ไม่ใช่ทศนิยมทั้งหมด (`ELLIPSIS_REGEX`, `NON_DECIMAL_DOT_REGEX` เช่น `"คุณสมใจ."`, `"คุณแม่.นาว"`, `"รับค่ะ."`, `"25. ค่ะ"`) พร้อมแปลงทศนิยมจริง (`38.5` ➔ `สามสิบแปดจุดห้า`) แบบ idempotent |
| 4.22 | AI Price Detector v1.5.0 Stock Compatibility | `src/stores/stock.js`, `stockStore.test.js`, `live-product-capture-ai/src/services/firebase_sync.py` | `processCancel()` คงทั้ง `price` และ `details` ที่ AI ซิงค์ไว้เมื่อเจ้าของคนเดียวยกเลิก (ไม่มีคิวสำรอง) และ `get_stock_snapshot()` ฝั่ง AI แปลง array จาก Firebase RTDB เป็น `dict` เสมอป้องกัน `AttributeError` ตอนสรุปยอดขาย |


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
| 6.6 | `HistoryModal` Mount & `historyTotalSales` | `src/components/HistoryModal.vue`, `src/__tests__/historyModal.test.js` | เปิด `HistoryModal.vue` ได้โดยไม่พังใน `setup()` (ต้องอ่านจาก `selectedItem.value?.orders` ห้ามอ้างอิงตัวแปร `allOrders` ที่ไม่มีอยู่จริง) และคำนวณป้ายยอดขาย `historyTotalSales` ตรงตามออเดอร์ที่โหลดจริงหรือ fallback ไป `selectedItem.value.totalSales` อย่างปลอดภัย |
| 6.7 | Historical Chat Replay (`แชท` Tab) & Shared Hybrid Helpers | `src/components/HistoryModal.vue`, `src/composables/useHistory.js`, `src/utils/chatDisplayUtils.js`, `src/__tests__/historyModal.test.js` | เปิดแท็บ `แชท` ในประวัติการจองได้โดยดึง `chats/{videoId}` แบบ read-only จาก `fetchHistoryChats(videoId)`, กรอง `isPriceAnnouncementMessage` ทิ้งทั้งหมด, ไม่เล่นเสียง TTS/SFX ใดๆ, ใช้ฟังก์ชันแชร์ร่วมกับ Live Chat (`chatDisplayUtils.js`: สีประจำตัว 360°, ขอบ Hybrid `4.5px`, proxy highlight, YouTube emotes), กรองตาม Intent Tab / ชื่อผู้พิมพ์ / คำค้นหา และ Export CSV แชทได้ครบ (ทำงานได้ทั้งใน Modal และหน้า `/history/`) |
| 6.8 | จัดเก็บและแสดงชื่อไลฟ์ย้อนหลัง | `src/composables/useYouTube.js`, `src/stores/stock.js`, `src/composables/useHistory.js`, `src/components/HistoryModal.vue`, `src/__tests__/historyPersistence.test.js` | บันทึก `history/{videoId}/title` แบบ non-destructive (`update` ไม่ทับ `totalSales`/`totalItems`/`timestamp` เดิม), ซิงค์ชื่อไลฟ์จาก `stock.js` เมื่อมี `liveTitle` จริง, แสดงแถบชื่อไลฟ์เต็ม + Video ID + วันที่ ใน `.history-live-title-bar`, แสดงชื่อ 2 บรรทัดพร้อมช่องค้นหาใน Sidebar และรองรับแก้ไขชื่อ / ดึงชื่อจาก YouTube (`syncMissingHistoryTitle`, `updateHistoryTitle`) ได้ทันที |
| 6.9 | History Modal & Page Friendly UX Redesign | `src/components/HistoryModal.vue`, `src/pages/HistoryPage.vue`, `src/__tests__/historyModal.test.js` | ขยายพื้นที่ Modal เป็น `max-width: 1320px; height: 90vh`, ใช้ Sidebar 280px โทน Champagne Gold พร้อมตัวนับจำนวนไลฟ์/จำนวนชิ้น/ยอดขาย + Mobile Drawer (`<= 860px`), หน้าว่างมีปุ่ม "เปิดไลฟ์ล่าสุด" 1 คลิก, แยกปุ่มอันตราย (`ล้างกระดาน`/`ลบไลฟ์`) เป็น Ghost Icon ชัดเจน, เพิ่ม KPI ชิปคลิกกรองได้ (`ขายแล้ว`/`เหลือว่าง` สลับไป `grid` อัตโนมัติเมื่อกดจากโหมดอื่น), ปุ่มกรองสถานะ (`ทั้งหมด`/`ขายแล้ว`/`ว่าง`), Segmented Control (`กระดาน`/`รายการ`/`แชท` จำค่าใน `localStorage` ค่าเริ่มต้น `grid`), การ์ด Grid 3 แถวคลีนเหมือนหน้าหลัก (ลบ legacy CSS `.queue-badge`/`.owner-count-badge` ที่ทับซ้อน), ตาราง List กรองเฉพาะรายการที่มี `owner` และรองรับ sparse array `null` holes พร้อมซ่อน raw UID + แปลงที่มาเป็นภาษาไทย (`แชทสด`/`แอดมินเพิ่ม`/`คิวสำรอง`/`AI`), และ `exportCSV` แนบคอลัมน์ `Details` + `URL.revokeObjectURL` |

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
| 9.3 | 60fps GPU-Only Main Page Animations & Reduced Motion | `src/components/StockItemCard.vue`, `src/components/StockGrid.vue`, `src/components/HistoryModal.vue`, `src/assets/style.css` | การ์ดจองใหม่ (`.new-order` นาน 8 วิ) คงเลขรายการ `.stock-num` ไร้กรอบ + เด้งป๊อป 1 ครั้ง + แสงทองกวาด GPU `translate3d` 2 รอบ (ไม่มี `infinite` repaint `background`/`box-shadow`), การ์ดยกเลิก (`.cancelled-blink` นาน 10 วิ) สั่น 1 ครั้ง + กะพริบ `opacity` GPU-only, `.mini-shimmer` ใช้ GPU `translate3d`, ถอด `infinite box-shadow` ออกจาก `.ds-pack-glow`/`.vip-admin`, แชทเข้าใหม่สไลด์ขึ้นสั้นๆ `0.15s` (`translateY(4px)`), และรองรับ `@media (prefers-reduced-motion: reduce)` |

---

## 📦 10. ระบบจัดการจัดส่ง (Shipping Manager)

| # | ฟังก์ชัน | ไฟล์ | ต้องทำงานได้ |
|---|---|---|---|
| 10.1 | Firebase CRUD & Non-Destructive Shipping Removal (`delivery_customers/{uid}`) | `src/components/ShippingManager.vue`, `src/pages/ShippingPage.vue`, `src/utils/deliveryActions.js`, `src/stores/customer.js` | เพิ่ม/แก้ไขลูกค้าได้ตามสิทธิ์ และเมื่อกดปุ่ม 🗑️ (`deleteCustomer` / `removeFromShippingList`) **ห้ามลบรายชื่อลูกค้าออกจาก `delivery_customers` เด็ดขาด** ให้ล้างเฉพาะ `deliveryDate: null` และสถานะพิมพ์ใบปะหน้า (`unscheduleDeliveryState`) เพื่อนำออกจากรายการจัดส่งและย้ายไปเก็บในหมวด "ฝากสินค้า" เท่านั้น; modal ใช้ข้อมูลจาก shared customer store ห้ามเพิ่ม listener ของ delivery_customers/address_book ซ้ำใน component |
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
| 10.15 | Legacy missing/mismatched-identity review | `deliveryActions.test.js`, `deliveryState.test.js`, `scripts/verify-firebase.mjs` | ยอดเก่า 8 + ใหม่ 2 (รวมกรณีกระดานเก่ามีรายการไม่ตรงกับยอดคงค้าง เช่น บันทึก 2 แต่พบ 6 ในกระดานเดิม): แจ้งให้ตรวจพัสดุและยืนยัน 10 ก่อนส่ง; ยกเลิกไม่เขียน; อ่าน stock ซ้ำและปฏิเสธ snapshot เปลี่ยน/กดซ้ำ; บันทึก boardItems ลง fulfilledItems โดยไม่ขยายยอดใน lastDoneSnapshot; เก็บ legacyCountConfirmed และ undo คืนยอดเดิมพร้อมของใหม่ ห้ามลด 10 เหลือ 2 หรือเพิ่มเป็น 14 อัตโนมัติ |
| 10.16 | Self-Healing Deleted Address Book Customers (`restoreDeletedAddressBookCustomers`) | `src/utils/deliverySync.js`, `src/components/ShippingManager.vue`, `src/pages/ShippingPage.vue` | กู้คืนรายชื่อลูกค้าที่มีข้อมูลอยู่ใน `address_book` แต่เคยถูกลบโหนด `delivery_customers` จากปุ่มถังขยะแบบเก่า ให้กลับมาอยู่ในหมวด "ฝากสินค้า" (`deliveryDate: null`, `status: 'pending'`) โดยอัตโนมัติพร้อมที่อยู่/COD/ช่องทางติดต่อครบถ้วน |
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
| 15.4 | `getCustomerCleanAddress(customer)` / `cleanShippingLabelAddress` | `src/components/ShippingLabelModal.vue`, `src/utils/addressParser.js` | ตัดชื่อผู้รับนำหน้า เบอร์โทรศัพท์ และรหัสไปรษณีย์ที่ติดอยู่ในข้อความที่อยู่ออกอัตโนมัติ เพื่อป้องกันการพิมพ์ซ้ำซ้อนบนใบปะหน้า |
| 15.5 | Isolated Direct Print Engine (`handlePrint`) & Font Ready Guard | `src/components/ShippingLabelModal.vue` | พิมพ์ผ่าน off-screen iframe ขนาดเท่ากระดาษจริง (ห้ามใช้ 0x0), รอ `<link id="label-font-link">` + `document.fonts.ready` ก่อนสั่งพิมพ์, ใช้ `@page { size: <width> <height>; margin: 0mm; }` ที่ถูกต้องตามมาตรฐาน W3C (ห้ามใส่ `landscape` ต่อท้ายตัวเลข 2 ค่า) และห้ามใส่ `'TH Sarabun New'` ใน `font-family` |
| 15.6 | สั่งพิมพ์รายบุคคล (`openPrintForCustomer`) | `src/components/ShippingManager.vue`, `src/pages/ShippingPage.vue`, `src/components/ShippingLabelModal.vue` | เมื่อกดปุ่ม `🖨️` ที่แถวลูกค้า ต้องเปิดหน้าต่างพิมพ์และเลือกเฉพาะลูกค้ารายนั้น (1 คน) เสมอ แม้ลูกค้าจะยังไม่ได้ระบุวันส่ง |
| 15.7 | บันทึกสถานะ "พิมพ์แล้ว" (`togglePrinted`, `toggleCustomerPrinted`) | `src/components/ShippingManager.vue`, `src/pages/ShippingPage.vue`, `src/components/ShippingLabelModal.vue` | อัปเดต `labelPrinted: boolean` และ `labelPrintedAt: timestamp` ลง Firebase ทันทีเมื่อคลิกสลับ หรือเมื่อสั่งพิมพ์ใบปะหน้าเสร็จสิ้น |
| 15.8 | Customer Selector & Filter Chips | `src/components/ShippingLabelModal.vue` | ค้นหาชื่อผู้รับ, เลือก/ยกเลิกทั้งหมด, กรองเฉพาะที่ยังไม่พิมพ์ (`unprinted`) และสลับเลือกรายชื่อแบบ Checkbox ได้อย่างอิสระ |
| 15.9 | Clean Borderless WYSIWYG Label Layout (130x76mm / 76x130mm) | `src/components/ShippingLabelModal.vue` | ดีไซน์สะอาดตา ไร้กรอบดำ ผู้ส่งอยู่ซ้าย ผู้รับอยู่ขวา ขนาดตัวหนังสือสั่งพิมพ์เทียบสัดส่วน 1:1 พอดีเป๊ะตามพรีวิวบนหน้าจอ (`13.5pt` ชื่อผู้รับ, `11pt` ที่อยู่พร้อมย่ออัตโนมัติเมื่อที่อยู่ยาว, `14pt` รหัสไปรษณีย์, `9.5pt` COD/โอน, `10pt` ผู้ส่ง) พร้อมตัวเลือกปรับสเกลฟอนต์ (`labelFontScale`: พอดีตามพรีวิว / กะทัดรัด / ตัวใหญ่) |
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
| 16.6 | Restored UI baseline | `App.vue`, `Header.vue`, `ChatPanel.vue`, `StockGrid.vue`, `StockItemCard.vue`, `AuthGate.vue` | ตามคำขอล่าสุด คืน UX/UI เป็น v5.4.18; เทียบ source b50aca2 ยกเว้น changelog; ไม่ใช้ข้อกำหนด UI v5.4.19 ที่ถูกยกเลิก |
| 16.7 | Preserve TTS and parser on UI rollback | `TextToSpeech.js`, `GoogleTtsAudio.js`, `useAudio.js`, chat/parser tests | Google Standard/native fallback/opt-in/free boundary/FIFO/deadlines และ regex ตรง v5.4.18; รันทดสอบปัจจุบัน ไม่ใช้จำนวน 800 tests ของ v5.4.19 อ้างแทน |
| 16.8 | Original queue UX | `StockGrid.vue` | เปิด/แก้ไข/บันทึก/เลื่อนรายการตาม source v5.4.18; draft UI/dirty guard ของ v5.4.19 ถูกถอนตาม rollback และผลทดสอบเดิมเป็นประวัติเท่านั้น |
| 16.9 | Original responsive layout | `App.vue`, `Header.vue`, `ChatPanel.vue`, `system.js` | คืน chat collapse และ layout เดิม; ไม่มี mobile workspace tabs/desktop resizer/workspace.css หรือ references ของฟีเจอร์ที่ถอน; ตรวจ browser และ PWA artifacts หลังเผยแพร่ |
| 16.10 | Original appearance and order effect | `StockGrid.vue`, `ChatPanel.vue`, `StockItemCard.vue` | สี/แสง/ปุ่มเดิมตรง v5.4.18, Smart Answer เต็มกรอบและขอบดำยังอยู่, new-order timer เดิม 15000ms; เลข release เพิ่มต่อเนื่องเพื่อให้ client ตรวจพบ rollback update |
| 16.11 | Quiet Luxury Full-Width Header & Mobile Pane Tabs (v5.5.0+) | `App.vue`, `Header.vue`, `style.css` | `<Header />` อยู่เหนือ `.app-layout` เต็มความกว้าง, แสดง `.mobile-pane-tabs` ที่ `<= 900px` สำหรับสลับหน้าจอสินค้า/แชท, `.version-badge` อ่านชัดเจน, และคง `100dvh` Lenis lock |
| 16.12 | 3-Tier Stock Card, Zero Row Overlap & Animations (v5.5.0+) | `StockItemCard.vue`, `StockGrid.vue` | การ์ด 3 ระดับไม่ซ้อนทับแถวข้างล่าง (ห้ามมี `.stock-item` หรือ `aspect-ratio: 1.35` ซ้ำใน `StockGrid.vue`; ใช้ `grid-auto-rows: minmax(104px, auto); align-items: stretch;`), แสดงแอนิเมชันจองใหม่/เลื่อนคิว (`newOrders` -> `newOrderLuxPulse` / `.new-order-shimmer`) และยกเลิก (`cancelShakeEntry` / `.cancel-flash-sweep`), `.stock-search-input` ไม่ตัดคำ และ `.quick-filter-select` มีลูกศรเดียวไม่ซ้อน |
| 16.13 | Live Monitor Chat Readability, Unified Single-Card, Per-Customer Row Colors & Non-Clipping Tabs/Header (v5.6.4+) | `ChatPanel.vue`, `style.css` | ข้อความแชทใหญ่คมชัด (`1.18rem`, `#ffffff`), `.chat-panel` กว้าง `430px` (`min-width: 410px`), ใช้การ์ดชั้นเดียว (`.chat-bubble` โปร่งใสไร้กรอบซ้อน, `.chat-name` สะอาดตา, ปุ่มกรองรายคนชิดขวา), แชทลูกค้าทุกประเภทรวมถึง จอง/ส่ง ใช้แบบผสม (Hybrid): พื้นหลังไล่สีตามตัวบุคคล 360 องศา (`getCustomerRowColor()` FNV-1a + `getChatRowStyle()`) แต่ขอบและแถบซ้าย `4.5px` + ป้ายใต้รูปแสดงสีตามคำสั่ง (`#10b981` จอง, `#a855f7` ส่ง, `#f43f5e` ยกเลิกพร้อมพื้นแดงเตือนภัย, และการ์ดแอดมินสีทองพร้อมแถบซ้ายตามคำสั่ง), แถบแท็บ `.chat-intent-tabs` แสดงครบทั้ง 7 แท็บโดยไม่ล้นขอบขวา, `.btn-collapse` แบบไอคอนไม่ทำให้หัวแชทล้นขอบขวา และ `#chat-viewport` ใช้ `scroll-behavior: auto` |
| 16.14 | Quiet Luxury Shipping Manager Readability (v5.5.0+) | `ShippingManager.vue`, `style.css` | โมดอลกว้าง `1040px`, การ์ด KPI/แท็บ/ป้ายสถานะโทน Quiet Luxury, `.item-count-auto` ใช้ `white-space: nowrap` ไม่ตกบรรทัด, ปุ่มจัดการใช้ FontAwesome สม่ำเสมอ, และปุ่มลบคงเป็น non-destructive |
| 16.15 | High-Contrast Booked vs Vacant Stock Cards, Background-Free Price/Num & Drag-Select Guard (v5.6.4+) | `StockItemCard.vue`, `StockGrid.vue`, `HistoryModal.vue`, `style.css` | การ์ดสินค้าที่ **จองแล้ว** (`.stock-item.sold` สีแดงเข้ม Burgundy/Crimson สบายตาไม่แสบตา + ขอบทึบ `1.5px solid rgba(248, 113, 113, 0.65)`) แยกชัดเจนจากรายการ **ว่าง** (`.stock-item:not(.sold)` พื้นมืดจมตัว + ขอบเส้นประ `1.5px dashed`), เลขรายการ (`.stock-num` `1.2em`) และป้ายราคา (`.stock-price-pill` `1em` สีทองสว่าง) ต้องไม่มีพื้นหลังกล่องทึบ (`background: transparent; border: none;`) เพื่อให้อ่านง่ายทั้งการ์ดว่างและการ์ดจองแล้ว รวมถึงใน `HistoryModal.vue`, และลากเมาส์ผ่าน `.header`, `.stock-panel`, `.stock-item`, `.grid-item` ต้องไม่เกิดการลากคลุมสีฟ้า (`user-select: none`, โดย `input`/`textarea` ยังพิมพ์/คลุมได้ปกติ) |

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
| 18.1 | `formatBackdatedCard(ts)` | src/utils/timeFormatUtils.js, src/components/StockItemCard.vue | แสดงเฉพาะไอคอนย้อนเวลา (.backdated-inline-icon) ต่อท้ายชื่อลูกค้าโดยตรง ไม่แสดงข้อความเวลา เพื่อความกะทัดรัดและคลีนตา |
| 18.2 | `formatBackdatedDetail(ts)` & `formatNormalBookingTime(ts)` | src/utils/timeFormatUtils.js, src/components/StockGrid.vue, src/components/HistoryModal.vue | ในหน้าต่างจัดการคิว (Modal) แสดงป้าย ⏳ ย้อนหลัง • วันนี้/เมื่อวาน/วันที่ HH:mm เด่นชัด และรายการปกติแสดงเวลาสะอาด 🕒 HH:mm |
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
| 23.7 | Billing budgets / enforced limits | ตรวจ currency/monthly scope/projects/services/credits/thresholds/recipients จาก API readback พร้อม etag; alerts และ payment threshold ไม่ใช่ hard cap; ตรวจ eligibility และ response ที่ deploy จริงแยกกัน; ไม่ทดสอบด้วยการปิด production หรือสร้างค่าใช้จ่าย; หลักฐานบัญชีเก็บใน ignored local ตาม [คู่มือ](../../docs/cloud-billing-controls.md) |

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


## 🚀 ผลตรวจ release ย้อนหลัง — v5.4.16 (2026-10-31)

- รันใหม่ก่อนเผยแพร่: npm test ผ่าน 730 tests/28 files, test:firebase ผ่าน 23 local emulator checks, test:transcriber ผ่าน 3 tests, build:gh ผ่าน 4 หน้าและ PWA 66 precache entries
- Benchmark counts ผ่าน: sync 300/1/0 ครั้งและ answer resolutions 2,400 → 200; เวลาจำลอง 1,222.85 → 117.14 ms ในรอบนี้ ไม่ใช่ production field metric
- Source 088f143 และ gh-pages 88a66a2 เผยแพร่แล้ว; main/shipping/history/address ได้ HTTP 200 และ HTML/entry JS ตรง build; sw.js กับ manifest ตรง build เช่นกัน
- Browser หน้า login โหลด main-DTiVVHIt.js, มี email/password inputs, 27 network requests สำเร็จ และไม่พบ console warnings/errors; unauthenticated stock/delivery_customers/address_book reads ถูกปฏิเสธ HTTP 401
- กฎ/verify 2.11–2.15 อัปเดตแล้ว; raw logs ไม่อยู่ใน Git; ไฟล์ที่วิเคราะห์ 5 ไฟล์ย้ายเข้า old โดย hash ตรงและรักษาไฟล์ชื่อซ้ำเดิม
- ตรวจครบทุกหมวดโดยแยก automated/browser/source review/ยังไม่ได้ตรวจจริงตาม [coverage report](../../docs/release-5.4.16.md#checklist-coverage); production password login, live YouTube, เสียง/iOS/เครื่องพิมพ์จริง และ installed-device PWA update ยังไม่ได้ทดสอบ


## 🔊 ผลตรวจ Native Thai TTS — v5.4.17 (2026-11-02)

- ผู้ใช้เลือกไม่มีค่าบริการ TTS; ไม่เปิด Billing และไม่เปลี่ยน payment/account settings
- npm test ผ่าน 745 tests/29 files; build:gh ผ่าน 4 หน้าและ PWA 66 entries; free build ไม่มี endpoint text:synthesize และไม่มีคีย์ Google TTS เดิมทั้งสอง
- Browser fixture ใช้ Header, system store, useAudio และ TextToSpeech จริง ปิดเฉพาะ shipping listener ของ Header และใช้ review environment; saved standard ย้ายเป็น native และไม่มี Cloud key
- Microsoft Pattara (Thai, localService=true) ได้ start/end ครบทั้งปุ่ม TH ฟรี และคิว สมใจ 15 / มะระ จอง 26 ตามลำดับ; Cloud request count = 0; การฟังเสียงด้วยหูและอุปกรณ์อื่นต้องตรวจแยก
- หมวด auth/rules/stock/delivery ใช้ source เดิมและ unit suite รอบนี้ ไม่ได้รัน Firebase emulator ใหม่สำหรับการเปลี่ยน TTS นี้; ผล 23 checks ของ v5.4.16 เป็นหลักฐานย้อนหลัง
- รายละเอียดและสถานะเผยแพร่ดู [release report](../../docs/release-5.4.17.md)


## 🚀 ผลตรวจ release ล่าสุด — v5.4.17 (2026-11-02)

- Source 9e1c81d และ gh-pages 90e6940 เผยแพร่แล้ว; ทั้ง 4 หน้า/entry scripts, sw.js และ manifest ตรง build; ทุกหน้าได้ HTTP 200
- เว็บจริงโหลด main-67CtCFLO.js และ actual system store แสดง v5.4.17, mode=native, cloudEnabled=false, ไม่มี Cloud keys; จำลอง saved standard ก่อน boot แล้วเปลี่ยนเป็น native สำเร็จ
- หน้า login ไม่มี console warnings/errors; 27 network requests สำเร็จ; unauthenticated stock/delivery_customers/address_book ถูกปฏิเสธ HTTP 401
- กฎโหมดฟรี/verify 4.5/4.13/4.14/4.16 อัปเดตแล้ว; ไม่เปิด Billing หรือเปลี่ยนการชำระเงิน; fixture server หยุดแล้ว
- ผ่าน 745 tests/29 files และ browser speech events ตามผลด้านบน; ไม่มีการอ้างว่าทดสอบเสียงด้วยหู/อุปกรณ์อื่นหรือ production password login แล้ว ดู [ขอบเขตครบทุกหมวด](../../docs/release-5.4.17.md#checklist-coverage)


## 🔊 ผลตรวจรุ่นเตรียมเผยแพร่ — v5.4.18 (2026-11-02)

- npm test ผ่าน 772 tests/32 files รวม loader, actual TTS service, outer FIFO/reset และ migration ครั้งเดียว; corpus แชต 307 แถวยังผ่าน
- build:gh ผ่านครบ 4 หน้าและ PWA 66 entries; free-check build ผ่าน และ artifact audit ยืนยัน free bundle ไม่มี synthesize endpoint/คีย์ TTS เดิม
- Browser fixture ใช้ Header/system/useAudio/TextToSpeech จริงในสอง isolated contexts: Cloud opt-in ย้าย native เป็น standard และเล่นสองข้อความตามลำดับ สูงสุด 1 source ต่อ context; โหลดข้อความถัดไปก่อนเสียงแรกจบ ช่องว่างจำลองประมาณ 4ms
- Mock Billing failure ทำให้ Microsoft Pattara อ่านสองข้อความสำรอง มี start/end ครบตามลำดับและคิวจบ; payload Cloud ใน fixture เป็น MP3 จำลอง จึงไม่ใช่หลักฐานว่า live Google ใช้งานได้
- ช่วงเตรียมพบ HTTP 403 BILLING_DISABLED; หลังผู้ใช้แก้บัตรเอง ตรวจ Billing open=true และทั้งสองคีย์ HTTP 200 ได้ MP3 11,520 bytes (mono 24kHz, 1.44s), full response 538/478ms; agent ไม่ได้ชำระเงิน เปลี่ยนบัตร ซื้อเครดิต หรือเปลี่ยน Billing
- อัปเดตกฎทั้ง 4 ไฟล์และ verify 4.13/4.14/4.17/4.18 แล้ว; ก่อน deploy รันใหม่ npm test ผ่าน 772 tests/32 files และ build:gh ผ่าน; ผลเผยแพร่บันทึกด้านล่างเมื่อสำเร็จ
- Live browser fixture สอง isolated contexts ใช้คีย์จริง #1/#2 และ services จริงกับข้อความจำลอง: HTTP 200 สองข้อความต่อ context, Cloud start/end ครบ FIFO, max active source=1, ไม่ fallback และ error=null; header latency 286–583ms และ gap จำลองสภาพแวดล้อมนี้ 2–5ms ไม่ใช่ค่ารับประกัน production
- ผล Firebase emulator ของรุ่นก่อนเป็นหลักฐานย้อนหลัง รอบนี้รัน unit/regression และ browser fixture; เสียงผ่านลำโพงจริง สองอุปกรณ์จริง iPad/installed PWA/เครื่องพิมพ์/live YouTube และ production password login ยังไม่ได้ทดสอบ ดู [ขอบเขตและขั้นตอนต่อ](../../docs/release-5.4.18.md)


## 🚀 ผลตรวจ release ล่าสุด — v5.4.18 (2026-11-02)

- Source 0574a37 / gh-pages 6e9bab0 เผยแพร่แล้ว; main/shipping/history/address และ entry scripts ตรง build, HTTP 200; sw.js และ manifest ตรงเช่นกัน
- เว็บจริงโหลด main-CYE8PLUZ.js; actual store version v5.4.18, mode standard, Cloud enabled=true; จำลอง saved native ของรุ่นเดิมแล้ว migrate เป็น standard สำเร็จ
- หน้า login ไม่มี console warnings/errors และ 27 requests แรกสำเร็จ; unauthenticated stock/delivery_customers/address_book ยัง HTTP 401; ไม่ได้ลอง production password login/ข้อมูลธุรกิจจริง
- ยิงข้อความจำลองจากโดเมน production ด้วยคีย์จาก actual store ทั้งคู่ได้ HTTP 200 และ MP3 13,632 bytes ต่อคีย์ ใช้เวลา 341/906ms; แยกหลักฐานนี้จาก browser fixture ที่ทดสอบ actual queue/playback และจากอุปกรณ์จริง
- npm test ผ่าน 772 tests/32 files และ build:gh ผ่าน; อัปเดตกฎ/verify 4.13/4.14/4.17/4.18 พร้อมผล Billing recovery และ deployment; ดู [รายงานรุ่น](../../docs/release-5.4.18.md)

## 🎨 ผลตรวจ UX/UI — v5.4.19 (2026-11-02)

- ทำครบ 6 ข้อที่อนุมัติ: connection/receipt age, เสียงตาม engine จริงแยกเครื่อง, draft คิว, responsive workspaces/resize, touch/keyboard และสี/เอฟเฟกต์ที่อ่านง่าย
- npm test ผ่าน 800 tests/33 files; build:gh ผ่าน 4 หน้า + PWA 66 entries; test:firebase ผ่าน 23 checks กับ localhost demo project และ actual stores/two clients; test:transcriber ผ่าน 3 tests
- Benchmark sync 300/1/0 calls และ answer resolution 2400 → 200; เวลาจำลองไม่ใช่ค่ารับประกันเว็บจริง
- Browser actual App กับ auth/database mock เฉพาะ ignored local fixture: desktop 1024/1280 และ mobile emulation 320/390/768px, resize pointer/keyboard/persist, local preferences ต่าง contexts, CSV 83 messages, dirty discard/cancel/save failure/retry/save-next, focus trap และ Escape ผ่าน
- จับเวลา new-order class หายที่ 15006ms; incoming order ไม่เปลี่ยน mobile chat tab; reduced motion ปิด animation; Smart Answer full-width/ขอบดำ/filter/pin/jump และ bottom pin/อ่านย้อนหลังผ่าน
- อัปเดตกฎทั้ง 4 ไฟล์และ verify 16.6–16.10; รายละเอียดและสถานะเผยแพร่ดู [release report](../../docs/release-5.4.19.md)
- เสียงลำโพงจริง/สองอุปกรณ์จริง/iOS/installed PWA/live YouTube/เครื่องพิมพ์ และ production password login ยังไม่ได้ทดสอบในรอบนี้; ไม่อ้างว่า unit/fixture คือการทดสอบทั้งหมดบนระบบจริง

## 🚀 ผลเผยแพร่ล่าสุด — v5.4.19 (2026-11-02)

- Source 594def4 / gh-pages 1760466; หลังรอ Pages propagation ตรวจ main/shipping/history/address และ entry scripts ตรง build ทั้งหมด, sw.js/manifest ตรง และ HTTP 200
- เว็บจริงโหลด main-B72hritM.js; actual store v5.4.19, Cloud enabled=true, mode=standard; login labels/password visibility ผ่าน, 28 requests ได้ 200/304, ไม่มี console warnings/errors
- unauthenticated stock/delivery_customers/address_book ยังคงถูกปฏิเสธ HTTP 401; ไม่ได้ลอง production password login หรือเขียนข้อมูลธุรกิจจริง
- Cloud/free artifact audit และ diff check ผ่าน; fixture tabs ปิดและ localhost server ของงานหยุดแล้ว; ขอบเขตการตรวจและอุปกรณ์จริงที่ยังไม่ทดสอบดู [release report](../../docs/release-5.4.19.md)

## ↩️ ผลตรวจคืน UX/UI v5.4.18 — release v5.4.20 (2026-11-02)

- ผู้ใช้ขอย้อน UX/UI กลับ v5.4.18: source ใต้ src ตรง b50aca2 ยกเว้น changelog และเก็บ trailing whitespace 1 จุด; diff แบบ ignore-space-at-eol ยืนยันตรงกัน
- ถอน UX v5.4.19 และ tests/helpers ที่ใช้เฉพาะฟีเจอร์ที่ถอน; ไม่คืน parser/TTS ไปก่อน v5.4.18 และไม่แก้ Billing/ข้อมูลธุรกิจ; ใช้ release 5.4.20 เพื่อให้ client ตรวจพบ update
- npm test ผ่าน 772 tests/32 files, build:gh ผ่าน 4 หน้า/PWA 66 entries และ free-check build/audit ผ่าน; changelog 20 entries; diff check ผ่าน
- Firebase Emulator ผ่าน 23 checks ด้วย actual stores/two clients ใน localhost demo project หลังเริ่ม Auth แยกแก้ startup timeout ของรอบแรก
- Browser fixture actual App กับ mock auth/database: desktop 1280px/mobile emulation 390px เห็น layout/ปุ่ม/สี/คิวเดิม ไม่มี tabs/resizer/status ใหม่; collapse เปิดปิดได้; แก้ชื่อและบันทึกคิวได้; Smart Answer เต็มกรอบ/ขอบดำ/filter/pin ยังทำงาน; timer รายการใหม่เดิม 15000ms
- อัปเดตกฎทั้ง 4 ไฟล์และ verify 16.6–16.10 ให้ตรง baseline ล่าสุด; ผล 800 tests และ UX checks ของ v5.4.19 ด้านบนเป็นประวัติ ไม่ใช่ข้อกำหนด active หลัง rollback
- ยังไม่ได้ทดสอบ production password login, live YouTube/Google synthesis, สองอุปกรณ์/เสียง/iPad/เครื่องพิมพ์/installed PWA จริงในรอบนี้; ดู [release report](../../docs/release-5.4.20.md)

## 🚀 ผลเผยแพร่ UX/UI แบบ v5.4.18 — release v5.4.20 (2026-11-02)

- Source 6d247e9 / gh-pages 7b1efa3 เผยแพร่แล้ว; ตรวจ HTML/entry scripts main/shipping/history/address, sw.js และ manifest ตรง final build หลังรอ Pages propagation
- เว็บจริงโหลด main-CsYnv42a.js; store v5.4.20, Cloud enabled=true/mode standard และไม่มี state mobilePanel/chatPanelWidth ของ UI ที่ถอน; หน้า login ไม่มี console warnings/errors
- unauthenticated stock/delivery_customers/address_book ยังคง HTTP 401; ยังไม่ได้ production password login หรือเขียนข้อมูลธุรกิจจริง
- localhost fixture/Auth/RTDB หยุดแล้ว (5190/9098/9009 ไม่ listen); หลัง emulator ผ่าน 23 checks มี Vite dependency-scan cancellation ตอน teardown ซึ่งแยกจากผล build/test ที่ผ่าน ดู [release report](../../docs/release-5.4.20.md)

## 📦 ผลตรวจ Legacy Shipment Review & Non-Destructive Shipping Removal — v5.4.21–v5.4.23 (2026-11-06 ถึง 2026-11-08)

- **v5.4.21–v5.4.22 (Legacy Shipment Review)**: รองรับการกดส่งแล้ว (`✅` `markDone`) เมื่อรอบเก่าที่มีแต่จำนวนรวม (`count > 0`, ไม่มี `items` array) มีรายการใน `stock/${videoId}` ไม่ตรงกับยอดที่บันทึกไว้ (เช่น บันทึกไว้ 2 ชิ้น แต่พบในกระดาน 0 หรือ 6 ชิ้นจากรอบก่อนหน้า เช่น `aAs6hsbgtpg` ของคุณอาทิตยา) โดยเปิดหน้าต่างให้ตรวจพัสดุและยืนยันยอดจริงแทนการบล็อก พร้อมบันทึก `fulfilledItems` เพื่อไม่ให้ยอดเก่าดีดกลับมาค้างส่ง และคงยอดเดิมเมื่อกดย้อนสถานะ (`↩️`)
- **v5.4.23 (Non-Destructive Shipping Removal)**: แก้ปุ่มถังขยะ (`🗑️` `deleteCustomer` / `removeFromShippingList`) ใน `ShippingManager.vue` และ `ShippingPage.vue` ไม่ให้ลบรายชื่อออกจาก `delivery_customers` เด็ดขาด เปลี่ยนเป็น `unscheduleDeliveryState` (`deliveryDate: null`, `labelPrinted: false`, `labelPrintedAt: null`, คง `status: 'pending'`) เพื่อย้ายกลับไปหมวด `🛋️ ฝากสินค้า` โดยคงรายชื่อ ยอดสะสม ที่อยู่ และประวัติครบ 100% พร้อม `restoreDeletedAddressBookCustomers()` กู้คืนรายชื่อที่มีอยู่ใน `address_book` แต่เคยถูกลบออกจาก `delivery_customers`

## 💬 ผลตรวจ Chat Log Regex Hardening — v5.4.24 (2026-11-08)

- วิเคราะห์ไฟล์แชทสดจริง 5 ไลฟ์ (31 ต.ค. – 7 พ.ย. 2569 รวม 261 แถว): ป้องกัน `คนส่ง`/`พิมพ์ส่ง` ไปติด `SHIPPING`, รองรับ `ยังไม่ต้องแพ็ค` เป็น `holdRegex`, แยก `พร้อมโอน โอนทางไหนค่ะ` เป็น `QUESTION`, รองรับคำถามภาษาถิ่น/ฝากถาม (`ขายให่แม่มัย`, `52ยายใส่ดัยบ่อนาง`, `65 นะคะคุณอ้อยถามว่า 65`), รองรับการจองที่มีสีคั่นหรืออีโมจิ YouTube ยาว (`77สีขาวค่ะ 60`, `สนใจรายการที่9`, `:emote:...`), รองรับโน้ตแอดมินชื่อนำหน้าถามอก (`วาสนา แก้วใหญ่ 31 อกเท่าไหร่`) และบล็อกวลีสนทนาไม่ให้จำผิดเป็นชื่อลูกค้า

## 🏷️ ผลตรวจใบปะหน้าพัสดุความร้อน (Thermal Shipping Label Typography & Clean Address) — v5.4.25 (2026-11-09)

- **สาเหตุที่แก้ไข**:
  1. ถอด `'TH Sarabun New'` ออกจาก `font-family` ทั้งหมดใน `src/components/ShippingLabelModal.vue` เพราะบนเครื่อง Windows ที่ติดตั้งฟอนต์ดังกล่าวไว้ เมื่อ Google Font (`Sarabun`) ใน `iframe` ขนาด `0x0` โหลดไม่ทันภายใน 250ms เบราว์เซอร์จะตกลงไปใช้ `TH Sarabun New` ซึ่งทำให้ตัวอักษรไทยเล็กลงและบางลง ~35% ที่ขนาด `pt` เดียวกัน
  2. ปรับ `iframe` สำหรับพิมพ์ใน `handlePrint()` ให้มีขนาดเท่ากระดาษจริงนอกจอ (`width: pageWidth; height: pageHeight; left: -9999px; visibility: hidden;`) และรอทั้งเหตุการณ์ `load` ของ `<link id="label-font-link">` ร่วมกับ `document.fonts.ready` (มี timeout guard 800ms) ก่อนสั่ง `print()`
  3. แก้ไข `@page { size: 130mm 76mm landscape; }` ซึ่งผิดไวยากรณ์ W3C CSS Paged Media (ห้ามใส่ `<length> <length>` ร่วมกับ `landscape`) เป็น `@page { size: ${pageWidth} ${pageHeight}; margin: 0mm; }` ที่ถูกต้องตามมาตรฐาน
  4. ขยายขนาดและเพิ่มความหนาตัวอักษรสำหรับเครื่องพิมพ์ความร้อน 203 DPI (`receiver-name: 16.5pt / 700`, `receiver-addr: 13.5pt / 600` พร้อมย่ออัตโนมัติเมื่อที่อยู่ยาวเกิน 85/130 ตัวอักษร, `receiver-zip: 18pt / 800`, `receiver-phone: 13.5pt / 700`, `sender-name: 12pt / 700`, `meta-payment-row: 12.5pt / 800`)
  5. เพิ่ม `cleanShippingLabelAddress` ใน `src/utils/addressParser.js` และเชื่อมกับ `getCustomerCleanAddress` ใน `src/components/ShippingLabelModal.vue` เพื่อตัดชื่อผู้รับนำหน้า เบอร์โทรศัพท์ และรหัสไปรษณีย์ที่ซ้ำซ้อนอยู่ในบรรทัดที่อยู่ออกอัตโนมัติ (ทดสอบ regression เคส `คุณสายบัว บุญพิมล 156/2 หมู่5 ต.บางทราย อ.เมือง จ.ชลบุรี 20000 โทร.061-941-9895` ➔ `156/2 หมู่5 ต.บางทราย อ.เมือง จ.ชลบุรี`)
- **ผลตรวจ Automated & Build**:
  - `npm test` ผ่าน **838 tests ใน 32 ไฟล์** (รวม `src/__tests__/addressParser.test.js` 20 tests ตรวจ `cleanShippingLabelAddress` และตรวจ source ของ `ShippingLabelModal.vue` ว่าไม่มี `'TH Sarabun New'`, ไม่มี `@page ... mm ... mm landscape`, และมีขนาดฟอนต์ `16.5pt` / `13.5pt` / `18pt` ครบถ้วน)
  - `npm run build` และ `npm run build:gh` ผ่านครบ 4 หน้า (`index.html`, `shipping/index.html`, `history/index.html`, `address/index.html`) และ PWA 65 precache entries
  - อัปเดตกฎโปรเจกต์ครบทั้ง 4 ไฟล์ (`AI_RULES.md`, `GEMINI.md`, `.agents/AGENTS.md`, `.agents/skills/manowzab-core/SKILL.md`) และรายการตรวจสอบข้อ `6.6`, `15.4`, `15.5`, `15.9` ใน `.agents/workflows/verify.md`
  - **ยังต้องตรวจด้วยอุปกรณ์จริง**: การสั่งพิมพ์ออกเครื่องพิมพ์สติกเกอร์ความร้อนจริงหน้างานหลังรีเฟรชเป็น `v5.4.25`

## 🏷️ การปรับเทียบขนาดฟอนต์ใบปะหน้าสั่งพิมพ์ให้ตรงตามพรีวิว 1:1 (WYSIWYG Shipping Label Font Calibration) — v5.4.26 (2026-11-10)

- **สาเหตุที่แก้ไข**:
  ผู้ใช้แจ้งฟีดแบ็กจากการใช้งานจริงกับเครื่องพิมพ์บลูทูธความร้อน (A70 Pro) ว่า *"ใบปะหน้า ตอนพรีวิวขนาดตัวหนังสือพอดี แต่พอสั่งปริ้นตัวหนังสือใหญ่ไป อยากได้ขนาดตอนพรีวิว"*
  จากการตรวจสอบพบว่าในเวอร์ชัน 5.4.25 ขนาดฟอนต์สั่งพิมพ์ใน `handlePrint()` ถูกปรับขยายเป็น `16.5pt` / `13.5pt` / `18pt` ซึ่งคิดเป็นสัดส่วนสูงกว่าขนาดบนพรีวิวการ์ดหน้าจอถึง 20%–36% ส่งผลให้ข้อความตัวใหญ่แน่นเกินไปเมื่อเปิดหน้าต่างสั่งพิมพ์ของเบราว์เซอร์
- **สิ่งที่ดำเนินการ**:
  1. คำนวณอัตราส่วนเรขาคณิตระหว่างการ์ดพรีวิวบนหน้าจอ (580px x 339px) กับขนาดกระดาษพิมพ์จริง (130mm x 76mm = 368.5pt x 215.4pt) ทำให้ได้สเกลแปลงขนาดพิกเซลพรีวิวเป็น `pt` สิ่งพิมพ์ที่แม่นยำ `0.635 pt/px`
  2. ปรับขนาดฟอนต์สั่งพิมพ์เริ่มต้นให้สอดคล้องกับพรีวิวแบบ 1:1:
     - ชื่อผู้รับ (`receiver-name`): `13.5pt` (ชื่อยาว `11.5pt`)
     - ที่อยู่ผู้รับ (`receiver-addr`): `11pt` (ที่อยู่ยาว `9.8pt` / ยาวพิเศษ `8.8pt`)
     - รหัสไปรษณีย์ (`receiver-zip`): `14pt` (ความหนา 800 ชัดเจน)
     - เบอร์โทรผู้รับ (`receiver-phone`): `11pt`
     - ข้อมูลผู้ส่ง (`sender-name: 10pt`, `sender-addr: 8.5pt`, `sender-phone: 8.5pt`)
     - ข้อมูลระบบและสถานะจัดส่งมุมล่างซ้าย (`meta-system-name: 9pt`, `meta-payment-row: 9.5pt`)
     - ข้อความขอบคุณ (`card-footer`): `9pt`
  3. เพิ่มตัวเลือกสเกลขนาดตัวอักษร (`labelFontScale`) ในแถบเมนูตัวเลือกของ `ShippingLabelModal.vue`:
     - `"preview"`: พอดีตามพรีวิว (แนะนำ / ค่าเริ่มต้น 100%)
     - `"compact"`: กะทัดรัด (ย่อ -10%)
     - `"large"`: ตัวใหญ่ (+20%)
     บันทึกลง `localStorage` (`manowzab_label_font_scale`) อัตโนมัติ โดยสเกลนี้จะปรับทั้งพรีวิวบนจอและหน้าสั่งพิมพ์พร้อมกันแบบ WYSIWYG
- **ผลตรวจ Automated & Build**:
  - `npm test` ผ่าน **838 tests ใน 32 ไฟล์**
  - `npm run build` ผ่าน 100% ครบทุก entry point
  - อัปเดตกฎและเอกสารสถาปัตยกรรมครบถ้วน (`AI_RULES.md`, `GEMINI.md`, `.agents/AGENTS.md`, `.agents/skills/manowzab-core/SKILL.md`, `.agents/workflows/verify.md`)

## 🔇 Zero Price Announcement Chat & Mute Price TTS Guarantee — v5.4.31 (2026-11-11)

- **สาเหตุที่แก้ไข**:
  ในการทดสอบระบบตรวจจับราคาและขนาดสินค้าด้วย AI แบบเรียลไทม์ มีข้อความระบบแจ้งราคา เช่น `🎙️ [AI ตั้งราคา] รายการที่ 3 ราคา ฿50` จาก `AI ระบบเสียง` ส่งเข้าช่องแชทและมีเสียงอ่าน TTS แทรกระหว่างไลฟ์ ผู้ใช้ต้องการให้ราคาอัปเดตขึ้นบนการ์ดสินค้าอย่างเงียบสนิท ไม่ต้องพูดอ่านออกเสียง และไม่ให้แสดงกล่องข้อความเหล่านี้ในช่องแชท
- **สิ่งที่ดำเนินการ**:
  1. ตัดการส่งข้อความแจ้งราคาเข้า Firebase `chats/{videoId}` ออกจากทั้ง Python Transcriber (`live_stream_detector.py`, `firebase_sync.py`) และ Web Chat Processor (`useChatProcessor.js`)
  2. เพิ่มฟังก์ชันตรวจจับและกรองข้อความแจ้งราคาแบบเบ็ดเสร็จ `isPriceAnnouncementMessage(m)` ใน `src/stores/chat.js` และ `src/components/ChatPanel.vue`
  3. ดักจับทุกคุณลักษณะของข้อความแจ้งราคา (`type === 'price_update'`, `id` ขึ้นต้นด้วย `ai-price-` หรือ `voice-price-`, `text` มี `[AI ตั้งราคา]`, ผู้ส่งเป็น `AI ระบบเสียง`, `ระบบตรวจจับราคา (AI)`, `ระบบเสียงสด (AI)`, หรือ `detectionMethod` เป็น `realtime-live-ai` / `voice-price-extractor`)
  4. กรองข้อความทั้งในขั้นตอนรับเข้า (`addMessage`, `onChildAdded`) และการเรนเดอร์ใน UI (`visibleMessages`, `filteredVisibleMessages`) เพื่อให้กล่องข้อความที่เคยส่งไปแล้วในอดีตถูกซ่อนสนิทเมื่อเปิดหน้าเว็บ
  5. ตัดการส่งเข้าคิวเสียง `queueAudio` เพื่อรับประกันไม่มีเสียงอ่านราคาพูดแทรก 100%
- **ผลตรวจ Automated & Build**:
  - `npm test` ผ่าน **840 tests ใน 32 ไฟล์**
  - `npm run build:gh` ผ่านครบ 4 หน้าและ PWA 65 precache entries
  - อัปเดตกฎโปรเจกต์ครบถ้วน (`AI_RULES.md`, `.agents/AGENTS.md`, `.agents/workflows/verify.md`)

## 🎨 ผลตรวจ UX/UI ใหม่ (Quiet Luxury Obsidian & Champagne Gold) — v5.5.0 (2026-11-13)

- **สิ่งที่ดำเนินการ**:
  1. ปรับดีไซน์ภาพรวมเป็น **Quiet Luxury (Obsidian & Champagne Gold)** สำหรับแม่ค้าดูหน้าจอระหว่างไลฟ์สด พร้อมสำรองไฟล์ต้นฉบับไว้ใน `src/_backup_v5.4.34/` (ถูก ignore จาก Git ตาม `.gitignore`)
  2. **Layout & Header (`App.vue`, `Header.vue`, `style.css`)**: ย้าย `<Header />` ขึ้นเต็มความกว้างเหนือ `.app-layout`, เพิ่มแถบสลับมุมมองมือถือ `.mobile-pane-tabs` (`<= 900px`), ลบอีโมจิซ้ำซ้อนข้าง FontAwesome, และเพิ่มความชัด `.version-badge` (`#94a3b8`)
  3. **Stock Cards & Grid (`StockItemCard.vue`, `StockGrid.vue`)**: จัดโครงสร้างการ์ด 3 ระดับไม่ทับซ้อน, เพิ่มแอนิเมชันจอง/เลื่อนคิว (`newOrders` ➔ `orderPopEntry` / `newOrderLuxPulse` / `.new-order-shimmer`) และแอนิเมชันยกเลิก (`cancelShakeEntry` / `cancelPulseLux` / `.cancel-flash-sweep`), ขยาย `.stock-search-input` เป็น `150px` ไม่ให้ตัดคำ, และแก้ไข `.quick-filter-select` ให้เหลือลูกศรเดียวไม่ซ้อน
  4. **Live Chat (`ChatPanel.vue`, `style.css`)**: ขยายตัวอักษรแชทสำหรับอ่านตอนไลฟ์ (`.chat-bubble` `1.18rem`, `#ffffff` 600/700, `.chat-meta` `0.98rem`), ขยาย `.chat-panel` เป็น `430px` (`min-width: 410px`), ใช้ `.btn-collapse` แบบไอคอนเพื่อไม่ให้หัวแชทล้นขอบขวา, และแก้ไข `#chat-viewport` เป็น `scroll-behavior: auto` ตามเกณฑ์ข้อ `13.3`
  5. **Shipping Manager (`ShippingManager.vue`, `style.css`)**: ปรับความกว้าง `1040px`, การ์ด KPI/แท็บ Segmented Control/ป้ายสถานะโทน Quiet Luxury, `.item-count-auto` ใช้ `white-space: nowrap` ไม่ตกบรรทัด, ปุ่มจัดการ FontAwesome สม่ำเสมอ, และคง non-destructive removal (`removeFromShippingList`)
- **ผลตรวจ Automated & Build (`v5.5.0`)**:
  - `npm test` (`vitest run`): ผ่านครบ **32 ไฟล์ / 842 tests** (`5.35s`)
  - `npm run build` (`vite build`): ผ่าน (`134 modules transformed`, `3.41s`, PWA `precache 66 entries`)
  - `npm run build:gh` (`vite build --base=/manowzab-v4/`): ผ่านครบ 4 entry pages + PWA `66 entries` (`3.17s`)
  - อัปเดตกฎโปรเจกต์ครบ 4 ไฟล์ (`AI_RULES.md`, `GEMINI.md`, `.agents/AGENTS.md`, `.agents/skills/manowzab-core/SKILL.md`), `.agents/workflows/verify.md` (`16.11`–`16.14`), และ `src/data/changelog.js` / `package.json` / `package-lock.json` (`v5.5.0`)
  - **ขอบเขตที่ยังต้องสังเกตหน้างานจริง**: การแสดงผลบนมือถือ/อุปกรณ์จริงขณะไลฟ์สด YouTube, เสียง TTS ลำโพงจริง และเครื่องพิมพ์ความร้อน

## ✅ ผลตรวจการแก้ไข v5.5.1 (2026-11-15)

- **สิ่งที่แก้ไข**:
  1. ลบสไตล์ `.stock-item` และ `aspect-ratio: 1.35` ชุดเก่าที่ซ้ำซ้อนออกจาก `src/components/StockGrid.vue` เหลือเฉพาะกฎ `.stock-grid` (`grid-auto-rows: minmax(104px, auto); align-items: stretch;`) และกำหนด `aspect-ratio: auto; height: auto;` ใน `src/components/StockItemCard.vue` เพื่อแก้ปัญหาการ์ดแถวบนล้นลงมาซ้อนทับการ์ดแถวล่าง
  2. เพิ่ม `formatMultiBuyTtsMessage()` ใน `src/utils/thaiNumberWords.js` และเชื่อมเข้า `src/composables/useChatProcessor.js` เพื่อให้การจองหลายรายการพร้อมกัน (`multi-buy`) อ่าน `"รายการที่ "` นำหน้าเลขรายการทุกรายการ (กัน `"รายการที่"` ซ้ำ) พร้อมคง `"ทั้งหมด ... รายการ"`
  3. (ฝั่ง AI `live-product-capture-ai`) ปรับ `run_live_realtime.bat` และ `src/services/session_resolver.py` ให้ส่ง `PYTHONUTF8=1` / `PYTHONIOENCODING=utf-8` และดึง metadata ด้วย `yt-dlp -J` เพื่อให้แสดงชื่อไลฟ์ภาษาไทยและอีโมจิครบถ้วนบน Windows
- **ผลตรวจ Automated**:
  - `npm test` (`vitest run`): ผ่านครบ **32 ไฟล์ / 848 tests** (เพิ่ม 6 เคสใหม่ใน `thaiNumberWords.test.js` และ `chatProcessorLogRegression.test.js`)
  - `main-*.css` ตรวจซ้ำ: ไม่มี `aspect-ratio: 1.35` และเหลือ `.stock-item` เฉพาะของ `StockItemCard.vue`
  - **ขอบเขตที่ยังต้องตรวจหน้างาน**: การแสดงผลสดบนเบราว์เซอร์และการฟังเสียง TTS multi-buy ผ่านลำโพงจริงหลังรีเฟรชเป็น `v5.5.1`

## 🛡️ ผลตรวจ Full-Stack Bug Audit & Hardening — v5.7.8 (2026-11-24)

- **สิ่งที่ตรวจสอบและแก้ไขฝั่ง `manowzab-v4`**:
  1. **Firebase Data Safety & Reconciliation**: ป้องกัน `clearAllStock()`/`processOrder()`/`processCancel()`/`updateItemData()` เขียนหรือลบ `stock/` เมื่อ `currentVideoId` ว่าง, capture `videoId` ก่อน `await`, รองรับ Firebase sparse array (`null` holes), ล้าง `backdated` ค้างตอนจองปกติ, รอ `stockStore.loadedVideoId === currentVideoId` ก่อน reconcile, และรวม concurrent proxy bookings ผ่าน `_pendingProxyUids`
  2. **Blacklist, Chat, Audio & Lifecycle**: ตรวจแบนทั้ง `realName` และ `displayName` + Channel ID แม้ไม่มีชื่อ, sanitize key ด้วย `sanitizeDbKey`, กันไม่ให้ `chatStore.addMessage` ทับชื่อลูกค้า proxy ด้วยชื่อเล่นแอดมิน, กันแอดมินยกเลิกแบบระบุชื่อไม่ให้ตกเป็น wildcard `null`, แก้ `multiBuyRegex` `"เอา 12 15 มะระ"`, แก้ `isDateMismatch` `"วันที่ 3 ส.ค. 15"` และ `"รอบ 2 เอา 15"`, แก้ `YouTubeLiveChat` `pollGeneration` & reset token, แก้ `useOfflineQueue` ไม่ลบคิวเมื่อไม่มี processor, แก้ `thaiNumberWords.js` ปกป้องเบอร์โทรที่มี `555` ด้วย placeholder ไร้ตัวเลข, และแก้ `addressParser.js` / `smartAnswerUtils.js`
  3. **UI Components, Pages & Security**: แก้ `HistoryModal.vue` (`initCustomerListeners` + `computed(() => customerStore.deliveryCustomersList)`), แก้ `ShippingLabelModal.vue` (ลบ `onMounted` ซ้ำที่ล้าง `initialSelectedId` + `escapeHtml()` ปิด Print XSS), แก้ `AddressPage.vue` (ส่ง props ให้ `AddressImportModal` + ลบลูกค้าแบบ Non-destructive เฉพาะที่อยู่), แก้ `ShippingPage.vue` แท็บส่งแล้ว (`done`), แก้ `Dashboard.vue` คอลัมน์สลับ + sanitize key, แก้ `CustomerQuickEditModal.vue` (เก็บชื่อ/UID เดิมก่อนแก้ไข), และแก้ `StockGrid.vue` animation handle / drag guard / watcher
- **สิ่งที่ตรวจสอบและแก้ไขฝั่ง `live-product-capture-ai`**:
  1. **Firebase Integrity & Session Resolver**: ป้องกัน `_finalize_session()` รีเซ็ตยอดขายเป็น 0 เมื่อ `get_stock_snapshot()` เป็น `None`, ป้องกัน `ensure_firebase_history_entry()` รีเซ็ต `totalSales`/`totalItems` เมื่อ GET ล้มเหลวหรือมีข้อมูลเดิม, ขยาย `search_history_by_date_query()` ครบทั้ง 12 เดือนพร้อม `(?<!\d)`, ตรวจ YouTube ID ด้วย `^[a-zA-Z0-9_-]{11}$`, และใช้ `re.finditer` + `try/except ValueError` ใน `extract_thai_date_from_title`
  2. **Detection Accuracy & Chrome Live Caption**: ล้าง `recent_texts` เมื่อเปลี่ยนรายการ (`set_item`) เพื่อไม่ให้ทิ้งคำพูดราคาซ้ำ (`"ราคา 60 บาทค่ะ"`), กัน `trailing_text` ไม่ให้ล็อกราคาประโยคไร้ตัวเลข, normalize คำตัวเลขไทยก่อนแยก pre/post cue (`"รายการที่ ยี่สิบ"`), แก้ `thai_number_normalizer` (`ร้อยห้าสิบ`/`สองร้อยห้าสิบ`), เพิ่ม `เป็น` ใน `INTRO_SHIPPING_GUARD_REGEX` & `SHIPPING_POLICY_LINE_REGEX` (`"ตั้งแต่ 20 เป็นจนถึง 100"`), รองรับรหัส 3 หลัก `100-120` พร้อม `(?<!\d)`, กัน `"อก 42 60 บาท"` ไม่ให้รวมราคาเข้าช่วงอก, กัน `ChromeCaptionReader` ไม่ให้จับหน้าต่างเบราว์เซอร์หลัก (`- Google Chrome`), และเพิ่มคำหลักสิบ `สามสิบ`..`เก้าสิบ`
  3. **Process, SQLite, Launcher & GUI Hardening**: เก็บ tail audio chunk ท้ายสตรีม + ปิด pipe/wait process ใน `live_stream_detector.py` & `live_source.py`, ซิงค์ `confirm` override `target_vid` ใน `run_live_launcher.py`, เพิ่ม UTF-8 `subprocess.run` + `import re` ใน `src/main.py`, ใช้ `contextlib.closing` ใน `database.py`, ทำ `save_summary()` idempotent + sanitize filename ใน `live_logger.py`, รองรับ UTF-8 BOM ใน `subtitle_source.py`, รองรับ Try-On merge และ `db=None` ใน `capture_coordinator.py`, และเพิ่ม `closeEvent` + CPU fallback ใน `main_window.py` / `audio_transcriber.py`
- **ผลตรวจ Automated & Build**:
  - `manowzab-v4`: `npm test` ผ่าน **36 ไฟล์ / 923 tests** (รวม `bugAuditRegression.test.js` 16 เคสใหม่), `npm run test:transcriber` ผ่าน **3 tests**, `npm run build` ผ่านครบทุก entry + PWA 67 precache entries
  - `live-product-capture-ai`: `unittest` ผ่าน **95 tests** (รวม `test_bug_audit_regression.py` 11 เคสใหม่)

## 🎯 ผลตรวจปรับปรุงความแม่นยำ Chrome Live Caption, YouTube SRT & Start-at-Item-1 Gate — `live-product-capture-ai` v1.5.5 (2026-11-26)

- **แหล่งข้อมูลที่วิเคราะห์**: Log สด 23–25 พ.ย. 69 (`6w97OPxsank`, `3xuQJPl0Wt8`) และซับ YouTube `.srt` 4 วัน (`11-11-69.srt`, `13-11-69.srt`, `18-11-69.srt`, `21-11-69.srt`)
- **สิ่งที่แก้ไข**:
  1. **Start-at-Item-1 Gate (`require_start_item_1=True` ค่าเริ่มต้น)**: เมื่อเริ่มเซสชันใหม่ต้องรอ **"รายการที่ 1"** ก่อนจึงเริ่มเปิดรายการ/ล็อกราคา บล็อกเสียงเกริ่นเปิดร้าน (`"20 100 บาท"`, `"20 ถึง 100 บาท"`, `"20 ไปจนถึง 100 บาท"`, `"รายการที่ 19"`) ไม่ให้ขึ้น `#20 = ฿100` เป็นรายการแรก พร้อมปลดล็อกกลางไลฟ์อัตโนมัติหากพบสต็อกเดิมใน Firebase หรือมีการประกาศรายการเรียงติดกัน 2 รายการชัดเจน (`16 ➔ 17`) และเพิ่มแฟล็ก `--allow-mid-live`
  2. กันการเขียนทับราคาที่ล็อกไว้แล้วจาก `trailing_text` เก่าและ ASR compound price inflation (`#10: ฿80` ➔ `"180 บาท"` คง `฿80`) โดยตรวจ `has_explicit_cue_in_text`/`target_num_spoken_in_text` บน chunk ปัจจุบัน และคง `pending_revision_for_item` สำหรับคำลดราคาแบบเปิด (`ลดราคา`/`เอารด`)
  3. ย้าย `record_measurements()` ไปหลัง `set_item()` + เพิ่ม `3b` จับเลขรายการซ้ำลำดับถัดไป (`"31  31"`) และอนุญาตลำดับถัดไป (`anchor_max + 1..2`) เมื่อชนความยาวตัวก่อน แก้รายการหาย `#29`, `#31`, `#52`, `#54`
  4. กันช่วงราคาตัดครึ่ง (`"20 ไปจนถึง 100 บาท"`, `"20 ถึง 100 บาท"`) และรายการเลขเรียงช่วง 3 ตัว/เช็กว่าง (`"พิมพ์ให้หน่อย 15 20 25"`, `"15 20 25 ยังว่างมั้ย"`) ไม่ให้ล็อก `#15 = ฿20`
- **ผลตรวจ Automated & Replay**:
  - `live-product-capture-ai`: `unittest` ผ่านครบ **105 tests** (รวม `test_nov25_and_srt_accuracy_v154_regression` และ `test_start_at_item_1_gate_blocks_opening_20_100_and_auto_unlocks_mid_live`)
  - ผล Replay 5 ไลฟ์จริง (เปิด Start-at-Item-1 Gate): **311/312 รายการ (99.68%)** — `NOV25` **50/50 (100%, `#10=฿80`)**, `13-11` **50/50 (100%)**, `18-11` **70/70 (100%, `#15=฿60`)**, `21-11` **70/70 (100%)**, `11-11` **71/72 (98.6%)**

## 🚀 ผลตรวจ Full-System 79-File Bug & Animation Audit + AuthSplash (2026-11-26)

- **สิ่งที่ตรวจสอบและแก้ไขครบทั้ง 3 ระยะ (Wave 1–3)**:
  1. **Minimalist 🍋 Splash Screen & Entry Hardening (`AuthSplash.vue`, `AuthGate.vue`, `swalConfig.js`, 4 `index.html`, 4 `*-main.js`)**: สร้างหน้าโหลดพรีเมียม `AuthSplash.vue` ครอบ `!authStore.authReady` ทุกหน้าหลัก/หน้าย่อย (กันหน้า Login แวบขึ้นมาสำหรับแอดมินที่ล็อกอินแล้ว), เพิ่ม `preconnect` ไป Firebase Auth, ลบดีเลย์เทียม `450ms`/`600ms` ใน `AuthGate.vue`, รวมศูนย์ `configureSwal(Swal)` รักษา SweetAlert2 v11 Toast mixin `defaultParams`, ลบ `vueLenisPlugin` ที่ไม่ได้ใช้, และแก้สคริปต์รีเซ็ต Service Worker ใน `index.html` ไม่ให้ reload ซ้อนเมื่อไม่มี SW
  2. **Critical & High Data/Security/Race Fixes**:
     - แก้ `AddressPage.vue` + `AddressImportModal.vue` (`:customers="deliveryCustomersList"` + `useCustomerStore` รวมศูนย์ ปิดบั๊ก `delivery_customers/undefined`)
     - แก้ `StockGrid.vue` & `HistoryModal.vue` รีเซ็ต/resolve `uid` เมื่อเปลี่ยนชื่อเจ้าของสินค้า, เปลี่ยน `onclick` ใน `showOwnerItems` เป็น event delegation + `titleText` ปิด XSS, และคงค่า `price`/`details`/`backdated`
     - แก้ `thaiDateUtils.js` (แปลง พ.ศ. 2 หลัก `69 ➔ 2026`, ป้องกัน day-31/next-year/UTC rollover ใน `ShippingManager.vue`, `ShippingPage.vue`, `deliverySync.js`), แก้ `ThaiDatePicker.vue` year bounds & outside-click, แก้ `multiBuyRegex` ReDoS & `SPLIT_NUMS_REGEX` (`และ|เเละ|กับ|กะ`), แก้ `thaiNumberWords.js` phone boundary (`ราคา 100 120 150`) & หลักสิบล้าน, แก้ `dbUtils.js` (`escapeHtml(0) === "0"` & control chars)
     - ปิด root Firebase write/delete ใน `stock.js` (`connectToStock("")`), `deliveryActions.js` (`completeDelivery`/`restoreDelivery`), `useHistory.js` (`deleteMultipleHistory`, `getCleanupPreview`, lazy `useSystemStore`), และ `blacklist.js`; แก้ race/leak ใน `App.vue` (`presenceCleanup` + auth hotkey guard), `Header.vue` (validate ก่อนเชื่อม), `useYouTube.js` (`connectGeneration`), `YouTubeLiveChat.js` (`apiKeys.length === 0`), `PhoneticManager.vue` (`queueAudio` แทน `ttsService.speak`), `CustomerQuickEditModal.vue` (`openSeq`), `CustomerAddressModal.vue` & `customer.js` (sparse addresses), `chat.js` & `chatIdb.js`, `voiceLearning.js`, `system.js`, `useAwayMode.js`, `useSmoothScroll.js`, `ShippingLabelModal.vue`, `ChangelogModal.vue`, `UpdatePrompt.vue`, `TtsQuotaModal.vue`
  3. **System-Wide 60fps Animations & UX Polish**: เปลี่ยน infinite `box-shadow`/`text-shadow`/`filter`/`left` keyframes ใน `style.css`, `ChatPanel.vue`, `ShippingManager.vue`, `ShippingPage.vue`, `AuthGate.vue`, `Dashboard.vue`, `ChangelogModal.vue`, `NoteBanner.vue` เป็น GPU compositor (`transform`/`opacity`) ทั้งหมด, ลบ double `backdrop-filter` และ `filter: blur(90px)` บนพื้นหลัง, ลบ `will-change: width, min-width` และ dead CSS, รองรับ `prefers-reduced-motion` ทุกหน้า และเพิ่มคีย์ `Esc` ปิด Modal (`ShortcutsModal`, `BlacklistModal`, `LiveSummaryModal`, `CustomerQuickEditModal`)
- **ผลตรวจ Automated & Build**:
  - `npm run build`: **✓ ผ่าน** (`142 modules transformed`, 4 entry points `index.html`, `shipping/index.html`, `history/index.html`, `address/index.html`)
  - `npm test -- --run`: **✓ ผ่านครบ 38/38 Test Files / 942/942 Tests** (รวม `systemAuditWave2.test.js` 14 เคสใหม่, `4.68s`)
  - อัปเดตกฎโปรเจกต์ครบ 4 ไฟล์ (`AI_RULES.md`, `GEMINI.md`, `.agents/AGENTS.md`, `.agents/skills/manowzab-core/SKILL.md`) และ `.agents/workflows/verify.md` แล้ว
  - **Post-Deploy Hotfix (26 พ.ย. 69):** เพิ่ม `".indexOn": ["timestamp"]` ที่ `/history` ใน `database.rules.json` + fallback ใน `useAutoCleanup.js` เมื่อ Firebase ยังไม่ได้ deploy index rules และปรับการข้ามข้อความแชทซ้ำใน `src/stores/chat.js` ให้เงียบ (`logger.debug` + skip ใน `onChildAdded`) ลด console warning noise (ผ่าน **38 ไฟล์ / 944 tests**)
