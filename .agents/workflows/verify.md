---
description: Mandatory verification checklist after every code change
---

# ✅ Post-Edit Verification Checklist

> **ต้องตรวจสอบทุกครั้งหลังแก้ไขโค้ด** — หากข้อใดเสียหาย ต้องแก้ไขก่อน commit

## Checklist

1. **แชทสด แสดงทุกข้อความตามลำดับจริง**
   - ตรวจสอบว่าข้อความจาก YouTube Live Chat แสดงผลตามลำดับเวลาจริง
   - ไฟล์ที่เกี่ยวข้อง: `src/services/YouTubeLiveChat.js`, `src/composables/useChatProcessor.js`

2. **อ่านแชทสด ต้องอ่านทุกข้อความ**
   - TTS ต้องอ่านทุกข้อความ รวมถึงจองซ้ำ/ล็อค/emoji
   - ต้องมี `queueAudio()` ก่อน early return ทุกจุดใน buy logic
   - ไฟล์ที่เกี่ยวข้อง: `src/composables/useChatProcessor.js`, `src/composables/useAudio.js`

3. **ระบบสลับ API Key ใช้ได้ทั้ง YouTube API / Google TTS**
   - ตรวจสอบว่า key rotation ทำงานทั้ง YouTube API และ Google TTS
   - ไฟล์ที่เกี่ยวข้อง: `src/composables/useYouTube.js`, `src/services/YouTubeLiveChat.js`, `src/services/TextToSpeech.js`

4. **ระบบจอง: มากกว่า 1 คน = ต่อคิว**
   - เมื่อจองรายการเดียวกันหลายคน ต้องเพิ่มเข้า queue ตามลำดับ ไม่ทับกัน
   - ไฟล์ที่เกี่ยวข้อง: `src/stores/stock.js`

5. **ขยายรายการจองอัตโนมัติ**
   - จองเกินจำนวนที่กำหนด → ขยายเป็นชุด (เช่น 50 → 60)
   - ไฟล์ที่เกี่ยวข้อง: `src/stores/stock.js`

6. **รองรับเลขไทย**
   - เลขไทย (เช่น "๕๖") ต้องแปลงเป็นเลขอารบิกแล้วจองได้
   - ไฟล์ที่เกี่ยวข้อง: `src/composables/useChatProcessor.js`

7. **จองหลายรายการพร้อมกัน**
   - ข้อความเดียวจองหลายรายการ (เช่น "จอง 1 3 5") ต้องจำทุกรายการ
   - ไฟล์ที่เกี่ยวข้อง: `src/composables/useChatProcessor.js`, `src/stores/stock.js`

## How to Verify

1. Review the diff of changed files
2. For each changed file, check which checklist items it relates to
3. Verify that the logic for those items is still intact
4. If any item may be affected, inform the user before proceeding
