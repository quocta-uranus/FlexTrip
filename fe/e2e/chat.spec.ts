import { expect, request, test, type Browser, type Page } from '@playwright/test';

const API = process.env.E2E_API_URL ?? 'http://localhost:3001/api/v1';
const PASSWORD = 'Seed@123456';
const TRAVELER = 'seed.traveler1@flextrip.dev';
const PROVIDER = 'seed.provider1@flextrip.dev';

// Login ignores ?redirect= and lands on a role-based page, so wait for it to leave /login.
async function signIn(browser: Browser, email: string) {
  const context = await browser.newContext({
    permissions: ['geolocation'],
    geolocation: { latitude: 21.0285, longitude: 105.8542 },
  });
  const page = await context.newPage();
  // Dev-only React Query devtools button can intercept clicks near the composer.
  await page.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      const s = document.createElement('style');
      s.textContent = '.tsqd-parent-container, .tsqd-open-btn-container, [aria-label*="Tanstack" i] { display: none !important; }';
      document.head.appendChild(s);
    });
  });
  await page.goto('/login');
  await page.locator('input[type=email]').fill(email);
  await page.locator('input[type=password]').fill(PASSWORD);
  await page.locator('button[type=submit]').click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
  return { context, page };
}

type Listing = { id: string; title: string; providerId: string; status?: string };

async function fetchProviderListing(): Promise<Listing> {
  const ctx = await request.newContext();
  try {
    const call = async (path: string, init?: { method?: 'POST'; data?: unknown; token?: string }) => {
      const res = await (init?.method === 'POST'
        ? ctx.post(`${API}${path}`, { data: init.data })
        : ctx.get(`${API}${path}`, { headers: init?.token ? { Authorization: `Bearer ${init.token}` } : {} }));
      if (!res.ok()) throw new Error(`${path} -> ${res.status()}: ${await res.text()}`);
      return res.json();
    };
    const { accessToken } = await call('/auth/login', { method: 'POST', data: { email: PROVIDER, password: PASSWORD } });
    const me = await call('/users/me', { token: accessToken });
    let totalPages = 1;
    for (let page = 1; page <= totalPages; page++) {
      const res = await call(`/listings?page=${page}&limit=100`);
      totalPages = res.totalPages ?? 1;
      const hit = (res.items as Listing[]).find((l) => l.providerId === me.id && (l.status ?? 'ACTIVE') === 'ACTIVE');
      if (hit) return hit;
    }
    throw new Error('seed data: provider1 has no ACTIVE listing — run `npx prisma db seed` in be/');
  } finally {
    await ctx.dispose();
  }
}

let listingPromise: Promise<Listing> | undefined;
const providerListing = () => (listingPromise ??= fetchProviderListing());

const bubble = (page: Page, text: string | RegExp) => page.getByTestId('message').filter({ hasText: text });
const composer = (page: Page) => page.getByRole('textbox', { name: 'Nhập tin nhắn' });
const contactBtn = (page: Page) => page.getByRole('button', { name: /Liên hệ Provider/ });

// Traveler contacts the provider from the listing; returns the conversation id.
async function openConversation(page: Page, listingId: string) {
  await page.goto(`/listings/${listingId}`);
  await contactBtn(page).click();
  await page.waitForURL(/\/messages\?c=/);
  return new URL(page.url()).searchParams.get('c')!;
}

test('traveler opens a listing, contacts the provider and both chat in realtime', async ({ browser }) => {
  const listing = await providerListing();
  const traveler = await signIn(browser, TRAVELER);
  const provider = await signIn(browser, PROVIDER);
  const unique = `xin chào ${Date.now()}`;
  try {
    const c = await openConversation(traveler.page, listing.id);
    await expect(composer(traveler.page)).toHaveValue(new RegExp(`/listings/${listing.id}$`));

    await provider.page.goto(`/messages?c=${c}`);
    await expect(composer(provider.page)).toBeVisible();

    // earlier runs reuse this conversation, so count what is already there and require exactly one more
    const all = provider.page.getByTestId('message');
    const countBefore = await all.count();
    await traveler.page.getByRole('button', { name: 'Gửi', exact: true }).click();
    // provider receives the link + preview card in realtime (no reload)
    await expect(all).toHaveCount(countBefore + 1);
    const newest = all.last();
    expect(await newest.getAttribute('id')).toMatch(/^msg-/);
    await expect(newest).toContainText(`/listings/${listing.id}`);
    await expect(newest.getByRole('link', { name: new RegExp(listing.title.slice(0, 20)) }).first()).toBeVisible();

    await composer(traveler.page).fill(unique);
    await composer(traveler.page).press('Enter');
    await expect(bubble(provider.page, unique)).toBeVisible();

    await bubble(provider.page, unique).getByRole('button', { name: 'Trả lời' }).click();
    await composer(provider.page).fill(`đã nhận ${unique}`);
    await composer(provider.page).press('Enter');
    await expect(bubble(traveler.page, `đã nhận ${unique}`).getByRole('button', { name: new RegExp(unique) })).toBeVisible();

    const original = (p: Page, text: string) => bubble(p, text).filter({ hasNotText: 'đã nhận' });
    await original(traveler.page, unique).getByRole('button', { name: 'Sửa' }).click();
    await traveler.page.getByRole('textbox', { name: 'Sửa tin nhắn' }).fill(`${unique} (sửa)`);
    await traveler.page.getByRole('button', { name: 'Lưu' }).click();
    const edited = original(provider.page, `${unique} (sửa)`);
    await expect(edited).toBeVisible();
    await expect(edited.getByText('đã chỉnh sửa')).toBeVisible();

    // a reply quoting the message also shows the recalled text, so target the bubble by id
    const id = await original(traveler.page, `${unique} (sửa)`).getAttribute('id');
    expect(id).toMatch(/^msg-/);
    traveler.page.once('dialog', (d) => d.accept());
    await original(traveler.page, `${unique} (sửa)`).getByRole('button', { name: 'Xoá' }).click();
    await expect(provider.page.locator(`[id="${id}"]`)).toContainText('Tin nhắn đã bị thu hồi');

    // second click from the same listing reuses the conversation
    expect(await openConversation(traveler.page, listing.id)).toBe(c);
  } finally {
    await traveler.context.close();
    await provider.context.close();
  }
});

test('location sharing and shared-links history', async ({ browser }) => {
  const listing = await providerListing();
  const traveler = await signIn(browser, TRAVELER);
  const provider = await signIn(browser, PROVIDER);
  const label = `Hồ Gươm ${Date.now()}`;
  const link = `https://example.com/guide-${Date.now()}`;
  try {
    const c = await openConversation(traveler.page, listing.id);
    await provider.page.goto(`/messages?c=${c}`);
    await expect(composer(provider.page)).toBeVisible();

    await traveler.page.getByRole('button', { name: 'Chia sẻ vị trí' }).click();
    await traveler.page.getByRole('button', { name: 'Dùng vị trí hiện tại' }).click();
    await traveler.page.getByLabel('Tên địa điểm (tuỳ chọn)').fill(label);
    await traveler.page.getByRole('button', { name: 'Gửi vị trí', exact: true }).click();
    // tiles may be slow; assert the label and the Google Maps link, not the map
    const loc = bubble(provider.page, label);
    await expect(loc).toBeVisible();
    await expect(loc.getByRole('link', { name: /Mở Google Maps/ })).toHaveAttribute('href', /21\.0285,\s*105\.8542/);

    await composer(traveler.page).fill(`tham khảo ${link}`);
    await composer(traveler.page).press('Enter');
    await expect(bubble(provider.page, link)).toBeVisible();
    await traveler.page.getByRole('button', { name: 'Xem ảnh, file, link' }).click();
    await traveler.page.getByRole('tab', { name: 'Link' }).click();
    const panel = traveler.page.getByRole('complementary', { name: 'Ảnh, file, link đã gửi' });
    await expect(panel.getByRole('link', { name: link })).toBeVisible();
  } finally {
    await traveler.context.close();
    await provider.context.close();
  }
});

test('images and files appear in the history panel', async ({ browser }) => {
  test.skip(process.env.E2E_UPLOADS !== '1', 'needs a Supabase "chat" bucket; set E2E_UPLOADS=1');
  const listing = await providerListing();
  const traveler = await signIn(browser, TRAVELER);
  const provider = await signIn(browser, PROVIDER);
  const stamp = Date.now();
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
  try {
    const c = await openConversation(traveler.page, listing.id);
    await provider.page.goto(`/messages?c=${c}`);
    await traveler.page.locator('input[type=file]').setInputFiles([
      { name: `anh-${stamp}.png`, mimeType: 'image/png', buffer: png },
      { name: `ghichu-${stamp}.txt`, mimeType: 'text/plain', buffer: Buffer.from('hello') },
    ]);
    await traveler.page.getByRole('button', { name: 'Gửi', exact: true }).click();
    await expect(bubble(provider.page, `ghichu-${stamp}.txt`)).toBeVisible({ timeout: 20_000 });

    await provider.page.getByRole('button', { name: 'Xem ảnh, file, link' }).click();
    const panel = provider.page.getByRole('complementary', { name: 'Ảnh, file, link đã gửi' });
    await expect(panel.getByRole('img', { name: `anh-${stamp}.png` })).toBeVisible();
    await panel.getByRole('tab', { name: 'File' }).click();
    await expect(panel.getByText(`ghichu-${stamp}.txt`)).toBeVisible();
  } finally {
    await traveler.context.close();
    await provider.context.close();
  }
});

test('contact button: hidden for the provider, anonymous visitor is sent to login', async ({ browser }) => {
  const listing = await providerListing();

  const anon = await browser.newContext();
  try {
    const page = await anon.newPage();
    await page.goto(`/listings/${listing.id}`);
    await contactBtn(page).click();
    await page.waitForURL(`**/login?redirect=${encodeURIComponent(`/listings/${listing.id}`)}`);
  } finally {
    await anon.close();
  }

  const provider = await signIn(browser, PROVIDER);
  try {
    await provider.page.goto(`/listings/${listing.id}`);
    await expect(provider.page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await expect(contactBtn(provider.page)).toHaveCount(0);
  } finally {
    await provider.context.close();
  }
});
