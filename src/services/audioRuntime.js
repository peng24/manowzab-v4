import { reactive } from 'vue';

// Per-device presentation only. Never starts audio, writes Firebase or changes queues.
export const audioRuntime = reactive({ engine: 'idle', phase: 'idle', fallback: false, voiceName: '' });
export function setAudioRuntime(update) { Object.assign(audioRuntime, update); }

export function getAudioDisplay({ isSoundOn, useOnlineTts }, runtime = audioRuntime) {
  if (!isSoundOn) return { label: 'ปิดเสียง', tone: 'muted', detail: 'เสียงของเครื่องนี้ปิดอยู่' };
  if (runtime.phase === 'error') return { label: 'เสียงไม่พร้อม', tone: 'error', detail: 'อุปกรณ์อ่านเสียงไม่สำเร็จ ลองทดสอบเสียงอีกครั้ง' };
  if (runtime.phase === 'speaking' && runtime.engine === 'google') return { label: 'Google', tone: 'google', detail: 'กำลังอ่านด้วย Google' };
  if (runtime.phase === 'speaking' && runtime.engine === 'native') return { label: runtime.fallback ? 'เสียงสำรอง' : 'เสียงในเครื่อง', tone: runtime.fallback ? 'fallback' : 'native', detail: runtime.voiceName || 'กำลังอ่านด้วยเสียงภาษาไทยของอุปกรณ์นี้' };
  if (!useOnlineTts) return { label: 'เสียงในเครื่อง', tone: 'native', detail: runtime.voiceName || 'ใช้เสียงภาษาไทยของอุปกรณ์นี้' };
  if (runtime.fallback) return { label: 'เสียงสำรอง', tone: 'fallback', detail: runtime.voiceName || 'Google ยังไม่พร้อม กำลังใช้เสียงภาษาไทยของอุปกรณ์นี้' };
  return { label: 'Google', tone: 'google', detail: runtime.phase === 'loading' ? 'กำลังเตรียมเสียง Google' : runtime.phase === 'speaking' ? 'กำลังอ่านด้วย Google' : 'เลือก Google เป็นเสียงหลัก' };
}
