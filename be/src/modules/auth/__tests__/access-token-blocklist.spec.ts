import { AuthHarness, resetDatabase } from './support/auth-harness';
import { createUser, http } from '../../admin/__tests__/support/admin-fixtures';
import { blockedKey } from '../../../common/redis/auth-blocklist';

describe('AccessTokenGuard blocklist', () => {
  const h = new AuthHarness();
  beforeAll(() => h.open());
  afterAll(() => h.close());
  beforeEach(async () => { await resetDatabase(h.prisma); h.redis.clear(); });

  it('rejects a valid token when the user is on the blocklist', async () => {
    const u = await createUser(h);
    expect((await http(h, u.accessToken).get('/users/me')).status).toBe(200);

    await h.redis.set(blockedKey(u.id), '1', 'EX', 960);
    const res = await http(h, u.accessToken).get('/users/me');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('ACCOUNT_SUSPENDED');

    await h.redis.del(blockedKey(u.id));
    expect((await http(h, u.accessToken).get('/users/me')).status).toBe(200);
  });
});
