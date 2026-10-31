import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { useChatProcessor } from '../composables/useChatProcessor';

const state = vi.hoisted(() => ({
  stock: { stockSize: 50, stockData: {}, processOrder: vi.fn(), processCancel: vi.fn(),
    updateStockSize: vi.fn(), findMostRecentItemForUser: vi.fn() },
  chat: { seenMessageIds: {}, sendMessageToFirebase: vi.fn() },
  system: { currentVideoId: 'log-regression', shippingCycle: 'today', isSoundOn: false },
  nick: { nicknames: {}, hasNickname: vi.fn(), getNickname: vi.fn(), getPhoneticName: vi.fn() },
  banned: false, update: vi.fn(), push: vi.fn(), queueAudio: vi.fn(),
}));
vi.mock('../stores/stock', () => ({ useStockStore: () => state.stock }));
vi.mock('../stores/chat', () => ({ useChatStore: () => state.chat }));
vi.mock('../stores/system', () => ({ useSystemStore: () => state.system }));
vi.mock('../stores/nickname', () => ({ useNicknameStore: () => state.nick }));
vi.mock('../stores/voiceLearning', () => ({ useVoiceLearningStore: () => ({}) }));
vi.mock('../stores/blacklist', () => ({ useBlacklistStore: () => ({ isBanned: () => state.banned }) }));
vi.mock('../composables/useFirebase', () => ({ db: {} }));
vi.mock('../composables/useAudio', () => ({ useAudio: () => ({ queueAudio: state.queueAudio, playSfx: vi.fn(), resetVoice: vi.fn() }) }));
vi.mock('../services/YouTubeLiveChat', () => ({ extractMessageRuns: () => null }));
vi.mock('../utils/deliverySync', () => ({ resolveDeliveryUid: vi.fn().mockResolvedValue('delivery-test') }));
vi.mock('../utils/smartAnswerUtils', () => ({ isSmartQuestionText: () => false }));
vi.mock('../utils/logger', () => ({ logger: new Proxy({}, { get: () => vi.fn() }) }));
vi.mock('sweetalert2', () => ({ default: { mixin: () => ({ fire: vi.fn() }), fire: vi.fn() } }));
vi.mock('firebase/database', () => ({
  ref: (_db, path) => ({ path }), update: (...args) => state.update(...args), push: (...args) => state.push(...args),
  set: vi.fn(), get: vi.fn(), onValue: vi.fn(), onChildAdded: vi.fn(), query: vi.fn(), limitToLast: vi.fn(),
}));
let processor, seq = 0;
beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks(); state.banned = false;
  state.system.currentVideoId = 'log-regression';
  state.stock.stockData = { 15: { uid: 'test-user', owner: 'ลูกค้าทดสอบ', price: 100, time: Date.now() } };
  state.stock.processOrder.mockResolvedValue({ success: true, action: 'claimed' });
  state.stock.processCancel.mockResolvedValue({ success: true, previousOwner: 'ลูกค้าทดสอบ' });
  state.stock.findMostRecentItemForUser.mockReturnValue(99);
  state.chat.sendMessageToFirebase.mockResolvedValue(); state.update.mockResolvedValue(); state.push.mockResolvedValue();
  state.nick.hasNickname.mockReturnValue(true); state.nick.getNickname.mockReturnValue('ลูกค้าทดสอบ');
  state.nick.getPhoneticName.mockImplementation((_uid, name) => name);
  processor = useChatProcessor();
});
afterEach(() => vi.useRealTimers());
async function process(text, admin = false) {
  let failure;
  const result = processor.processMessage({ id: `log-${++seq}`, snippet: { displayMessage: text, publishedAt: new Date().toISOString() },
    authorDetails: { channelId: 'test-user', displayName: admin ? 'Manowzab' : 'ลูกค้าทดสอบ', isChatOwner: admin } }).catch(error => { failure = error; });
  await vi.advanceTimersByTimeAsync(90); await result;
  if (failure) throw failure;
  return state.chat.sendMessageToFirebase.mock.calls.at(-1)?.[1];
}

describe('actual chat processor log safety', () => {
  it.each(['พุง54คะนาว ถ้าถคงใส่ได้คะ รบกวนด้วยคะ', 'นาววัดพุง', '51คะได้ไซด์พี่ไหมคะ'])
    ('does not send measurement questions into stock: %s', async text => {
      const chat = await process(text);
      expect(state.stock.processOrder).not.toHaveBeenCalled();
      expect(state.stock.processCancel).not.toHaveBeenCalled();
      expect(chat.type).toBe('question');
    });
  it.each(['มีฝากไหมนาว', 'ขอสอบถามค่ะ.มีเก็บเงินปลายทางรึเปล่าค่ะ.', 'ส่งวันเสาร์ได้ไหมคะ', 'ส่งแล้วหรือยังคะ'])
    ('does not mark shipping readiness or create a date for an inquiry: %s', async text => {
      const chat = await process(text);
      expect(chat.type).toBe('question');
      expect(state.update).not.toHaveBeenCalled(); expect(state.push).not.toHaveBeenCalled();
    });
  it.each(['เก็บไว้ก่อนนะคะ', 'ยังไม่ส่งวันเสาร์นะคะ', 'ฝากไว้ก่อนแต่ส่งพรุ่งนี้'])
    ('does not assign delivery date to a hold: %s', async text => {
      await process(text);
      expect(state.update.mock.calls.some(([ref]) => ref.path.startsWith('delivery_customers/'))).toBe(false);
      expect(state.stock.processOrder).not.toHaveBeenCalled();
    });
  it.each([['เอาๆ6', 6], ['ได้คะ43', 43], ['16 เอานะชอบลองดู', 16]])
    ('books the intended number from explicit commitment: %s', async (text, id) => {
      await process(text); expect(state.stock.processOrder).toHaveBeenCalledTimes(1);
      expect(state.stock.processOrder.mock.calls[0][0]).toBe(id);
    });
  it('keeps the released-colour admin note out of cancellation', async () => {
    const chat = await process('สีน้ำเงิน ที่หลุดจอง มะระ', true);
    expect(state.stock.processCancel).not.toHaveBeenCalled();
    expect(state.stock.findMostRecentItemForUser).not.toHaveBeenCalled();
    expect(chat).toMatchObject({ type: 'note', proxyCustomerName: 'มะระ' });
  });
  it.each(['คืน15ค่ะ', 'ถอน15', 'สละสิทธิ์15'])
    ('cancels the written ID instead of falling back to the latest one: %s', async text => {
      await process(text); expect(state.stock.processCancel.mock.calls[0]?.[0]).toBe(15);
      expect(state.stock.findMostRecentItemForUser).not.toHaveBeenCalled();
    });
  it.each(['เก็บไว้ก่อนนะคะ', 'แอดใด้แล้วค่ะ', 'ตัดขอบ', 'อาทิตยก็ได้จ้า'])
    ('never writes a conversational nickname: %s', async text => {
      state.nick.hasNickname.mockReturnValue(false); await process(text);
      expect(state.update.mock.calls.some(([ref]) => ref.path.startsWith('nicknames/'))).toBe(false);
    });
  it('preserves the shared-audio invariant and banned-user stock protection', async () => {
    state.banned = true; await process('เอาๆ6');
    expect(state.stock.processOrder).not.toHaveBeenCalled();
    expect(state.queueAudio).not.toHaveBeenCalled();
    expect(state.chat.sendMessageToFirebase.mock.calls.at(-1)[1]).toMatchObject({ type: 'banned', ttsText: '', sfxType: null });
  });
  it('processes the entire first-poll-batch in timestamp order', async () => {
    state.system.currentVideoId = 'first-batch-live';
    const finished = [];
    const enqueue = (id, time) => processor.processMessage({ id: `batch-${id}`, snippet: { displayMessage: String(id), publishedAt: time },
      authorDetails: { channelId: 'test-user', displayName: 'ลูกค้าทดสอบ' } }).then(() => finished.push(id));
    const a = enqueue(6, '2026-10-31T10:00:01Z');
    const b = enqueue(7, '2026-10-31T10:00:00Z');
    await vi.advanceTimersByTimeAsync(100);
    expect(state.stock.processOrder.mock.calls.map(call => call[0])).toEqual([7, 6]);
    expect(finished).toHaveLength(2);
    await Promise.all([a, b]);
  });
  it('settles queued old-session messages without writing into a new live', async () => {
    state.system.currentVideoId = 'old-live';
    const enqueue = id => processor.processMessage({ id: `session-${id}`, snippet: { displayMessage: String(id), publishedAt: new Date().toISOString() },
      authorDetails: { channelId: 'test-user', displayName: 'ลูกค้าทดสอบ' } });
    const old = enqueue(8);
    state.system.currentVideoId = 'new-live';
    const active = enqueue(9);
    await vi.advanceTimersByTimeAsync(100);
    expect(state.stock.processOrder.mock.calls.map(call => call[0])).toEqual([9]);
    await Promise.all([old, active]);
  });
});
