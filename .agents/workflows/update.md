---
description: How to update Patch Notes and version after making code changes
---

# 📝 Update Version & Patch Notes

> Run this workflow after every meaningful code change.

## Steps

1. **Bump version** in `package.json`
   - Patch version for bug fixes (e.g., 4.0.1 → 4.0.2)
   - Minor version for new features (e.g., 4.0.x → 4.1.0)
   - Major version only when explicitly requested

2. **Check the changelog display in `src/components/Header.vue`**
   - `showChangelog()` opens `ChangelogModal.vue`, which consumes `src/data/changelog.js`.
   - Add the version/date/change record to that shared data file in step 3; do not create a duplicate changelog array in Header.
   - Keep `package-lock.json` and its root package version aligned with `package.json`.

3. **Update & Prune `src/data/changelog.js` (Changelog Pruning Policy)**
   - Add the structured change record (added / improved / fixed / removed)
   - **กฎการตัด Changelog เก่าออก**: ตรวจสอบและคงเหลือเฉพาะ **15–20 เวอร์ชันล่าสุด** เท่านั้น หากเกินให้ตัดเวอร์ชันเก่าท้ายไฟล์ออกเสมอ เพื่อไม่ให้ไฟล์ใหญ่และลดขนาด Bundle

4. **Verify** that `src/stores/system.js` reads version from `package.json` correctly

5. **Run `/verify` workflow** to ensure no checklist items were broken

6. **Auto-Update Rules & `/verify` + Report to User (บังคับทำทุกครั้ง)**
   - ตรวจสอบว่ามีการเปลี่ยนแปลงสถาปัตยกรรม ลอจิก หรือข้อกำหนดใหม่ที่ควรอัปเดตลงใน `AI_RULES.md`, `GEMINI.md`, `.agents/AGENTS.md`, `.agents/skills/manowzab-core/SKILL.md` และ `.agents/workflows/verify.md` หรือไม่
   - หากมี ให้อัปเดตไฟล์เหล่านั้นทันทีโดยไม่ต้องรอให้สั่ง และ**รายงานให้ผู้ใช้ทราบทุกครั้ง**

