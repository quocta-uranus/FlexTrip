import { api } from '@/lib/api/client';
import type { IncentiveRunResult, ProviderIncentive, TopRatedProvider } from '@/types/incentive';

export const incentivesApi = {
  mine: () => api.get('/providers/me/incentive') as Promise<ProviderIncentive>,
};

export const adminIncentivesApi = {
  list: () => api.get('/admin/provider-incentives') as Promise<TopRatedProvider[]>,
  run: () => api.post('/admin/provider-incentives/run', {}) as Promise<IncentiveRunResult>,
};
