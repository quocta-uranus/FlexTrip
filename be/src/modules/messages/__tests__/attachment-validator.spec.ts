import { BadRequestException } from '@nestjs/common';
import { MAX_FILE_BYTES, safeFileName, validateAttachment } from '../attachment-validator';

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);
const PDF = Buffer.from('%PDF-1.7\n...');
const ZIP = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(32)]);
const OLE2 = Buffer.concat([Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]), Buffer.alloc(32)]);
const file = (buffer: Buffer, mimetype: string, size = buffer.length) => ({ buffer, mimetype, size });

describe('validateAttachment', () => {
  it('accepts a real png', () => {
    expect(validateAttachment(file(PNG, 'image/png'))).toEqual({ mime: 'image/png', ext: 'png' });
  });

  it('accepts pdf, docx (zip container), doc (ole2), plain text', () => {
    expect(validateAttachment(file(PDF, 'application/pdf')).ext).toBe('pdf');
    expect(
      validateAttachment(file(ZIP, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')).ext,
    ).toBe('docx');
    expect(validateAttachment(file(OLE2, 'application/msword')).ext).toBe('doc');
    expect(validateAttachment(file(Buffer.from('hello'), 'text/plain')).ext).toBe('txt');
  });

  it('rejects a mime outside the whitelist', () => {
    expect(() => validateAttachment(file(PNG, 'application/x-msdownload'))).toThrow(BadRequestException);
  });

  it('rejects content that does not match the declared mime', () => {
    expect(() => validateAttachment(file(Buffer.from('<script>alert(1)</script>'), 'image/png'))).toThrow(
      BadRequestException,
    );
    expect(() => validateAttachment(file(ZIP, 'application/pdf'))).toThrow(BadRequestException);
  });

  it('rejects text/plain that contains a NUL byte', () => {
    expect(() => validateAttachment(file(Buffer.from([0x68, 0x00, 0x69]), 'text/plain'))).toThrow(BadRequestException);
  });

  it('rejects empty and oversized files', () => {
    expect(() => validateAttachment(file(Buffer.alloc(0), 'text/plain'))).toThrow(BadRequestException);
    expect(() => validateAttachment(file(PNG, 'image/png', MAX_FILE_BYTES + 1))).toThrow(BadRequestException);
  });
});

describe('safeFileName', () => {
  it('strips path separators and control characters', () => {
    expect(safeFileName('..\\..//evil\u0000.png')).toBe('.._..__evil.png');
  });

  it('falls back to "file" and truncates', () => {
    expect(safeFileName('   ')).toBe('file');
    expect(safeFileName('a'.repeat(300))).toHaveLength(200);
  });
});
