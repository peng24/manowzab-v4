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

  // Reviewed Oct 31 – Nov 7, 2026 CSV logs (261 rows anonymized)
  it.each([
    'ได้แล้วคะมาตอนฝนตกตั้งไว้บนตู้จดหมายไม่โทรบอกเลย คนส่งคนเดียวกันแน่เลย',
    'นาววันนี้ทำไมไม่เหมือนเดิมพี่พิมพ์ส่งได้ได้เหมือนเดิม',
  ])('does not misclassify courier/typing mentions (คนส่ง/พิมพ์ส่ง) as shipping: %s', text => {
    expect(parseIntentDetails(text).type).toBe('UNKNOWN');
  });

  it('recognizes payment channel inquiry (พร้อมโอน โอนทางไหนค่ะ) as QUESTION, not SHIPPING', () => {
    expect(parseIntentDetails('พร้อมโอน โอนทางไหนค่ะ')).toMatchObject({ type: 'QUESTION', method: 'shipping-inquiry' });
  });

  it('recognizes packing hold request (ยังไม่ต้องแพ็คนะ) as SHIPPING hold-keyword', () => {
    expect(parseIntentDetails('คุณนาว ขององุ่นยังไม่ต้องแพ็คนะ ถ้าทันรอบซัก ค่อยซักมาให้ ก่อนส่ง')).toMatchObject({
      type: 'SHIPPING',
      method: 'hold-keyword',
    });
  });

  it.each([
    'ขายให่แม่มัย',
    '52ยายใส่ดัยบ่อนาง',
    '65 นะคะคุณอ้อยถามว่า 65',
    'นาวพี่ใส่ได้ไหมคะ27',
    '38รอบพุงคะ',
    'นาว59อกเท่าไหร่',
  ])('recognizes dialect/fit/reported questions as QUESTION, never BUY: %s', text => {
    expect(parseIntentDetails(text).type).toBe('QUESTION');
    expect(extractCustomerSelfName(text)).toBeNull();
  });

  it.each([
    ['77สีขาวค่ะ 60', 77],
    ['สนใจรายการที่9', 9],
    ['ปุยฝ้ายอยากได้เสื้อตัวเบอร์ 5 นะคะ:person-turqouise-waving::person-turqouise-waving::person-turqouise-waving::person-turqouise-waving::person-turqouise-waving::face-blue-wide-eyes::face-blue-wide-eyes::face-blue-wide-eyes::face-blue-wide-eyes:', 5],
    ['ของน้องปุยฝ้ายองค์ที่ 5 ค่ะ:face-orange-raised-eyebrow::face-orange-raised-eyebrow::face-orange-raised-eyebrow::face-orange-raised-eyebrow:', 5],
  ])('recognizes color-inserted polite buy, สนใจรายการที่, and emote-heavy orders: %s', (text, id) => {
    expect(parseIntentDetails(text)).toMatchObject({ type: 'SINGLE_BUY', itemId: id });
  });

  it('normalizes spaced double Sara E typo (เ เม่เอา4ตัว) and blocks quantity-unit from booking', () => {
    expect(parseIntentDetails('เ เม่เอา4ตัว')).toMatchObject({ type: 'UNKNOWN', method: 'quantity-unit-guard' });
  });

  it.each([
    ['วาสนา แก้วใหญ่ 31 อกเท่าไหร่', 'วาสนา แก้วใหญ่'],
    ['อาทิตยา 50 อกเท่าไหร่', 'อาทิตยา'],
  ])('recognizes name-first admin chest-size question note: %s', (text, customerName) => {
    expect(isAdminSizeSelectionNote(text)).toBe(true);
    expect(extractAdminCustomerName(text)).toBe(customerName);
    expect(parseIntentDetails(text)).toMatchObject({
      type: 'ADMIN_NOTE',
      noteCategory: 'size-selection',
      customerName,
    });
  });

  it.each([
    ['วรรณี เบญ ลอง 48 ให้ดูหน่อย', 48, 'วรรณี เบญ'],
    ['วรรณี เบญ ลอฃ 17 ให้ดูหน่อย', 17, 'วรรณี เบญ'],
  ])('recognizes admin try proxy with typo ลอฃ and extracts customerName: %s', (text, id, customerName) => {
    expect(parseIntentDetails(text)).toMatchObject({ type: 'TRY_ITEM', itemId: id });
    expect(extractAdminCustomerName(text)).toBe(customerName);
  });

  it('recognizes dotted circle typo in try request (◌าวขอดู26ผ้ายืดมั้ย)', () => {
    expect(parseIntentDetails('◌าวขอดู26ผ้ายืดมั้ย')).toMatchObject({ type: 'TRY_ITEM', itemId: 26 });
  });

  it.each([
    'ไม่มีคู่แข่ง', 'มาเร็วจัง', 'ได้แล้ว', 'อ๋อค่ะ', 'ที่ถือค่ะ',
    'อีกตัวนึง', 'รับจร้า', 'ลูก', 'กุมภาพันธ์', 'รอก่อนคะ',
    'อิอิ', 'จอบเบิ่งอยู่เด้อ', 'สไปรท๋ออกมาเลย', 'รับคะ พี่เล็งไว้คะ5555',
  ])('does not learn Oct 31 – Nov 7 conversational phrases as customer names: %s', text => {
    expect(extractCustomerSelfName(text)).toBeNull();
    expect(extractAdminCustomerName(text)).toBeNull();
  });

  it('preserves genuine self-introduction บุญทรัพย์ from Nov 1 log', () => {
    expect(extractCustomerSelfName('บุญทรัพย์')).toBe('บุญทรัพย์');
    expect(parseIntentDetails('บุญทรัพย์')).toMatchObject({ type: 'SELF_INTRO', customerName: 'บุญทรัพย์' });
  });

  // Reviewed Nov 8 – Nov 15, 2026 CSV logs (174 rows anonymized)
  it.each([
    'สวสดีคะ', 'สว้สดีคะ', 'ดูผอมจ่ะ', 'รอดูลูกไม้', 'ไว้ไปญี่ปุ่น//',
    'ใช่หล่ออยู่', 'ให้ลูก', 'จำผิดเบอร์ค่ะ', 'ผิดตัวแน่เลย',
  ])('does not learn Nov 8 – Nov 15 conversational phrases as customer names: %s', text => {
    expect(extractCustomerSelfName(text)).toBeNull();
    expect(extractAdminCustomerName(text)).toBeNull();
  });

  it('keeps genuine short self-intro ตาลค่ะ from Nov 10 log', () => {
    expect(extractCustomerSelfName('ตาลค่ะ')).toBe('ตาล');
    expect(parseIntentDetails('ตาลค่ะ')).toMatchObject({ type: 'SELF_INTRO', customerName: 'ตาล' });
  });

  it('prevents ดู inside เอ็นดู / ดูซีจีน from triggering TRY_ITEM', () => {
    expect(parseIntentDetails('โอ้จยยเอ็นดู64อิอิ').type).toBe('UNKNOWN');
    expect(parseIntentDetails('ใช่คนเดียวกันพี่ก็ดูซีจีนคนนี้แสดงอยู่').type).toBe('UNKNOWN');
  });

  it('blocks ไม่เหมาะกับ+number as NEGATION, never booking stock', () => {
    expect(parseIntentDetails('พี่มดไม่เหมาะกับ21')).toMatchObject({ type: 'NEGATION', method: 'negation-guard' });
    expect(extractAdminCustomerName('พี่มดไม่เหมาะกับ21')).toBeNull();
  });

  it('parses รายการXX and 64 ค่ะฝฝฝฝฝ cleanly without fake customer names (รายการ/ค่ะฝฝฝฝฝ)', () => {
    expect(parseIntentDetails('รายการ50')).toEqual({ type: 'SINGLE_BUY', itemId: 50, method: 'explicit-keyword' });
    expect(parseIntentDetails('64 ค่ะฝฝฝฝฝ:text-green-game-over::text-green-game-over:')).toEqual({
      type: 'SINGLE_BUY',
      itemId: 64,
      method: 'polite-number',
    });
    expect(extractAdminCustomerName('อ๋อๆๆ22')).toBeNull();
    expect(extractAdminCustomerName('ได้ๆ23')).toBeNull();
  });

  it('handles พี่ได้ไห๊มคะ 46น้องนาว as QUESTION and ฝากไวัก่อนนะคะ as hold without fake name', () => {
    expect(parseIntentDetails('พี่ได้ไห๊มคะ 46น้องนาว').type).toBe('QUESTION');
    expect(parseIntentDetails('ฝากไวัก่อนนะคะ')).toEqual({
      type: 'SHIPPING',
      customerName: null,
      method: 'hold-keyword',
    });
  });

  it('handles admin trailing ด้วย (พี่กวาง 19 ด้วย) and color note (พี่พัช เขียวขี้ม้า)', () => {
    expect(parseIntentDetails('พี่กวาง 19 ด้วย')).toMatchObject({
      type: 'SINGLE_BUY',
      itemId: 19,
      customerName: 'พี่กวาง',
    });
    expect(parseIntentDetails('พี่พัช เขียวขี้ม้า')).toMatchObject({
      type: 'ADMIN_NOTE',
      noteCategory: 'size-selection',
      customerName: 'พี่พัช',
    });
  });

  // Reviewed Nov 16, 2026 CSV log (66 rows anonymized)
  it('guards conditional/family gifting (จะยกให้พี่สาว) from cancelling orders while keeping ยกให้พี่เค้า', () => {
    expect(parseIntentDetails('ไม่เป็นไรค่ะ ถ้าพี่ใส่ไม่ได้ จะยกให้พี่สาว').type).toBe('UNKNOWN');
    expect(parseIntentDetails('ยกให้พี่เค้า').type).toBe('CANCEL_LATEST');
  });

  it('prevents bare ดู from being learned as a self-name while disambiguating ดูเหมือน / รอดู / ให้ดู from TRY_ITEM', () => {
    expect(extractCustomerSelfName('ดู')).toBeNull();
    expect(parseIntentDetails('ดู').type).toBe('TRY_ITEM');
    expect(parseIntentDetails('นาวลองใส่20ให้ดูหน่อย')).toMatchObject({ type: 'TRY_ITEM', itemId: 20 });
    expect(parseIntentDetails('ปกติน้องนาวใส่ไซร์อะไรเหรอค่ะ พี่หุ่นไกล้เคียงกับน้องนาว แต่ดูเหมือนว่าพี่มีหน้าท้องใหญ่กว่า😊').type).toBe('QUESTION');
    expect(parseIntentDetails('พรุ่งนี้จะมีลูกไม่ให้ดูหรือเปล่าคะ').type).toBe('QUESTION');
    expect(parseIntentDetails('พรุ่งนี้จะรอดู/////ไม่ต้องรีดก็ได้///').type).toBe('UNKNOWN');
  });

  it('handles Nov 16 colloquial questions (สีอาไร, อีกไม่ค่ะ, ซักยังนาว) without false-matching เเก้ใหม่เด้อเสียง', () => {
    expect(parseIntentDetails('เเก้ใหม่เด้อเสียง').type).toBe('UNKNOWN');
    expect(parseIntentDetails('ซักยังนาว').type).toBe('QUESTION');
    expect(parseIntentDetails('นาว13สีอาไร').type).toBe('QUESTION');
    expect(parseIntentDetails('พรุ่งนี้ไลฟ์อีกไม่ค่ะ').type).toBe('QUESTION');
  });

  // Reviewed Nov 21, 2026 CSV log (72 rows anonymized)
  it('parses พี่รับค่ะ ที่2 / ที่6 as explicit SINGLE_BUY without fake admin proxy name', () => {
    expect(parseIntentDetails('พี่รับค่ะ ที่2')).toEqual({ type: 'SINGLE_BUY', itemId: 2, method: 'explicit-keyword' });
    expect(parseIntentDetails('พี่รับค่ะ ที่6')).toEqual({ type: 'SINGLE_BUY', itemId: 6, method: 'explicit-keyword' });
    expect(extractAdminCustomerName('พี่รับค่ะ ที่2')).toBeNull();
  });

  it('blocks รับทราบค่าา and ใส่ด้วยค่ะ สีดำ from nickname/admin-note extraction', () => {
    expect(extractCustomerSelfName('รับทราบค่าา')).toBeNull();
    expect(parseIntentDetails('รับทราบค่าา').type).toBe('UNKNOWN');
    expect(extractAdminCustomerName('ใส่ด้วยค่ะ สีดำ')).toBeNull();
    expect(parseIntentDetails('ใส่ด้วยค่ะ สีดำ').type).toBe('UNKNOWN');
  });

  it('treats รอดูไลฟ์พรุ่งนี้ก่อน...จะได้ส่งทีเดียว as HOLD, ขายไม่ค่ะ as QUESTION, and มะระ สั่งเสื้อสีขาว 2 ตัว as ADMIN_NOTE', () => {
    expect(parseIntentDetails('ของพี่รอดูไลฟ์พรุ่งนี้ก่อนนะคะเผื่อต้องการเพิ่มจะได้ส่งทีเดียว')).toEqual({
      type: 'SHIPPING',
      customerName: null,
      method: 'hold-keyword',
    });
    expect(parseIntentDetails('ปกตินาวเอากางเกงมาขายไม่ค่ะ').type).toBe('QUESTION');
    expect(parseIntentDetails('มะระ สั่งเสื้อสีขาว 2 ตัว')).toMatchObject({
      type: 'ADMIN_NOTE',
      noteCategory: 'size-selection',
      customerName: 'มะระ',
    });
  });

  // Audited all 23 archived CSV logs (1,324 rows anonymized)
  it.each([
    'ไม่ใช้แม่', 'หราาาา', 'น้ำตกที่ไหน', 'จะคอยตาม', 'ใบ่หายไป',
  ])('does not learn archived CSV conversational phrases as self-names: %s', text => {
    expect(extractCustomerSelfName(text)).toBeNull();
  });

  it('prevents fake customerName on โอเค41ค่ะ, ใช่ค่ะ พี่รับ 42 ค่ะ, โอนแล้วอ่านด้วยจ้า, and พี่ฝากไว้ก่อนจะเอฟต่อ', () => {
    expect(parseIntentDetails('โอเค41ค่ะ')).toEqual({ type: 'SINGLE_BUY', itemId: 41, method: 'explicit-keyword' });
    expect(parseIntentDetails('ใช่ค่ะ พี่รับ 42 ค่ะ')).toEqual({ type: 'SINGLE_BUY', itemId: 42, method: 'explicit-keyword' });
    expect(parseIntentDetails('โอนแล้วอ่านด้วยจ้า')).toEqual({ type: 'SHIPPING', customerName: null, method: 'shipping-keyword' });
    expect(parseIntentDetails('พี่ฝากไว้ก่อนจะเอฟต่อ')).toEqual({ type: 'SHIPPING', customerName: null, method: 'hold-keyword' });
  });

  it('treats นาวไม่เอาตัวหลุดมาขายเลยเหรอ and ที่ตัวละ20อกเท่าไรค่ะ as QUESTION, and blocks casual ดูนาน/ดูทุกวัน/ดูใหม่/ดูวันนี้ from TRY_ITEM', () => {
    expect(parseIntentDetails('นาวไม่เอาตัวหลุดมาขายเลยเหรอ').type).toBe('QUESTION');
    expect(parseIntentDetails('ที่ตัวละ20อกเท่าไรค่ะ').type).toBe('QUESTION');
    expect(parseIntentDetails('ไม่ได้ดูนานเลยคะ').type).toBe('UNKNOWN');
    expect(parseIntentDetails('จ้าแม่ดูทุกวัน').type).toBe('UNKNOWN');
    expect(parseIntentDetails('ใช่อยากดูวันนี้').type).toBe('UNKNOWN');
    expect(parseIntentDetails('หาไซใหญ่ๆมาลงให้หน่อยค่ะไว้จะดูใหม่นะคะขอบคุณค่ะป้ามีอายุขมีแขนสามส่วน').type).toBe('UNKNOWN');
  });

  // Audited Nov 23 live chat CSV (92 rows anonymized)
  it('handles Nov 23 multi-buy เเละ, fit typo ไหคะ, casual browsing, photo request, and self-name guards', () => {
    expect(parseIntentDetails('รับ12เเละ13')).toMatchObject({ type: 'MULTI_BUY', itemIds: [12, 13] });
    expect(parseIntentDetails('รับ 12 และ 13')).toMatchObject({ type: 'MULTI_BUY', itemIds: [12, 13] });
    expect(parseIntentDetails('สีเำหลัง64พี่ใส่ได้ไหคะ').type).toBe('QUESTION');
    expect(parseIntentDetails('พี่ขอดูไปเรื่อยๆก่อนค่ะ').type).toBe('UNKNOWN');
    expect(parseIntentDetails('พรุ่งนี้ส่งรูปให้พี่ดูด้วย').type).toBe('UNKNOWN');
    expect(extractCustomerSelfName('พึ่งเข้ามา')).toBeNull();
    expect(extractCustomerSelfName('นี่ค่ะ')).toBeNull();
    expect(parseIntentDetails('ของพี่จ่ายวันนี้หมดเลยแต่ฝากไว้ก่อนค่ะ')).toEqual({
      type: 'SHIPPING',
      customerName: null,
      method: 'hold-keyword',
    });
  });
});
