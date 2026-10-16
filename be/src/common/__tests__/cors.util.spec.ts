import { isAllowedOrigin } from '../cors.util';

describe('isAllowedOrigin', () => {
  it('allows no origin (server-to-server) and localhost dev origins', () => {
    expect(isAllowedOrigin(undefined)).toBe(true);
    expect(isAllowedOrigin('http://localhost:3000')).toBe(true);
  });

  it('allows vercel previews and rejects unknown origins', () => {
    expect(isAllowedOrigin('https://flextrip-git-x.vercel.app')).toBe(true);
    expect(isAllowedOrigin('https://evil.example')).toBe(false);
  });
});
