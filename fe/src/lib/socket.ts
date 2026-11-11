import { io, type Socket } from 'socket.io-client';
import { getAccessToken } from '@/lib/api/token';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

let socket: Socket | null = null;

// auth is a function so every (re)connect attempt sends the current access token.
export function getSocket(): Socket {
  socket ??= io(new URL(API_URL).origin, {
    autoConnect: false,
    transports: ['websocket'],
    auth: (cb) => cb({ token: getAccessToken() }),
  });
  return socket;
}
