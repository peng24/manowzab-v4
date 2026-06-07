export const CONSTANTS = {
    // Auto Cleanup Configuration
    CLEANUP: {
        STARTUP_DELAY_MS: 20000, // 20 seconds
        HISTORY_RETENTION_DAYS: 30,
    },

    // YouTube & Connection Configuration
    YOUTUBE: {
        VIEWER_POLL_INTERVAL_MS: 60000, // 1 minute (60 seconds) - Optimized for API quota
        DISCONNECT_DELAY_MS: 90000,     // 1.5 minutes (90 seconds)
    },

    // UI & System Limits
    UI: {
        TOAST_DURATION_MS: 2000,
        LONG_TOAST_DURATION_MS: 3000,
        ERROR_TOAST_DURATION_MS: 4000,
    },

    // Voice & Audio
    VOICE: {
        RETRY_DELAY_MS: 500,
    }
};

// ✅ Away Mode Messages (consolidated from src/constants.js)
export const AWAY_START_MESSAGES = [
    "แอดมินพาลูกนอนแล้ว รอแปปนะคะ",
    "แอดมินพาลูกนอนแล้วค่ะ ช่วยดูแลแชทหน่อยนะคะ",
    "พาน้องนอนก่อนนะคะ ช่วยดูแลลูกค้าด้วยนะคะ",
    "แอดมินพาลูกนอนแล้ว ฝากดูแลแชทด้วยนะคะ",
    "พาลูกนอนแล้วนะคะ กลับมาเร็วๆ",
    "ขอโทษค่ะ แอดมินพาลูกนอนก่อน รอสักครู่นะคะ",
    "แอดมินพาน้องนอนแล้วค่ะ รอแปปเดียว",
    "พาลูกนอนก่อนนะคะ กลับมาตอบเลยนะคะ",
    "แอดมินยังไม่อยู่หน้าจอค่ะ กำลังพาลูกนอน",
    "พาน้องนอนแล้ว ช่วยดูแลลูกค้าหน่อยนะคะ",
];

export const AWAY_END_MESSAGES = [
    "ลูกหลับแล้ว แอดมินสแตนบายแล้วค่ะ",
    "ลูกหลับแล้ว กลับมาแล้วค่ะ",
    "ลูกหลับสบายแล้ว แอดมินกลับมาดูแลแชทแล้วค่ะ",
    "ลูกหลับแล้วค่ะ แอดมินพร้อมแล้ว",
    "ลูกนอนหลับแล้ว แอดมินสแตนบายแล้ว",
    "ลูกหลับแล้วค่ะ กลับมาแล้ว",
    "แอดมินกลับมาแล้วค่ะ ลูกหลับสบาย",
    "ลูกนอนแล้ว แอดมินพร้อมดูแลลูกค้าแล้วค่ะ",
];
