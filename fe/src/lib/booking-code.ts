// Một đơn chỉ hiển thị bằng một mã duy nhất ở mọi màn hình, hợp đồng và hoá đơn.
export function bookingCode(id: string): string {
  return `#${id.slice(-12).toUpperCase()}`;
}
