// Khớp với fe/src/lib/booking-code.ts: người dùng chỉ thấy 12 ký tự cuối của mã đơn, viết hoa.
export function bookingCode(id: string): string {
  return `#${id.slice(-12).toUpperCase()}`;
}

// Chấp nhận mã người dùng thấy (có hoặc không có dấu #, hoa hoặc thường) và trả về phần đuôi để so với id.
export function bookingCodeTail(input: string): string | null {
  const tail = input.trim().replace(/^#/, '').toLowerCase();
  return /^[a-z0-9]{4,}$/.test(tail) ? tail : null;
}
