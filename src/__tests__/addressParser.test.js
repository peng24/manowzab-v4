import { describe, it, expect } from 'vitest';
import {
  parseSingleAddress,
  parseMultipleAddresses,
  formatPhoneNumber,
  extractPhone,
  extractPostalCode,
  normalizeName
} from '../utils/addressParser';

describe('Smart Address Parser Suite', () => {
  describe('formatPhoneNumber', () => {
    it('formats 10-digit standard Thai mobile numbers', () => {
      expect(formatPhoneNumber('0812345678')).toBe('081-234-5678');
      expect(formatPhoneNumber('0987654321')).toBe('098-765-4321');
    });

    it('formats numbers with country code +66', () => {
      expect(formatPhoneNumber('+66812345678')).toBe('081-234-5678');
      expect(formatPhoneNumber('66899998888')).toBe('089-999-8888');
    });

    it('formats 9-digit landline numbers', () => {
      expect(formatPhoneNumber('021234567')).toBe('02-123-4567');
    });
  });

  describe('extractPhone', () => {
    it('extracts phone number with dots (095.155.5706)', () => {
      const res = extractPhone('โทร. 095.155.5706 ส่งด่วน');
      expect(res.phone).toBe('095-155-5706');
    });

    it('extracts phone number with Tel. prefix and dashes', () => {
      const res = extractPhone('Tel. 081-999-8888');
      expect(res.phone).toBe('081-999-8888');
    });
  });

  describe('extractPostalCode', () => {
    it('extracts 5-digit zip code', () => {
      const res = extractPostalCode('อ.เมือง จ.เชียงใหม่ 50000');
      expect(res.postalCode).toBe('50000');
    });

    it('does not confuse fractional house numbers with zip codes', () => {
      const res = extractPostalCode('บ้านเลขที่ 10123/45 ถ.พังงา ต.ตลาดใหญ่ อ.เมือง จ.ภูเก็ต 83000');
      expect(res.postalCode).toBe('83000');
    });
  });

  describe('parseSingleAddress', () => {
    it('parses standard 3-line format from Apple Note', () => {
      const note = `พี่ไหม
081-234-5678
123/45 หมู่ 6 ต.บ้านใหม่ อ.เมือง จ.เชียงใหม่ 50000`;

      const result = parseSingleAddress(note);
      expect(result.name).toBe('พี่ไหม');
      expect(result.phone).toBe('081-234-5678');
      expect(result.postalCode).toBe('50000');
      expect(result.address).toContain('123/45 หมู่ 6 ต.บ้านใหม่ อ.เมือง จ.เชียงใหม่ 50000');
    });

    it('parses multi-line address without a recipient name (starts with house number)', () => {
      const note = `36 ถ.พังงา ต.ตลาดใหญ่
อ.เมือง จ.ภูเก็ต 83000
โทร. 095-155-5706`;

      const result = parseSingleAddress(note);
      expect(result.name).toBe('');
      expect(result.phone).toBe('095-155-5706');
      expect(result.postalCode).toBe('83000');
      expect(result.address).toContain('36 ถ.พังงา ต.ตลาดใหญ่ อ.เมือง จ.ภูเก็ต 83000');
    });

    it('parses single-line address starting directly with house number (no name)', () => {
      const line = '191 หมู่ 3 ต.ขามใหญ่ อ.เมือง จ.อุบลราชธานี 34000 โทร. 095-155-5706';
      const result = parseSingleAddress(line);
      expect(result.name).toBe('');
      expect(result.phone).toBe('095-155-5706');
      expect(result.postalCode).toBe('34000');
      expect(result.address).toContain('191 หมู่ 3 ต.ขามใหญ่ อ.เมือง จ.อุบลราชธานี 34000');
    });

    it('parses format with label prefixes (ชื่อ:, เบอร์:, ที่อยู่:)', () => {
      const note = `ชื่อ: คุณกนกวรรณ ใจดี
เบอร์: 0987654321
ที่อยู่: 45/6 ซอยสุขุมวิท 101/1 แขวงบางจาก เขตพระโขนง กทม 10260`;

      const result = parseSingleAddress(note);
      expect(result.name).toBe('คุณกนกวรรณ ใจดี');
      expect(result.phone).toBe('098-765-4321');
      expect(result.postalCode).toBe('10260');
      expect(result.address).toContain('45/6 ซอยสุขุมวิท 101/1 แขวงบางจาก เขตพระโขนง กทม 10260');
    });

    it('parses single-line address format with name', () => {
      const line = 'สมชาย ใจงาม 0812345678 99/99 หมู่ 1 ถ.พหลโยธิน ต.คลองหนึ่ง อ.คลองหลวง จ.ปทุมธานี 12120';
      const result = parseSingleAddress(line);
      expect(result.name).toBe('สมชาย ใจงาม');
      expect(result.phone).toBe('081-234-5678');
      expect(result.postalCode).toBe('12120');
      expect(result.address).toContain('99/99 หมู่ 1');
    });

    it('handles Thai numerals conversion seamlessly', () => {
      const thaiNumNote = `คุณวิภา
๐๘๙-๙๙๙-๘๘๘๘
๕๕/๑๒ ถ.มิตรภาพ ต.ในเมือง อ.เมือง จ.ขอนแก่น ๔๐๐๐๐`;

      const result = parseSingleAddress(thaiNumNote);
      expect(result.name).toBe('คุณวิภา');
      expect(result.phone).toBe('089-999-8888');
      expect(result.postalCode).toBe('40000');
      expect(result.address).toContain('55/12');
    });
  });

  describe('parseMultipleAddresses', () => {
    it('parses multiple entries separated by blank lines from Apple Note', () => {
      const noteContent = `พี่ไหม
081-234-5678
123/45 หมู่ 6 ต.บ้านใหม่ อ.เมือง จ.เชียงใหม่ 50000

คุณนก
089-999-9999
99/9 ถ.สุขุมวิท แขวงคลองเตย เขตคลองเตย กทม. 10110`;

      const results = parseMultipleAddresses(noteContent);
      expect(results.length).toBe(2);
      expect(results[0].name).toBe('พี่ไหม');
      expect(results[0].phone).toBe('081-234-5678');
      expect(results[1].name).toBe('คุณนก');
      expect(results[1].phone).toBe('089-999-9999');
    });

    it('parses numbered list entries (1. 2.) from Apple Note', () => {
      const noteContent = `1. น้องฟ้า
0823456789
987/65 ซ.ลาดพร้าว 101 กทม 10310
2. พี่หนุ่ม
0899998888
12 หมู่ 3 ต.บางกระดี จ.ปทุมธานี 12000`;

      const results = parseMultipleAddresses(noteContent);
      expect(results.length).toBe(2);
      expect(results[0].name).toBe('น้องฟ้า');
      expect(results[0].phone).toBe('082-345-6789');
      expect(results[1].name).toBe('พี่หนุ่ม');
      expect(results[1].phone).toBe('089-999-8888');
    });

    it('parses continuous multi-line entries without empty lines using phone number detection', () => {
      const noteContent = `น้องกานต์
0831112233
55/1 ซอย 2 กทม 10220
พี่เต๋า
0842223344
77/3 ต.บ้านฉาง จ.ระยอง 21130`;

      const results = parseMultipleAddresses(noteContent);
      expect(results.length).toBe(2);
      expect(results[0].name).toBe('น้องกานต์');
      expect(results[0].phone).toBe('083-111-2233');
      expect(results[1].name).toBe('พี่เต๋า');
      expect(results[1].phone).toBe('084-222-3344');
    });
  });
});
