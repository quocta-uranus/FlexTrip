const DAY_MS = 86_400_000;

export function rentalDaysBetween(startDate: Date, endDate: Date): number {
  return Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / DAY_MS) + 1;
}

export function priceBooking(input: { unitPrice: number; quantity: number; rentalDays: number; depositRate: number }) {
  const totalPrice = input.unitPrice * input.quantity * input.rentalDays;
  return { totalPrice, depositAmount: totalPrice * input.depositRate };
}
