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
- **Cross-Device Sync:** Stock data synchronized in real-time via Firebase across all admin devices.

### 🗣️ Advanced Audio & TTS System
- **Hybrid TTS Engine:** Smart switching between **Google Cloud TTS (Neural2)** for high-quality voice and **Native Browser TTS** for offline fallback.
- **Smart Fallback:** Automatically switches to Native TTS if the internet lags (>3s) or API quota is exceeded.
- **iPad/iOS Optimized:** Solves Safari auto-play restrictions with "Silent Unlock" technology, ensuring continuous audio playback on iPads.
- **Sound Effects (SFX):** Distinct synthesized audio cues:
  - 🎵 **Ka-Ching!** - Successful order processing
  - 🔴 **Buzzer** - Order failed/sold out
  - 🔵 **Pop** - Order cancellation
- **Sequential Audio:** SFX plays before TTS for clear, professional feedback.

### 💬 Intelligent Chat Processing
- **YouTube Live Integration:** Fetches live chat and viewer statistics in real-time.
- **Smart Filtering:** Ignores spam and irrelevant messages.
- **Firebase Chat Sync:** Chat history persisted and synchronized across all devices - no data loss on refresh.
- **Session-Based History:** Chat logs organized by video ID for clean data management.
- **Intent Detection:** AI-powered detection of buy/cancel/shipping requests.
- **Custom Nickname Override:** Hardcoded pronunciation fixes for specific customer names.

### 📊 Real-time Analytics
- **Live Viewer Count:** Displays current viewer statistics (updates every 60 seconds).
- **Sales Dashboard:** Track total sales, revenue, and popular items.
- **History Export:** Download chat logs and sales data as CSV.
- **Performance Metrics:** Monitor API quota usage and system health.

### 🛠️ Technical Highlights
- **Framework:** Built with **Vue 3** + **Vite** for blazing-fast performance.
- **State Management:** Uses **Pinia** for efficient state handling.
- **Backend:** **Firebase Realtime Database** for instant data syncing.
- **Styling:** Custom CSS optimized for touch interfaces and iPad displays (Safe Area awareness).
- **API Quota Optimization:** Reduced YouTube API calls by 75% through intelligent polling.

---

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Firebase project with Realtime Database enabled
- YouTube Data API v3 key
- Google Cloud TTS API key (optional, for high-quality voice)

### Setup

1. **Clone the repository:**
   ```sh
   git clone <repository-url>
   cd manowzab-v4
   ```

2. **Install dependencies:**
   ```sh
   npm install
   ```

3. **Configure environment variables:**
   ```sh
   cp .env.example .env
   ```

4. **Fill in your credentials in `.env`:**
   ```env
   # Firebase Configuration
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id

   # YouTube Data API
   VITE_YOUTUBE_API_KEY=your_youtube_api_key

   # Google Cloud TTS (Optional)
   VITE_GOOGLE_TTS_KEY_1=your_tts_key_1
   VITE_GOOGLE_TTS_KEY_2=your_tts_key_2
   VITE_GOOGLE_TTS_KEY_3=your_tts_key_3
   ```

5. **Start development server:**
   ```sh
   npm run dev
   ```

6. **Open browser:**
   ```
   http://localhost:5173
   ```

---

## 🚀 Development

### Available Scripts

```sh
# Development server with hot-reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

### Project Structure

```
manowzab-v4/
├── src/
│   ├── components/        # Vue components
│   │   ├── ChatPanel.vue  # Live chat display
│   │   ├── StockGrid.vue  # Stock management UI
│   │   ├── Header.vue     # App header
│   │   └── ...
│   ├── composables/       # Reusable Vue composables
│   │   ├── useAudio.js    # Audio & SFX management
│   │   ├── useChatProcessor.js  # Chat intent detection
│   │   ├── useFirebase.js # Firebase connection
│   │   └── ...
│   ├── services/          # Business logic
│   │   └── TextToSpeech.js  # Hybrid TTS engine
│   ├── stores/            # Pinia state management
│   │   ├── chat.js        # Chat state & Firebase sync
│   │   ├── stock.js       # Stock management
│   │   ├── system.js      # System settings
│   │   └── nickname.js    # Customer nicknames
│   ├── config/            # Configuration
│   │   └── constants.js   # App constants
│   └── App.vue            # Root component
├── public/                # Static assets
└── package.json
```

---

## 🎯 Usage

### Basic Workflow

1. **Connect to YouTube Live:**
   - Click "Connect" button
   - Enter your YouTube Live Video ID
   - System fetches live chat automatically

2. **Processing Orders:**
   - Customers type "CF 10" or "10" in chat
   - System automatically:
     - Detects intent (buy/cancel/shipping)
     - Cuts stock in real-time
     - Plays success sound (ka-ching!)
     - Announces via TTS: "คุณ[Name] ... CF 10"

3. **Multi-Buy:**
   - Customer types: "26 38 74"
   - System processes all 3 items
   - Announces: "คุณ[Name] ... CF 26, 38, 74 ... ทั้งหมด 3 รายการ"

4. **Admin Proxy:**
   - Admin types: "CF 10 ชื่อลูกค้า"
   - System assigns item to specified customer

5. **Cancellation:**
   - Customer types: "cancel 10"
   - System releases stock back to available

---

## 🎨 Special Modes

### Voice Price Mode
Display-only mode for showing prices with voice announcements.
```
http://localhost:5173/?mode=voice
```

### Live Overlay Mode
Transparent overlay for OBS/Streamlabs integration.
```
http://localhost:5173/?mode=overlay
```

---

## 🔧 Configuration

### TTS Settings (`src/services/TextToSpeech.js`)

```javascript
// Toggle between Google TTS and Native TTS
systemStore.useOnlineTts = true;  // Google TTS (high quality)
systemStore.useOnlineTts = false; // Native TTS (offline)
```

### API Quota Management (`src/config/constants.js`)

```javascript
YOUTUBE: {
    VIEWER_POLL_INTERVAL_MS: 60000, // Poll every 60 seconds
    DISCONNECT_DELAY_MS: 90000,     // Disconnect after 90 seconds
}
```

### Custom Nickname Override (`src/stores/nickname.js`)

```javascript
if (realName === 'รุ่งนภา ชม') {
    return 'รุ่งนภา เชียงใหม่';
}
```

---

## 🧪 Testing

### Test on iPad Safari

1. Open app on iPad
2. Tap anywhere to unlock audio
3. Console should show: `🔓 All audio systems unlocked!`
4. Send test order
5. Verify Google TTS plays without refresh

### Test Sound Effects

- **Success:** Order available item → Hear ka-ching
- **Error:** Order sold-out item → Hear buzzer
- **Cancel:** Cancel order → Hear pop

---

## 📚 Documentation

### Implementation Guides
- [`FIREBASE_CHAT_SYNC_IMPLEMENTATION.md`](./FIREBASE_CHAT_SYNC_IMPLEMENTATION.md) - Chat persistence
- [`SOUND_EFFECTS_IMPLEMENTATION.md`](./SOUND_EFFECTS_IMPLEMENTATION.md) - Advanced SFX
- [`IPAD_AUDIO_FIX.md`](./IPAD_AUDIO_FIX.md) - iOS Safari audio unlock
- [`STOCK_SIZE_SYNC_SUMMARY.md`](./STOCK_SIZE_SYNC_SUMMARY.md) - Stock size Firebase sync
- [`CUSTOM_NICKNAME_OVERRIDE.md`](./CUSTOM_NICKNAME_OVERRIDE.md) - Custom pronunciations

---

## 🔐 Security & Privacy

- ✅ Firebase security rules configured for authenticated users only
- ✅ API keys stored in environment variables
- ✅ No sensitive data in version control
- ✅ Real-time presence tracking for admin sessions
- ✅ Private repository - proprietary software

---

## 🐛 Troubleshooting

### Google TTS Not Working on iPad
**Solution:** Tap anywhere on screen to unlock audio. Check console for unlock confirmation.

### Chat Not Syncing
**Solution:** Verify Firebase connection and video ID is set correctly.

### API Quota Exceeded
**Solution:** System auto-switches to Native TTS. Add more API keys or reduce polling frequency.

### Stock Size Changes Not Saving
**Solution:** Check Firebase permissions and network connection. Verify no validation errors (must be > 0).

---

## 📊 Version History

### v4.9.1 (Current)
- 🔧 Fixed iPad Google TTS audio unlock
- 🎵 Advanced sound effects (ka-ching, buzzer, pop)
- 🔊 Sequential audio: SFX before TTS
- 📝 Custom nickname override support
- ⚡ API quota optimization (75% reduction)
- 🔥 Firebase chat sync persistence
- 📱 iPad landscape UI optimization

### v4.8.x
- Stock size Firebase sync
- TTS fallback improvements
- Chat memory optimization

### v4.7.x
- Multi-buy support
- Admin proxy improvements
- Voice mode enhancements

---

## 👨‍💻 Development Team

**Manowzab Internal Development Team**

---

## 📄 License

**PROPRIETARY SOFTWARE - ALL RIGHTS RESERVED**

This software is the exclusive property of Manowzab. Unauthorized use, reproduction, or distribution is strictly prohibited.

---

## 🙏 Acknowledgments

- Vue.js team for the amazing framework
- Firebase for real-time database infrastructure
- Google Cloud for TTS services
- YouTube Data API for live chat integration

---

**Built with ❤️ for Manowzab Live Commerce**