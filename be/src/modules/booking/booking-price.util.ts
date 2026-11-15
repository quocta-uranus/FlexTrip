const DAY_MS = 86_400_000;

// Cọc = trả trước 30% tiền thuê, cố định cho mọi listing (không còn tuỳ chỉnh theo Provider hay AI gợi ý)
export const DEPOSIT_RATE = 0.3;

export function rentalDaysBetween(startDate: Date, endDate: Date): number {
  return Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / DAY_MS) + 1;
}

export function priceBooking(input: { unitPrice: number; quantity: number; rentalDays: number }) {
  const totalPrice = input.unitPrice * input.quantity * input.rentalDays;
  return { totalPrice, depositAmount: totalPrice * DEPOSIT_RATE };
}
