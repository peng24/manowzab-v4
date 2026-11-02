import { describe, it, expect, vi } from 'vitest';
import { ref } from 'vue';
import { getLiveStatus, formatReceivedAge } from '../utils/liveStatus';
import { getAudioDisplay } from '../services/audioRuntime';
import { clampChatWidth } from '../utils/workspaceLayout';
import { useQueueDraft } from '../composables/useQueueDraft';

const connected = { currentVideoId: 'fixture-live', isConnected: true, statusDb: 'ok', statusApi: 'ok', statusChat: 'ok', lastChatPollAt: 1000 };
describe('truthful live connection labels', () => {
  it('never shows LIVE on the disconnected initial screen', () => {
    expect(getLiveStatus({ isConnected: false })).toEqual({ tone: 'idle', label: 'ยังไม่เชื่อมต่อ' });
    expect(getLiveStatus({ isConnected: true, currentVideoId: 'demo' }).tone).toBe('idle');
  });
  it.each([
    [{ isConnecting: true }, 'connecting'], [{ isLiveFinished: true }, 'ended'],
    [{ networkOnline: false }, 'error'], [{ statusDb: 'err' }, 'error'],
    [{ statusChat: 'err' }, 'error'], [{ statusApi: 'err' }, 'error'],
    [{ statusChat: 'warn' }, 'waiting'], [{ statusDb: 'warn' }, 'waiting'], [{}, 'live'],
  ])('renders the actual phase for %j', (change, tone) => expect(getLiveStatus({ ...connected, ...change }).tone).toBe(tone));
  it('distinguishes the Firebase follower device from direct polling', () => {
    expect(getLiveStatus({ ...connected, isConnected: false, lastChatReceivedAt: 1000 }).label).toBe('รับแชตผ่านซิงค์');
    expect(getLiveStatus({ ...connected, isConnected: false, lastChatPollAt: 0 }).label).toBe('รอแชตจากเครื่องหลัก');
  });
  it('keeps failed connection errors visible after the connected flag is cleared', () => {
    expect(getLiveStatus({ ...connected, isConnected: false, statusApi: 'err' }).tone).toBe('error');
  });
  it('does not mistake a quiet chat for a network failure', () => {
    expect(getLiveStatus({ ...connected, lastChatReceivedAt: 1 }).tone).toBe('live');
    expect(formatReceivedAge(1000, 121000)).toContain('2 นาที');
    expect(formatReceivedAge(0, 1000)).toBe('รอข้อความใหม่');
    expect(formatReceivedAge(2000, 1000)).toBe('รับข้อความเมื่อสักครู่');
  });
});

describe('per-device actual speech display', () => {
  const preferred = { isSoundOn: true, useOnlineTts: true };
  it('shows fallback without changing the selected primary engine', () => {
    expect(getAudioDisplay(preferred, { engine: 'native', phase: 'speaking', fallback: true, voiceName: 'Pattara' })).toMatchObject({ label: 'เสียงสำรอง', detail: 'Pattara' });
    expect(preferred.useOnlineTts).toBe(true);
  });
  it('follows the active utterance even when preferences change during playback', () => {
    expect(getAudioDisplay({ ...preferred, useOnlineTts: false }, { engine: 'google', phase: 'speaking' }).label).toBe('Google');
    expect(getAudioDisplay(preferred, { engine: 'native', phase: 'speaking', fallback: false }).label).toBe('เสียงในเครื่อง');
  });
  it('clearly distinguishes mute, playback failure, local mode and Google readiness', () => {
    expect(getAudioDisplay({ ...preferred, isSoundOn: false }, { phase: 'speaking', fallback: true }).tone).toBe('muted');
    expect(getAudioDisplay(preferred, { phase: 'error' }).tone).toBe('error');
    expect(getAudioDisplay({ ...preferred, useOnlineTts: false }, { phase: 'idle' }).tone).toBe('native');
    expect(getAudioDisplay(preferred, { phase: 'loading' }).detail).toContain('กำลังเตรียม');
  });
});

describe('safe queue editing', () => {
  function setup() {
    const price = ref(100), queue = ref([{ owner: 'สมใจ', uid: 'fixture-1', time: 1 }]);
    const close = vi.fn(), confirmDiscard = vi.fn().mockResolvedValue(false);
    const draft = useQueueDraft({ price, queue, close, confirmDiscard }); draft.capture();
    return { price, queue, close, confirmDiscard, ...draft };
  }
  it('does not warn for untouched fields or an extra empty name', async () => {
    const h = setup(); h.queue.value.push({ owner: '  ', uid: 'blank' });
    expect(h.isDirty.value).toBe(false); expect(await h.requestClose()).toBe(true);
    expect(h.confirmDiscard).not.toHaveBeenCalled(); expect(h.close).toHaveBeenCalledOnce();
  });
  it('retains price/name/reorder edits when discard is cancelled', async () => {
    const h = setup(); h.price.value = 150; h.queue.value.push({ owner: 'มะระ', uid: 'fixture-2' }); h.queue.value.reverse();
    expect(h.isDirty.value).toBe(true); expect(await h.requestClose()).toBe(false);
    expect(h.close).not.toHaveBeenCalled(); expect(h.price.value).toBe(150); expect(h.queue.value[0].owner).toBe('มะระ');
  });
  it('closes only after explicit discard confirmation', async () => {
    const h = setup(); h.price.value = 150; h.confirmDiscard.mockResolvedValue(true);
    expect(await h.requestClose()).toBe(true); expect(h.close).toHaveBeenCalledOnce();
  });
  it('serializes saves, blocks closing during a save and captures the successful baseline', async () => {
    const h = setup(); h.price.value = 150; let complete;
    const persist = vi.fn(() => new Promise(resolve => { complete = resolve; }));
    const first = h.save(persist, { closeAfter: false });
    expect(h.isSaving.value).toBe(true); expect(await h.save(persist)).toBe(false); expect(await h.requestClose()).toBe(false);
    complete(); expect(await first).toBe(true); expect(h.isSaving.value).toBe(false); expect(h.isDirty.value).toBe(false);
    expect(h.close).not.toHaveBeenCalled(); expect(persist).toHaveBeenCalledOnce();
  });
  it('keeps the draft and modal after a failed save so navigation can be cancelled', async () => {
    const h = setup(); h.queue.value[0].owner = 'มะระ';
    await expect(h.save(async () => { throw new Error('offline'); })).rejects.toThrow('offline');
    expect(h.isDirty.value).toBe(true); expect(h.isSaving.value).toBe(false); expect(h.close).not.toHaveBeenCalled();
    expect(await h.save(async () => false)).toBe(false); expect(h.close).not.toHaveBeenCalled();
  });
});

describe('desktop chat width constraints', () => {
  it('clamps invalid saved widths and reserves space for the stock panel', () => {
    expect(clampChatWidth(null)).toBe(400); expect(clampChatWidth('invalid')).toBe(400);
    expect(clampChatWidth(100)).toBe(280); expect(clampChatWidth(900)).toBe(600);
    expect(clampChatWidth(600, 900)).toBe(540); expect(clampChatWidth(400, 769)).toBe(400);
  });
});
