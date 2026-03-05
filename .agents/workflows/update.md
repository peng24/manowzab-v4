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

3. **Verify** that `src/stores/system.js` reads version from `package.json` correctly

4. **Run `/verify` workflow** to ensure no checklist items were broken
