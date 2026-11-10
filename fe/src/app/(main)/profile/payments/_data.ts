import type { PaymentMethod } from '@/types/wallet';

export const mockPaymentMethods: PaymentMethod[] = [
  { id: 'pm_1', brand: 'visa', label: 'Visa •••• 4291', detail: 'Hết hạn 08/27', isDefault: true },
  { id: 'pm_2', brand: 'mastercard', label: 'Mastercard •••• 7745', detail: 'Hết hạn 02/28', isDefault: false },
  { id: 'pm_3', brand: 'momo', label: 'Ví MoMo', detail: 'Liên kết với 0912 ••• 456', isDefault: false },
  { id: 'pm_4', brand: 'zalopay', label: 'ZaloPay', detail: 'Liên kết với 0912 ••• 456', isDefault: false },
];
