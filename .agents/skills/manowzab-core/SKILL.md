---
name: manowzab-core
description: >-
  Expert engineering and operational guide for Manowzab Command Center (Vue 3, Firebase RTDB, Web Audio, Live Commerce).
  Use this skill whenever developing, modifying, debugging, verifying, or deploying features in the Manowzab Command Center,
  including chat intent processing, stock booking queues, audio/TTS synchronization, shipping labels, and automated releases.
---

# 🚀 Manowzab Command Center Core Engineering Skill

This skill governs all development, bug fixing, architectural changes, and deployment procedures for the **Manowzab Command Center** (v4.85+). It ensures that critical live commerce invariants are preserved across all updates.

---

## 🏗️ 1. Architecture & Subsystem Map

The application is an event-driven, real-time live commerce dashboard built with:
- **Frontend**: Vue 3 (Composition API, `<script setup>`), Vite 7, Pinia 3.
- **Persistence & Real-Time Sync**: Firebase Realtime Database (RTDB v12).
- **Audio Engine**: Multi-tier Cloud TTS in approved opt-in builds (`Chirp 3: HD` `th-TH-Chirp3-HD-Achernar` default & `th-TH-Chirp3-HD-Aoede`, fallback `th-TH-Standard-A`, and Native `SpeechSynthesis`; native-only in free builds) + Web Audio SFX.
- **Hardware Integration**: Direct thermal label printing via isolated hidden iframes (130x76mm / 76x130mm).

### Core Stores & Composables
| Subsystem | Primary Files | Key Responsibility |
| :--- | :--- | :--- |
| **Stock & Orders** | `src/stores/stock.js`, `StockGrid.vue` | Atomic inventory claiming (`runTransaction`), booking queues, auto-expanding grid, throttled & deduplicated history sync |
| **Customer & Address Sync** | `src/stores/customer.js`, `deliverySync.js` | Centralized reference-counted `delivery_customers` & `address_book` listeners, $O(1)$ `deliveryByNormKey` & `getCustomerMetaByName` cache |
| **Chat Processing** | `useChatProcessor.js`, `chatParserUtils.js` | Lazy short-circuit regex buying strategies, 80ms micro-batch window, Thai numeral normalization ($O(1)$), admin proxies |
| **Live Chat Sync** | `useYouTube.js`, `YouTubeLiveChat.js`, `src/stores/chat.js` | Concurrent poll batch dispatch (`Promise.allSettled`), API key rotation, Firebase real-time broadcast |
| **Blacklist & Safety** | `src/stores/blacklist.js`, `BlacklistModal.vue` | Centralized `/blacklist` RTDB sync, space-agnostic Thai matching, zero-leak audio mute, anti-stock stealing |
| **Audio & TTS** | `useAudio.js`, `TextToSpeech.js`, `system.js` | Unified sequential queue, free Thai voice test button (Cloud toggle only in opt-in builds) (`S` / `🤖`), shared singleton `AudioContext`, LRU cache, iOS unlock |
| **Shipping & CRM** | `ShippingManager.vue`, `addressParser.js` | Delivery dates, countdowns, smart Thai phone/zip parser, thermal labels |
| **Device Roles** | `system.js` | Host role takeover, Active Price Detector election, presence-based key balancing |

For detailed Firebase schema definitions and database paths, refer to [architecture.md](./references/architecture.md).

---

## 🔒 2. Mandatory Engineering Invariants

### 📌 กฎเหล็กประจำระบบ: ห้ามทำอะไร (DO NOT) & ให้ทำอะไร (MUST DO)
*(อัปเดตล่าสุด: 28 พ.ย. 69 — ปฏิบัติตามอย่างเคร่งครัดและอัปเดตต่อเนื่องทุกครั้งที่มีการเปลี่ยนแปลง)*

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
1. **คิดและอัปเดตกฎ + `/verify` อัตโนมัติทุกครั้ง (Proactive Rule & `/verify` Auto-Evolution) และรวมแชทสดทุกครั้งที่พูดถึง Regex:**
   - หลังแก้ไขโค้ดทุกครั้ง ต้องวิเคราะห์และอัปเดตไฟล์กฎ (`AI_RULES.md`, `GEMINI.md`, `.agents/AGENTS.md`, `.agents/skills/manowzab-core/SKILL.md`) และ `.agents/workflows/verify.md` โดยอัตโนมัติโดยไม่ต้องรอให้สั่ง พร้อมรายงานให้ผู้ใช้ทราบทุกครั้ง
   - **Unified Regex Scope:** ทุกครั้งที่ผู้ใช้พูดถึงหรือสั่งตรวจสอบ/ปรับปรุง **Regex** ต้องตรวจรวม **Regex แชทสดจองสินค้า/ยกเลิก/ส่งของ/ถามคำถาม/จำชื่อลูกค้า** (`chatParserUtils.js`, `useChatProcessor.js`, `smartAnswerUtils.js` เทียบกับไฟล์ล่าสุดใน `Logs\Chat`) ควบคู่กับ **Regex ฝั่ง AI จับราคา/ไซส์** (`live-product-capture-ai`) เสมอ; คง `isSizeRangeText()` ร่วมกันรองรับ multi-buy/cancel แบบขีด/ทับ (`11-14`, `6/7`, `ยกเลิก 11-14`) โดยยังบล็อกช่วงอก `32–65` (`52-54`, `42/44`), `27/11/69`, `081-...`, รองรับ `เทาไร่`/`นาวใส่41`, และกันคำปลอม (`ห่นเทาไร่`, `ให้หลานสาวคะ`, `เน็ตเสีย`, `ทา`) ไม่ให้จำชื่อลูกค้า
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
   - ใน `StockGrid.vue` (และ `HistoryModal.vue`) เปลี่ยนตำแหน่งข้อความเดิม ("🔥 ไฟเริ่มติดแล้ว!") เป็นป้ายยอดขายรวม `.total-sales-badge` (`ยอด: ฿...`) สีทองสด (`#fbbf24` / `#fde047`) **ไร้กรอบและไร้พื้นหลัง** (`background: transparent; border: none; box-shadow: none;`)
   - คำนวณจาก `useStockStore.totalSales` โดยรวมเฉพาะสินค้าที่ขายแล้ว (`item.owner` มีค่า) และมีราคาที่ถูกต้อง (`item.price > 0`) สินค้าที่ว่างอยู่ไม่ถูกนำมาคำนวณ
   - รองรับตัวเลขอัปเดตแบบแอนิเมชันลื่นไหล (`animateValue`), Pulse Effect (`isPulsingSales`), Tooltip สรุปจำนวนชิ้น, และ Responsive ซ่อนคำว่า `ยอด:` บนมือถือ (`<= 768px`) เพื่อความกะทัดรัด
9. **การป้องกัน False Positives จาก Whisper Thai ASR & Chrome Live Caption (`live-product-capture-ai` v1.5.8+):**
   - **Chrome Live Caption เป็นเมนู `[1]` + การจูน Regex & สเปก (`v1.5.7–v1.5.8`):** เมนูแรกและค่าเริ่มต้นคือ Chrome Live Caption พร้อมดึง `system/activeVideo` อัตโนมัติ, แคช UIA primary node, หน่วงตัดเลขค้าง (`1.35s`) + ต่อเลขขาดครึ่งข้าม chunk (`396`+`0`), กัน `"ผ้าไม่ยืด <N>"` ติด `ยืดสุด`, กันคำแนะนำ `"อก 50 อัพ/บวก"` ทับอกจริง, กันค่าส่งท้ายไลฟ์ (`พื้นที่พิเศษ/พื้นที่ห่างไกล/คิดยอดตามจริง` + `"50 บาท"` ทับ `#50`), ใช้ `is_false_ok_compound()` จับ `"อก"` ติดคำไทย (`แบบนี้เลยอก 52`/`ไม่ยืดอก 48`/`คอตตอนอก 48`/`อกสักประมาณ 38`) โดยยังบล็อก `ลายดอก`/`บอก`/`ส่งออก`, แยกเลขไทยติดกัน (`ยี่สิบเก้าหกสิบบาท`, `อกสามแปด40`), ตัดช่วงอกเว้นวรรค (`48 อก 38 40`) กันหลุดเป็นราคา `฿40` โดยห้ามเติม `"อก อก"` ซ้ำ, รองรับ `_merge_cued_spaced_code` (`รายการที่ 1 4`/`1 7 80`/`1 3 6 5 4`), `ลายกันที่`, `14,80`, `4964850`, `อก 464 8`, `6 4 6 4 8`, `4 2 6 5 12`, `3 6 6 4 8`, `65456`/`48648`/`3 5 6 4 8`/`อก 552`/`46 อก 46`/`48 นะคะรอบอก 48`/`36 48 ยาว 32`/`49 รอบ 54 ยาว 294980`, รีเซ็ต non-standard `detected_price` (`3860 บาท`) ก่อนแยก compound, เพิ่ม `protect_existing=True` กันสเปกเดิมโดนทับหลังล็อกราคา (อนุญาตทวนรายการชัดเจนแก้ `อก <= 32`) + กู้รอบอกข้าม chunk (`อก`+`56`/`3840`) + `leading_bust_cont` หลัง `"ตึงหน้าผ้า"`, และกัน `LiveEndMonitor` หยุดก่อนกำหนดขณะ `upcoming`
   - **ต้องเริ่มจากรายการที่ 1 ก่อนเสมอ (`require_start_item_1=True` ค่าเริ่มต้น):** รอ `"รายการที่ 1"` ก่อนเริ่มเปิดรายการ/ล็อกราคาเพื่อกันเสียงเกริ่นเปิดร้าน (`"20 100 บาท"`, `"20 ถึง 100 บาท"`, `"20 ไปจนถึง 100 บาท"`, `"รายการที่ 19"`) ไม่ให้ขึ้น `#20 = ฿100` เป็นรายการแรก พร้อมปลดล็อกกลางไลฟ์อัตโนมัติเมื่อพบสต็อกเดิมใน Firebase หรือขายเรียงติดกัน 2 รายการชัดเจน (`16 ➔ 17`)
   - ต้องรองรับเลขหลักสิบที่มีช่องว่างและคำเพี้ยน Whisper (`แปด สิบ` ➔ `80`, `สิบเจ็บ`/`สิบจีด` ➔ `17`, `สิบโหก` ➔ `16`, `สิบ สี` ➔ `14`, `สิบสาว` ➔ `13`, `สีสิบเอ็ด` ➔ `41`, `ยิปสอง` ➔ `22`, `นี่สิบสาม`/`เยี่สิบสาม`/`แปลดสิบป้าท` ➔ `23 80`, `ยี่แปด` ➔ `28`, `สามที่ผก` ➔ `36`, `สามก้า` ➔ `39`, `สี หก 80` ➔ `46 80`, `สาม สอง`/`สาม สาม`/`3 7`/`3.9`/`4 9 60`), จัดลำดับ `spaced_pair` ก่อน `item_digit_pattern` และรองรับ `รายการ ที่`, `ตัวนี้ก็ไป`, `23ตัวนี้ 80บาท`, และเลขหลักเดียวขึ้นต้นก่อนกริยาราคา (`เจ็ด เอาไป 60 พอ`)
   - ต้องกรองเปอร์เซ็นต์ (`ราคา 100%`), ช่วงราคานำรายการ/ค่าส่งทั้งติดกันและตัดคำ (`"ตั้งแต่ 20 ไป จะถึง 100"`, `"กรณีโอนเงิน 40"`, `"ค่า ส่ง กรณี โอน เงิน 40 บาท"`, `"เก็บไปทาง 50"`, `"บกเพิ่ม"`), จำนวนผู้ชม (`10 20 11 ท่าน`), อกเพี้ยนและช่วงอกขาลง (`อ 6 40` ➔ `อก 40`, `อก 42 40`), วลีวัดขนาดซ้อน (`"อกตึงหน้าผ้า ได้ 46 ขอประมาณ 40 บาท"`), และคลิปคำ `"ที่ 31 ค่ะ อก 56"` ออกจากรหัสและราคา; ใน `LiveStreamPriceDetector` กันรหัส ASR หลอมรวมกระโดด `> 120` (`#196`/`#246`), ห้ามปิดรายการค้างเมื่อ `parsed_raw.code` ถูก Jump Guard ปฏิเสธ (เช่น `"4 ค่ะ"` ขณะอยู่ที่ `#40`), กัน `"รายการที่ รหัส 60"` ไม่ให้สร้าง `#60`, ผูกราคา `pre_text` และ orphan price หน้า `รายการที่ X` (`"ตอนนี้ 60 บาท"` ➔ `"รายการที่ 45"`), และห้ามเขียนทับราคาที่ล็อกไว้แล้วจากการลองใส่ (`is_tryon_signal`), แชทตัวเลขล้วน (`คือ 14 16 50`), เพื่อนบ้านที่ล็อกแล้ว (`#36` ขณะอยู่ที่ `#37`), หรือรายการถัดไปที่ไม่พูดเลขรายการเว้นแต่มีคำลดราคาจริง (`ลด`/`เอารด`)
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
13. **เกราะป้องกันชื่อและที่อยู่ลูกค้า 6 ชั้น (6-Layer Customer & Admin Identity Safety — 28 พ.ย. 69):**
   - **ห้ามเขียน `nicknames/<ชื่อธรรมดา>` และห้ามเขียน `nicknames/` จาก Proxy/Manual/Synthetic Key (`customerIdentityGuard.js`, `ChatPanel.vue`, `CustomerQuickEditModal.vue`, `Dashboard.vue`, `PhoneticManager.vue`):** คีย์ที่อนุญาตให้เปลี่ยนชื่อเล่นถาวรใน `nicknames/` มีเฉพาะ YouTube Channel ID (`UC...`) และ YouTube Handle (`@...`) เท่านั้น — Proxy edit (`isProxyEdit: true` หรือ `isTemporaryOrSyntheticUid`) ต้องไม่เขียนลง `nicknames/` เลย, `Dashboard.vue` ห้ามเขียน `nicknames/` สำหรับ `name:*`/proxy/manual, และ `PhoneticManager.vue` ต้องบล็อกการผูกชื่อธรรมดาไปเป็นชื่อลูกค้าอีกคน
   - **กันทับที่อยู่และออเดอร์ข้ามคน (`CustomerQuickEditModal.vue`):** ใช้ `detectCrossCustomerCollision()` เตือนทันทีบน UI และขอ confirmation ก่อนบันทึกเมื่อเปลี่ยนชื่อไปตรงกับลูกค้าที่มีอยู่ใน `address_book`/`delivery_customers` โดย **ห้าม** เขียนทับ `address_book` ของเป้าหมายด้วยฟอร์มคนเดิม, **ห้าม** เปลี่ยนชื่อ `delivery_customers` ของคนเดิมเป็นอีกคน, จำกัดการแก้สต็อกของ proxy edit เฉพาะ `item.uid === originalUid` พร้อมเปลี่ยน `uid` ตามเจ้าของใหม่และแยก `syncDeliveryCustomerForOwner` คนละ UID
   - **ป้องกันชื่อเล่นซ้ำระหว่างลูกค้าคนละบัญชี (`findDuplicateNicknameOwner` & `suggestUniqueNickname`):** ตรวจชื่อเล่นซ้ำข้ามบัญชี YouTube ทั้งจาก `nicknames`, `address_book` และ `delivery_customers` ใน `CustomerQuickEditModal.vue` (แสดงเตือนสีแดง + ปุ่มแนะนำชื่อไม่ซ้ำเช่น `"พี่นก 2"` + บล็อกการบันทึกสำหรับบัญชีจริง), `PhoneticManager.vue`, `Dashboard.vue`, และบล็อกการ auto-learn ชื่อตัวเองซ้ำใน `useChatProcessor.js` (ทั้ง 2 จุด) เพื่อไม่ให้ 2 บัญชีรวมออเดอร์/ที่อยู่ผิดคน
   - **Read-Side Strict Isolation (`src/stores/nickname.js`, `StockGrid.vue`, `HistoryModal.vue`):** ใน `getNickname()`/`hasNickname()` หาก `uid` เป็น proxy/manual/synthetic/`null` และ `realName` ไม่ใช่ `@handle` ต้องคืน `realName` ตรงๆ โดยไม่ fallback ไปดึง `nicknames[realName]` และใน `StockGrid.vue`/`HistoryModal.vue` ห้าม fallback เป็นคีย์กลาง `"manual"`
   - **Admin Identity Guard (Layer 6 — `useChatProcessor.js`, `ChatPanel.vue`, `CustomerQuickEditModal.vue`):** ตรวจสถานะแอดมิน (`isAccountAdmin`) ก่อนดึง `nicknames/` เสมอ — หากมีชื่อลูกค้าหลุดมาผูกกับ UID แอดมินให้ข้ามและคงชื่อ `"แอดมิน"`, ห้ามแสดงป้ายที่อยู่/OA/โอนของลูกค้าบนแชทแอดมินปกติ (ที่ไม่มี `proxyName`), และบล็อกการเปิด/บันทึก `CustomerQuickEditModal` บนบัญชีแอดมินเพื่อไม่ให้ทับ `nicknames/` หรือ `delivery_customers/` ของแอดมินเป็นชื่อลูกค้า
   - **Cross-Device `stockSize` Sync (`stock.js`, `App.vue`, `StockGrid.vue`, `HistoryModal.vue`):** ช่องเปลี่ยนจำนวนรายการต้องใช้ `v-model` + `@keydown.enter.prevent` + `@change` + `@blur` (ไม่ใช้ `v-model.lazy` เดี่ยวๆ ที่กด Enter แล้วไม่บันทึก), ใช้ `update(dbRef(db, "settings"), { [`${videoId}/stockSize`]: size, defaultStockSize: size })` แบบ Atomic พร้อม `initDefaultStockSizeListener()` ใน `App.vue` เพื่อให้ทุกเครื่องซิงค์ค่าเดียวกันทั้งตอนไลฟ์สด, ตอนเปลี่ยนก่อนต่อไลฟ์, และตอนเปิดไลฟ์ใหม่ที่ยังไม่มี `settings/{videoId}/stockSize` พร้อม rollback เมื่อเขียนไม่สำเร็จและแสดง toast ตามผลจริงหลัง `await`
14. **แอนิเมชันสินค้าจองใหม่แบบดูง่ายและลื่น 60fps (`StockItemCard.vue`, `StockGrid.vue`, `stock.js`, `style.css` — 27 พ.ย. 69):**
   - การ์ดจองใหม่ (`.stock-item.sold.new-order`, ระยะเวลา 8 วินาที) ใช้โทนไฮไลต์ Ruby-Gold ขอบทอง `2px`, แฟลชแสงทอง `.new-order-flash`, ป้ายลอย `.new-order-pill` (`ใหม่`), วงแหวนแสงทองคู่ `::before`/`::after`, แสงชิมเมอร์ `.new-order-shimmer`, แถบนับถอยหลัง `.new-order-timer-fill` (`scaleX` 8 วินาที) และชื่อลูกค้าเด้งชัด `.stock-status` โดยทุก `@keyframes` ใช้เฉพาะ GPU compositor (`transform`/`opacity`) แบบ finite (ไม่ใช้ `infinite`), ตั้ง `content-visibility: visible` ขณะ `.new-order` ไม่ให้ `contain: paint` ตัดวงแหวน/ป้ายลอย, คง `.stock-num` ไร้พื้นหลัง, ไม่ใช้ wildcard `* { animation-duration: 0.01ms !important }` ใน `@media (prefers-reduced-motion: reduce)` ที่ฆ่าแอนิเมชันบน Windows (`MinAnimate=0`), แปลง Firebase sparse array `[null, ...]` ด้วย `normalizeStockSnapshot()` ใน `stock.js` กัน watcher ใน `StockGrid.vue` พังที่ index 0, และตั้ง `hydratedVideoId = activeVid` เมื่อโหลดไลฟ์ว่างเสร็จเพื่อให้ออเดอร์แรกของไลฟ์แสดงแอนิเมชันเสมอ
15. **ระบบตรวจและรวมลูกค้าซ้ำในสมุดที่อยู่ลูกค้า (`addressMergeUtils.js`, `AddressMergeModal.vue`, `AddressPage.vue` — 28 พ.ย. 69):**
   - ตรวจจับลูกค้าที่อาจซ้ำทั้งกรณี **ต่างชื่อแต่คนเดียวกัน** และ **ชื่อเดียวกันแต่มีหลายไอดีแยกกัน (`UC...` + `manual-...`/`cust_...`)** โดยเปรียบเทียบ **ไอดี (UID/YouTube Channel ID)**, **เบอร์โทร (normalized 9–10 หลัก)**, **ที่อยู่ (normalized + บ้านเลขที่/รหัสไปรษณีย์ + Dice similarity)**, **ชื่อผู้รับ**, และ **ชื่อคล้ายกัน** พร้อมแจ้งเตือนสีแดงเมื่อพบ YouTube ID/เบอร์โทร/ที่อยู่ต่างกัน (ป้องกันรวมผิดคน) และไม่จัดกลุ่มชื่อคล้ายกันที่มีเบอร์+ที่อยู่ต่างกันโดยพลการ
   - การรวมข้อมูล (`buildCustomerMergePlan`) ต้องทำแบบ **Atomic Multi-Path Update** เดียว: รักษาทุกที่อยู่ที่ไม่ซ้ำไว้ใน `addresses[]`, เลือกไอดีหลักเป็น YouTube Channel ID แท้ (`UC...`) ก่อนเสมอ, รวม `sessions`/`items`/`fulfilledItems`/`totalBookings`/วันส่งที่เร็วสุดผ่าน `recalculateDelivery()`, อัปเดต `nicknames/` เฉพาะคีย์ `UC...`/`@handle` ที่ผ่าน `isSafeGlobalNicknameKey()` (ห้ามเขียนชื่อธรรมดา/proxy key), และซิงค์ชื่อเจ้าของบนกระดานไลฟ์ปัจจุบัน (`stock/{activeVideo}`) ให้ตรงชื่อหลักเพื่อไม่ให้รายชื่อรองฟื้นกลับคืนมา
   - **การลบรายชื่อในสมุดที่อยู่ลูกค้า (`inspectCustomerDeleteState`, `buildCustomerDeletePlan`):** หากลูกค้ารายนั้น **ไม่มีสินค้าค้างจัดส่งและไม่มีวันนัดส่งที่ยังไม่เสร็จ** (`hasPendingOrders === false`) ให้ลบทั้ง `address_book/{key}` และ `delivery_customers/{id}` ได้จริงแบบ Atomic (แถวหายออกจากตารางทันที; หากมีประวัติเคยซื้อ `totalBookings > 0` ให้เลือกได้ระหว่างลบทั้งหมดหรือลบเฉพาะที่อยู่) แต่หาก **ยังมีสินค้าค้างส่ง/นัดส่ง** ต้องบล็อกการลบถาวรเพื่อกันออเดอร์หาย พร้อมเสนอปุ่ม `🔀 ไปรวมกับชื่ออื่น` หรือ `ลบเฉพาะที่อยู่` (โดยไม่ดัน `updatedAt` ขึ้นแถวบนสุด) และกรองทุกคีย์ด้วย `isValidFirebaseKey`


Whenever touching code in this repository, you **MUST** uphold these non-negotiable rules:

### 1. Audio & TTS Synchronization Invariant
- **Never trigger overlapping audio**: All audio calls (SFX and TTS) must funnel exclusively through `queueAudio(sfxType, author, message)` in `useAudio.js`.
- **Cross-device playback**: Audio for new incoming live chat messages must be triggered by the Firebase listener in `src/stores/chat.js`, **NOT** directly in `useChatProcessor.js` (except local welcome announcements).
- **Time-guard incoming audio**: Only play audio for messages with `timestamp >= syncStartTime - 5000` and `isNew === true`.
- **Zero-Stall Fallback**: In an explicitly enabled Cloud build, if Google Cloud TTS encounters a network error, quota limit, or timeout, it must seamlessly fall back to `speakNative()` without stalling the audio queue.
- **Sanitization & Emoji Fallback**: Messages that sanitize to an empty string (stickers/emojis) must be voiced as `"ส่งสติกเกอร์"`.
- **Thai Cardinal Number & Booking TTS Pronunciation (v5.4.13+)**: Numbers in booking chats must be converted to Thai cardinal words (`numberToThaiWords`, `replaceNumbersWithThaiWords`, `formatMultiBuyTtsMessage` in `src/utils/thaiNumberWords.js`) so TTS pronounces "สิบห้า" instead of "หนึ่งห้า", with phone numbers, leading zeros, and time expressions safely preserved, and for multi-item bookings (`multi-buy` > 1 item) always prepend `"รายการที่ "` before every booked item number.
- **Shared Singleton `AudioContext`**: Reuse `ttsService.getAudioContext()` across TTS, SFX, and celebration audio.

### 2. Concurrency & Transaction Safety
- **Inventory writes must use `runTransaction`**: Never perform raw `set()`, `update()`, or `remove()` when booking (`processOrder`), canceling (`processCancel` or past-session cancel in `showOwnerItems`), or updating `totalBookings` (`markDone` / `undoDone`).
- **UID & Snapshot Preservation**: `processCancel` must preserve `previousUid` and `nextUid` and pass post-transaction snapshots to `syncDeliveryCustomerForOwner`. `clearAllStock` must `await remove()`, deduplicate owners, and pass `{}` to `syncDeliveryCustomerForOwner`. `markDone` must store `lastDoneCount` and `lastDoneSessions` so `undoDone` accurately reverts `totalBookings` and restores only current-cycle sessions.
- **Device Role Election**: Host role and Price Detector election (`system/activePriceDetectorId`) must be acquired and released atomically.

### 3. Memory Leak & Event Listener Hygiene
- **Centralized Customer Store (`useCustomerStore`)**: Never attach duplicate `onValue` listeners for `delivery_customers` or `address_book` in UI components. Always consume `useCustomerStore()`.
- **Unsubscribe all Firebase listeners**: Every `onValue`, `onChildAdded` must store its unsubscribe function and invoke it in `onUnmounted()`.
- **Chat Window Trimming**: Maintain bounds on in-memory chat messages (`MAX_MESSAGES = 500`, `MAX_SEEN_IDS = 2000`) without affecting CSV export data.

### 4. Thai Numeral & Intent Normalization
- **Strict $O(1)$ Thai transcription**: Always route through `thaiToArabic()` using the static table lookup `THAI_TO_ARABIC_MAP`.
- **Admin Proxy**: Support both `"26 พี่อ้อย"` and `"พี่อ้อย 26"` syntax; pronounce only the recipient customer's name during TTS.
- **Admin Proxy & Multi-Cancel Safety**: Support single and multi-item cancel (`"ยกเลิก 12 15"`, `"12 มะระ ยกเลิก"`, `"12 15 มะระ ยกเลิก"`, `"มะระ ยกเลิก 12"`, `"ยกเลิก 12 มะระ"`), cancellation typos (`ยกเริก`, `ยอเลิก`), and `ไม่รับ`/`ไม่เอา` + number (`"ไม่รับ25นะคะ"`, `"นาวพี่ไม่เอา38"`) while guarding against conditional/stain notes (`conditionalCancelGuardRegex`), never falling back to `null` wildcard when Admin specifies a customer name, and preserving item `price` when the sole owner cancels in `processCancel`.
- **Disambiguation & Parity Guards**: Guard `multiBuyRegex` with `!isMultiBuyBlocked()`, support `"พี่เอาใบที่120"`, `"ใช่คะ25"`, `"70นาว"`, prevent `"บอก"`/`"ดอก"`/`"คอกลม"` from falsely matching `"อก"` in `questionRegex`, exclude `"ส่งรูป"`/`"พรุ่งนี้ส่งรูป"` from `shippingRegex`, guard buys against size complaints (`negationGuardRegex`), price classifiers (`pricePatternRegex`), and quantity units (`quantityUnitRegex`), share `isAdminSizeSelectionNote()` across parser and processor (including garment/pattern/question notes with customer name suffix), and always push `isDateMismatch` messages to Firebase before returning.
- **Backdated Orders / Yesterday Debt Notes Audio & Extraction Invariant**: Support yesterday/backdated customer orders in both name-first and number-first formats (`"มะระ 39 เมื่อวาน"`, `"39 เมื่อวาน มะระ"`, `"ของมะระ 39 เมื่อวาน"`). These orders must NOT cut today's stock grid, must sync to Firebase with full audio support (`sfxType: isNewCustomerChat ? 'bell' : 'success'`, `ttsText: isVoiceChat ? '' : ttsMessage`), and deduplicate author prefixes in `ttsService.speak()`.
- **Zero-Allocation Regex & ReDoS Hygiene**: Hoist regular expressions to module scope, avoid nested quantifiers (`*?\s*`), and use memoized regex pools for dynamic search strings.

### 5. UI & Alert Standards
- **Toast vs Popup Separation**: SweetAlert toasts must not receive `heightAuto` or `returnFocus` options.
- **XSS Prevention**: Always wrap dynamic user strings with `escapeHtml()` before rendering via `v-html` or Swal modal templates.
- **Chat Auto-Scroll & Initial Bottom Pinning**: Use `evaluateChatScrollState()`, Double-RAF `scrollToBottom()`, and `ResizeObserver` on `#chat-list`/`#chat-viewport` in `ChatPanel.vue` (without `contain-intrinsic-size: 55px` on `.chat-row`) so initial load and async customer badge rendering stay pinned to the latest message.

### 6. Customer Blacklist & Ban Invariant (v5.4.5+)
- **Centralized Store & Storage Path**: Sync real-time via `settings/blacklist` in Firebase RTDB (`useBlacklistStore`).
- **Zero Audio Leakage**: Cross-device audio in `chat.js` MUST suppress all TTS and SFX playback for banned users.
- **Anti-Stock Stealing**: Banned customers CANNOT claim stock, enter queues, or cancel items in `useChatProcessor.js`.
- **Option A Visual Style**: `ChatPanel.vue` renders banned chat messages with dimmed opacity (~45%), red border-left accent, and `🚫` overlay directly on the profile picture (restoring full opacity on hover).
- **No Auto-Release of Prior Stock**: Banning a user never touches their previously booked items or queues automatically; releases remain purely manual by admin.
- **Space-Agnostic Thai Matching**: `isBanned()` and `getBanInfo()` match Thai names with and without spaces (e.g. "สมชาย ใจดี" and "สมชายใจดี").
- **Admin Controls**: Support `!แบน [ชื่อ]` / `!ปลดแบน [ชื่อ]` chat commands, 1-click ban/unban by clicking customer profile avatar (hidden inside avatar with hover hint), `BlacklistModal.vue` in `⚡ Tools`, and direct ban/unban toggle inside `CustomerQuickEditModal.vue`.

---

### 7. Backdated Booking Smart Time Formatting Invariant (v5.4.7+)
- Centralize booking time formatting in `src/utils/timeFormatUtils.js` (`formatBackdatedCard`, `formatBackdatedDetail`, `formatNormalBookingTime`, `getBookingTooltip`).
- Eliminate noisy seconds from timestamps (`13:11:50` -> `13:11`).
- Distinguish calendar day boundaries (`today`, `yesterday`, `other`) so backdated orders clearly display inline icon right behind customer name (`.backdated-inline-icon`) with polite Thai tooltip (`title`) without text clutter, while in the queue modal displaying `⏳ ย้อนหลัง • วันนี้/เมื่อวาน/วันที่ HH:mm` and normal bookings showing clean `🕒 HH:mm`.

---

### 8. Smart Seller Answer Assistant Invariant (v5.4.9+)
- **Zero Extra Firebase Reads, Visual-Only & Non-Redundant Copy**: Resolve customer questions across 5 stored-data categories (`item`, `orders`, `yesterday`, `hold`, `profile`) in `src/utils/smartAnswerUtils.js` using in-memory `stockStore.stockData`, `customerStore.deliveryByNormKey`, and `customerStore.addressBook` without triggering extra TTS audio. Omit duplicate customer names (unless `isProxyTarget`), omit duplicate item ID lists in headlines, and omit duplicate address/COD pills in `orders`/`item`/`yesterday`/`hold`.
- **3-Point Seller Display (`ChatPanel.vue`)**: Render (1) Full-width `.smart-answer-card` below the customer bubble inside `.chat-row` (`.smart-answer-top` without separate header row, including `getSmartAnswerKey(chat)` in `.chat-row` `v-memo`), (2) 25-second Pinned `.smart-hud-banner` at the top of `ChatPanel.vue` (`pinnedHudTimer` cleaned up on unmount), and (3) `💡 คำถาม` filter tab (`selectedChatTab === 'question'`).
- **Full-Width Answer Layout (2026-10-30)**: `.smart-answer-card` must be a direct child of `.chat-row`, outside `.chat-bubble`/`.chat-bubble-container`, spanning both avatar and message columns. Keep equal inner side padding, thin black text outlines, responsive wrapping, and working pin/jump/quick-order controls without changing audio or answer data flow.
- **Interactive Cross-Panel Actions (`StockGrid.vue`)**: Handle `manowzab:jump-to-item` (`scrollToItem`) and `manowzab:show-owner-items` (`showOwnerItems`) custom window events with cleanup in `onUnmounted`.

### 9. Lenis Smooth Scrolling & Scroll Isolation Invariant (v5.4.12+)
- **Integrated Architecture**: Powered by `lenis`, `lenis/vue`, `src/composables/useSmoothScroll.js`, and `v-smooth-scroll` directive.
- **Fixed Layout Preservation**: `src/assets/style.css` enforces `html.lenis, html.lenis body { height: 100dvh; overflow: hidden; }` preventing Lenis `height: auto` from breaking the fixed 100dvh SPA command center.
- **Zero Chat Interference**: `#chat-viewport` in `ChatPanel.vue` MUST have `data-lenis-prevent` to protect YouTube live stream real-time scrolling and bottom pinning.
- **Fluid Grid Navigation**: `StockGrid.vue` uses `useSmoothScroll(gridContainer)` with centered item jump animation (`scrollToItem`), while `ShippingManager.vue` sets `data-lenis-prevent` on `.sm-table-wrap`.

### 10. Firebase Authentication & Atomic Delivery Cycles Invariant (2026-10-30)
- **Identity & Authority**: Firebase Authentication is the sole source of truth for identity. Never trust client-generated sessions, hard-coded password hashes, or automatic anonymous sign-in. Access to all business nodes requires a non-anonymous Firebase user with `admin_users/<UID> = true`.
- **Protected Lifecycle**: Start protected listeners in `App.vue` only after authorization is verified; tear down listeners and sign out of Firebase on logout or grant revocation. Never include sensitive credentials in `VITE_*` variables.
- **Canonical Delivery Actions**: Both shipping screens (`ShippingManager.vue` and `ShippingPage.vue`) must use `deliveryActions.js` (`executeMarkDone`, `executeUndoDone`). Complete and undo operations execute as atomic transactions on the entire customer record guarded by delivery cycle identity and the reviewed booking snapshot.
- **Centralized Stock-to-Delivery Writers**: All stock-to-delivery writers (`App.vue`, `Dashboard.vue`, `HistoryModal.vue`) must route through `syncDeliveryCustomerForOwner` in `deliverySync.js`. Always retain `items`, `fulfilledItems`, and undo metadata.
- **Shipped Item Isolation**: A booking is identified by `videoId + itemNumber + bookingTime`. Modifying a price, customer name, or UID must never revert a shipped booking to pending. New bookings in the same video session count only unshipped items.
- **Firebase Sparse Array Normalization**: Handle numeric item maps that Firebase may deserialize as sparse arrays or JSON arrays; compare booking fields in canonical order so serialization differences never alter delivery identity.

## 🔄 3. Standard Workflows

### 🧪 1. Verification & Auto-Rule Evolution Protocol (`/verify`)
Always execute the automated verification suite before reporting completion:
```powershell
npm test
npm run build
```
1. Verify all current categories documented in [.agents/workflows/verify.md](../../workflows/verify.md).
2. **Proactive Rule & `/verify` Auto-Evolution (บังคับทำและรายงานทุกครั้ง)**: After every code change, proactively check if any project rules (`AI_RULES.md`, `GEMINI.md`, `.agents/AGENTS.md`, `SKILL.md`) or `/verify` items should be updated. Apply updates automatically without waiting to be asked, and **always report the rule/`/verify` updates to the user**.

### 🏷️ 2. Version Bump Protocol (`/update`)
When bumping versions:
1. Increment version in `package.json` (SemVer).
2. Add changelog entry in `src/data/changelog.js` (under `added`, `improved`, `fixed`, or `removed`) and prune old versions to keep only recent 15–20 versions.
3. Run `npm test` and `npm run build` to ensure a clean build.

### 🚀 3. Automated Deploy Trigger ("อัพเลย")
When the user states **"อัพเลย"**:
1. Run verification (`npm test` + `npm run build` + proactive rule/`/verify` update).
2. Run version update (`/update`).
3. Commit and push: `git add .`, `git commit -m "..."`, `git push origin main`.
4. Deploy to GitHub Pages: `npm run deploy:gh` (or `npm run deploy`).

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
- Maintain high-legibility thermal font sizes calibrated 1:1 with on-screen preview (`receiver-name: 13.5pt / 700`, `receiver-addr: 11pt / 600` with adaptive long-address sizing, `receiver-zip: 14pt / 800`, `receiver-phone: 11pt / 700`, `sender-name: 10pt / 700`, `meta-payment-row: 9.5pt / 800`, `card-footer: 9pt / 600`) and support user-selectable font scaling (`preview` 100% default / `compact` 90% / `large` 120%) persisted in `localStorage('manowzab_label_font_scale')` so print output matches preview proportions.
- `cleanShippingLabelAddress` (`getCustomerCleanAddress`) must strip duplicate leading recipient names, embedded phone numbers, and 5-digit postal codes from the address body when those fields are already rendered on dedicated lines.

## Quiet Luxury Live Monitor UI (v5.5.0+ — 2026-11-13)
- Render `<Header />` full-width above `.app-layout` (`App.vue`), with `.mobile-pane-tabs` (`<= 900px`) for single-pane mobile switching, `430px` desktop `.chat-panel` with `1.18rem` crisp white chat typography, unified single-card `.chat-row` (borderless/transparent `.chat-bubble`, Hybrid per-customer 360-degree FNV-1a tinted row backgrounds paired with semantic `4.5px` intent left stripes/borders via `getCustomerRowColor()` + `getChatRowStyle()`, clean inline `.chat-name`), non-clipping `.chat-intent-tabs` fitting all 7 tabs, icon-only `.btn-collapse` to prevent header clipping, and `scroll-behavior: auto` on `#chat-viewport`.
- Keep 3-tier non-overlapping `StockItemCard.vue` (no duplicate `.stock-item` / `aspect-ratio: 1.35` in `StockGrid.vue`; `.stock-grid` uses `grid-auto-rows: minmax(104px, auto); align-items: stretch;`), ensure `HistoryModal.vue` `historyTotalSales` reads `selectedItem.value?.orders` (never an undefined `allOrders` variable, covered by `historyModal.test.js`), keep read-only Historical Chat Replay (`แชท` tab in `HistoryModal.vue`, `fetchHistoryChats` in `useHistory.js`, shared `src/utils/chatDisplayUtils.js` with zero audio and `isPriceAnnouncementMessage` filtering), preserve & display Historical Live Titles (`useYouTube.js` non-destructive `update`, `stock.js` title sync, `useHistory.js` `updateHistoryTitle`/`syncMissingHistoryTitle`, `HistoryModal.vue` `.history-live-title-bar`, 2-line sidebar titles, and `.sidebar-search-input`), unmistakable high-contrast booked vs vacant card separation (vacant dark recessed `1.5px dashed` with crisp `#cbd5e1` `.stock-num` vs booked eye-friendly Deep Crimson/Burgundy `1.5px solid rgba(248, 113, 113, 0.65)`, background-free `1.2em` `#fef08a` `.stock-num` and `1em` `#fbbf24`/`#fde047` `.stock-price-pill`, mirrored in `HistoryModal.vue` & `style.css`), drag-selection protection (`user-select: none` on `.header`, `.stock-panel`, `.stock-item`, `.grid-item` with selectable `input, textarea`), booking (`orderPopEntry`, `newOrderLuxPulse`, `.new-order-shimmer`, also on queue promotion in `StockGrid.vue`) and cancellation (`cancelShakeEntry`, `cancelPulseLux`, `.cancel-flash-sweep`) animations, untruncated `.stock-search-input` (`150px`), single-chevron `.quick-filter-select`, and Quiet Luxury `ShippingManager.vue` (`1040px` modal, `white-space: nowrap` item counts, FontAwesome actions, non-destructive shipping removal).

## Chirp 3: HD with Standard-A/Native Fallback (2026-11-16)
- Approved Cloud builds (`VITE_ENABLE_GOOGLE_CLOUD_TTS=true`) support 4 TTS modes (`achernar` default `th-TH-Chirp3-HD-Achernar`, `chirp3` `th-TH-Chirp3-HD-Aoede`, `standard` `th-TH-Standard-A`, `native` `🤖`) with automatic fallback (`achernar`/`chirp3 -> standard -> native`); free builds stay strictly `native` with empty `googleApiKey`.
- `GoogleTtsAudio.js` omits `pitch` and `speakingRate` for `Chirp3-HD` voices and isolates per-voice cooldowns (`voiceRetryAfter`) so `Standard-A` fallback runs immediately.
- **Natural Thai Spacing & Zero Dot Verbalization (`TextToSpeech.js`, `thaiNumberWords.js`)**: Never use `" ... "` (Chirp 3: HD reads `"..."` as `"จุด"`) or Western commas `", "` (alters Chirp 3: HD Thai cadence). Always join `${cleanAuthor} ${messageBody}` and `ทั้งหมด ... รายการ` with pure Thai space, strip ellipses and all non-decimal dots (`ELLIPSIS_REGEX`, `NON_DECIMAL_DOT_REGEX`) in `sanitize()` and `cleanAuthor`, convert numeric decimals (`38.5` ➔ `สามสิบแปดจุดห้า`) idempotently, and preserve both `price` and `details` on sole-owner cancel in `stock.js` for `live-product-capture-ai` v1.5.0 compatibility.
- Monthly TTS character quota tracking (`ttsQuota.js`, `system.js`, `TtsQuotaModal.vue`): counts real HTTP synthesis calls only (excluding cache hits), syncs via `settings/ttsUsage/{YYYY-MM}` (`runTransaction`), resets on the 1st at 00:00 US/Pacific Time (`America/Los_Angeles`) with automatic primary-voice restore, shows a live Header quota pill, and auto-switches at 90% (`Chirp3-HD -> Standard-A -> Native`), remaining inert in free builds.
