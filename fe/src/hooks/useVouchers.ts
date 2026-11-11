import { useMutation, useQuery } from '@tanstack/react-query';
import { vouchersApi } from '@/lib/api/vouchers';

export function useMyVouchers() {
  return useQuery({ queryKey: ['vouchers', 'mine'], queryFn: vouchersApi.mine });
}

export function useValidateVoucher() {
  return useMutation({ mutationFn: vouchersApi.validate });
}
