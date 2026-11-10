import { create } from 'zustand';

interface ChatState {
  connected: boolean;
  setConnected: (connected: boolean) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  connected: false,
  setConnected: (connected) => set({ connected }),
}));
