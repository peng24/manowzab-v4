import { thaiToArabic } from './chatParserUtils';

/**
 * Normalizes customer name for flexible matching (case-insensitive, trim whitespace)
 * @param {string} name
 * @returns {string}
 */
export function normalizeName(name) {
  if (!name) return '';
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Formats a 10-digit or 9-digit Thai phone number with dashes (e.g. 081-234-5678)
 * @param {string} phone
 * @returns {string}
 */
export function formatPhoneNumber(phone) {
  if (!phone) return '';
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('66') && cleaned.length >= 11) {
    cleaned = '0' + cleaned.substring(2);
  }
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 9) {
    return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 5)}-${cleaned.slice(5)}`;
  }
  return phone.trim();
}

/**
 * Extracts phone numbers from a block of text
 * @param {string} text
 * @returns {{ phone: string, cleanedText: string }}
 */
export function extractPhone(text) {
  if (!text) return { phone: '', cleanedText: '' };

  // Match Thai mobile (06x, 08x, 09x) & landline (02x, 03x, 04x, 05x, 07x) and +66 formats
  // Ensure we don't match across newlines and don't match sub-parts of zipcodes or house numbers
  const phoneRegex = /(?<!\d)(?:(?:\+66\s*|0)[689]\d[-. ]?\d{3,4}[-. ]?\d{3,4}|(?:\+66\s*|0)[2-57]\d?[-. ]?\d{3}[-. ]?\d{3,4}|\b0[689]\d{8}\b|\b0[2-7]\d{7,8}\b)(?!\d)/;
  const match = text.match(phoneRegex);

  if (match) {
    const rawPhone = match[0];
    const phone = formatPhoneNumber(rawPhone);
    // Remove the phone and labels from text to avoid picking it up as address/name
    const cleanedText = text
      .replace(rawPhone, '')
      .replace(/(?:^|\s)(?:เบอร์(?:\s*โทร)?|โทร(?:\.)?|Tel(?:\.)?|Phone(?:\.)?)[:\s-]*/gi, ' ')
      .trim();
    return { phone, cleanedText };
  }

  return { phone: '', cleanedText: text };
}

/**
 * Extracts 5-digit Thai postal code
 * @param {string} text
 * @returns {{ postalCode: string, cleanedText: string }}
 */
export function extractPostalCode(text) {
  if (!text) return { postalCode: '', cleanedText: '' };

  // 5-digit postal code (Thai postal codes are 10000 - 96000), not followed by fraction / or digits
  const zipRegex = /\b[1-9]\d{4}\b(?!\/|\d)/;
  const match = text.match(zipRegex);

  if (match) {
    return { postalCode: match[0], cleanedText: text };
  }
  return { postalCode: '', cleanedText: text };
}

/**
 * Parses a single customer address block (multi-line or single-line)
 * @param {string} rawBlock
 * @returns {object} { name, phone, address, postalCode, fullAddress, rawText }
 */
export function parseSingleAddress(rawBlock) {
  if (!rawBlock || !rawBlock.trim()) return null;

  let text = thaiToArabic(rawBlock).trim();

  // Strip leading list numbers like "1.", "1)", "1 - "
  text = text.replace(/^\s*\d+[\.\)\-]\s*/, '');

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  let name = '';
  let phone = '';
  let address = '';
  let postalCode = '';

  // Extract phone first from full text
  const phoneResult = extractPhone(text);
  phone = phoneResult.phone;

  // Extract postal code
  const zipResult = extractPostalCode(text);
  postalCode = zipResult.postalCode;

  // Address marker pattern for line detection
  const addressMarkerRegex = /^(?:\d+[\d\/\-\.]*|\b\d+\b(?=\s*(?:หมู่|ม\.|ซอย|ซ\.|ถนน|ถ\.|\/))|หมู่|ม\.|บ้านเลขที่|ต\.|ตำบล|อ\.|อำเภอ|จ\.|จังหวัด|แขวง|เขต|กทม|ถ\.|ถนน|ซ\.|ซอย)/i;

  if (lines.length >= 2) {
    // Multi-line format:
    // Check if line 1 starts with address markers (e.g. 191 หมู่ 3, บ้านเลขที่, 123/45, ถ., ซ.)
    let firstLine = lines[0];
    const isFirstLineAddress = addressMarkerRegex.test(
      firstLine.replace(/^(?:ที่อยู่|ที่อยู่จัดส่ง|ส่งที่|Address)[:\s-]*/i, '').trim()
    );

    const addressParts = [];

    if (!isFirstLineAddress) {
      firstLine = firstLine.replace(/^(?:ชื่อลูกค้า|ชื่อผู้รับ|ผู้รับ|ชื่อ|Name|Customer|To)\s*[:\-]\s*/i, '').trim();

      // Check if first line contains phone
      const firstLinePhone = extractPhone(firstLine);
      if (firstLinePhone.phone && !phone) {
        phone = firstLinePhone.phone;
        firstLine = firstLinePhone.cleanedText;
      } else if (firstLinePhone.phone) {
        firstLine = firstLinePhone.cleanedText;
      }

      name = firstLine.trim();
    } else {
      // First line is part of the address
      const cleanedFirst = firstLine.replace(/^(?:ที่อยู่|ที่อยู่จัดส่ง|ส่งที่|Address)[:\s-]*/i, '').trim();
      if (cleanedFirst) {
        addressParts.push(cleanedFirst);
      }
    }

    // Remaining lines make up the address and potentially phone
    const remainingLines = lines.slice(1);

    for (let line of remainingLines) {
      let cleaned = line
        .replace(/^(?:ที่อยู่|ที่อยู่จัดส่ง|ส่งที่|Address)[:\s-]*/i, '')
        .replace(/^(?:เบอร์(?:โทร)?|โทร(?:\.)?|Tel(?:\.)?|Phone(?:\.)?)[:\s-]*/i, '')
        .trim();

      // Check if this line is purely a phone number
      const linePhone = extractPhone(cleaned);
      if (linePhone.phone && !phone) {
        phone = linePhone.phone;
        cleaned = linePhone.cleanedText;
      } else if (linePhone.phone && cleaned.replace(/\D/g, '').length >= 9) {
        // Line was just phone number
        cleaned = linePhone.cleanedText;
      }

      if (cleaned) {
        addressParts.push(cleaned);
      }
    }

    address = addressParts.join(' ');
  } else {
    // Single line format: "สมชาย ใจดี 0812345678 123/45 ถ.สุขุมวิท กทม 10110"
    let singleLine = phoneResult.cleanedText.trim();

    // Detect Name at beginning (usually 1-3 words before house numbers / addresses)
    const addressStartMatch = singleLine.match(/(?:\s|^)(?:\d+[\d\/\-\.]*|\b\d+\b(?=\s*(?:หมู่|ม\.|ซอย|ซ\.|ถนน|ถ\.|\/))|หมู่|ม\.|บ้านเลขที่|ต\.|ตำบล|อ\.|อำเภอ|จ\.|จังหวัด|แขวง|เขต|กทม|ถ\.|ถนน|ซ\.|ซอย)/i);

    if (addressStartMatch) {
      if (addressStartMatch.index === 0) {
        // Entire single line is address (no name prefix)
        name = '';
        address = singleLine.replace(/^(?:ที่อยู่|ส่งที่|Address)\s*[:\-]\s*/i, '').trim();
      } else {
        name = singleLine.substring(0, addressStartMatch.index).replace(/^(?:ชื่อลูกค้า|ชื่อผู้รับ|ผู้รับ|ชื่อ|Name|Customer|To)\s*[:\-]\s*/i, '').trim();
        address = singleLine.substring(addressStartMatch.index).replace(/^(?:ที่อยู่|ส่งที่|Address)\s*[:\-]\s*/i, '').trim();
      }
    } else {
      // Fallback: check if line has name + address or only address
      const words = singleLine.split(/\s+/);
      if (words.length > 2) {
        name = words.slice(0, 2).join(' ');
        address = words.slice(2).join(' ');
      } else {
        name = words[0] || '';
        address = words.slice(1).join(' ') || '';
      }
    }
  }

  // Clean up address & name
  address = address.replace(/\s+/g, ' ').trim();
  name = name.replace(/^[^\w\u0E00-\u0E7F]+|[^\w\u0E00-\u0E7F]+$/g, '').trim();

  const fullAddress = [name, phone, address].filter(Boolean).join('\n');

  return {
    name,
    recipientName: name,
    phone,
    address,
    postalCode,
    fullAddress,
    rawText: rawBlock.trim()
  };
}

/**
 * Splits raw pasted text from Apple Notes into individual address entries
 * Handles:
 * - Empty line separated blocks (\n\n)
 * - Numbered items (1. 2. 3.)
 * - Separator lines (---, ===, ***)
 * - Continuous entries by phone number pattern
 * @param {string} fullText
 * @returns {Array<object>} List of parsed address objects
 */
export function parseMultipleAddresses(fullText) {
  if (!fullText || !fullText.trim()) return [];

  const normalized = thaiToArabic(fullText).trim();

  // 1. First attempt: Split by double newlines or explicit divider lines
  let rawBlocks = normalized
    .split(/(?:\r?\n\s*){2,}|(?:\r?\n[-=_*#]{3,}\r?\n)/)
    .map(b => b.trim())
    .filter(Boolean);

  // 2. If only 1 huge block was found, check if it contains numbered items (e.g. "1.", "2.")
  if (rawBlocks.length === 1 && /^\s*\d+[\.\)]\s+/m.test(rawBlocks[0])) {
    rawBlocks = rawBlocks[0]
      .split(/(?=(?:^|\r?\n)\s*\d+[\.\)]\s+)/)
      .map(b => b.trim())
      .filter(Boolean);
  }

  // 3. If still only 1 block with multiple lines, check if it's multiple 3-line entries without empty lines
  if (rawBlocks.length === 1) {
    const lines = rawBlocks[0].split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    // If lines contain multiple phone numbers, chunk by phone numbers
    const phoneIndices = [];
    lines.forEach((l, idx) => {
      if (extractPhone(l).phone) {
        phoneIndices.push(idx);
      }
    });

    if (phoneIndices.length > 1) {
      const reconstructedBlocks = [];
      let currentStartIndex = 0;

      for (let i = 0; i < phoneIndices.length; i++) {
        const phoneIdx = phoneIndices[i];
        // Name is likely the line right before phone, or starting from previous end
        const blockStart = (i === 0) ? 0 : Math.max(currentStartIndex, phoneIdx - 1);
        const nextPhoneIdx = phoneIndices[i + 1];
        const blockEnd = (nextPhoneIdx !== undefined) ? Math.max(blockStart + 1, nextPhoneIdx - 1) : lines.length;

        const blockLines = lines.slice(blockStart, blockEnd);
        if (blockLines.length > 0) {
          reconstructedBlocks.push(blockLines.join('\n'));
        }
        currentStartIndex = blockEnd;
      }

      if (reconstructedBlocks.length > 1) {
        rawBlocks = reconstructedBlocks;
      }
    }
  }

  // Parse each block
  const results = [];
  for (const block of rawBlocks) {
    const parsed = parseSingleAddress(block);
    if (parsed && (parsed.name || parsed.address || parsed.phone)) {
      results.push(parsed);
    }
  }

  return results;
}
