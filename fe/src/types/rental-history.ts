export type RentalRole = 'traveler' | 'provider';

export type RentalStatus = 'completed' | 'upcoming' | 'ongoing' | 'cancelled';

export interface RentalHistoryItem {
  id: string;
  title: string;
  location: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  status: RentalStatus;
}
