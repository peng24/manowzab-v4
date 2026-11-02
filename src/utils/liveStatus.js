export function getLiveStatus(state) {
  if (state.isConnecting) return { tone: 'connecting', label: 'กำลังเชื่อมต่อ' };
  const hasVideo = Boolean(state.currentVideoId && state.currentVideoId !== 'demo');
  if (!hasVideo) return { tone: 'idle', label: 'ยังไม่เชื่อมต่อ' };
  if (state.isLiveFinished) return { tone: 'ended', label: 'ไลฟ์จบแล้ว' };
  if (state.networkOnline === false || state.statusDb === 'err') return { tone: 'error', label: 'การเชื่อมต่อขัดข้อง' };
  if (state.statusDb === 'warn') return { tone: 'waiting', label: 'กำลังเชื่อมต่อข้อมูลอีกครั้ง' };
  if (state.statusChat === 'err' || state.statusApi === 'err') return { tone: 'error', label: 'รับแชตขัดข้อง' };
  if (state.isConnected) {
    if (state.statusChat === 'warn') return { tone: 'waiting', label: 'ยังไม่พบแชตสด' };
    return { tone: 'live', label: state.lastChatPollAt || state.lastChatReceivedAt ? 'รับแชตอยู่' : 'เชื่อมต่อแล้ว' };
  }
  if (state.statusDb === 'ok' && state.lastChatReceivedAt) return { tone: 'synced', label: 'รับแชตผ่านซิงค์' };
  return { tone: 'waiting', label: 'รอแชตจากเครื่องหลัก' };
}

export function formatReceivedAge(timestamp, now = Date.now()) {
  if (!timestamp) return 'รอข้อความใหม่';
  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (seconds < 5) return 'รับข้อความเมื่อสักครู่';
  if (seconds < 60) return `รับล่าสุด ${seconds} วินาทีที่แล้ว`;
  if (seconds < 3600) return `รับล่าสุด ${Math.floor(seconds / 60)} นาทีที่แล้ว`;
  return `รับล่าสุด ${Math.floor(seconds / 3600)} ชั่วโมงที่แล้ว`;
}
