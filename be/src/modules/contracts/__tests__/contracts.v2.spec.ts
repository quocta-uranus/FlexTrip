import { getQueueToken } from '@nestjs/bullmq';
import { ListingStatus, Role } from '@prisma/client';
import { BOOKING_QUEUE } from '../../booking/booking.constants';
import { ChatHarness } from '../../messages/__tests__/support/chat-harness';
import { hashContent } from '../contracts.document';
import { loadPresentedContract } from '../contracts.present';

type U = { userId: string; accessToken: string };

const png = (bytes = 3000) =>
  `data:image/png;base64,${Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(bytes, 9)]).toString('base64')}`;

describe('CONTRACT-LEGAL v2 signing', () => {
  const h = new ChatHarness();
  beforeAll(() => h.open((b) => b.overrideProvider(getQueueToken(BOOKING_QUEUE)).useValue({ add: async () => undefined, remove: async () => undefined, upsertJobScheduler: async () => undefined })));
  afterAll(() => h.close());
  beforeEach(async () => {
    await h.reset();
    delete process.env.CONTRACT_V2;
  });

  async function setup() {
    const traveler = await h.createUser('traveler@example.com', [Role.TRAVELER]);
    const provider = await h.createUser('provider@example.com', [Role.PROVIDER]);
    await h.prisma.user.update({ where: { id: traveler.userId }, data: { phone: '0987654321', address: '1 Lê Lợi, Huế' } });
    await h.prisma.providerProfile.create({
      data: { userId: provider.userId, shopName: 'Shop Lều', ownerName: 'Chủ Shop', category: 'CAMPING_TREKKING', pickupAddress: '12 Trần Phú, Đà Lạt', bankAccount: 'VCB 0011' },
    });
    const listing = await h.prisma.listing.create({
      data: {
        title: 'Lều 4 người', description: 'd', price: 150000, location: 'Đà Lạt', category: 'CAMPING', imageUrls: [],
        status: ListingStatus.ACTIVE, providerId: provider.userId, conditionNote: 'Mới 90%',
        penaltyRules: [{ item: 'Rách lều', description: 'Rách vải', minAmount: 100000, maxAmount: 300000 }],
      },
    });
    const book = () =>
      h.prisma.booking.create({
        data: {
          startDate: new Date('2026-11-20'), endDate: new Date('2026-11-22'), totalPrice: 450000, depositAmount: 135000,
          travelerId: traveler.userId, listingId: listing.id, status: 'PENDING_PAYMENT',
        },
      });
    return { traveler, provider, book };
  }

  const tSign = (u: U, id: string, body: object = {}) => h.req('post', `/contracts/booking/${id}/traveler-sign`, u.accessToken).send(body);
  const pSign = (u: U, id: string, body: object = {}) => h.req('patch', `/contracts/booking/${id}/provider-sign`, u.accessToken).send(body);
  const get = (u: U, id: string) => h.req('get', `/contracts/booking/${id}`, u.accessToken);

  it('creates a numbered v2 contract with a verifiable hash when the traveler signs', async () => {
    const { traveler, book } = await setup();
    const b = await book();
    expect((await tSign(traveler, b.id, { signatureImage: png() })).status).toBe(204);

    const row = await h.prisma.contract.findUniqueOrThrow({ where: { bookingId: b.id } });
    expect(row.templateVersion).toBe(2);
    expect(row.status).toBe('TRAVELER_SIGNED');
    expect(row.contractNo).toBe(`000001/${new Date().getUTCFullYear()}-HĐTB`);
    expect(hashContent(row.content)).toBe(row.contentHash);
    expect(row.terms).toContain('450.000 VNĐ (Bằng chữ: Bốn trăm năm mươi nghìn đồng)');
    expect(row.terms).toContain('Rách lều');
    expect(row.terms).toContain('12 Trần Phú, Đà Lạt');

    const res = await get(traveler, b.id);
    expect(res.status).toBe(200);
    expect(res.body.travelerSignature.image).toMatch(/^data:image\/png/);
    expect(res.body.travelerSignature.ip).toBeUndefined();
    expect(res.body.providerSignature).toBeNull();
    expect(res.body.appendices).toEqual([]);
  });

  it('numbers contracts sequentially and does not duplicate on a repeated sign', async () => {
    const { traveler, book } = await setup();
    const a = await book();
    const b = await book();
    await tSign(traveler, a.id, { signatureImage: png() });
    await tSign(traveler, a.id, { signatureImage: png() });
    await tSign(traveler, b.id, { signatureImage: png() });
    const nos = (await h.prisma.contract.findMany({ orderBy: { createdAt: 'asc' } })).map((c) => c.contractNo?.slice(0, 6));
    expect(nos).toEqual(['000001', '000002']);
  });

  it('rejects an invalid signature without creating a contract', async () => {
    const { traveler, book } = await setup();
    const b = await book();
    expect((await tSign(traveler, b.id, { signatureImage: 'data:image/png;base64,AAAA' })).status).toBe(400);
    expect(await h.prisma.contract.count()).toBe(0);
  });

  it('keeps the legacy text contract when no signature is sent or the flag is off', async () => {
    const { traveler, book } = await setup();
    const a = await book();
    await tSign(traveler, a.id);
    expect((await h.prisma.contract.findUniqueOrThrow({ where: { bookingId: a.id } })).templateVersion).toBe(1);

    process.env.CONTRACT_V2 = 'false';
    const b = await book();
    await tSign(traveler, b.id, { signatureImage: png() });
    expect((await h.prisma.contract.findUniqueOrThrow({ where: { bookingId: b.id } })).templateVersion).toBe(1);
  });

  it('requires the provider to sign by hand, then confirms the booking', async () => {
    const { traveler, provider, book } = await setup();
    const b = await book();
    await tSign(traveler, b.id, { signatureImage: png() });

    expect((await pSign(provider, b.id)).status).toBe(400);
    expect((await pSign(provider, b.id, { signatureImage: 'nope' })).status).toBe(400);
    expect((await pSign(provider, b.id, { signatureImage: png() })).status).toBe(204);

    const row = await h.prisma.contract.findUniqueOrThrow({ where: { bookingId: b.id }, include: { booking: true } });
    expect(row.status).toBe('SIGNED');
    expect(row.booking.status).toBe('CONFIRMED');
    expect((row.providerSignature as { hash: string }).hash).toBe(row.contentHash);
    expect((await get(provider, b.id)).body.providerSignature.image).toMatch(/^data:image\/png/);
    expect((await pSign(provider, b.id, { signatureImage: png() })).status).toBe(400);
  });

  it('refuses the provider signature when the content no longer matches what the traveler signed', async () => {
    const { traveler, provider, book } = await setup();
    const b = await book();
    await tSign(traveler, b.id, { signatureImage: png() });
    const row = await h.prisma.contract.findUniqueOrThrow({ where: { bookingId: b.id } });
    const tampered = JSON.parse(JSON.stringify(row.content));
    tampered.title = 'ĐÃ SỬA';
    await h.prisma.contract.update({ where: { bookingId: b.id }, data: { content: tampered } });
    expect((await pSign(provider, b.id, { signatureImage: png() })).status).toBe(409);
    expect((await h.prisma.contract.findUniqueOrThrow({ where: { bookingId: b.id } })).status).toBe('TRAVELER_SIGNED');
  });

  it('only lets the two parties read the contract, and the traveler preview it', async () => {
    const { traveler, provider, book } = await setup();
    const outsider = await h.createUser('o@example.com', [Role.TRAVELER]);
    const b = await book();

    const preview = await h.req('get', `/contracts/booking/${b.id}/preview`, traveler.accessToken);
    expect(preview.status).toBe(200);
    expect(preview.body.templateVersion).toBe(2);
    expect(preview.body.content.number).toBeNull();
    expect((await h.req('get', `/contracts/booking/${b.id}/preview`, outsider.accessToken)).status).toBe(403);

    await tSign(traveler, b.id, { signatureImage: png() });
    expect((await get(outsider, b.id)).status).toBe(403);
    expect((await get(provider, b.id)).status).toBe(200);
  });

  it('adds the handover and return appendices once the staff has recorded them', async () => {
    const { traveler, book } = await setup();
    const b = await book();
    await tSign(traveler, b.id, { signatureImage: png() });
    await h.prisma.booking.update({
      where: { id: b.id },
      data: { checkedInAt: new Date('2026-11-20T02:00:00Z'), handoverCondition: 'Kiểm tra:\n✓ Đúng thiết bị trong đơn thuê' },
    });
    await h.prisma.contract.update({ where: { bookingId: b.id }, data: { checkInPhotos: ['https://img.test/1.jpg'] } });
    const titles = (await get(traveler, b.id)).body.appendices.map((a: { title: string }) => a.title);
    expect(titles).toEqual(['PHỤ LỤC 1. BIÊN BẢN BÀN GIAO THIẾT BỊ']);
  });
  it('uses the rental location when the provider has no saved address (placeholder value)', async () => {
    const { traveler, provider, book } = await setup();
    await h.prisma.providerProfile.update({ where: { userId: provider.userId }, data: { pickupAddress: 'Chưa cập nhật' } });
    const b = await book();
    await tSign(traveler, b.id, { signatureImage: png() });
    const { terms } = await h.prisma.contract.findUniqueOrThrow({ where: { bookingId: b.id } });
    expect(terms).toContain('Địa chỉ: Đà Lạt');
    expect(terms).not.toContain('Chưa cập nhật');
    expect(terms).toContain('Nhận và trả tại: Đà Lạt');
  });

  it('presents the v2 contract to staff/admin without ip or user-agent, and skips legacy contracts', async () => {
    const { traveler, book } = await setup();
    const v2 = await book();
    const legacy = await book();
    await tSign(traveler, v2.id, { signatureImage: png() });
    await tSign(traveler, legacy.id);

    const shown = await loadPresentedContract(h.prisma as never, v2.id);
    expect(shown?.contractNo).toMatch(/^000001\//);
    expect(shown?.content).toBeTruthy();
    expect(shown?.travelerSignature).toEqual({ image: expect.stringMatching(/^data:image\/png/), signedAt: expect.any(String), hash: expect.any(String) });
    expect(JSON.stringify(shown)).not.toContain('userAgent');
    expect(await loadPresentedContract(h.prisma as never, legacy.id)).toBeNull();
  });
});
