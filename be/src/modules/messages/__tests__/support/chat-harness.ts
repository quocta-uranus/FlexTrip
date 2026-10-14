import { Role } from '@prisma/client';
import { AddressInfo } from 'net';
import { io, Socket } from 'socket.io-client';
import request from 'supertest';
import { AuthHarness, resetDatabase } from '../../../auth/__tests__/support/auth-harness';

export type Method = 'get' | 'post' | 'patch' | 'delete';

export class ChatHarness extends AuthHarness {
  async createUser(email: string, roles: Role[]): Promise<{ userId: string; accessToken: string }> {
    const registered = await this.register(email);
    await this.prisma.user.update({
      where: { id: registered.userId },
      data: { emailVerifiedAt: new Date(), name: email.split('@')[0] },
    });
    await this.prisma.userRole.deleteMany({ where: { userId: registered.userId } });
    await this.prisma.userRole.createMany({ data: roles.map((role) => ({ userId: registered.userId, role })) });
    const accessToken = await this.jwt.signAsync(
      { sub: registered.userId, roles },
      { secret: process.env.JWT_ACCESS_SECRET },
    );
    return { userId: registered.userId, accessToken };
  }

  req(method: Method, path: string, token?: string): request.Test {
    const r = request(this.app.getHttpServer())[method](`/api/v1${path}`);
    return token ? r.set('Authorization', `Bearer ${token}`) : r;
  }

  async reset(): Promise<void> {
    await resetDatabase(this.prisma);
    this.redis.clear();
  }

  async listen(): Promise<string> {
    await this.app.listen(0, '127.0.0.1');
    const { port } = this.app.getHttpServer().address() as AddressInfo;
    return `http://127.0.0.1:${port}`;
  }
}

/** Resolves once the gateway has joined the user's room (`ready`). */
export function connect(url: string, token: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = io(url, { auth: { token }, transports: ['websocket'], reconnection: false });
    socket.once('ready', () => resolve(socket));
    socket.once('connect_error', reject);
  });
}

export function nextEvent<T = unknown>(socket: Socket, event: string, ms = 2000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out waiting for ${event}`)), ms);
    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
