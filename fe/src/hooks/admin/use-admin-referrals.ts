import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { adminReferralsApi } from '@/lib/api/referrals';
import type { ReferralStatus } from '@/types/referral';

export function useAdminReferrals(page: number, status?: ReferralStatus) {
  return useQuery({
    queryKey: ['admin', 'referrals', page, status ?? 'all'],
    queryFn: () => adminReferralsApi.list({ page, limit: 20, status }),
    placeholderData: keepPreviousData,
  });
}
