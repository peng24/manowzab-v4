# Manowzab Command Center (v4)

**Manowzab Command Center** is a specialized, high-performance dashboard designed for managing Facebook/YouTube Live commerce. It streamlines the process of real-time stock management, automated order processing from chat, and high-quality Text-to-Speech (TTS) announcements.

> ⛔ **PRIVATE PROJECT / PROPRIETARY SOFTWARE**
>
> This software is strictly for internal use by **Manowzab** only.
> **Unauthorized copying, modification, distribution, or use of this source code is strictly prohibited.**
> All rights reserved.

---

## 🚀 Key Features

### 🛒 Live Commerce Management

- **Real-time Stock Cutting:** Automatically deduces stock when customers type "CF" or specific codes (e.g., "26", "26 38").
- **Multi-Buy Support:** Handles complex orders like `26 38 74` in a single message.
- **Admin Proxy:** Allows admins to manually book items for customers via chat commands.
- **Visual Dashboard:** Color-coded stock grid showing available (Green), reserved (Red), and sold-out items.

### 🗣️ Advanced Audio & TTS System

- **Hybrid TTS Engine:** Smart switching between **Google Cloud TTS (Neural2)** for high-quality voice and **Native Browser TTS** for offline fallback.
- **Smart Fallback:** Automatically switches to Native TTS if the internet lags (>2s) or API quota is exceeded. After 5 consecutive failures, switches permanently for the session.
- **Unified Audio Queue:** All audio (SFX + TTS) flows through a single sequential queue — no overlapping sounds.
- **iPad/iOS Optimized:** Solves Safari auto-play restrictions with "Silent Unlock" technology, ensuring continuous audio playback on iPads.
- **Sound Effects (SFX):** Distinct audio cues for Success (Ka-Ching!) and Error/Sold Out (Buzzer) events.

### 💬 Intelligent Chat Processing

- **YouTube Live Integration:** Fetches live chat and viewer statistics in real-time.
- **Smart Filtering:** Ignores spam and irrelevant messages.
- **Cross-Device Sync:** Chat history and stock status are synchronized across all admin devices via Firebase Realtime Database.
- **Session-Based History:** Chat logs are organized by session (Video ID) to keep data clean and efficient.

### 🛠️ Technical Highlights

- **Framework:** Built with **Vue 3** + **Vite** for blazing-fast performance.
- **State Management:** Uses **Pinia** for efficient state handling.
- **Backend:** **Firebase Realtime Database** for instant data syncing.
- **Styling:** Custom CSS optimized for touch interfaces and iPad displays (Safe Area awareness).

---

## � License & Legal Notice

**Copyright © 2024-2026 Manowzab. All Rights Reserved.**

This source code is the intellectual property of Manowzab.

- You are **NOT** allowed to use this code for commercial or non-commercial purposes without explicit written permission.
- You are **NOT** allowed to redistribute, modify, or host this application publicly.

_Violators will be prosecuted to the maximum extent possible under applicable laws._
