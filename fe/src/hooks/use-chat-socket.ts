import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { userApi } from '@/lib/api/client';
import { SOCKET_EVENTS, applySocketEvent } from '@/lib/chat/cache';
import { getSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/auth.store';
import { useChatStore } from '@/store/chat.store';

const RETRY_MS = 3000;

export function useChatSocket() {
  const qc = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setConnected = useChatStore((s) => s.setConnected);

  useEffect(() => {
    if (!isAuthenticated) return;
    const socket = getSocket();
    let retry: ReturnType<typeof setTimeout> | undefined;

    socket.on('ready', () => setConnected(true));
    socket.on('disconnect', (reason) => {
      setConnected(false);
      // The server drops sockets with a stale token and socket.io does not auto-reconnect those:
      // refresh the token through a normal API call, then reconnect.
      // ponytail: retries every 3s while mounted; add backoff if auth outages become common.
      if (reason === 'io server disconnect') {
        retry = setTimeout(() => void userApi.me().catch(() => undefined).finally(() => socket.connect()), RETRY_MS);
      }
    });
    for (const event of SOCKET_EVENTS) socket.on(event, (payload) => applySocketEvent(qc, event, payload));
    socket.connect();

    return () => {
      clearTimeout(retry);
      socket.removeAllListeners();
      socket.disconnect();
      setConnected(false);
    };
  }, [isAuthenticated, qc, setConnected]);
}
