import type { PaymentMethod, WalletSummary, WalletTransaction } from '@/types/wallet';

// Mock data — replace with TanStack Query calls once the `users`/`wallet` BE modules exist.
export const mockWalletSummary: WalletSummary = {
  balance: 2_450_000,
  updatedAt: '2026-09-09T09:12:00+07:00',
};

export const mockPaymentMethods: PaymentMethod[] = [
  { id: 'pm_1', brand: 'visa', label: 'Visa •••• 4291', detail: 'Hết hạn 08/27', isDefault: true },
  { id: 'pm_2', brand: 'mastercard', label: 'Mastercard •••• 7745', detail: 'Hết hạn 02/28', isDefault: false },
  { id: 'pm_3', brand: 'momo', label: 'Ví MoMo', detail: 'Liên kết với 0912 ••• 456', isDefault: false },
  { id: 'pm_4', brand: 'zalopay', label: 'ZaloPay', detail: 'Liên kết với 0912 ••• 456', isDefault: false },
];

export const mockTransactions: WalletTransaction[] = [
  { id: 'tx_1', description: 'Nạp tiền qua ZaloPay', createdAt: '2026-09-08T14:20:00+07:00', amount: 500_000, status: 'success' },
  {
    id: 'tx_2',
    description: 'Thanh toán đặt phòng · Villa Đà Lạt View Đồi Thông',
    createdAt: '2026-09-05T09:05:00+07:00',
    amount: -3_600_000,
    status: 'success',
  },
  { id: 'tx_3', description: 'Hoàn tiền huỷ đặt phòng', createdAt: '2026-09-01T18:42:00+07:00', amount: 1_200_000, status: 'processing' },
  { id: 'tx_4', description: 'Rút tiền về Vietcombank •1234', createdAt: '2026-08-28T11:10:00+07:00', amount: -2_000_000, status: 'success' },
];
