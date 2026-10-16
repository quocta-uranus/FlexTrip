// Compile the routes the suite touches before any browser starts, so a cold
// Next dev server does not compile them mid-test (slow, and memory-hungry next to Chromium).
export default async function globalSetup() {
  const base = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
  for (const path of ['/login', '/messages', '/listings/warmup']) {
    await fetch(base + path, { redirect: 'manual' });
  }
}
