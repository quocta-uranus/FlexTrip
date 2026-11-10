import type { PenaltyRule } from './contract';

export type StaffTaskType = 'HANDOVER' | 'RETURN';
export type StaffMediationStatus = 'OPEN' | 'RESOLVED' | 'ESCALATED';

export interface StaffTask {
  id: string;
  bookingId: string;
  bookingStatus: string;
  type: StaffTaskType;
  scheduledAt: string;
  completedAt: string | null;
  deliveryMethod: 'PICKUP' | 'DELIVERY';
  deliveryAddress: string | null;
  listing: {
    id: string;
    title: string;
    location: string;
    imageUrls: string[];
    provider: { id: string; name: string; phone: string | null };
  };
  traveler: { id: string; name: string; phone: string | null; email: string };
}

export interface StaffMediation {
  id: string;
  bookingId: string;
  status: StaffMediationStatus;
  issue: string;
  travelerStatement: string | null;
  providerStatement: string | null;
  resolution: string | null;
  evidenceUrls: string[];
  escalatedDisputeId: string | null;
  resolvedAt: string | null;
  createdAt: string;
  booking?: {
    id: string;
    listing: { id: string; title: string; location: string };
    traveler: { id: string; name: string };
  };
  escalatedDispute?: { id: string; status: string } | null;
}

export interface StaffTaskSchedule {
  date: string;
  tasks: StaffTask[];
}

export interface StaffBooking {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  deliveryMethod: 'PICKUP' | 'DELIVERY';
  deliveryAddress: string | null;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  listing: {
    id: string;
    title: string;
    location: string;
    imageUrls: string[];
    provider: { id: string; name: string; phone: string | null };
  };
  traveler: { id: string; name: string; phone: string | null; email: string };
  contract: {
    status: string;
    terms: string;
    penaltyRules: PenaltyRule[] | null;
    productConditionNote: string | null;
    travelerSignedAt: string | null;
    providerSignedAt: string | null;
    checkInPhotos: string[];
    checkOutPhotos: Array<string | { url: string }> | null;
  } | null;
  staffMediations: StaffMediation[];
}

export interface StaffBookingPage {
  items: StaffBooking[];
  total: number;
  page: number;
  totalPages: number;
}
