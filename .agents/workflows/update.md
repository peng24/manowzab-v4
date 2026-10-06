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

2. **Update Patch Notes** in `src/components/Header.vue`
   - Find the `showChangelog()` function
   - Add a new entry at the top of the changelog array with:
     - Version number
     - Date (current date in YYYY-MM-DD format)
     - List of changes made

3. **Update & Prune `src/data/changelog.js` (Changelog Pruning Policy)**
   - Add the structured change record (added / improved / fixed / removed)
   - **กฎการตัด Changelog เก่าออก**: ตรวจสอบและคงเหลือเฉพาะ **15–20 เวอร์ชันล่าสุด** เท่านั้น หากเกินให้ตัดเวอร์ชันเก่าท้ายไฟล์ออกเสมอ เพื่อไม่ให้ไฟล์ใหญ่และลดขนาด Bundle

4. **Verify** that `src/stores/system.js` reads version from `package.json` correctly

5. **Run `/verify` workflow** to ensure no checklist items were broken
