import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Redis } from 'ioredis';
import { Server, Socket } from 'socket.io';
import { isAllowedOrigin } from '../../common/cors.util';
import { blockedKey } from '../../common/redis/auth-blocklist';
import { REDIS_CLIENT } from '../../common/redis/redis.module';

export type MessageEvent = 'message:new' | 'message:updated' | 'message:deleted' | 'message:read';

export const userRoom = (userId: string) => `user:${userId}`;

@WebSocketGateway({
  cors: {
    origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) =>
      cb(null, isAllowedOrigin(origin)),
    credentials: true,
  },
})
export class MessagesGateway implements OnGatewayConnection {
  @WebSocketServer() server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  // The token is verified once at handshake; clients reconnect with a fresh token after expiry.
  async handleConnection(client: Socket): Promise<void> {
    try {
      const token: unknown = client.handshake.auth?.token;
      if (typeof token !== 'string') throw new Error('no token');
      const payload: { sub?: unknown } = await this.jwt.verifyAsync(token, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        algorithms: ['HS256'],
      });
      if (typeof payload.sub !== 'string' || (await this.redis.exists(blockedKey(payload.sub)))) {
        throw new Error('rejected');
      }
      await client.join(userRoom(payload.sub));
      client.emit('ready');
    } catch {
      client.disconnect(true);
    }
  }

  emitToUsers(userIds: string[], event: MessageEvent, payload: unknown): void {
    this.server.to(userIds.map(userRoom)).emit(event, payload);
  }
}
