import { ListingStatus, Role } from '@prisma/client';
import { MAX_FILE_BYTES } from '../attachment-validator';
import { ChatHarness } from './support/chat-harness';

type U = { userId: string; accessToken: string };
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);
const PDF = Buffer.from('%PDF-1.7\nbody');

describe('MSG-03 attachments and shared history', () => {
  const h = new ChatHarness();
  beforeAll(() => h.open());
  afterAll(() => h.close());
  beforeEach(() => h.reset());

  async function setup() {
    const traveler = await h.createUser('traveler@example.com', [Role.TRAVELER]);
    const provider = await h.createUser('provider@example.com', [Role.PROVIDER]);
    const c = (await h.req('post', '/messages/conversations', traveler.accessToken).send({ targetUserId: provider.userId })).body.id as string;
    return { traveler, provider, c };
  }
  const upload = (u: U, c: string, files: { buf: Buffer; name: string; type: string }[]) => {
    const r = h.req('post', `/messages/conversations/${c}/attachments`, u.accessToken);
    files.forEach((f) => r.attach('files', f.buf, { filename: f.name, contentType: f.type }));
    return r;
  };
  const send = (u: U, c: string, body: object) => h.req('post', `/messages/conversations/${c}`, u.accessToken).send(body);
  const att = (n: number, mimeType = 'image/png', name = `p${n}.png`) => ({ url: `https://storage.test/chat/${n}.png`, name, mimeType, size: 100 });

  describe('upload', () => {
    it('validates then stores files and returns their metadata', async () => {
      const { traveler, c } = await setup();
      const res = await upload(traveler, c, [
        { buf: PNG, name: 'a.png', type: 'image/png' },
        { buf: PDF, name: 'báo giá.pdf', type: 'application/pdf' },
      ]);
      expect(res.status).toBe(201);
      expect(res.body).toEqual([
        { url: 'https://storage.test/chat/1.png', name: 'a.png', mimeType: 'image/png', size: PNG.length },
        { url: 'https://storage.test/chat/2.pdf', name: 'báo giá.pdf', mimeType: 'application/pdf', size: PDF.length },
      ]);
    });

    it('rejects bad files without uploading any of the batch', async () => {
      const { traveler, c } = await setup();
      const res = await upload(traveler, c, [
        { buf: PNG, name: 'ok.png', type: 'image/png' },
        { buf: Buffer.from('<script>1</script>'), name: 'fake.png', type: 'image/png' },
      ]);
      expect(res.status).toBe(400);
      expect((await upload(traveler, c, [{ buf: PNG, name: 'x.exe', type: 'application/x-msdownload' }])).status).toBe(400);
      expect(h.storage.uploaded).toHaveLength(0);
    });

    it('rejects files over 10MB, more than 10 files, no files and non-members', async () => {
      const { traveler, c } = await setup();
      const outsider = await h.createUser('o@example.com', [Role.TRAVELER]);
      const big = Buffer.concat([PNG, Buffer.alloc(MAX_FILE_BYTES)]);
      expect((await upload(traveler, c, [{ buf: big, name: 'big.png', type: 'image/png' }])).status).toBe(413);
      const many = Array.from({ length: 11 }, (_, i) => ({ buf: PNG, name: `${i}.png`, type: 'image/png' }));
      expect((await upload(traveler, c, many)).status).toBe(400);
      expect((await h.req('post', `/messages/conversations/${c}/attachments`, traveler.accessToken)).status).toBe(400);
      expect((await upload(outsider, c, [{ buf: PNG, name: 'a.png', type: 'image/png' }])).status).toBe(403);
    });
  });

  describe('sending IMAGE and FILE', () => {
    it('stores attachments on the message', async () => {
      const { traveler, c } = await setup();
      const res = await send(traveler, c, { type: 'IMAGE', content: 'caption', attachments: [att(1), att(2)] });
      expect(res.status).toBe(201);
      expect(res.body.attachments).toHaveLength(2);
      expect(res.body.attachments[0]).toMatchObject({ url: 'https://storage.test/chat/1.png', mimeType: 'image/png' });
      const file = await send(traveler, c, { type: 'FILE', attachments: [att(3, 'application/pdf', 'a.pdf')] });
      expect(file.body).toMatchObject({ type: 'FILE', content: '' });
    });

    it('rejects foreign urls, wrong mime for the type, empty and oversized attachment lists', async () => {
      const { traveler, c } = await setup();
      expect((await send(traveler, c, { type: 'IMAGE', attachments: [{ ...att(1), url: 'https://evil.example/x.png' }] })).status).toBe(400);
      expect((await send(traveler, c, { type: 'IMAGE', attachments: [att(1, 'application/pdf')] })).status).toBe(400);
      expect((await send(traveler, c, { type: 'FILE', attachments: [att(1, 'image/png')] })).status).toBe(400);
      expect((await send(traveler, c, { type: 'FILE', attachments: [] })).status).toBe(400);
      expect((await send(traveler, c, { type: 'IMAGE', attachments: Array.from({ length: 11 }, (_, i) => att(i + 1)) })).status).toBe(400);
    });
  });

  describe('shared history', () => {
    async function seed() {
      const ctx = await setup();
      const { traveler, provider, c } = ctx;
      const listing = await h.prisma.listing.create({
        data: { title: 'Lều', description: 'd', price: 1, location: 'ĐL', category: 'CAMPING_TREKKING', imageUrls: [], status: ListingStatus.ACTIVE, providerId: provider.userId },
      });
      const img1 = (await send(traveler, c, { type: 'IMAGE', attachments: [att(1), att(2)] })).body;
      const file = (await send(provider, c, { type: 'FILE', attachments: [att(3, 'application/pdf', 'a.pdf')] })).body;
      const img2 = (await send(traveler, c, { type: 'IMAGE', attachments: [att(4)] })).body;
      const link = (await send(traveler, c, { type: 'TEXT', content: `xem http://localhost:3000/listings/${listing.id} và https://example.com/a` })).body;
      return { ...ctx, listing, img1, file, img2, link };
    }
    const shared = (u: U, c: string, qs: string) => h.req('get', `/messages/conversations/${c}/shared?${qs}`, u.accessToken);

    it('lists media newest-first, flattened per attachment, with cursor paging', async () => {
      const { provider, c, img1, img2 } = await seed();
      const p1 = (await shared(provider, c, 'kind=media&limit=2')).body;
      expect(p1.items.map((i: { url: string }) => i.url)).toEqual(['https://storage.test/chat/4.png', 'https://storage.test/chat/2.png']);
      expect(p1.items[0]).toMatchObject({ messageId: img2.id, name: 'p4.png', mimeType: 'image/png', size: 100 });
      const p2 = (await shared(provider, c, `kind=media&limit=2&cursor=${p1.nextCursor}`)).body;
      expect(p2.items).toHaveLength(1);
      expect(p2.items[0]).toMatchObject({ messageId: img1.id, url: 'https://storage.test/chat/1.png' });
      expect(p2.nextCursor).toBeNull();
    });

    it('lists files and links (with a listing preview for internal links)', async () => {
      const { provider, c, file, link, listing } = await seed();
      const files = (await shared(provider, c, 'kind=files')).body.items;
      expect(files).toHaveLength(1);
      expect(files[0]).toMatchObject({ messageId: file.id, name: 'a.pdf' });
      const links = (await shared(provider, c, 'kind=links')).body.items;
      expect(links).toHaveLength(2);
      expect(links.every((l: { messageId: string }) => l.messageId === link.id)).toBe(true);
      const internal = links.find((l: { url: string }) => l.url.includes('/listings/'));
      expect(internal.listingPreview).toMatchObject({ id: listing.id, title: 'Lều' });
      expect(links.find((l: { url: string }) => l.url === 'https://example.com/a').listingPreview).toBeNull();
    });

    it('drops recalled messages from every tab', async () => {
      const { traveler, provider, c, img2, link } = await seed();
      await h.req('delete', `/messages/${img2.id}`, traveler.accessToken);
      await h.req('delete', `/messages/${link.id}`, traveler.accessToken);
      const media = (await shared(provider, c, 'kind=media')).body.items;
      expect(media.map((i: { url: string }) => i.url)).toEqual(['https://storage.test/chat/2.png', 'https://storage.test/chat/1.png']);
      expect((await shared(provider, c, 'kind=links')).body.items).toEqual([]);
    });

    it('rejects non-members and unknown kinds', async () => {
      const { c, traveler } = await seed();
      const outsider = await h.createUser('o@example.com', [Role.TRAVELER]);
      expect((await shared(outsider, c, 'kind=media')).status).toBe(403);
      expect((await shared(traveler, c, 'kind=videos')).status).toBe(400);
    });
  });
});
