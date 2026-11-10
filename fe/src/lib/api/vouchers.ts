import { api, toQuery } from '@/lib/api/client';
import type { Paginated } from '@/types/admin';
import type {
  AdminVoucher, AdminVoucherRedemption, MyVouchers, PromoBudget, VoucherPreview, VoucherSource, VoucherStatus,
} from '@/types/voucher';
import type { CreateVoucherInput, UpdateVoucherInput } from '@/lib/validators/voucher.schema';

export const vouchersApi = {
  mine: () => api.get('/vouchers/mine') as Promise<MyVouchers>,
  validate: (body: { code: string; listingId: string; startDate: string; endDate: string; quantity: number }) =>
    api.post('/vouchers/validate', body) as Promise<VoucherPreview>,
};

export const adminVouchersApi = {
  list: (q: { status?: VoucherStatus; source?: VoucherSource; search?: string; page?: number; limit?: number }) =>
    api.get(`/admin/vouchers${toQuery(q)}`) as Promise<Paginated<AdminVoucher>>,
  create: (body: CreateVoucherInput) => api.post('/admin/vouchers', body) as Promise<AdminVoucher>,
  update: (id: string, body: UpdateVoucherInput) => api.patch(`/admin/vouchers/${id}`, body) as Promise<AdminVoucher>,
  redemptions: (id: string, q: { page?: number; limit?: number }) =>
    api.get(`/admin/vouchers/${id}/redemptions${toQuery(q)}`) as Promise<Paginated<AdminVoucherRedemption>>,
  budgets: () => api.get('/admin/promo-budgets') as Promise<PromoBudget[]>,
  createBudget: (body: { name: string; totalAmount: number }) => api.post('/admin/promo-budgets', body) as Promise<PromoBudget>,
  updateBudget: (id: string, body: { name?: string; totalAmount?: number; isActive?: boolean }) =>
    api.patch(`/admin/promo-budgets/${id}`, body) as Promise<PromoBudget>,
};
