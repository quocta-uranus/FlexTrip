import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { referralsApi } from '@/lib/api/referrals';

export function useReferral() {
  return useQuery({ queryKey: ['referrals', 'me'], queryFn: referralsApi.me });
}

export function useReferralList(page: number) {
  return useQuery({
    queryKey: ['referrals', 'list', page],
    queryFn: () => referralsApi.list({ page, limit: 10 }),
    placeholderData: keepPreviousData,
  });
}
