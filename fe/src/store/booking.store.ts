import { create } from 'zustand';
import type { Listing } from '@/types/listing';
import type { CreateBookingPayload } from '@/types/booking';

interface BookingDraft extends Partial<CreateBookingPayload> {
  listing?: Listing | null;
  totalPrice?: number;
  nights?: number;
}

interface BookingStore {
  draft: BookingDraft;
  setDraft: (d: Partial<BookingDraft>) => void;
  clearDraft: () => void;
}

export const useBookingStore = create<BookingStore>((set) => ({
  draft: {},

  setDraft(partial) {
    set((s) => ({ draft: { ...s.draft, ...partial } }));
  },

  clearDraft() {
    set({ draft: {} });
  },
}));
