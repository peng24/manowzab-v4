---
description: How to update Patch Notes and version after making code changes
---

# Update Patch Notes & Version

// turbo-all

Every time you finish making code changes (before deploy or final build), you MUST do the following:

## 1. Bump Version in `package.json`

- Use **Semantic Versioning** (MAJOR.MINOR.PATCH):
  - **PATCH** (4.15.0 → 4.15.1): Bug fixes, small tweaks, CSS changes
  - **MINOR** (4.15.1 → 4.16.0): New features, new UI components, significant refactors
  - **MAJOR** (4.16.0 → 5.0.0): Breaking changes, full rewrites, architecture overhaul
- Edit `package.json` line 4: `"version": "X.Y.Z"`

## 2. Update Patch Notes in `src/components/Header.vue`

- Find the `showChangelog()` function (search for `Patch Notes`)
- Replace the HTML content inside `Swal.fire({ html: ... })` with the new changes
- Use this structure with 3 categories (omit empty ones):

```html
<h4 style="color: #00e676; margin-bottom: 5px;">✨ ปรับปรุงใหม่</h4>
<ul>
  <li>🔊 <b>Feature Name</b> — Short description in Thai</li>
</ul>
<h4 style="color: #ff9800; margin-bottom: 5px;">🐛 แก้ไขบั๊ก</h4>
<ul>
  <li>📦 <b>Bug Name</b> — What was fixed</li>
</ul>
<h4 style="color: #f44336; margin-bottom: 5px;">🧹 ทำความสะอาด</h4>
<ul>
  <li>🗑️ Description of cleanup</li>
</ul>
```

## 3. Build and Verify

```bash
npx vite build
```

## Rules

- Always write patch notes in **Thai**
- Keep each item to **one line** — concise but informative
- Group by category: ✨ New / 🐛 Fix / 🧹 Cleanup
- The version in `package.json` is automatically read by `src/stores/system.js` via `import pkg from "../../package.json"`
- The `showChangelog()` function title uses `systemStore.version` so it auto-updates
