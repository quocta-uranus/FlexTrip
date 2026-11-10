import { randomBytes } from 'crypto';

// Bỏ các ký tự dễ nhầm (0/O, 1/I) vì mã được đọc và gõ tay
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function randomCode(length: number): string {
  return Array.from(randomBytes(length), (b) => ALPHABET[b % ALPHABET.length]).join('');
}

export const generateVoucherCode = (prefix: string) => `${prefix}-${randomCode(8)}`;
