# Chat regex review — 2026-10-31

## ขอบเขต

ผลวิเคราะห์ก่อน release v5.4.16 จาก source main 7010fc9; การเผยแพร่ภายหลังดู [release report](release-5.4.16.md) วิเคราะห์ CSV ที่อยู่ตรงโฟลเดอร์ Chat ทั้ง 5 ไฟล์ครบ 307 แถว ไม่อ่านซ้ำไฟล์ที่อยู่ใน old และไม่ replay ข้อมูลจริงเข้า Firebase

| ไฟล์ | ข้อความ |
|---|---:|
| 20-10-2569.csv | 42 |
| 21-10-2569.csv | 12 |
| 23-10-69.csv | 122 |
| 27-10-69.csv | 94 |
| 28-10-69.csv | 37 |

อ่านด้วย CSV parser รองรับ BOM/quoted fields และเก็บ SHA-256 ก่อนวิเคราะห์ ใช้วันที่ตามชื่อไฟล์ในการ replay เพื่อให้ผลเกี่ยวกับเมื่อวาน/วันส่งทำซ้ำได้ ตรวจเส้นทาง regex สำหรับจองเดี่ยว/หลายรายการ/จองแทน ยกเลิก ทดลองสินค้า ฝาก/ส่ง คำถาม ชื่อลูกค้า และ Smart Answer

## ผลและการแก้ไข

ผล replay ของ 19 แถวเปลี่ยนจากเดิม: 16 แถวเปลี่ยนประเภท อีก 3 แถวเปลี่ยนชื่อที่สกัดหรือวิธีประมวลผล ตัวเลขนี้เป็นผลต่างบนชุดที่ตรวจ ไม่ใช่อัตราความแม่นยำกับแชตใหม่

| ข้อความ/กรณี | กลไกเดิม | พฤติกรรมที่แก้ |
|---|---|---|
| พุง54คะนาว… / นาววัดพุง | ขาดคำถามบางคำและ fast path ข้ามคำถาม | แยกเป็นคำถาม ไม่จองสินค้า 54 |
| มีฝากไหมนาว / มีเก็บเงินปลายทางรึเปล่า | shippingRegex เป็นทั้ง topic และคำสั่งเขียนข้อมูล | ใช้ shared inquiry/request guards; คำถามไม่เขียน readiness/ประวัติ/วันส่ง |
| เก็บใว้ให้พี่หน่อย / ยังไม่ส่งวันเสาร์ | ไม่ครอบคลุมคำฝาก/ปฏิเสธส่ง | จับเป็น hold และไม่ตั้งวันส่งจากคำที่อยู่ในประโยคปฏิเสธ |
| สีน้ำเงิน ที่หลุดจอง + ชื่อ | keyword หลุด ทำให้ยกเลิกล่าสุด | เก็บเป็นโน้ตสี/สินค้า ไม่มีการยกเลิก |
| คืน15 / ถอน15 / สละสิทธิ์15 | processor จับ keyword ได้แต่ number pattern ไม่ตรง จึงใช้รายการล่าสุด | ใช้รหัส 15 ในคำสั่งแทน latest fallback |
| account / คืนนี้ / ยกเลิกได้ไหม | cancel substring หรือประโยคคำถาม | เพิ่มขอบเขตคำอังกฤษ คำบอกเวลา และ guard คำถาม |
| ได้คะ43 / เอาๆ6 / 16 เอานะชอบลองดู | คำยืนยัน/ไม้ยมก/ลองท้ายคำจองไม่ครอบคลุม | ยืนยันจองรหัสที่ระบุ; คำขอลองหรือเงื่อนไขจริงยังไม่จอง |
| รับ31ตัว / เอา54นิ้ว | backtracking ลดเลขเพื่อหลบหน่วย | ห้ามแยกบางหลักไปจองเป็น 3 หรือ 5 |
| แอดใด้แล้ว / ตัดขอบ / อาทิตยก็ได้จ้า | เรียนคำสนทนาเป็นชื่อ | กรองไม่บันทึกเป็น nickname |
| กี่ตัวแลว / ไซด์ / พุง / ส่งแล้วหรือยัง | Smart Answer บางคำไม่ตรง | รองรับคำพิมพ์ผิด/คำถามเพิ่มเติม โดยไม่ใช้สัดส่วนเป็น item ID |

normalizeChatText ใช้เลขไทยและตัดอักขระ zero-width สำหรับการจับ intent โดยยังเก็บข้อความต้นฉบับแสดงและส่งเสียงตามเดิม ใช้ guards ร่วมกันระหว่าง pure parser และ actual processor; ไม่เพิ่ม audio call โดยตรง และคง blacklist/transaction ของ stock

ข้อความไม่มีรหัส เช่น “รับคะ” หรือ “เอาตัวนี้” ยังไม่เดาว่าหมายถึงสินค้าชิ้นไหน เพราะ CSV ไม่มีบริบทภาพไลฟ์ ชุดนี้ไม่ได้ทำให้ชื่อภาษาไทยหรือภาษาสนทนาทุกรูปแบบแม่นยำ 100%

## บั๊กชุดข้อความแรก

การทดสอบ actual useChatProcessor พบว่าชุดแรกของไลฟ์ที่ enqueue 6 และ 7 ต่างเวลา ถูกเรียงแล้วประมวลผลเพียง [7] เนื่องจาก processSingleMessage ล้าง incomingBatchQueue เมื่อ video เปลี่ยน ทำให้ข้อความถัดไปหายและ Promise ไม่จบ

แก้โดยคงคิวของไลฟ์ใหม่ และแนบ videoId ตั้งแต่ enqueue เพื่อข้าม queued messages ของไลฟ์เก่าพร้อม resolve ครบ Regression ยืนยันผล [7, 6] และไม่ส่งข้อความค้างจาก old-live เข้า new-live ขอบเขตนี้ครอบคลุมงานที่ยังอยู่ในคิว ไม่ใช่การรับประกันยกเลิก transaction ที่เริ่มทำไปแล้วเมื่อเปลี่ยนไลฟ์

สาเหตุที่ทดสอบเดิมไม่พบ: pure-parser tests ไม่เรียกเส้นทางเขียนข้อมูล และไม่มี actual-processor test ที่ enqueue หลายข้อความก่อน reset แรก จึงเพิ่ม assertions ที่ขอบเขต processOrder/processCancel/Firebase update รวมถึง FIFO และการ settle Promise

## หลักฐานทดสอบ

- ก่อนแก้: npm test 321 tests/24 files ผ่าน แต่เคสใหม่จับการจัดประเภทผิดและ side effects ได้; first-batch repro ได้ [7] แทน [7, 6]
- หลังแก้: npm test 730 tests/28 files ผ่าน เพิ่ม 409 tests: corpus 307, parser boundaries 68, actual processor 24, Smart Answer 10
- npm run build ผ่านครบ 4 entry pages และ PWA 66 entries
- npm run test:firebase ผ่าน 23 checks ใน local Auth/RTDB emulators รวม actual auth/stock stores และหลาย clients ไม่ใช้ production
- npm run test:transcriber ผ่าน 3 tests
- Parser benchmark ใน npm test: 20,000 ข้อความจำลองใช้ 216.63 ms (เฉลี่ย 0.01083 ms ต่อข้อความบนเครื่องนี้) ผ่านเกณฑ์เดิม 2,000 ms
- npm run benchmark:performance ผ่าน: initial sync 300, price edit 1, queue-only 0; answer resolutions 2,400 → 200; median จำลอง 915.74 → 98.98 ms (5 trials, เครื่องนี้ ไม่ใช่ production field metric)

Golden corpus เก็บเฉพาะข้อความที่ลดข้อมูลระบุตัวบุคคลและ expected intent ที่ตรวจทานแล้ว ตัด author IDs/handles/timestamps และแทนชื่อเต็ม/ช่องทางติดต่อ ไม่สร้าง expected labels จาก parser หลังแก้ ไฟล์ดิบกับ replay อยู่ใน tmp ที่ Git ignore

ยังไม่ได้ทดสอบไลฟ์ YouTube จริง เสียงบนอุปกรณ์จริง iPad/เครื่องพิมพ์ หรือ production หลัง login รอบนี้ ไม่มีการแก้ข้อมูลธุรกิจย้อนหลังจาก CSV

## การเก็บไฟล์ที่วิเคราะห์แล้ว

ย้ายเข้าโฟลเดอร์ old ภายใต้ Chat ที่ผู้ใช้ระบุ ตรวจ SHA-256 ก่อนและหลังย้าย ไม่เขียนทับไฟล์เดิม ชื่อซ้ำเติม __reviewed-2026-10-31-<sha8> ดูรายการที่ [chat-log-archive-2026-10-31.json](chat-log-archive-2026-10-31.json)

## กฎและรายการตรวจ

ปรับ AI_RULES.md, GEMINI.md, .agents/AGENTS.md และ manowzab-core/SKILL.md ให้รักษา shared request guards, hold date protection, explicit cancel IDs และคิวแรกของไลฟ์ เพิ่ม verify ข้อ 2.11–2.15 พร้อมแยกผล unit/mock/emulator ออกจาก live จริง
