import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminVouchersApi } from '@/lib/api/vouchers';
import type { UpdateVoucherInput } from '@/lib/validators/voucher.schema';
import type { VoucherSource, VoucherStatus } from '@/types/voucher';

export function useAdminVouchers(q: { status?: VoucherStatus; source?: VoucherSource; search?: string; page: number }) {
  return useQuery({
    queryKey: ['admin', 'vouchers', q],
    queryFn: () => adminVouchersApi.list({ ...q, limit: 15 }),
    placeholderData: keepPreviousData,
  });
}

export function useCreateVoucher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminVouchersApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'vouchers'] });
      qc.invalidateQueries({ queryKey: ['admin', 'promo-budgets'] });
    },
  });
}

export function useUpdateVoucher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & UpdateVoucherInput) => adminVouchersApi.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'vouchers'] }),
  });
}

export function useVoucherRedemptions(id: string | null, page: number) {
  return useQuery({
    queryKey: ['admin', 'vouchers', id, 'redemptions', page],
    queryFn: () => adminVouchersApi.redemptions(id!, { page, limit: 10 }),
    enabled: !!id,
    placeholderData: keepPreviousData,
  });
}

export function usePromoBudgets() {
  return useQuery({ queryKey: ['admin', 'promo-budgets'], queryFn: adminVouchersApi.budgets });
}

export function useSavePromoBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id?: string; name?: string; totalAmount?: number; isActive?: boolean }) =>
      id ? adminVouchersApi.updateBudget(id, body) : adminVouchersApi.createBudget({ name: body.name!, totalAmount: body.totalAmount! }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'promo-budgets'] }),
  });
}
