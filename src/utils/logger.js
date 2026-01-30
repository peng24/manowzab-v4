// ไฟล์: src/utils/logger.js

// 🔴 เปลี่ยนเป็น false เมื่อต้องการปิด Log ทั้งหมด (เช่น ตอนใช้งานจริง)
const DEBUG_MODE = true;

export const logger = {
  log: (...args) => {
    if (DEBUG_MODE) console.log(...args);
  },
  warn: (...args) => {
    if (DEBUG_MODE) console.warn(...args);
  },
  error: (...args) => {
    // Error ควรแสดงเสมอ เพื่อให้เรารู้ว่ามีปัญหา
    console.error(...args);
  },
  debug: (...args) => {
    if (DEBUG_MODE) console.debug(...args);
  },
};
