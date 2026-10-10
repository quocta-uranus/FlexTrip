import { api } from './client';
import type { Contract, ContractPreview } from '@/types/contract';

export const contractsApi = {
  preview: (bookingId: string): Promise<ContractPreview> =>
    api.get(`/contracts/booking/${bookingId}/preview`),

  getByBooking: (bookingId: string): Promise<Contract> =>
    api.get(`/contracts/booking/${bookingId}`),

  providerSign: (bookingId: string): Promise<void> =>
    api.patch(`/contracts/booking/${bookingId}/provider-sign`, {}),
};
