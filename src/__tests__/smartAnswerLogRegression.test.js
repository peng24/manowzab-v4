import { describe, it, expect } from 'vitest';
import { isSmartQuestionText, resolveSmartAnswer, extractQueriedItemId } from '../utils/smartAnswerUtils';

const chat = text => ({ text, displayName: 'ลูกค้าทดสอบ', uid: 'test-customer', type: 'question' });
const context = { currentVideoId: 'test-live', stockData: { 16: { price: 150, size: 'อก 44 พุง 48' } },
  addressBook: { 'ลูกค้าทดสอบ': { address: 'ที่อยู่ตัวอย่าง', paymentType: 'cod' } } };
describe('Smart Answer — reviewed log questions', () => {
  it.each(['ขอสอบถามค่ะ.มีเก็บเงินปลายทางรึเปล่าค่ะ.', 'มีเก็บปลายทางหรือเปล่าคะ', 'COD ได้รึเปล่าคะ'])
    ('recognizes a COD profile question: %s', text => {
      expect(isSmartQuestionText(text)).toBe(true);
      expect(resolveSmartAnswer(chat(text), context)).toMatchObject({ category: 'profile' });
    });
  it.each(['กี่ตัวแลว', 'พี่นับได่8', 'นาวพี่ได้กี่ตัววันนี้'])
    ('recognizes order-count inquiry: %s', text => {
      expect(isSmartQuestionText(text)).toBe(true);
      expect(resolveSmartAnswer(chat(text), context)).toMatchObject({ category: 'orders' });
    });
  it.each(['16 พุงได้เท่าไรคะ', '16ไซด์อะไรคะ'])
    ('keeps explicit item IDs for item-size questions: %s', text => {
      expect(extractQueriedItemId(text)).toBe(16);
      expect(resolveSmartAnswer(chat(text), context)).toMatchObject({ category: 'item', itemId: 16 });
    });
  it.each(['พุง54คะนาว ถ้าถคงใส่ได้คะ', 'อก54ค่ะ'])
    ('does not invent an item number from a body measurement: %s', text => {
      expect(extractQueriedItemId(text)).toBeNull();
    });
});
