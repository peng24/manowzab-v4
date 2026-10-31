import { describe, it, expect } from 'vitest';
import fixtures from './fixtures/reviewedChatLogs20261031.json';
import { parseIntentDetails } from '../utils/chatParserUtils';

describe('all 307 reviewed CSV rows (anonymized)', () => {
  it.each(fixtures)('$source:$line $text', ({ source, text, expected }) => {
    const liveDate = new Date(2026, 9, Number(source.split('-')[0]), 20);
    expect(parseIntentDetails(text, liveDate)).toMatchObject(expected);
  });
});
