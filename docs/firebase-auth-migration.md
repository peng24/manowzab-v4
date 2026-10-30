# ตั้งค่า Firebase ก่อนเผยแพร่การแก้ไขระบบล็อกอิน

การแก้ไขนี้ย้ายการยืนยันตัวตนจากรหัสผ่านและ session ที่ตรวจเฉพาะใน browser มาใช้ Firebase Authentication และรายชื่อผู้ดูแลที่ควบคุมจาก Firebase Console โดยข้อมูลลูกค้า สต็อก และประวัติใช้ path เดิม

## ต้องตั้งค่าก่อนนำขึ้นใช้งานจริง

1. ใน Firebase Console ของโปรเจกต์เดิม เปิด Authentication → Sign-in method → Email/Password
2. สร้างหรือเลือกบัญชีผู้ดูแลใน Authentication → Users แล้วคัดลอก UID บัญชีนั้น รหัสผ่านเก่าที่ตรวจเฉพาะในเว็บไม่ได้สร้างบัญชี Firebase ให้อัตโนมัติ
3. ใน Realtime Database → Data เพิ่ม boolean `true` ที่ `admin_users/<UID>` ผ่าน Console ผู้ใช้บนเว็บไม่มีสิทธิ์เพิ่มหรือแก้รายชื่อนี้ รวมถึงแอดมินที่ล็อกอินแล้ว
4. หากใช้ `yt_transcriber.py` ให้กำหนดบัญชีที่ได้รับสิทธิ์ใน `.env` ของเครื่องที่รัน Python:

   ```dotenv
   FIREBASE_TRANSCRIBER_EMAIL=transcriber@example.com
   FIREBASE_TRANSCRIBER_PASSWORD=your_local_secret
   ```

   ห้ามเติม `VITE_` ให้ตัวแปรรหัสผ่าน เพราะตัวแปรดังกล่าวจะเผยแพร่ไปพร้อม JavaScript ฝั่ง browser
5. เผยแพร่ `database.rules.json` ผ่านหน้า Rules ใน Firebase Console หรือ Firebase CLI ที่ระบุโปรเจกต์จริงอย่างชัดเจน การ deploy เว็บไป GitHub Pages ไม่ได้เผยแพร่ database rules
6. เผยแพร่เว็บเวอร์ชันใหม่หลังเตรียมบัญชีและสิทธิ์ครบแล้ว ให้ผู้ดูแลเข้าสู่ระบบใหม่หนึ่งครั้ง Session แบบเก่าจะไม่ถูกนำกลับมาใช้

ตรวจสอบใน staging ก่อน: ล็อกอิน → เปิดหน้าหลัก/จัดส่ง/ประวัติ/ที่อยู่ → reload → ออกจากระบบ → ตรวจว่าเข้าใช้ข้อมูลไม่ได้ และลองบัญชีที่ไม่ได้อยู่ใน `admin_users` ด้วย การถอนสิทธิ์ให้เปลี่ยนค่า grant เป็น `false` ผ่าน Console

## ข้อมูลจัดส่งเดิม

- ตั้งแต่การแก้ไขนี้ ทั้งสองหน้าจัดส่งใช้ transaction เดียวกันเพื่อปิดรอบ เก็บ snapshot และปรับ `totalBookings` พร้อมกัน
- แต่ละ session เก็บ `items` และ `fulfilledItems` แยกตามหมายเลขและเวลาจอง ทำให้แก้ราคาแล้วไม่เปิดรายการที่ส่งแล้วกลับมา และรองรับการจองใหม่ในไลฟ์เดิม
- ข้อมูลเก่าที่มี `lastDoneCount` และ `lastDoneSessions` ยังย้อนเฉพาะรอบล่าสุดได้
- ข้อมูลเก่าที่ไม่มีข้อมูลรอบเพียงพอจะแสดงข้อความให้ตรวจสอบเอง แทนการเดาว่าต้องนำทุกรอบเก่ากลับมา
- ระบบไม่แก้ยอดสะสมที่ผิดไปก่อนหน้านี้อัตโนมัติ เพราะไม่มีหลักฐานพอจะคำนวณประวัติการส่งใหม่อย่างถูกต้อง

## ทดสอบในเครื่องโดยไม่แตะ production

```powershell
npm test
npm run test:transcriber
npm run build
npx firebase-tools emulators:exec --project demo-manowzab-review --only auth,database "npm run test:firebase"
```

ชุดทดสอบ Firebase ใช้ namespace ของโปรเจกต์ `demo-manowzab-review` และ localhost พอร์ต 9009/9098 แบบตายตัว รวมถึงบังคับ config ของ app stores ที่โหลดมาทดสอบให้ใช้ Emulator เท่านั้น ใช้ข้อมูลจำลองและเขียนล้างข้อมูลใน namespace นี้ จึงไม่ควรใช้ namespace เดียวกับงานทดสอบอื่นที่กำลังทำอยู่
