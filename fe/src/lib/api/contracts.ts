import { api } from './client';
import type { Contract, ContractPreview } from '@/types/contract';

export interface CheckinPayload {
  idDocumentUrl: string;
  idDocumentType: 'NATIONAL_ID' | 'PASSPORT';
  checkInPhotos: string[];
}

export interface CheckoutPayload {
  photos: string[];
  note?: string;
  action?: 'complete' | 'dispute';
}

export const contractsApi = {
  preview: (bookingId: string): Promise<ContractPreview> =>
    api.get(`/contracts/booking/${bookingId}/preview`),

  getByBooking: (bookingId: string): Promise<Contract> =>
    api.get(`/contracts/booking/${bookingId}`),

  travelerSign: (bookingId: string): Promise<void> =>
    api.post(`/contracts/booking/${bookingId}/traveler-sign`, {}),

  providerSign: (bookingId: string): Promise<void> =>
    api.patch(`/contracts/booking/${bookingId}/provider-sign`, {}),

  checkin: (bookingId: string, payload: CheckinPayload): Promise<void> =>
    api.patch(`/contracts/booking/${bookingId}/checkin`, payload),

  checkout: (bookingId: string, payload: CheckoutPayload): Promise<void> =>
    api.patch(`/contracts/booking/${bookingId}/checkout`, payload),
};
