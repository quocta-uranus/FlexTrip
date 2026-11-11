import { api, toQuery } from '@/lib/api/client';
import type { Paginated } from '@/types/admin';
import type { AdminReferral, ReferralItem, ReferralStatus, ReferralSummary } from '@/types/referral';

export const referralsApi = {
  me: () => api.get('/referrals/me') as Promise<ReferralSummary>,
  list: (q: { page?: number; limit?: number }) =>
    api.get(`/referrals/me/list${toQuery(q)}`) as Promise<Paginated<ReferralItem>>,
};

export const adminReferralsApi = {
  list: (q: { page?: number; limit?: number; status?: ReferralStatus }) =>
    api.get(`/admin/referrals${toQuery(q)}`) as Promise<Paginated<AdminReferral>>,
};
