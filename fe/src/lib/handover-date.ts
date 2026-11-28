// Khớp với backend: ngày thuê là 00:00 UTC của ngày khách chọn, "hôm nay" tính theo giờ Việt Nam.
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

export function isBeforeRentalStart(startIso: string, now: Date = new Date()): boolean {
  const today = new Date(now.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);
  return today < startIso.slice(0, 10);
}

export function isAfterRentalEnd(endDate: string, now: Date = new Date()): boolean {
  const today = new Date(now.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return today > endDate.slice(0, 10);
}
