import { create } from 'zustand';
import { writeStoredMode, type AppMode } from '@/lib/app-mode';

// Keyed by user id so one account's mode never leaks into another after logout or an account switch.
interface ModeState {
  modes: Record<string, AppMode>;
  setMode: (userId: string, mode: AppMode) => void;
}

export const useModeStore = create<ModeState>((set) => ({
  modes: {},
  setMode(userId, mode) {
    writeStoredMode(userId, mode);
    set((state) => ({ modes: { ...state.modes, [userId]: mode } }));
  },
}));
