import { create } from 'zustand';

interface ProfileSavedStore {
  savedAt: number | null;
  setSaved: () => void;
  clearSaved: () => void;
}

export const useProfileSavedStore = create<ProfileSavedStore>((set) => ({
  savedAt: null,
  setSaved: () => set({ savedAt: Date.now() }),
  clearSaved: () => set({ savedAt: null }),
}));
