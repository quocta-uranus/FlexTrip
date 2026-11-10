import { ChatStorage } from '../chat-storage.service';

describe('ChatStorage.isOwnUrl', () => {
  const BASE = 'https://proj.supabase.co';
  const P = '/storage/v1/object/public/chat/';
  const storage = new ChatStorage();
  const original = process.env.SUPABASE_URL;
  beforeEach(() => {
    process.env.SUPABASE_URL = BASE;
  });
  afterAll(() => {
    if (original === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = original;
  });

  it('accepts legitimate public chat URLs', () => {
    expect(storage.isOwnUrl(`${BASE}${P}1700000000-ab12cd34.png`)).toBe(true);
    expect(storage.isOwnUrl(`${BASE}${P}b%C3%A1o.pdf`)).toBe(true);
  });

  it('tolerates a trailing slash on SUPABASE_URL', () => {
    process.env.SUPABASE_URL = `${BASE}/`;
    expect(storage.isOwnUrl(`${BASE}${P}x.png`)).toBe(true);
  });

  it.each([
    ['dot-dot traversal', `${BASE}${P}../avatars/x.png`],
    ['encoded traversal', `${BASE}${P}%2e%2e/avatars/x.png`],
    ['encoded slash', `${BASE}${P}a%2f..%2fb.png`],
    ['empty segment', `${BASE}${P}a//x.png`],
    ['query', `${BASE}${P}x.png?x=1`],
    ['fragment', `${BASE}${P}x.png#frag`],
    ['backslash', `${BASE}${P}..\\avatars\\x.png`],
    ['encoded backslash', `${BASE}${P}a%5Cb.png`],
    ['other bucket', `${BASE}/storage/v1/object/public/avatars/x.png`],
    ['other origin', `https://evil.example${P}x.png`],
    ['host with same prefix', `${BASE}.evil.example${P}x.png`],
    ['empty filename', `${BASE}${P}`],
    ['garbage', 'not a url'],
  ])('rejects %s', (_n, url) => {
    expect(storage.isOwnUrl(url)).toBe(false);
  });

  it('rejects everything when SUPABASE_URL is unset', () => {
    delete process.env.SUPABASE_URL;
    expect(storage.isOwnUrl(`${BASE}${P}x.png`)).toBe(false);
  });
});
