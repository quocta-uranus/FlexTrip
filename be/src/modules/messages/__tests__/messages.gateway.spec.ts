import { jest } from '@jest/globals';
import { Role } from '@prisma/client';
import { io, Socket } from 'socket.io-client';
import { MessagesGateway } from '../messages.gateway';
import { ChatHarness, connect, nextEvent, sleep } from './support/chat-harness';

describe('MSG gateway', () => {
  const h = new ChatHarness();
  let url: string;
  const sockets: Socket[] = [];

  beforeAll(async () => {
    await h.open();
    url = await h.listen();
  });
  afterAll(async () => {
    sockets.forEach((s) => s.close());
    await h.close();
  });
  beforeEach(() => h.reset());

  it('disconnects a socket with an invalid token', async () => {
    const socket = io(url, { auth: { token: 'nope' }, transports: ['websocket'], reconnection: false });
    sockets.push(socket);
    const reason = await new Promise<string>((resolve) => socket.once('disconnect', resolve));
    expect(reason).toBe('io server disconnect');
  });

  it('delivers an event only to the targeted user', async () => {
    const a = await h.createUser('a@example.com', [Role.TRAVELER]);
    const b = await h.createUser('b@example.com', [Role.PROVIDER]);
    const sa = await connect(url, a.accessToken);
    const sb = await connect(url, b.accessToken);
    sockets.push(sa, sb);
    const spy = jest.fn();
    sb.on('message:new', spy);

    const received = nextEvent<{ hello: number }>(sa, 'message:new');
    h.app.get(MessagesGateway).emitToUsers([a.userId], 'message:new', { hello: 1 });

    await expect(received).resolves.toEqual({ hello: 1 });
    await sleep(200);
    expect(spy).not.toHaveBeenCalled();
  });

  it('delivers to nobody when there are no recipients', async () => {
    const a = await h.createUser('a@example.com', [Role.TRAVELER]);
    const b = await h.createUser('b@example.com', [Role.PROVIDER]);
    const sa = await connect(url, a.accessToken);
    const sb = await connect(url, b.accessToken);
    sockets.push(sa, sb);
    const spyA = jest.fn();
    const spyB = jest.fn();
    sa.on('message:new', spyA);
    sb.on('message:new', spyB);

    h.app.get(MessagesGateway).emitToUsers([], 'message:new', { leak: true });

    await sleep(200);
    expect(spyA).not.toHaveBeenCalled();
    expect(spyB).not.toHaveBeenCalled();
  });

  it('disconnects a socket when its access token expires and stops delivering to it', async () => {
    const a = await h.createUser('a@example.com', [Role.TRAVELER]);
    const shortLived = await h.jwt.signAsync(
      { sub: a.userId },
      { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '2s' },
    );
    const expiring = await connect(url, shortLived);
    const durable = await connect(url, a.accessToken);
    sockets.push(expiring, durable);
    const spy = jest.fn();
    expiring.on('message:new', spy);

    const reason = await new Promise<string>((resolve) => expiring.once('disconnect', resolve));
    expect(reason).toBe('io server disconnect');

    const received = nextEvent(durable, 'message:new');
    h.app.get(MessagesGateway).emitToUsers([a.userId], 'message:new', { after: true });
    await received;
    expect(spy).not.toHaveBeenCalled();
    expect(durable.connected).toBe(true);
  }, 10_000);
});
