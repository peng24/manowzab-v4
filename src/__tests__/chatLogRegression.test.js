import { describe, it, expect } from 'vitest';
import { parseIntentDetails, extractAdminCustomerName, extractCustomerSelfName,
  explicitBuyRegex, isAdminSizeSelectionNote } from '../utils/chatParserUtils';

// Reviewed October 20/21/23/27/28 log examples. No author IDs, handles or contact details.
describe('reviewed chat log regressions — 2026-10-31', () => {
  it.each([
    'พุง54คะนาว ถ้าถคงใส่ได้คะ รบกวนด้วยคะ', 'นาววัดพุง',
    'พุง ๕๔ ค่ะ', '51คะได้ไซด์พี่ไหมคะ', 'นาวลายเหลืองเบอร์ไร',
    'ขอสอบถามค่ะ.มีเก็บเงินปลายทางรึเปล่าค่ะ.', 'มีฝากไหมนาว',
    'ส่งวันไหนคะ', 'ส่งวันเสาร์ได้ไหมคะ', 'ส่งแล้วหรือยังคะ',
  ])('treats inquiry as a question, not an order or shipment: %s', text => {
    expect(parseIntentDetails(text).type).toBe('QUESTION');
    expect(extractCustomerSelfName(text)).toBeNull();
  });

  it.each([
    ['เอาๆ6', 6], ['เอา ๆ ๖', 6], ['ได้คะ43', 43],
    ['ได้ค่ะ ๔๓', 43], ['16 เอานะชอบลองดู', 16], ['เอา16ลองดู', 16],
  ])('recognizes explicit numbered commitment: %s', (text, id) => {
    expect(parseIntentDetails(text)).toMatchObject({ type: 'SINGLE_BUY', itemId: id });
  });

  it.each(['เก็บไว้ก่อนนะคะ', 'เก็บใว้ให้พี่หน่อย', 'เอาใว้ค่อยส่งให้พี่นะ', 'ยังไม่ส่งวันเสาร์นะคะ'])
    ('recognizes a hold without learning it as a name: %s', text => {
      expect(parseIntentDetails(text)).toMatchObject({ type: 'SHIPPING', method: 'hold-keyword' });
      expect(extractCustomerSelfName(text)).toBeNull();
    });

  it.each(['แอดแล้ว', 'แอดใด้แล้วค่ะ', 'ตัดขอบ', 'อาทิตยก็ได้จ้า', 'ส่งเลยก็ได้จ้า'])
    ('does not learn conversational text as a customer: %s', text => {
      expect(extractCustomerSelfName(text)).toBeNull();
      expect(extractAdminCustomerName(text)).toBeNull();
    });

  it('keeps a released-colour admin note from cancelling a recent order', () => {
    const text = 'สีน้ำเงิน ที่หลุดจอง มะระ';
    expect(isAdminSizeSelectionNote(text)).toBe(true);
    expect(extractAdminCustomerName(text)).toBe('มะระ');
    expect(parseIntentDetails(text)).toMatchObject({ type: 'ADMIN_NOTE', customerName: 'มะระ' });
  });

  it.each(['หลุดไหมคะ', '12 หลุดหรือยัง', 'ยกเลิก12ได้ไหม', 'เมื่อคืนวันเสาร์'])
    ('does not cancel when merely asking/describing: %s', text => {
      expect(parseIntentDetails(text).type).not.toMatch(/^CANCEL/);
    });

  it.each(['รับ31ตัว', 'เอา54นิ้ว', 'เอา3000', 'รับ9999บาท', 'ราคา150ค่ะ', 'อก54ค่ะ'])
    ('does not backtrack into a partial or measurement number: %s', text => {
      expect(parseIntentDetails(text).type).not.toMatch(/BUY/);
      if (/^(รับ31ตัว|เอา54นิ้ว)$/.test(text)) expect(explicitBuyRegex.test(text)).toBe(false);
    });

  it.each(['รับคะ', 'รับตัวเมื่อกี้จ้า', 'นาวเอาตัวนี้คะชอบสี', 'เอาตัวที่นาวใส่'])
    ('does not guess a stock number from a contextual request: %s', text => {
      expect(parseIntentDetails(text).type).not.toMatch(/BUY/);
    });

  it.each(['ลอง16ก่อน', '16 ลองให้ดู', 'ลอง16ถ้าใส่ได้ค่อยเอา', 'ขอดู30ชัดๆ ผ้าอะไรคะ'])
    ('does not book a try/conditional request: %s', text => {
      expect(parseIntentDetails(text).type).not.toMatch(/BUY/);
    });

  it.each(['จรีพร', 'ซาร่า', 'บุญญาภาค่ะ', 'อาทิตยาค่ะ'])
    ('keeps genuine self-introductions: %s', text => {
      expect(extractCustomerSelfName(text)).toBe(text.replace(/ค่ะ$/, ''));
    });

  it.each(['สวัสดีค่ะ', '555', ':face-blue-smiling:', 'ผ้าเปื้อนก็ยังไม่เอานะนาว', 'ถ้าใส่ไม่ได้ก็ไม่เอา'])
    ('keeps social/conditional chat free of stock side effects: %s', text => {
      expect(parseIntentDetails(text).type).not.toMatch(/BUY|CANCEL/);
    });

  it.each(['นาวของพี่ส่งเลยของพี่ได้2ตัวใช่ไหม', 'ส่งเลยค่ะ มีที่อยู่พี่ไหม', 'มะระ ส่งวันเสาร์', 'โอนแล้วส่งเลยค่ะ'])
    ('preserves an explicit shipping command alongside an unrelated question: %s', text => {
      expect(parseIntentDetails(text).type).toBe('SHIPPING');
    });

  it.each(['40ใส่ไม่ใด้', 'เอา16ถ้าใส่ได้', 'รับ31 ตัว', 'เอา 54 นิ้ว', 'รับ12ไหมคะ'])
    ('keeps conditional/unit/negated variants out of booking: %s', text => {
      expect(parseIntentDetails(text).type).not.toMatch(/BUY/);
    });

  it.each(['account', 'success', 'access', 'คืนนี้', 'คืนวันศุกร์'])
    ('does not read partial English words or nights as cancellation: %s', text => {
      expect(parseIntentDetails(text).type).not.toMatch(/^CANCEL/);
    });

  it('normalizes hidden paste characters and preserves repeated multi-buy commands', () => {
    expect(parseIntentDetails('\u200bรับ ๔๓\u200b')).toMatchObject({ type: 'SINGLE_BUY', itemId: 43 });
    expect(parseIntentDetails('เอาๆ 6 7')).toMatchObject({ type: 'MULTI_BUY', itemIds: [6, 7] });
  });
});
