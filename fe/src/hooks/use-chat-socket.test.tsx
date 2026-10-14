import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/store/auth.store';
import { useChatStore } from '@/store/chat.store';
import { useChatSocket } from './use-chat-socket';

const handlers = new Map<string, (...args: unknown[]) => void>();
const socket = vi.hoisted(() => ({
  on: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  removeAllListeners: vi.fn(),
}));
const me = vi.hoisted(() => vi.fn());

vi.mock('@/lib/socket', () => ({ getSocket: () => socket }));
vi.mock('@/lib/api/client', () => ({ userApi: { me } }));

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

beforeEach(() => {
  vi.useFakeTimers();
  handlers.clear();
  socket.on.mockReset().mockImplementation((event: string, fn: (...args: unknown[]) => void) => {
    handlers.set(event, fn);
  });
  socket.connect.mockReset();
  socket.disconnect.mockReset();
  socket.removeAllListeners.mockReset();
  me.mockReset();
  useAuthStore.setState({ isAuthenticated: true });
  useChatStore.setState({ connected: false });
});

afterEach(() => vi.useRealTimers());

describe('useChatSocket', () => {
  it('registers listeners and connects on mount', () => {
    renderHook(() => useChatSocket(), { wrapper });
    expect(handlers.has('ready')).toBe(true);
    expect(handlers.has('disconnect')).toBe(true);
    expect(socket.connect).toHaveBeenCalledTimes(1);
  });

  it('refreshes the token then reconnects after a server disconnect', async () => {
    me.mockResolvedValue({});
    renderHook(() => useChatSocket(), { wrapper });
    socket.connect.mockClear();
    handlers.get('disconnect')!('io server disconnect');
    expect(me).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(3000);
    expect(me).toHaveBeenCalledTimes(1);
    expect(socket.connect).toHaveBeenCalledTimes(1);
  });

  it('does not reconnect if unmounted while the token refresh is pending', async () => {
    let resolve!: (v: unknown) => void;
    me.mockReturnValue(new Promise((r) => (resolve = r)));
    const { unmount } = renderHook(() => useChatSocket(), { wrapper });
    socket.connect.mockClear();
    handlers.get('disconnect')!('io server disconnect');
    await vi.advanceTimersByTimeAsync(3000);
    expect(me).toHaveBeenCalledTimes(1);
    unmount();
    resolve({});
    await vi.advanceTimersByTimeAsync(0);
    expect(socket.connect).not.toHaveBeenCalled();
  });

  it('tracks connected state', () => {
    const { unmount } = renderHook(() => useChatSocket(), { wrapper });
    handlers.get('ready')!();
    expect(useChatStore.getState().connected).toBe(true);
    unmount();
    expect(useChatStore.getState().connected).toBe(false);
  });
});
