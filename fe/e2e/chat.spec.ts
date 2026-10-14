import { expect, test, type Browser, type Page } from '@playwright/test';

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

async function providerListing(browser: Browser) {
  const ctx = await browser.newContext();
  const request = ctx.request;
  const login = await (await request.post(`${API}/auth/login`, { data: { email: PROVIDER, password: PASSWORD } })).json();
  const headers = { Authorization: `Bearer ${login.accessToken}` };
  const me = await (await request.get(`${API}/users/me`, { headers })).json();
  const all = await (await request.get(`${API}/listings?limit=100`)).json();
  await ctx.close();
  const listing = all.items.find((l: { providerId: string }) => l.providerId === me.id);
  if (!listing) throw new Error('seed data: provider1 has no ACTIVE listing — run `npx prisma db seed` in be/');
  return listing as { id: string; title: string };
}

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
  const listing = await providerListing(browser);
  const traveler = await signIn(browser, TRAVELER);
  const provider = await signIn(browser, PROVIDER);
  const unique = `xin chào ${Date.now()}`;
  try {
    const c = await openConversation(traveler.page, listing.id);
    await expect(composer(traveler.page)).toHaveValue(new RegExp(`/listings/${listing.id}$`));

    await provider.page.goto(`/messages?c=${c}`);
    await expect(composer(provider.page)).toBeVisible();

    await traveler.page.getByRole('button', { name: 'Gửi', exact: true }).click();
    // provider receives the link + preview card in realtime (no reload)
    await expect(bubble(provider.page, listing.title).last()).toBeVisible();

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
    traveler.page.once('dialog', (d) => d.accept());
    await original(traveler.page, `${unique} (sửa)`).getByRole('button', { name: 'Xoá' }).click();
    await expect(provider.page.locator(`#${id}`)).toContainText('Tin nhắn đã bị thu hồi');

    // second click from the same listing reuses the conversation
    expect(await openConversation(traveler.page, listing.id)).toBe(c);
  } finally {
    await traveler.context.close();
    await provider.context.close();
  }
});

test('location sharing and shared-links history', async ({ browser }) => {
  const listing = await providerListing(browser);
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
    await expect(traveler.page.getByRole('link', { name: link }).last()).toBeVisible();
  } finally {
    await traveler.context.close();
    await provider.context.close();
  }
});

test('images and files appear in the history panel', async ({ browser }) => {
  test.skip(process.env.E2E_UPLOADS !== '1', 'needs a Supabase "chat" bucket; set E2E_UPLOADS=1');
  const listing = await providerListing(browser);
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
    await expect(provider.page.getByRole('img', { name: `anh-${stamp}.png` }).last()).toBeVisible();
    await provider.page.getByRole('tab', { name: 'File' }).click();
    await expect(provider.page.getByText(`ghichu-${stamp}.txt`).last()).toBeVisible();
  } finally {
    await traveler.context.close();
    await provider.context.close();
  }
});

test('contact button: hidden for the provider, anonymous visitor is sent to login', async ({ browser }) => {
  const listing = await providerListing(browser);

  const anon = await browser.newContext();
  const anonPage = await anon.newPage();
  await anonPage.goto(`/listings/${listing.id}`);
  await contactBtn(anonPage).click();
  await anonPage.waitForURL(`**/login?redirect=${encodeURIComponent(`/listings/${listing.id}`)}`);
  await anon.close();

  const provider = await signIn(browser, PROVIDER);
  await provider.page.goto(`/listings/${listing.id}`);
  await expect(provider.page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  await expect(contactBtn(provider.page)).toHaveCount(0);
  await provider.context.close();
});
