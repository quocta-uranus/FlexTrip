import { describe, expect, it } from 'vitest';
import { MAX_FILE_BYTES, locationSchema, textMessageSchema, validateFiles } from './message';

const file = (name: string, type: string, size = 10) => {
  const f = new File(['x'], name, { type });
  Object.defineProperty(f, 'size', { value: size });
  return f;
};

describe('textMessageSchema', () => {
  it('trims and requires content', () => {
    expect(textMessageSchema.safeParse({ content: '  hi ' })).toMatchObject({ success: true, data: { content: 'hi' } });
    expect(textMessageSchema.safeParse({ content: '   ' }).success).toBe(false);
    expect(textMessageSchema.safeParse({ content: 'a'.repeat(4001) }).success).toBe(false);
  });
});

describe('locationSchema', () => {
  it('bounds latitude and longitude', () => {
    expect(locationSchema.safeParse({ latitude: 21, longitude: 105 }).success).toBe(true);
    expect(locationSchema.safeParse({ latitude: 91, longitude: 0 }).success).toBe(false);
    expect(locationSchema.safeParse({ latitude: 0, longitude: 181 }).success).toBe(false);
  });
});

describe('validateFiles', () => {
  it('accepts allowed files', () => {
    expect(validateFiles([file('a.png', 'image/png'), file('b.pdf', 'application/pdf')])).toBeNull();
  });
  it('rejects too many, too large and unsupported files', () => {
    expect(validateFiles(Array.from({ length: 11 }, () => file('a.png', 'image/png')))).toMatch(/10/);
    expect(validateFiles([file('big.png', 'image/png', MAX_FILE_BYTES + 1)])).toMatch(/10MB/);
    expect(validateFiles([file('x.exe', 'application/x-msdownload')])).toMatch(/hỗ trợ/);
  });
});
