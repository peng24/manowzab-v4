# ผลการแก้ไขและตรวจสอบ Manowzab Command Center

วันที่: 30 ตุลาคม 2026 (Asia/Bangkok)

## ผลตรวจที่รันจริง

- `npm test`: ผ่าน 314 ข้อ ใน 22 ไฟล์
- `npm run test:transcriber`: ผ่าน 3 ข้อ
- `npm run test:firebase`: ผ่าน 23 รายการกับ Auth/Realtime Database Emulator โดยใช้ Firebase SDK และ auth/stock stores ของแอปจริง
- `npm run build`: สร้างทั้งหน้าหลัก จัดส่ง ประวัติ และที่อยู่ พร้อม PWA
- ไม่มีการ deploy หรือแก้ข้อมูล production

## สิ่งที่แก้และเหตุผล

1. เปลี่ยนการล็อกอินจากการเทียบ hash และ session ใน browser เป็น Firebase Authentication พร้อม grant `admin_users/<UID>` ที่ client แก้ไม่ได้ ปิด anonymous access ของข้อมูลธุรกิจและเอารหัสผ่านทดสอบออกจาก frontend
2. เริ่ม listeners ของหน้าหลักหลังผ่านการตรวจสิทธิ์ และหยุดเมื่อ logout/revoke รวมถึง sign out Firebase จริง แก้ countdown lockout และคีย์ลัดปิดเสียงที่เรียก method ซึ่งไม่มีอยู่
3. ทั้งสองหน้าจัดส่งเรียก complete/undo ชุดเดียวกัน การเพิ่มยอดสะสม การเปลี่ยนสถานะ และ snapshot ของรอบทำใน transaction เดียว เพื่อกันการทำซ้ำจากหลายเครื่อง
4. เก็บตัวตนรายการจองและรายการส่งแล้วแยกกัน การแก้ราคา/UID ไม่เปิดของเก่ากลับมา และของจองใหม่ในไลฟ์เดิมนับเฉพาะของที่ยังไม่ส่ง
5. รวมการ sync จากหน้าหลัก Dashboard และประวัติเข้า helper เดียวกัน คำนวณยอดรวมจากข้อมูลใน transaction ไม่ใช้ยอดจาก cache เก่า ป้องกันการล้าง metadata ของรอบจัดส่ง
6. ตัวนับ/รายการของสะสมและ Smart Answer แยกของที่ส่งแล้วออกจากของค้างส่ง โดยยังเก็บยอดขายวันนี้และประวัติสต็อกไว้
7. Python transcriber ใช้บัญชี Firebase ที่ได้รับสิทธิ์ผ่านตัวแปรฝั่ง Python และไม่ส่ง transcript หากไม่มี token

## กรณีสำคัญที่ยืนยัน

- บุคคลทั่วไป anonymous และบัญชีที่ไม่มี grant ถูกปฏิเสธทั้งอ่านและเขียนทุก business node; client ยกระดับสิทธิ์ตัวเองไม่ได้
- Auth store จริงคืน session ได้เฉพาะบัญชีที่ได้รับสิทธิ์ และถอนสิทธิ์ขณะเปิดใช้งานได้
- Stock store จริงจองสินค้า เข้าคิว กันคิวซ้ำ เลื่อนผู้จองสำรอง และคงราคาเมื่อยกเลิกคนสุดท้าย
- Sync คนละ session พร้อมกันแล้วยอดรวมถูกต้อง
- สอง client ยืนยันรอบเดียวกันได้เพียงครั้งเดียว และย้อนรอบเดียวกันได้เพียงครั้งเดียว
- ส่ง → ย้อน → ส่งซ้ำไม่เพิ่มยอดสะสมซ้ำ ไม่ปลุก session เก่าที่ส่งแล้ว และคงของจองใหม่หลังส่งไว้เมื่อย้อน
- ข้อมูลเก่าที่มี metadata ของรอบยังย้อนคืนได้; count-only records ที่ประวัติ stock ถูกล้างไปแล้วยังส่งและย้อนคืนได้
- รองรับ item maps ที่ Firebase คืนเป็น sparse arrays หรือ JSON arrays และไม่ถือว่าลำดับ field ที่ต่างกันเป็นคนละรายการ

การเพิ่ม integration test พบว่า tests แบบ mock เดิมไม่จำลองรูปแบบ array และการเรียง field ของ Firebase จึงเพิ่ม regression tests ครอบคลุมกรณีนี้ ตรวจสถานะ server แยกจาก cache ของ client ที่อาจตามอีกเครื่องชั่วครู่ และให้ clients มี realtime listeners เหมือนหน้าจอจริง

## ขอบเขตตามฟังก์ชันทั้ง 9 หมวด

| หมวด | ที่ตรวจแล้ว | ยังต้องทดสอบกับการใช้งานจริง |
|---|---|---|
| 1. แชตและ intent | Unit tests ของ parser/ตัวเลข/อีโมจิ และตรวจว่าไม่ได้เปลี่ยนเส้นทางแชตย้อนหลัง | การเชื่อม YouTube Live จริง API quota/การหมุน key และลำดับข้อความหน้างาน |
| 2. สต็อกและคิว | Stock store กับ Firebase SDK จริง + unit tests ยกเลิก/เลื่อนคิว/คงราคา/ล้างข้อมูล | การกดการ์ด ค้นหา ขยาย grid และ UI หลายอุปกรณ์ |
| 3. เสียง | Tests การเตรียมข้อความ TTS ตัวเลขไทย และชื่อ; ไม่เปลี่ยน audio queue/iOS unlock | เสียงจริง Google/native fallback ลำโพง และ iPad/iOS |
| 4. Smart Answer | Unit tests คำถาม หมวดย่อย ยอดสะสม และการยกเว้นของส่งแล้ว | การแสดง inline/HUD 25 วินาที และปุ่มกระโดดใน browser |
| 5. Blacklist | Unit tests ของ blacklist; ไม่เปลี่ยนเงื่อนไขบล็อกการจอง/เสียง | การกดแบนจากรูปและข้อความ/เสียงข้ามอุปกรณ์จริง |
| 6. จัดส่ง | Tests วงจร complete/undo และ concurrent transactions ผ่าน Emulator | กดส่ง/ย้อนจากทั้งสองหน้า และเครื่องพิมพ์ฉลากจริง |
| 7. ที่อยู่ | Unit tests address parser/contact channels และ build หน้า address | นำเข้าไฟล์จริง แก้ไข modal และการพิมพ์ข้อมูลบนฉลาก |
| 8. ประวัติ | ตรวจ source ให้ใช้ sync กลาง; build หน้า history; tests การแยกรอบเก่า/ส่งแล้ว | ตัวเลขสถิติและการกดแก้/ยกเลิกย้อนหลังบน UI |
| 9. เครื่องมือแอดมิน | Auth unit/integration tests; build และตรวจ hotkey/listener cleanup | Away/Shared Note/Phonetic Manager/Lenis/PWA update และ UI คีย์ลัดจริง |

ยังไม่ถือว่าทุกฟังก์ชันผ่าน end-to-end บนอุปกรณ์จริง เครื่องมือ Computer Use หยุดการตรวจ browser เนื่องจากตรวจสอบ URL บน Windows ได้ไม่แน่นอน จึงไม่ได้ดำเนินการผ่านช่องทางนั้นต่อ ไม่มีการทดสอบพิมพ์ฉลากจริงหรือเสียงจริง

## ก่อนนำขึ้นใช้งาน

ทำตาม `docs/firebase-auth-migration.md` เพื่อสร้าง/เลือกบัญชี เปิด Email/Password เพิ่ม grant ตั้งค่า Python และเผยแพร่ database rules การ deploy GitHub Pages อย่างเดียวไม่ทำขั้นตอนเหล่านี้

ข้อมูลเก่าที่ไม่มีรหัสรอบและ snapshot เพียงพอไม่สามารถเดารอบ undo ได้อย่างถูกต้อง ระบบจะแจ้งให้ตรวจสอบเอง และไม่แก้ยอดสะสมที่เคยผิดย้อนหลังโดยอัตโนมัติ

อัปเดตข้อกำหนดใน `AI_RULES.md` และเพิ่ม checklist หมวด 21 ใน `.agents/workflows/verify.md` แล้ว
