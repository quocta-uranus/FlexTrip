const DAY_MS = 86_400_000;

// Số ngày thuê tính cả ngày nhận và ngày trả (15/11 đến 17/11 là 3 ngày, 15/11 đến 15/11 là 1 ngày); khớp rentalDaysBetween ở backend.
export function rentalDays(startDate: string | Date, endDate: string | Date): number {
  return Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / DAY_MS) + 1;
}
