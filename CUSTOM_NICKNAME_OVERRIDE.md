# Custom Nickname Override - รุ่งนภา ชม

## 🎯 Purpose
Hardcoded nickname override to ensure the TTS always pronounces "รุ่งนภา ชม" as "รุ่งนภา เชียงใหม่" for better clarity.

## 📝 Implementation

### File: `src/stores/nickname.js`

Added a hardcoded check at the beginning of the `getNickname()` function:

```javascript
function getNickname(uid, realName) {
  // ✅ Hardcoded Nickname Override (for TTS pronunciation)
  if (realName === 'รุ่งนภา ชม') {
    return 'รุ่งนภา เชียงใหม่';
  }
  
  // ... rest of function
}
```

## ✅ How It Works

### Priority Order:
1. **Hardcoded Override** (NEW) ⭐
   - Checks if `realName === 'รุ่งนภา ชม'`
   - Returns `'รุ่งนภา เชียงใหม่'` immediately
   
2. **Firebase Nickname Dictionary**
   - Checks `nicknames.value[uid]`
   - Returns stored nickname if exists
   
3. **Original Name Fallback**
   - Returns `realName` if no override or nickname found

## 🔊 TTS Impact

When the admin manually enters "รุ่งนภา ชม" for orders:
- **Before:** TTS would pronounce "รุ่งนภา ชม" 
- **After:** TTS will pronounce "รุ่งนภา เชียงใหม่" ✅

## 📍 Where It's Used

The `getNickname()` function is called from:
1. `useChatProcessor.js` - When processing chat messages
2. Any component displaying customer names
3. TTS service - For announcing customer names

## ➕ Adding More Overrides

To add more hardcoded nickname overrides in the future:

```javascript
function getNickname(uid, realName) {
  // ✅ Hardcoded Nickname Overrides (for TTS pronunciation)
  if (realName === 'รุ่งนภา ชม') {
    return 'รุ่งนภา เชียงใหม่';
  }
  
  // Add more overrides here:
  if (realName === 'ชื่อเดิม') {
    return 'ชื่อใหม่';
  }
  
  // ... rest of function
}
```

## ✅ Result

The customer name "รุ่งนภา ชม" will now always be pronounced as "รุ่งนภา เชียงใหม่" by the TTS system, ensuring clear and consistent audio announcements.
