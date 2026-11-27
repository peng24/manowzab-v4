# Gemini Integration Instructions for Manowzab v4

These instructions help customize interactions with the Gemini agent for this specific project.

## 🌟 Core Principles

### 📌 กฎเหล็กประจำระบบ: ห้ามทำอะไร (DO NOT) & ให้ทำอะไร (MUST DO)
*(อัปเดตล่าสุด: 27 พ.ย. 69 — ปฏิบัติตามอย่างเคร่งครัดและอัปเดตต่อเนื่องทุกครั้งที่มีการเปลี่ยนแปลง)*

#### 🚫 สิ่งที่ห้ามทำเด็ดขาด (DO NOT / NEVER)
1. **ห้ามส่งเสียงราคา และห้ามประกาศราคาลงช่องแชท (Zero Price TTS & Zero Chat Invariant):**
   - ราคาที่ AI ตรวจจับได้จากการฟังเสียงสดหรือย้อนหลัง **ห้าม** โพสต์ลง `chats/{videoId}`
   - **ห้าม** ออกเสียง TTS / SFX ราคา และห้ามรบกวนช่องแชททุกแท็บ ให้บันทึกราคาเงียบๆ (Silent Sync) เข้าไปที่ป้ายราคาสีทอง `.stock-price-pill` บนการ์ดสต็อกเท่านั้น
2. **ห้ามจับภาพสินค้าในตอนนี้ (Image Capture Paused):**
   - พักการจับภาพสินค้าไว้ก่อน ตามคำสั่งผู้ใช้ เน้นเฉพาะการฟังเสียงตรวจจับราคาและไซส์อย่างแม่นยำเท่านั้น
3. **ห้ามลบโค้ดการทำงานเดิมโดยพลการ (Modification Policy):**
   - ห้ามลบฟีเจอร์เดิม ให้ใช้แนวทาง Additive Enhancements เสมอ
4. **ห้ามใช้วันที่ปัจจุบันเป็นค่าเริ่มต้น เมื่อประมวลผลไลฟ์ย้อนหลัง (Replay Exact Date Invariant):**
   - ห้ามลงราคาผิดวันที่ หรือทับวันปัจจุบัน ต้องตรงตามวันที่ไลฟ์จริงเสมอ เช่น ลิงก์ไลฟ์วันที่ 11 พ.ย. 69 ต้องลงราคาในสต็อกและประวัติของวันที่ 11 พ.ย. 69 เท่านั้น
5. **ห้ามใช้ `subprocess` โดยไม่ระบุ `encoding='utf-8'` บน Windows:**
   - ห้ามละเลย encoding เมื่อเรียก yt-dlp/ffmpeg ใน Python เพื่อป้องกันภาษาไทยกลายเป็นอักษรต่างดาว
6. **ห้ามดึง URL ตรงของ GoogleVideo (`yt-dlp -g`) มาใส่ FFmpeg ในโหมดไลฟ์ย้อนหลัง:**
   - เพราะไฟล์เป็น DASH Segment จะทำให้สตรีมตัดจบหลัง 5 วินาที ต้องใช้ท่อ Pipe (`yt-dlp -o - | ffmpeg`) และบัฟเฟอร์ `read_exact_bytes` เสมอ
7. **ห้ามลบลูกค้าออกจากฐานข้อมูลเมื่อกดปุ่มถังขยะในหน้าส่งของ (Non-destructive Shipping Removal):**
   - `remove(dbRef(db, 'delivery_customers/...'))` ห้ามทำเด็ดขาด ให้เคลียร์เฉพาะวันส่ง (`unscheduleDeliveryState`) ย้ายไป "ฝากสินค้า" โดยข้อมูลการจองและที่อยู่ยังอยู่ครบ 100%
8. **ห้ามเรียก `ttsService.speak()` ตรงๆ โดยไม่ผ่านคิว:**
   - เสียงทุกอย่างต้องเข้า `queueAudio()` ใน `useAudio.js` เท่านั้น เพื่อป้องกันเสียงทับซ้อน
9. **ห้ามให้ลูกค้าที่ถูกแบน (Blacklist) จองสินค้าหรือมีเสียงอ่าน:**
   - ลูกค้าที่อยู่ในแบล็กลิสต์ต้องไม่มีเสียงอ่าน และไม่สามารถแย่งสต็อกได้
10. **ห้ามใส่ฟอนต์ 'TH Sarabun New' ในสลิปพิมพ์ความร้อน (Thermal Label):**
    - เพราะทำให้สระภาษาไทยหดเล็กลง 35% บน Windows ให้ใช้ 'Sarabun', 'Kanit', ...

#### ✅ สิ่งที่ต้องทำเสมอ (MUST DO / ALWAYS)
1. **คิดและอัปเดตกฎ + `/verify` อัตโนมัติทุกครั้ง (Proactive Rule & `/verify` Auto-Evolution):**
   - หลังแก้ไขโค้ดทุกครั้ง ต้องวิเคราะห์และอัปเดตไฟล์กฎ (`AI_RULES.md`, `GEMINI.md`, `.agents/AGENTS.md`, `.agents/skills/manowzab-core/SKILL.md`) และ `.agents/workflows/verify.md` โดยอัตโนมัติโดยไม่ต้องรอให้สั่ง พร้อมรายงานให้ผู้ใช้ทราบทุกครั้ง
2. **ระบบตรวจจับราคาไลฟ์ย้อนหลังตรงตามวันที่จริง (Replay Price Detection & Exact Date Sync):**
   - รองรับการใส่ลิงก์ YouTube ย้อนหลัง, Video ID, หรือระบุวันที่ เช่น `11 พ.ย. 69`
   - ตรวจสอบและสร้าง `history/{videoId}` และ `settings/{videoId}/stockSize` ใน Firebase ให้ตรงวันที่
   - ซิงค์ราคาเงียบๆ ไปที่ `stock/{videoId}/{item}/price` และคำนวณยอดขายรวมใน `history/{videoId}` อัตโนมัติ
   - แสดงป้ายราคาใน `HistoryModal.vue` และมีปุ่ม "เปิดที่หน้าหลัก" ให้สลับ `system/activeVideo` มาที่หน้าจอหลักได้ใน 1 คลิก
3. **เมื่อผู้ใช้สั่ง "อัพเลย" ให้รันไปป์ไลน์อัตโนมัติจนจบ:**
   - `/verify` (พร้อมอัปเดตกฎ/`/verify`) ➔ `/update` (bump version & changelog) ➔ `git commit & push` ➔ `npm run deploy` ขึ้น GitHub Pages ทันที
4. **รักษาความเสถียร 60fps และ Centralized Customer Store:**
   - ใช้ `useCustomerStore` จุดเดียวสำหรับ `delivery_customers` และ `address_book`
   - แอนิเมชันหน้าหลักต้องใช้เฉพาะ GPU compositor (`transform`/`opacity`) ห้ามใช้ `infinite` keyframes ที่กระตุ้น layout/paint (`left`, `box-shadow`, `background`) บน `.stock-item`, `.mini-shimmer-slide`, `.ds-pack-tonight`, `.badge-nick.vip-admin`; คง `.stock-num` ไร้พื้นหลังแม้ขณะ `.new-order` (timer 8s / ยกเลิก 10s), ใช้ `.chat-row` `translateY(4px)` (`0.15s`), และรองรับ `@media (prefers-reduced-motion: reduce)`
5. **แปลงตัวเลขเป็นคำอ่านภาษาไทย (Thai Cardinal Numbers):**
   - แปลงเลขเบอร์สินค้าและราคาเป็นคำอ่านภาษาไทย เช่น 15 -> "สิบห้า", 120 -> "หนึ่งร้อยยี่สิบ" เพื่อให้อ่านออกเสียงอย่างเป็นธรรมชาติ
6. **บันทึก Log การวิเคราะห์ทุกเซสชัน:**
   - บันทึก `.log`, `.jsonl`, และ `_summary.json` ทุกครั้งเพื่อใช้ปรับปรุงความแม่นยำอย่างต่อเนื่อง
7. **ระบบตรวจจับราคาและเบอร์สินค้าแบบสลับลำดับและมีชื่อคั่น (Permutation & Intervening Name Detection):**
   - ต้องรองรับการพูดสลับลำดับของแม่ค้าทั้ง 6 รูปแบบ เช่น `[เบอร์] + [ชื่อ] + [ราคา]`, `[ราคา] + [เบอร์]`, `[ชื่อ] + [เบอร์] + [ราคา]` โดยใช้ `extract_code_price_permutations()`
   - ป้องกัน False Positives โดยใช้ Negative Lookahead กรองหน่วย `บาท/ตัว/คน/วัน/%` ออกจากตัวเลขเบอร์สินค้า และตรวจสอบราคาในชุดราคามาตรฐาน (`VALID_PRICES`)
8. **แสดงยอดขายรวมไลฟ์ปัจจุบันแทนข้อความไฟเริ่มติดแล้ว (Live Session Sales Revenue Badge):**
   - ใน `StockGrid.vue` (และ `HistoryModal.vue`) เปลี่ยนตำแหน่งข้อความเดิม ("🔥 ไฟเริ่มติดแล้ว!") เป็นป้ายยอดขายรวม `.total-sales-badge` (`ยอด: ฿...`) สีทองเรืองแสง
   - คำนวณจาก `useStockStore.totalSales` โดยรวมเฉพาะสินค้าที่ขายแล้ว (`item.owner` มีค่า) และมีราคาที่ถูกต้อง (`item.price > 0`) สินค้าที่ว่างอยู่ไม่ถูกนำมาคำนวณ
   - รองรับตัวเลขอัปเดตแบบแอนิเมชันลื่นไหล (`animateValue`), Pulse Effect (`isPulsingSales`), Tooltip สรุปจำนวนชิ้น, และ Responsive ซ่อนคำว่า `ยอด:` บนมือถือ (`<= 768px`) เพื่อความกะทัดรัด
9. **การป้องกัน False Positives จาก Whisper Thai ASR & Chrome Live Caption (`live-product-capture-ai` v1.5.7+):**
   - **Chrome Live Caption เป็นเมนู `[1]` + การจูนเฉพาะ Live Caption (`v1.5.7`):** เมนูแรกและค่าเริ่มต้นคือ Chrome Live Caption พร้อมดึง `system/activeVideo` อัตโนมัติ, แคช UIA primary node, หน่วงตัดเลขค้าง (`1.35s`) + ต่อเลขขาดครึ่งข้าม chunk (`396`+`0`), กัน `"ผ้าไม่ยืด <N>"` ไม่ให้ติด `ยืดสุด`, กันคำแนะนำ `"อก 50 อัพ/บวก"` ทับอกจริง, รองรับ `65456`/`48648`/`3 5 6 4 8`/`อก 552`/`46 อก 46`, กัน `"พื้นที่พิเศษ/พื้นที่ห่างไกล/คิดยอดตามจริง"` + `"50 บาท"` ทับราคา `#50`, และกัน `LiveEndMonitor` หยุดก่อนกำหนดขณะ `upcoming`
   - **ต้องเริ่มจากรายการที่ 1 ก่อนเสมอ (`require_start_item_1=True` ค่าเริ่มต้น):** รอ `"รายการที่ 1"` ก่อนเริ่มเปิดรายการ/ล็อกราคาเพื่อกันเสียงเกริ่นเปิดร้าน (`"20 100 บาท"`, `"20 ถึง 100 บาท"`, `"20 ไปจนถึง 100 บาท"`, `"รายการที่ 19"`) ไม่ให้ขึ้น `#20 = ฿100` เป็นรายการแรก พร้อมปลดล็อกกลางไลฟ์อัตโนมัติเมื่อพบสต็อกเดิมใน Firebase หรือขายเรียงติดกัน 2 รายการชัดเจน (`16 ➔ 17`)
   - ต้องรองรับเลขหลักสิบที่มีช่องว่างและคำเพี้ยน Whisper (`แปด สิบ` ➔ `80`, `สิบเจ็บ`/`สิบจีด` ➔ `17`, `สิบโหก` ➔ `16`, `สิบ สี` ➔ `14`, `สิบสาว` ➔ `13`, `สีสิบเอ็ด` ➔ `41`, `ยิปสอง` ➔ `22`, `นี่สิบสาม`/`เยี่สิบสาม`/`แปลดสิบป้าท` ➔ `23 80`, `ยี่แปด` ➔ `28`, `สามที่ผก` ➔ `36`, `สามก้า` ➔ `39`, `สี หก 80` ➔ `46 80`, `สาม สอง`/`สาม สาม`/`3 7`/`3.9`/`4 9 60`), จัดลำดับ `spaced_pair` ก่อน `item_digit_pattern` และรองรับ `รายการ ที่`, `ตัวนี้ก็ไป`, `23ตัวนี้ 80บาท`, และเลขหลักเดียวขึ้นต้นก่อนกริยาราคา (`เจ็ด เอาไป 60 พอ`)
   - ต้องกรองเปอร์เซ็นต์ (`ราคา 100%`), ช่วงราคานำรายการ/ช่วงราคาตัดครึ่ง/ค่าส่งทั้งติดกันและตัดคำ (`"ตั้งแต่ 20 ไป จะถึง 100"`, `"20 ไปจนถึง 100 บาท"`, `"กรณีโอนเงิน 40"`, `"ค่า ส่ง กรณี โอน เงิน 40 บาท"`, `"เก็บไปทาง 50"`, `"บกเพิ่ม"`), รายการเลขเรียงช่วง 3 ตัว/เช็กว่าง (`"พิมพ์ให้หน่อย 15 20 25"`, `"15 20 25 ยังว่างมั้ย"`), จำนวนผู้ชม (`10 20 11 ท่าน`), อกเพี้ยนและช่วงอกขาลง (`อ 6 40` ➔ `อก 40`, `อก 42 40`), วลีวัดขนาดซ้อน (`"อกตึงหน้าผ้า ได้ 46 ขอประมาณ 40 บาท"`), และคลิปคำ `"ที่ 31 ค่ะ อก 56"` ออกจากรหัสและราคา; ใน `LiveStreamPriceDetector` เรียก `record_measurements()` หลังสลับรายการ + รองรับเลขซ้ำลำดับถัดไป (`"31  31"`) เพื่อไม่ให้สเปกความยาวบล็อกรายการถัดไป (`#29`, `#31`), กันรหัส ASR หลอมรวมกระโดด `> 120` (`#196`/`#246`), ห้ามปิดรายการค้างเมื่อ `parsed_raw.code` ถูก Jump Guard ปฏิเสธ (เช่น `"4 ค่ะ"` ขณะอยู่ที่ `#40`), กัน `"รายการที่ รหัส 60"` ไม่ให้สร้าง `#60`, ผูกราคา `pre_text` และ orphan price หน้า `รายการที่ X` (`"ตอนนี้ 60 บาท"` ➔ `"รายการที่ 45"`), และห้ามเขียนทับราคาที่ล็อกไว้แล้วจาก `trailing_text` เก่า/ASR compound price inflation (`80` ➔ `180`), การลองใส่ (`is_tryon_signal`), แชทตัวเลขล้วน (`คือ 14 16 50`), เพื่อนบ้านที่ล็อกแล้ว (`#36` ขณะอยู่ที่ `#37`), หรือรายการถัดไปที่ไม่พูดเลขรายการเว้นแต่มีคำลดราคาจริง (`ลด`/`เอารด`)
10. **มาตรฐานสีการ์ดสต็อกและช่องแชทแบบผสม (Deep Crimson Stock Cards, Background-Free Numbers/Size & Hybrid Chat UI):**
   - **การ์ดสต็อก (`StockItemCard.vue`, `HistoryModal.vue`, `stockSizeUtils.js`):** รายการที่ **จองแล้ว** ใช้สีแดงเข้มโทนอุ่นสบายตา (`rgba(185, 28, 28, 0.42)` ➔ `rgba(69, 10, 10, 0.88)`) ขอบทึบ `rgba(248, 113, 113, 0.65)` ส่วนรายการ **ว่าง** ใช้พื้นมืดจมตัวขอบเส้นประ `1.5px dashed`; ทั้ง **เลขรายการ** (`.stock-num`), **เลขราคา** (`.stock-price-pill`), และ **ไซส์กระชับ** (`.stock-size-meta` เช่น `อก54`/`อก52-54`/`2XL` พร้อม `item.details`/`item.size` ใน `v-memo` + Tooltip สเปกเต็ม + ช่องแก้ใน Modal + ค้นหาตามไซส์) ต้อง **ไม่มีพื้นหลังกล่อง** (`background: transparent; border: none;`) และป้องกันการลากคลุมสีฟ้า (`user-select: none`) บน `.header`, `.stock-panel`, `.stock-item`, `.grid-item` (คง `user-select: text` ให้ `input`/`textarea`)
   - **ช่องแชทแบบผสม Hybrid (`ChatPanel.vue`, `style.css`):** ใช้การ์ดชั้นเดียวไร้กรอบซ้อน (`.chat-bubble` โปร่งใส), แถบแท็บ 7 ปุ่มพอดีไม่ล้นขอบขวา, แชทลูกค้าใช้พื้นหลังไล่สีประจำตัว **360 องศา (`getCustomerRowColor`)** เพื่อแยกตัวบุคคลชัดเจน ส่วนคำสั่งสำคัญแยกด้วย **ขอบและแถบซ้าย `4.5px` + ป้ายใต้รูป** (`#10b981` จอง, `#a855f7` ส่ง, `#f43f5e` ยกเลิกพร้อมพื้นแดงเตือนภัย, และการ์ดแอดมินสีทองพร้อมแถบซ้ายตามคำสั่ง)
11. **ความปลอดภัยข้อมูล Firebase, Race Condition & Print XSS (`v5.7.7+` Audit Invariants):**
   - **Empty VideoId & Load-Gated Reconciliation (`stock.js`, `useDeliveryReconciliation.js`):** ห้าม `remove()`/`runTransaction()`/`set()` บน `stock/${videoId}` เมื่อ `videoId` ว่าง, capture `videoId` ก่อน `await` ทุกครั้ง, และรอ `stockStore.loadedVideoId === currentVideoId` ก่อน reconcile เพื่อไม่ให้สต็อกที่ยังไม่โหลดไปทับยอดลูกค้าเป็น 0; ใช้ `_pendingProxyUids` รวม concurrent proxy bookings ของลูกค้ารายใหม่
   - **Sanitized Keys, Print XSS & Lifecycle (`blacklist.js`, `ShippingLabelModal.vue`, `YouTubeLiveChat.js`, `thaiNumberWords.js`, `useOfflineQueue.js`):** ต้องใช้ `sanitizeDbKey()` ก่อนเขียน path Firebase ทุกจุด, `escapeHtml()` ทุกฟิลด์ก่อน `doc.write()` ในใบปะหน้า, ใช้ `pollGeneration` + ล้าง `liveChatId`/`nextPageToken` ตอน `stopPolling()`, ใช้ placeholder ไร้ตัวเลขปกป้องเบอร์โทรที่มี `555` ใน `thaiNumberWords.js`, และห้ามลบรายการออกจาก `useOfflineQueue` เมื่อไม่มี processor
   - **AI Price Detector Integrity (`live-product-capture-ai`, Full 47-File Audit 26 พ.ย. 69):** ข้าม `update_history_totals` เมื่อ `get_stock_snapshot()` เป็น `None`, ห้ามรีเซ็ต `totalSales`/`totalItems` หรือทับ `title`/`timestamp` เดิมใน Firebase history, validate `video_id`/`item_num` + `redact_secrets()` + HTTP 401 single-retry, กันคำผสมไทย (`ลายดอก`/`แขนยาว`/`เดรสยาว`/`ชอบ`/`กระสอบ`/`บอก`/`ส่งออก`) ไม่ให้ตัดราคา/สร้างสเปกหลอก, คงรหัส 3 หลัก (`#100–#300`), ล้าง `trailing_text` ทุก early return & แยกสเปกข้ามรายการ, พาร์ส `ytInitialPlayerResponse` ด้วย `raw_decode` ไม่หลงจับ sidebar, ใช้ SQLite WAL + `ON CONFLICT` คง `updated_by_user=1`, รองรับ `.vtt`/HTML strip/same-day collision guard, กัน CSV injection, ใช้ `copy.deepcopy` + `_save_jpg_unicode`, และกัน `ChromeCaptionReader` ไม่ให้จับหน้าต่างที่มี `" - "` (เบราว์เซอร์/VS Code)
12. **มาตรฐานหน้าโหลด AuthSplash, Shared Safety Utils และแอนิเมชัน 60fps ทั้งระบบ (26 พ.ย. 69):**
   - **Splash Screen & Fast Auth (`AuthSplash.vue`, `AuthGate.vue`, `index.html`, `*/index.html`):** ทุกหน้า (`App.vue`, `ShippingPage.vue`, `HistoryPage.vue`, `AddressPage.vue`) ต้องแสดง `<AuthSplash v-if="!authStore.authReady" />` ก่อน `<AuthGate v-else-if="!authStore.isAuthenticated" />` เพื่อไม่ให้หน้า Login แวบขึ้นมาขณะรอ Firebase Auth พร้อม `preconnect` (`identitytoolkit.googleapis.com`, `securetoken.googleapis.com`) และไม่มี artificial login delay ใน `AuthGate.vue`
   - **Shared Helpers & Root-Write Guards (`swalConfig.js`, `thaiDateUtils.js`, `dbUtils.js`, `chatParserUtils.js`, `stock.js`, `useHistory.js`, `deliveryActions.js`, `useAutoCleanup.js`, `database.rules.json`):** ใช้ `configureSwal(Swal)` ในทุก entry point (`main.js`, `shipping-main.js`, `history-main.js`, `address-main.js`) เพื่อรักษา SweetAlert2 v11 Toast mixin `defaultParams` โดยไม่ mutate `opts`, ใช้ `thaiDateUtils.js` แปลง พ.ศ. 2 หลัก (`69 ➔ 2026`) และปฏิทิน Local Time ป้องกัน day-31/UTC rollover, คง `multiBuyRegex` แบบ ReDoS-safe, `escapeHtml(0) === "0"`, `sanitizeDbKey` กรอง control chars, กันการเขียน/ลบ root Firebase ทุกจุด, คง `".indexOn": ["timestamp"]` บน `/history` พร้อม fallback client-side ใน `useAutoCleanup.js`, และข้ามข้อความแชทซ้ำเงียบๆ ใน `chat.js` (`logger.debug`)
   - **Owner UID Safety, XSS Prevention & System-Wide 60fps CSS:** เมื่อแก้ชื่อเจ้าของสินค้าใน `StockGrid.vue`/`HistoryModal.vue` ต้อง resolve `uid` ใหม่ตามเจ้าของใหม่เสมอ, ใช้ `titleText` + event delegation แทน inline `onclick` และ `title` attribute ดิบ, ใช้ `useCustomerStore` รวมศูนย์ใน `AddressPage.vue`/`ShippingPage.vue`, แอนิเมชันทั้งระบบต้องใช้ GPU compositor (`transform`/`opacity`) เท่านั้น, ห้าม double `backdrop-filter` ระหว่าง overlay กับกล่อง modal, ห้าม `filter: blur(...)` ขนาดใหญ่บนพื้นหลัง, และรองรับปุ่ม `Esc` ปิด Modal ทุกหน้าต่าง
13. **การแยกคีย์ Nickname สำหรับการจองแทนและจองมือ (Proxy & Manual Nickname Isolation — 27 พ.ย. 69):**
   - **ห้ามเขียน `nicknames/<ชื่อลูกค้า>` จาก Proxy Edit (`ChatPanel.vue`, `CustomerQuickEditModal.vue`):** เมื่อแอดมินคลิกแก้ชื่อลูกค้าในข้อความจองแทน (`editProxyCustomer` ส่ง `isProxyEdit: true` หรือ `uid` เป็น proxy/manual/`null`) ห้ามเขียน `nicknames/${safeReal}` (เช่นเปลี่ยน proxy `"กุ้ง"` ➔ `"พี่กวาง"` ห้ามเขียน `nicknames/กุ้ง`) เพื่อไม่ให้ไปยึดชื่อลูกค้าคนอื่นทั้งระบบ
   - **ห้าม Fallback ชื่อธรรมดาบน Proxy/Manual UID (`src/stores/nickname.js`, `StockGrid.vue`, `HistoryModal.vue`):** ใน `getNickname()`/`hasNickname()` หาก `uid` เป็น proxy/manual (`manual-*`, `proxy-*`, `multi-proxy-*`, `admin-proxy-*`, `manual`) และ `realName` ไม่ใช่ `@handle` ให้เช็กเฉพาะคีย์ `uid` เฉพาะรายการนั้น (ข้ามคีย์กลาง `"manual"`) แล้วคืน `realName` ตรงๆ โดยไม่ fallback ไปดึง `nicknames[realName]` และใน `StockGrid.vue`/`HistoryModal.vue` ห้าม fallback เป็น `uid: "manual"` แบบแชร์คีย์ ให้ใช้ `resolveUidForCustomerName`/`resolveHistoryCustomerUid` เสมอ

- **Stability First**: This is a production Vue 3 application used for Live Commerce. Never break existing features, especially the real-time Firebase sync, stock booking queues, and the audio/TTS queue.
- **Read the Rules**: Always review [AI_RULES.md](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/AI_RULES.md) before implementing logic changes.
- **Additive Enhancements**: Focus on adding features alongside existing code. Only modify or remove code when explicitly requested or to clean up obsolete logic (e.g., the iOS Audio Unlock removal in v4.29.3).
- **Responsive Premium UI**: Ensure UI designs are modern, clean, and dynamic. All layouts must be responsive, accommodating all devices including portrait smartphone views.

## 🛠️ Technical Context & Architecture
Manowzab Command Center (currently v5.3.2+) coordinates live sales stream management. It utilizes the following stack and subsystems:

### 1. Frontend & State
- **Framework**: Vue 3 (Composition API) + Vite.
- **State Management**: Pinia (`src/stores/`).
  - [stock.js](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/src/stores/stock.js): Inventory, queues, sales, throttled & deduplicated history sync.
  - [customer.js](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/src/stores/customer.js): Centralized reference-counted Firebase listeners for `delivery_customers` and `address_book`, $O(1)$ lookup index (`deliveryByNormKey`), and memoized reactive customer metadata (`getCustomerMetaByName`).
  - [system.js](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/src/stores/system.js): Connection statuses, active live stream, API key rotation, TTS settings.
  - [chat.js](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/src/stores/chat.js): Live chat log & Firebase sync.
  - [nickname.js](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/src/stores/nickname.js): Pronunciation overrides.
- **Styling**: Custom Vanilla CSS. Avoid introducing external CSS frameworks.

### 2. Live Chat Sync & Processing
- **YouTube Polling**: Polled in [YouTubeLiveChat.js](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/src/services/YouTubeLiveChat.js) using round-robin API key rotation via `systemStore.currentKeyIndex` and concurrent `Promise.allSettled` dispatch into the 80ms micro-batch window.
- **Intent Processor**: [useChatProcessor.js](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/src/composables/useChatProcessor.js) parses chats via lazy short-circuit Regex patterns to detect buying (`CF`), cancelling, shipping updates, and admin proxy commands.
- **Firebase Real-Time Sync**: Proccessed chat messages are written to Firebase `chats/{videoId}`. All clients listen and render reactively to maintain consistency.

### 3. Stock Management
- **Transaction Safety**: [stock.js](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/src/stores/stock.js) uses Firebase `runTransaction` for allocating stock (`processOrder`, `processCancel`) to prevent race conditions.
- **Booking Queues**: If an item is already claimed, subsequent buyers are placed in a queue. Cancelling promotes the next in queue automatically.
- **Stock Size Sync**: The grid size (stock size) is synced across devices and auto-expands when bookings exceed the limit.

### 4. Audio & Text-to-Speech (TTS)
- **Unified Audio Queue**: Managed in [useAudio.js](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/src/composables/useAudio.js). All audio events (SFX + TTS) must go through `queueAudio(sfxType, author, message)`. **Do not call TTS services directly** to prevent overlapping.
- **Synthesized SFX**: Sound effects (`'success'`, `'error'`, `'cancel'`) are generated dynamically on-the-fly using the shared singleton Web Audio API `AudioContext` (`ttsService.getAudioContext()`).
- **TTS Engine**: [TextToSpeech.js](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/src/services/TextToSpeech.js) handles 4 TTS modes in approved Cloud builds (`A` Chirp 3: HD `th-TH-Chirp3-HD-Achernar` default, `C` Chirp 3: HD `th-TH-Chirp3-HD-Aoede`, `S` Google Cloud Standard `th-TH-Standard-A`, and `🤖` Native offline SpeechSynthesis). Includes automatic multi-tier fallback (`Chirp3-HD -> Standard-A -> Native`), LRU buffer cache, and `ensureAudioContextReady()` to recover from browser idle suspension.

### 5. Shipping & Lifetime Bookings
- **Shipping Manager**: [ShippingManager.vue](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/src/components/ShippingManager.vue) manages delivery customers, relative dates, countdowns, and order status updates (`Pending` / `Done`) backed by centralized `useCustomerStore`.
- **Lifetime Purchase Stats**: Marking a delivery `Done` increments the customer's `totalBookings` on Firebase using transactions. If a `Done` customer books again, their status resets to `Pending` automatically.

### 6. Admin Utilities
- **Shared Note System**: [NoteEditor.vue](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/src/components/NoteEditor.vue) and [NoteBanner.vue](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/src/components/NoteBanner.vue) sync temporary notes across admin dashboards.
- **Phonetic Manager**: Allows overrides of customer name pronunciations for clean TTS speech.

---

## ⚠️ Crucial Implementation Guidelines
1. **Audio Sequencing**: Always await SFX completion before triggering TTS. Use the unified queue in `useAudio.js`.
2. **Firebase Transactions**: Always use `runTransaction` for critical writes (stock claiming, queue adjustments, lifetime booking updates) to prevent concurrent writes from colliding.
3. **Memory Management & Centralized Listeners**: Keep track of all Firebase event listeners (`onValue`, `onChildAdded`) inside composables/components. Store unsubscribed functions in arrays and clean them up (`off(...)` / calling unsub functions) on component unmount to prevent leaks. Never create duplicate `delivery_customers` or `address_book` listeners in components—always use `useCustomerStore`.
4. **Thai Number Conversion & Pronunciation**: Preserve the numeric transcription capability (`thaiToArabic`) inside the chat processor, and convert numbers to Thai cardinal words (`numberToThaiWords`, `replaceNumbersWithThaiWords` in `thaiNumberWords.js`) so TTS reads numbers as cardinal words (e.g. 15 -> 'สิบห้า') rather than digit-by-digit ('หนึ่งห้า').

---

## 📂 Reference Documentation
Familiarize yourself with these root documentation files when working on relevant domains:
- [AI_RULES.md](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/AI_RULES.md): Mandatory checklist and system invariants.
- [FIREBASE_CHAT_SYNC_IMPLEMENTATION.md](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/FIREBASE_CHAT_SYNC_IMPLEMENTATION.md): Real-time chat database layout and sync details.
- [SOUND_EFFECTS_IMPLEMENTATION.md](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/SOUND_EFFECTS_IMPLEMENTATION.md): Web Audio API synthesis logic and wave specifications.
- [STOCK_SIZE_SYNC_SUMMARY.md](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/STOCK_SIZE_SYNC_SUMMARY.md): Sync flow of stock limits across admin panels.
- [CUSTOM_NICKNAME_OVERRIDE.md](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/CUSTOM_NICKNAME_OVERRIDE.md): How hardcoded phonetic substitutions are handled.

---

## 🤖 Integrated Agent Skills (9arm-skills)
We have adapted and installed developer-agent workflows from `9arm-skills` into our `.agents/skills/` directory. The AI agent should proactively trigger and follow these disciplines:

1. **Debugging Mantra (`/debug-mantra`)**
   - **Trigger**: When the user reports a bug, mentions an error/crash, or asks to diagnose/debug an issue.
   - **Instruction**: Read and follow the 4-step discipline in [debug-mantra/SKILL.md](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/.agents/skills/engineering/debug-mantra/SKILL.md). Always recite the debugging mantra verbatim in the first response when debugging starts:
     > 1. *First is reproducibility.* Can the issue be reproduced reliably?
     > 2. *Know the fail path.* Debugger first; then source trace + knob enumeration; then in-code instrumentation.
     > 3. *Question your hypothesis.* What would disprove it?
     > 4. *Every run is a breadcrumb.* Cross-reference all of them.
   - **Workflow**: Do not propose or implement a fix without satisfying reproducibility first. Maintain an experimental ledger.

2. **Post-Mortem Record (`/post-mortem`)**
   - **Trigger**: When the user requests a Root Cause Analysis (RCA), asks to document a fix, or asks to write a post-mortem.
   - **Instruction**: Read [post-mortem/SKILL.md](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/.agents/skills/engineering/post-mortem/SKILL.md). Gather the 4 required inputs: reliable repro, known cause, specific fix (PR/commit), and validation proof. Draft the canonical engineering record (Summary, Symptom, Root Cause, Fix, Validation, and Slip analysis) with code identifiers intact.

3. **Plan & Code Scrutinize (`/scrutinize`)**
   - **Trigger**: When the user asks to review, audit, check, or get a second opinion on a proposed plan, PR, or code change.
   - **Instruction**: Read [scrutinize/SKILL.md](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/.agents/skills/engineering/scrutinize/SKILL.md). Act as an independent reviewer. Question the intent (is there a simpler alternative?), trace the actual execution paths (not just the diff), verify correctness under edge cases, and report findings structured by severity.

4. **Management Communication (`/management-talk`)**
   - **Trigger**: When the user requests an executive summary, a status report for non-engineers, or Slack/Email updates of technical achievements.
   - **Instruction**: Read [management-talk/SKILL.md](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/.agents/skills/productivity/management-talk/SKILL.md). Strip internal jargon (file names, function names, commit SHAs) while preserving high-level product and concept terms. Shape the content precisely for the target channel (JIRA, Slack, standup, email, or meeting bullets).

---

## 🔄 Development Workflows
- **Version Updates (`/update`)**: After completing code changes, use the `/update` workflow (see [.agents/workflows/update.md](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/.agents/workflows/update.md)) to bump the version in `package.json`, update `src/data/changelog.js` (พร้อมตัด Changelog เก่าออกให้คงเหลือเฉพาะ 15–20 เวอร์ชันล่าสุดเสมอ เพื่อควบคุมขนาด Bundle), and update [Header.vue](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/src/components/Header.vue) if needed.
- **Mandatory Verification (`/verify`)**: Always run through the verification checklist in [.agents/workflows/verify.md](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/.agents/workflows/verify.md) before concluding your work to ensure critical paths (YouTube sync, queueing, key rotation, performance invariants) remain functional.
- **Proactive Rule & `/verify` Auto-Evolution (คิดและอัปเดตกฎ + `/verify` อัตโนมัติทุกครั้ง)**: Every time you make code changes, **proactively evaluate** whether any project rules (`AI_RULES.md`, `GEMINI.md`, `.agents/AGENTS.md`, `.agents/skills/manowzab-core/SKILL.md`) or `/verify` items (`.agents/workflows/verify.md`) should be updated. If so, **update them immediately without waiting to be asked**, and **always report the rule/`/verify` updates to the user**.
- **Automated Deploy Command ("อัพเลย")**: When the user says **"อัพเลย"**, automatically run `/verify` (including auto-updating rules/`/verify`) -> `/update` -> Git Commit & Push to GitHub -> `npm run deploy` to GitHub Pages without stopping.

## Chat Log Regression & Request Safety (2026-10-31)

- Normalize intent matching through normalizeChatText (Thai digits + zero-width stripping); preserve the original message for display/audio.
- shippingRegex detects topics only. Use isShippingRequest/isShippingInquiry before readiness/history/date writes. Hold requests must not set delivery dates, including named weekdays/dates.
- Share isCancellationRequest and isTryRequest between parser and processor. Cancellation questions, conditional statements, descriptive “ที่หลุดจอง” notes, embedded English cc/cancel, and night references must not cause cancellation. Explicit คืน/ถอน/สละสิทธิ์ + number must cancel that ID, never the latest fallback.
- Keep numeric captures complete when rejecting quantity/price/measurement suffixes. Never infer item IDs from body measurements or unnumbered contextual chat. Keep conversational fragments out of nickname learning.
- Preserve every message and settle every Promise in the first poll batch of a new video. Capture videoId when enqueueing and skip stale queued work before processing; never clear the active batch inside processSingleMessage.
- Regex changes require the reviewed anonymized 307-row corpus, boundary tests, and actual useChatProcessor side-effect tests. Expected labels must be reviewed independently of the changed parser. Keep raw logs/identifiers outside tracked fixtures; archive analyzed files only after hash checks, with no overwrite on filename collisions.
- Guard `tryRegex` against substring/conversational false matches (`เอ็นดู`, `ดูซี`, `ดูเหมือน`, `รอดู`, `ให้ดู`), keep `"ดู"` as `TRY_ITEM` while excluding it from self-name learning, guard conditional/family gifting (`จะยกให้พี่สาว`, `"ไม่เป็นไร..."`) from cancelling orders while preserving `ยกให้พี่เค้า`, guard `ใหม(?![่้๊๋])|ลูกค้าใหม่` (`เเก้ใหม่เด้อเสียง` -> `UNKNOWN`), support colloquial questions/Smart Answer (`สีอาไร`, `ซักยังนาว`, `อีกไม่ค่ะ`, `ขายไม่ค่ะ`), treat `รอดูไลฟ์พรุ่งนี้ก่อน...ส่งทีเดียว` as `hold-keyword`, strip `ค่า+` (`รับทราบค่าา`) and block `พี่รับค่ะ ที่`/`ใส่ด้วย` from fake names while parsing `พี่รับค่ะ ที่2` as explicit buy and `มะระ สั่งเสื้อสีขาว 2 ตัว` as `ADMIN_NOTE` (`/verify` 2.16–2.18).
- See docs/chat-regex-review-2026-10-31.md and /verify 2.11–2.18. Passing this corpus is regression evidence, not a claim of 100% accuracy on new chat.

## Thai TTS Policy (2026-11-02, latest user approval)

- The earlier v5.4.17 free-native release remains documented as historical. The user subsequently chose the original Google Cloud Standard voice as primary, Microsoft Pattara as fallback, and both devices speaking. This installation may explicitly opt in with VITE_ENABLE_GOOGLE_CLOUD_TTS=true; do not silently enable Cloud in other/free builds. Billing/payment readiness is separate from code readiness; never report live Cloud success from mocks or a successful build.
- Free builds retain their native migration, no Cloud keys/calls/presence writes, and TH ฟรี test button. Saved preferences alone cannot enable Cloud. Approved Cloud builds migrate to standard once via manowzab_tts_cloud_policy=cloud-primary-2026-11-02, then preserve a subsequent manual native choice independently on each device.
- GoogleTtsAudio prepares bytes only: no playback or queue advancement. Deduplicate in-flight text/voice, cap background requests at current + next two, preserve bounded LRU copies, and share formatting/sanitization with foreground speech. Never drop queued chat to reduce latency.
- Bound Google fetch plus response-body loading across all keys to 2000ms total (1500ms/key maximum). Invalid-key/network failures may rotate within that deadline. BILLING_DISABLED and HTTP 429 enter cooldown without cycling keys to evade account/project limits. Retry after 60s for Billing or 10s for other failures, or explicitly retry from the mode control; retain native fallback throughout.
- Reset invalidates fetch/decode/resume/native callbacks before stopping audio and clears queued work. A watchdog invalidates the current item before continuing the remaining FIFO queue. Old outer-queue finally handlers must not change the state of a new queue. Keep shared AudioContext, iOS unlock, Thai cardinal words, emoji fallback and Firebase time/blacklist guards.
- Native fallback prefers installed Thai voices (Microsoft Pattara on this Windows device), then other Thai voices. Availability varies by device. Verify request limits, cache/dedup, deadlines, Billing/quota recovery, cancellation, old callbacks, actual playback FIFO and two isolated clients. Distinguish mocked Cloud payload/browser engine events from live synthesis and listening on physical devices.
- Reopening existing Billing was authorized, but no payment-method replacement, payment, credit purchase or paid add-on is implied. If Google requires card verification, have the user complete that step. Keep credentials, card details and original logs out of tracked files.

- Cloud Billing controls: distinguish alert-only budgets from verified enforcement. All-account budgets and payment thresholds do not guarantee invoice ceilings; native spend caps have project/service restrictions and TTS is not currently eligible. Custom shutdown can lag and removing billing can irreversibly affect resources. Verify actual scope/recipients and any deployed response separately; keep private billing evidence out of public Git. See docs/cloud-billing-controls.md.

## Operational workspace UI baseline (2026-11-02 rollback)

- The user reverted the entire v5.4.19 UX/UI to the v5.4.18 baseline. Use source b50aca2 (same application source as the published v5.4.18, plus documentation) as the reference. Restore its layout, colours, controls, chat collapse and queue interaction. Do not reintroduce the v5.4.19 tabs/resizer/status panels/draft UI without a new request.
- Retain v5.4.18 Google Standard primary/native fallback, Cloud opt-in/free-build boundaries, FIFO, prefetch/deadlines, regex corpus, Firebase authentication and delivery invariants. A UI rollback must not downgrade these or mutate business data or Billing.
- Original new-order emphasis remains 15,000ms in StockGrid.vue. Keep the full-width Smart Answer and thin black outline from the v5.4.18 baseline.
- Publish rollback builds with a new increasing release version so installed clients can detect an update. Clearly distinguish the restored UI baseline from the release number; preserve historical release notes and their evidence.
- Verify baseline source parity excluding changelog, current unit suite and builds, then check published artifacts/PWA. V5.4.19-only acceptance checks and its historical 800-test result no longer describe the active UI. Report physical-device/production-login checks separately.

## Legacy shipment review (2026-11-06)

- When a count-only pending session still has stock whose matching unfulfilled bookings do not equal its saved count (whether zero, partial, or extra historical board items from earlier unrecorded cycles such as `aAs6hsbgtpg` 2 saved vs 6 found), do not silently discard its saved count or block forever with an error. Require an explicit physical-count review in the shared markDone action, then re-read stock and retain the atomic reviewed-customer guard.
- Keep the original shipment count, total price, cycle ID and undo snapshot; record explicitly reviewed mismatched sessions in lastDoneSnapshot.legacyCountConfirmed. Mark existing board items in fulfilledItems so they do not reopen on subsequent syncs, while keeping lastDoneSnapshot.sessions[vid].items empty when found !== count so undo never inflates the saved count. Exclude already fulfilled identities from legacy fallback. Cancel, failed reads, stale stock/customer review and duplicate confirmations must not change the shipment.
- Undo of a count-only shipment must preserve its original quantity/value even if a new identified booking arrived before undo. Never claim physical dispatch from tests; production completion requires the operator confirming the actual parcel count.

## Non-destructive shipping removal (2026-11-08)

- Clicking the trash button (`🗑️` `deleteCustomer` / `removeFromShippingList`) in `ShippingManager.vue` or `ShippingPage.vue` must NEVER delete a customer record from `delivery_customers` or `address_book` (`remove(dbRef(db, 'delivery_customers/...'))` is strictly forbidden).
- Instead, `removeFromShippingList` / `unscheduleDelivery` (`unscheduleDeliveryState`) must only clear the shipping schedule (`deliveryDate: null`, `labelPrinted: false`, `labelPrintedAt: null`, keeping `status: 'pending'` for active records) via `runTransaction`, moving the customer out of `📦 เฉพาะคนที่แจ้งส่ง` and back to `🛋️ ฝากสินค้า / ยังไม่ระบุวันส่ง` while preserving their `name`, `itemCount`, `totalPrice`, `sessions`, `totalBookings`, `address`, `paymentType`, `contactChannel`, and `note` 100%.
- `restoreDeletedAddressBookCustomers()` self-heals any customer present in `address_book` whose `delivery_customers` entry was previously removed by the legacy trash button, restoring them into `ฝากสินค้า` (`deliveryDate: null`, `status: 'pending'`).

## Thermal shipping label typography & clean address (2026-11-09)

- Never include `'TH Sarabun New'` in the `font-family` stack of `ShippingLabelModal.vue` (`handlePrint` or preview CSS): on Windows machines with `TH Sarabun New` installed, any race in Google Font (`Sarabun`) loading inside the print iframe causes the browser to fall back to `TH Sarabun New`, which renders Thai glyphs ~35% smaller and thinner at the same `pt` size. Use `'Sarabun', 'Kanit', 'Leelawadee UI', 'Tahoma', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`.
- Give the print iframe real off-screen dimensions (`width: pageWidth; height: pageHeight; left: -9999px; visibility: hidden;`) rather than `0x0`, and await both the stylesheet `<link id="label-font-link">` load event and `document.fonts.ready` (bounded by an 800ms timeout guard) before invoking `print()`.
- Use valid W3C `@page { size: <width> <height>; margin: 0mm; }` syntax (never combine two explicit `<length>` values with the `landscape` keyword such as `size: 130mm 76mm landscape;`, which browsers reject as invalid CSS Paged Media syntax).

## Chirp 3: HD with Standard-A/Native Fallback (2026-11-16)

- Approved Cloud builds (`VITE_ENABLE_GOOGLE_CLOUD_TTS=true`) support 4 TTS modes (`achernar` default `th-TH-Chirp3-HD-Achernar`, `chirp3` `th-TH-Chirp3-HD-Aoede`, `standard` `th-TH-Standard-A`, `native` `🤖`) with automatic fallback (`achernar`/`chirp3 -> standard -> native`); free builds stay strictly `native` with empty `googleApiKey`.
- `GoogleTtsAudio.js` omits `pitch` and `speakingRate` for `Chirp3-HD` voices and isolates per-voice cooldowns (`voiceRetryAfter`) so `Standard-A` fallback runs immediately.
- **Natural Thai Spacing & Zero Dot Verbalization (`TextToSpeech.js`, `thaiNumberWords.js`)**: Never use `" ... "` (Chirp 3: HD reads `"..."` as `"จุด"`) or Western commas `", "` (alters Chirp 3: HD Thai cadence). Always join `${cleanAuthor} ${messageBody}` and `ทั้งหมด ... รายการ` with pure Thai space, strip ellipses and all non-decimal dots (`ELLIPSIS_REGEX`, `NON_DECIMAL_DOT_REGEX`) in `sanitize()` and `cleanAuthor`, convert numeric decimals (`38.5` ➔ `สามสิบแปดจุดห้า`) idempotently, and preserve both `price` and `details` on sole-owner cancel in `stock.js` for `live-product-capture-ai` v1.5.0 compatibility.
- Monthly TTS character quota tracking (`ttsQuota.js`, `system.js`, `TtsQuotaModal.vue`): counts real HTTP synthesis calls only (excluding cache hits), syncs via `settings/ttsUsage/{YYYY-MM}` (`runTransaction`), resets on the 1st at 00:00 US/Pacific Time (`America/Los_Angeles`) with automatic primary-voice restore, shows a live Header quota pill, and auto-switches at 90% (`Chirp3-HD -> Standard-A -> Native`), remaining inert in free builds.
- Maintain high-legibility thermal font sizes calibrated 1:1 with on-screen preview (`receiver-name: 13.5pt / 700`, `receiver-addr: 11pt / 600` with adaptive long-address sizing, `receiver-zip: 14pt / 800`, `receiver-phone: 11pt / 700`, `sender-name: 10pt / 700`, `meta-payment-row: 9.5pt / 800`, `card-footer: 9pt / 600`) and support user-selectable font scaling (`preview` 100% default / `compact` 90% / `large` 120%) persisted in `localStorage('manowzab_label_font_scale')` so print output matches preview proportions.
- `cleanShippingLabelAddress` (`getCustomerCleanAddress`) must strip duplicate leading recipient names, embedded phone numbers, and 5-digit postal codes from the address body when those fields are already rendered on dedicated lines.

## Replay Price Detection & Exact Date Sync (2026-11-12)

- Manowzab AI (`run_live_launcher.py`) supports fast accelerated detection on past live streams (VOD / Replay) from YouTube URLs or Thai date queries (e.g. `11 พ.ย. 69`).
- `SessionResolver` auto-resolves live dates (from YouTube title/upload_date or Thai date queries), ensures `history/{videoId}` exists in Firebase with title and date timestamp, runs fast accelerated replay without `-re`, syncs detected prices directly to `stock/{videoId}/{item}/price`, and recalculates totals in `history/{videoId}`.
- In `HistoryModal.vue`, display the price badge (`.stock-price`) whenever `item.price && Number(item.price) > 0` for both sold and unsold items, and ensure `historyTotalSales` reads `selectedItem.value?.orders` (never an undefined `allOrders` reference) with `historyModal.test.js` verifying mount/render cleanly.
- Support read-only Historical Chat Replay (`viewMode === 'chat'` tab `แชท` in `HistoryModal.vue` + `fetchHistoryChats(videoId)` in `useHistory.js`) sharing `src/utils/chatDisplayUtils.js` with `ChatPanel.vue` (360-degree FNV-1a personal gradients, `4.5px` Hybrid semantic left borders, intent tabs, customer metadata pills via ref-counted `useCustomerStore`, search/author filter, YouTube emotes, CSV export), strictly filtering `isPriceAnnouncementMessage` and playing zero audio.
- Store and display Historical Live Titles reliably (`/verify` 6.8): `useYouTube.js` (`connectVideo`) writes `history/{videoId}` via non-destructive `get` + `update` (preserving totals and original `timestamp`), `stock.js` persists valid `systemStore.liveTitle` during history sync, `useHistory.js` provides `updateHistoryTitle` & `syncMissingHistoryTitle`, and `HistoryModal.vue` displays `.history-live-title-bar` (full title, date, `videoId`, inline edit, YT refresh) alongside 2-line sidebar titles and `.sidebar-search-input` filter.
- Provide `openOnMainBoard()` action in `HistoryModal.vue` allowing the operator to switch `system/activeVideo` in Firebase and open the historical live session directly on the main dashboard in 1 click.

## Quiet Luxury Live Monitor UI (v5.5.0+ — 2026-11-13)
- Render `<Header />` full-width above `.app-layout` (`App.vue`), with `.mobile-pane-tabs` (`<= 900px`) for single-pane mobile switching while keeping all core invariants intact (`id="yt-video-id-input"`, `.total-sales-badge`, `.stock-price-pill`, `.no-addr-indicator` + `hasCustomerAddress` in `v-memo`, `data-lenis-prevent`, `100dvh`, non-destructive shipping removal).
- Maintain 3-tier non-overlapping `StockItemCard.vue` layout (keep `.stock-item` CSS solely inside `StockItemCard.vue`, never duplicate `.stock-item` or `aspect-ratio: 1.35` in `StockGrid.vue`; use `grid-auto-rows: minmax(104px, auto); align-items: stretch;` on `.stock-grid`), preserve unmistakable high-contrast separation between vacant (`rgba(10, 14, 22, 0.42)`, `1.5px dashed`, dimmed `#475569`, crisp `#cbd5e1` `.stock-num`) and booked cards (eye-friendly Deep Crimson/Burgundy `rgba(185, 28, 28, 0.42)` ➔ `rgba(69, 10, 10, 0.88)`, `1.5px solid rgba(248, 113, 113, 0.65)`, background-free `1.2em` `#fef08a` `.stock-num` & `1em` `#fbbf24`/`#fde047` `.stock-price-pill` with `background: transparent; border: none;`, mirrored in `HistoryModal.vue` & `style.css`), prevent accidental drag-selection (`user-select: none` on `.header`, `.stock-panel`, `.stock-item`, `.grid-item` while keeping `input, textarea` selectable), with booking animations (`orderPopEntry`, `newOrderLuxPulse`, `.new-order-shimmer`, also triggered on queue promotion in `StockGrid.vue`) and cancellation animations (`cancelShakeEntry`, `cancelPulseLux`, `.cancel-flash-sweep`), untruncated `.stock-search-input` (`150px`), and single-chevron `.quick-filter-select`.
- Maintain enlarged live-monitor chat typography in `ChatPanel.vue` (`1.18rem` bubble text, `#ffffff` 600/700 weight, unified single-card `.chat-row` with borderless/transparent `.chat-bubble`, Hybrid per-customer 360-degree FNV-1a tinted row backgrounds (`getCustomerRowColor()` + `getChatRowStyle()` `0.24/0.09` alpha gradient) combined with semantic `4.5px` intent left stripes/borders (`#10b981` buy, `#a855f7` shipping, `#f43f5e` cancel with danger wash, `#e5b869` admin gold cards with intent stripes), clean inline `.chat-name`, `430px` desktop `.chat-panel` width, non-clipping `.chat-intent-tabs` fitting all 7 tabs, icon-only `.btn-collapse` preventing `.chat-header-bar` clipping, and `scroll-behavior: auto` on `#chat-viewport`), plus Quiet Luxury `ShippingManager.vue` styling (`1040px` width, segmented tabs, `white-space: nowrap` `.item-count-auto`, and FontAwesome action icons).
- Keep multi-buy TTS pronunciation clear via `formatMultiBuyTtsMessage()` in `src/utils/thaiNumberWords.js` / `useChatProcessor.js` by prepending `"รายการที่ "` before every booked item number whenever > 1 item is booked in one message (e.g. `"12 15"` -> `"รายการที่ สิบสอง รายการที่ สิบห้า ... ทั้งหมด สอง รายการ"`).
