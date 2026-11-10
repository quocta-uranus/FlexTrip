import { api, toQuery } from '@/lib/api/client';
import type { Paginated } from '@/types/admin';
import type {
  AdminLoyaltyReward, LoyaltyReward, LoyaltyStats, LoyaltySummary, LoyaltyTransaction, RedeemResult,
} from '@/types/loyalty';
import type { RewardInput } from '@/lib/validators/loyalty.schema';

export const loyaltyApi = {
  me: () => api.get('/loyalty/me') as Promise<LoyaltySummary>,
  rewards: () => api.get('/loyalty/rewards') as Promise<LoyaltyReward[]>,
  transactions: (q: { page?: number; limit?: number }) =>
    api.get(`/loyalty/transactions${toQuery(q)}`) as Promise<Paginated<LoyaltyTransaction>>,
  redeem: (rewardId: string) => api.post('/loyalty/redeem', { rewardId }) as Promise<RedeemResult>,
};

export const adminLoyaltyApi = {
  stats: () => api.get('/admin/loyalty/stats') as Promise<LoyaltyStats>,
  rewards: () => api.get('/admin/loyalty/rewards') as Promise<AdminLoyaltyReward[]>,
  createReward: (body: RewardInput) => api.post('/admin/loyalty/rewards', body) as Promise<AdminLoyaltyReward>,
  updateReward: (id: string, body: Partial<RewardInput> & { isActive?: boolean }) =>
    api.patch(`/admin/loyalty/rewards/${id}`, body) as Promise<AdminLoyaltyReward>,
};
