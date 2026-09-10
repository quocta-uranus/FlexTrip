import type { RentalHistoryItem } from '@/types/rental-history';

// Mock data — replace with TanStack Query calls once the `bookings`/`listings` BE modules expose history endpoints.
export const mockTravelerHistory: RentalHistoryItem[] = [
  {
    id: 'r_1',
    title: 'Villa Đà Lạt View Đồi Thông',
    location: 'Đà Lạt, Lâm Đồng',
    startDate: '2026-08-12',
    endDate: '2026-08-15',
    totalPrice: 3_600_000,
    status: 'completed',
  },
  {
    id: 'r_2',
    title: 'Homestay Phố Cổ Hội An',
    location: 'Hội An, Quảng Nam',
    startDate: '2026-09-20',
    endDate: '2026-09-22',
    totalPrice: 1_450_000,
    status: 'upcoming',
  },
  {
    id: 'r_3',
    title: 'Căn hộ view biển Nha Trang',
    location: 'Nha Trang, Khánh Hòa',
    startDate: '2026-07-02',
    endDate: '2026-07-05',
    totalPrice: 4_200_000,
    status: 'completed',
  },
  {
    id: 'r_4',
    title: 'Bungalow Sa Pa Mây Núi',
    location: 'Sa Pa, Lào Cai',
    startDate: '2026-08-14',
    endDate: '2026-08-18',
    totalPrice: 2_100_000,
    status: 'ongoing',
  },
  {
    id: 'r_5',
    title: 'Phòng Superior Phú Quốc Resort',
    location: 'Phú Quốc, Kiên Giang',
    startDate: '2026-05-30',
    endDate: '2026-06-02',
    totalPrice: 5_800_000,
    status: 'cancelled',
  },
];

export const mockProviderHistory: RentalHistoryItem[] = [];
