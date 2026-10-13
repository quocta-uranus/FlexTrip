// @ts-nocheck
import 'reflect-metadata';
import { jest } from '@jest/globals';
import { PrismaClient, BookingStatus, DeliveryMethod, ListingStatus, Role } from '@prisma/client';
import { AvailabilityService } from '../availability.service';
import { CartService } from '../../cart/cart.service';
import { BookingService } from '../../booking/booking.service';
import { ListingsService } from '../../listings/listings.service';

const TEST_DB_URL = 'postgresql://flextrip:flextrip@localhost:5433/flextrip_auth01_test?schema=public';

describe('Real PostgreSQL Concurrency & Overbooking Protection', () => {
  let prisma: PrismaClient;
  let availabilitySvc: AvailabilityService;
  let cartSvc: CartService;
  let bookingSvc: BookingService;
  let listingsSvc: ListingsService;

  let testProviderId: string;
  let traveler1Id: string;
  let traveler2Id: string;
  let testListing1Id: string; // qty = 1
  let testListingMultiId: string; // qty = 3

  const mockQueue = {
    add: jest.fn().mockResolvedValue({ id: 'job-1' }),
    remove: jest.fn().mockResolvedValue(true),
  };

  const mockContractsSvc = {
    generate: jest.fn().mockResolvedValue({ id: 'contract-1' }),
    providerSign: jest.fn().mockResolvedValue({ id: 'contract-1' }),
  };

  beforeAll(async () => {
    prisma = new PrismaClient({
      datasources: { db: { url: TEST_DB_URL } },
    });

    availabilitySvc = new AvailabilityService(prisma as any);
    cartSvc = new CartService(prisma as any, availabilitySvc);
    bookingSvc = new BookingService(
      prisma as any,
      availabilitySvc,
      mockContractsSvc as any,
      mockQueue as any,
    );
    listingsSvc = new ListingsService(
      prisma as any,
      { get: () => '' } as any,
    );

    // Setup base users in test DB
    const ts = Date.now();
    const provider = await prisma.user.create({
      data: {
        id: 'provider-' + ts,
        email: 'provider-' + ts + '@test.local',
        password: 'hashedpassword',
        name: 'Test Provider',
      },
    });
    testProviderId = provider.id;

    const t1 = await prisma.user.create({
      data: {
        id: 'traveler1-' + ts,
        email: 'traveler1-' + ts + '@test.local',
        password: 'hashedpassword',
        name: 'Traveler One',
      },
    });
    traveler1Id = t1.id;

    const t2 = await prisma.user.create({
      data: {
        id: 'traveler2-' + ts,
        email: 'traveler2-' + ts + '@test.local',
        password: 'hashedpassword',
        name: 'Traveler Two',
      },
    });
    traveler2Id = t2.id;

    // Setup test listings
    const l1 = await prisma.listing.create({
      data: {
        id: 'listing-single-' + ts,
        title: 'Single Item Listing (Qty = 1)',
        description: 'Test single inventory',
        price: 100000,
        currency: 'VND',
        location: 'Da Nang',
        category: 'CAMPING',
        status: ListingStatus.ACTIVE,
        providerId: testProviderId,
        quantity: 1,
        minRentalDays: 1,
      },
    });
    testListing1Id = l1.id;

    const lMulti = await prisma.listing.create({
      data: {
        id: 'listing-multi-' + ts,
        title: 'Multi Item Listing (Qty = 3)',
        description: 'Test multi inventory',
        price: 200000,
        currency: 'VND',
        location: 'Da Nang',
        category: 'CAMPING',
        status: ListingStatus.ACTIVE,
        providerId: testProviderId,
        quantity: 3,
        minRentalDays: 1,
      },
    });
    testListingMultiId = lMulti.id;
  }, 30000);

  afterAll(async () => {
    // Clean up created test data in test db
    try {
      await prisma.cartItem.deleteMany({
        where: { listingId: { in: [testListing1Id, testListingMultiId] } },
      });
      await prisma.cart.deleteMany({
        where: { travelerId: { in: [traveler1Id, traveler2Id] } },
      });
      await prisma.payment.deleteMany({
        where: { booking: { listingId: { in: [testListing1Id, testListingMultiId] } } },
      });
      await prisma.booking.deleteMany({
        where: { listingId: { in: [testListing1Id, testListingMultiId] } },
      });
      await prisma.listing.deleteMany({
        where: { id: { in: [testListing1Id, testListingMultiId] } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [testProviderId, traveler1Id, traveler2Id] } },
      });
    } catch (e) {
      // ignore cleanup errors
    }
    await prisma.$disconnect();
  });

  describe('1. Hai khách cùng thêm vào giỏ khi quantity = 1 (Cart Concurrency)', () => {
    it('chính xác 1 request thành công, 1 request thất bại INSUFFICIENT_STOCK', async () => {
      const dates = {
        listingId: testListing1Id,
        startDate: '2026-12-01',
        endDate: '2026-12-05',
        quantity: 1,
      };

      const results = await Promise.allSettled([
        cartSvc.addItem(traveler1Id, dates),
        cartSvc.addItem(traveler2Id, dates),
      ]);

      const successes = results.filter((r) => r.status === 'fulfilled');
      const failures = results.filter((r) => r.status === 'rejected');

      expect(successes.length).toBe(1);
      expect(failures.length).toBe(1);
      expect((failures[0] as PromiseRejectedResult).reason.message).toContain('Không đủ số lượng');

      // Dọn cart items sau test
      await prisma.cartItem.deleteMany({ where: { listingId: testListing1Id } });
    });
  });

  describe('2. Hai khách đặt trực tiếp đồng thời khi quantity = 1 (Direct Booking Concurrency)', () => {
    it('chính xác 1 booking thành công, 1 booking bị từ chối INSUFFICIENT_STOCK', async () => {
      const dto = {
        listingId: testListing1Id,
        startDate: '2026-12-10',
        endDate: '2026-12-12',
        quantity: 1,
      };

      const results = await Promise.allSettled([
        bookingSvc.create(traveler1Id, dto),
        bookingSvc.create(traveler2Id, dto),
      ]);

      const successes = results.filter((r) => r.status === 'fulfilled');
      const failures = results.filter((r) => r.status === 'rejected');

      expect(successes.length).toBe(1);
      expect(failures.length).toBe(1);
      expect((failures[0] as PromiseRejectedResult).reason.message).toContain('Không đủ số lượng');

      // Dọn bookings sau test
      await prisma.booking.deleteMany({ where: { listingId: testListing1Id } });
    });
  });

  describe('3. Listing quantity > 1 với nhiều request giao nhau (Multi-quantity Concurrency)', () => {
    it('Listing qty = 3: Hai khách cùng yêu cầu 2 chiếc -> 1 thành công (còn 1), 1 thất bại (2 > 1)', async () => {
      const dto = {
        listingId: testListingMultiId,
        startDate: '2026-12-15',
        endDate: '2026-12-18',
        quantity: 2,
      };

      const results = await Promise.allSettled([
        bookingSvc.create(traveler1Id, dto),
        bookingSvc.create(traveler2Id, dto),
      ]);

      const successes = results.filter((r) => r.status === 'fulfilled');
      const failures = results.filter((r) => r.status === 'rejected');

      expect(successes.length).toBe(1);
      expect(failures.length).toBe(1);
      expect((failures[0] as PromiseRejectedResult).reason.message).toContain('Không đủ số lượng');

      // Clean up
      await prisma.booking.deleteMany({ where: { listingId: testListingMultiId } });
    });
  });

  describe('4. Cart hold của chính khách không bị tính trùng khi Checkout', () => {
    it('Traveler thêm vào giỏ rồi checkout thành công không bị tự chặn chính mình', async () => {
      const item = await cartSvc.addItem(traveler1Id, {
        listingId: testListing1Id,
        startDate: '2026-12-20',
        endDate: '2026-12-22',
        quantity: 1,
      });
      expect(item.id).toBeDefined();

      const checkoutRes = await cartSvc.checkout(traveler1Id, {
        paymentMethod: 'VNPAY',
      });

      expect(checkoutRes.bookings.length).toBe(1);
      expect(checkoutRes.bookings[0].status).toBe(BookingStatus.PENDING_APPROVAL);

      // Clean up
      await prisma.payment.deleteMany({ where: { booking: { listingId: testListing1Id } } });
      await prisma.booking.deleteMany({ where: { listingId: testListing1Id } });
    });
  });

  describe('5. PENDING_PAYMENT còn hạn vs hết hạn chiếm tồn kho', () => {
    it('PENDING_PAYMENT còn hạn chiếm tồn kho -> checkAvailability trả về false', async () => {
      const booking = await prisma.booking.create({
        data: {
          travelerId: traveler1Id,
          listingId: testListing1Id,
          startDate: new Date('2026-12-25'),
          endDate: new Date('2026-12-26'),
          quantity: 1,
          totalPrice: 200000,
          status: BookingStatus.PENDING_PAYMENT,
          holdExpiresAt: new Date(Date.now() + 15 * 60_000), // còn hạn 15 phút
        },
      });

      const check = await availabilitySvc.checkAvailability(
        testListing1Id,
        new Date('2026-12-25'),
        new Date('2026-12-26'),
        1,
      );

      expect(check.available).toBe(false);
      expect(check.reason).toBe('INSUFFICIENT_STOCK');

      // Cập nhật booking sang hết hạn (holdExpiresAt trong quá khứ)
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          holdExpiresAt: new Date(Date.now() - 5 * 60_000), // đã hết hạn 5 phút trước
        },
      });

      const checkExpired = await availabilitySvc.checkAvailability(
        testListing1Id,
        new Date('2026-12-25'),
        new Date('2026-12-26'),
        1,
      );

      expect(checkExpired.available).toBe(true);

      // Clean up
      await prisma.booking.delete({ where: { id: booking.id } });
    });
  });

  describe('6. Thanh toán đến sau khi hold hết hạn bị từ chối', () => {
    it('confirmPayment ném lỗi khi holdExpiresAt < now()', async () => {
      const booking = await prisma.booking.create({
        data: {
          travelerId: traveler1Id,
          listingId: testListing1Id,
          startDate: new Date('2026-12-28'),
          endDate: new Date('2026-12-29'),
          quantity: 1,
          totalPrice: 200000,
          status: BookingStatus.PENDING_PAYMENT,
          holdExpiresAt: new Date(Date.now() - 60_000), // đã hết hạn
        },
      });

      await expect(
        bookingSvc.confirmPayment(booking.id, traveler1Id, { method: 'VNPAY' }),
      ).rejects.toThrow('Thời gian giữ chỗ đã hết, vui lòng đặt lại');

      // Clean up
      await prisma.booking.delete({ where: { id: booking.id } });
    });
  });

  describe('7. Search CTE và checkAvailability nhất quán với PENDING_PAYMENT', () => {
    it('Search CTE loại bỏ listing khi có PENDING_PAYMENT còn hạn', async () => {
      const booking = await prisma.booking.create({
        data: {
          travelerId: traveler1Id,
          listingId: testListing1Id,
          startDate: new Date('2026-12-30'),
          endDate: new Date('2026-12-31'),
          quantity: 1,
          totalPrice: 200000,
          status: BookingStatus.PENDING_PAYMENT,
          holdExpiresAt: new Date(Date.now() + 10 * 60_000), // còn hạn
        },
      });

      // Search với ngày trùng
      const searchRes = await listingsSvc.findAll({
        dateFrom: '2026-12-30',
        dateTo: '2026-12-31',
      });

      const found = searchRes.items.some((i) => i.id === testListing1Id);
      expect(found).toBe(false);

      // Clean up
      await prisma.booking.delete({ where: { id: booking.id } });
    });
  });

  describe('8. Cart updateItem đồng thời bảo vệ tồn kho', () => {
    it('Listing qty = 3: T1 và T2 cùng giữ 1 chiếc, cùng update lên 2 chiếc -> 1 thành công (còn 1), 1 thất bại INSUFFICIENT_STOCK', async () => {
      // T1 và T2 thêm 1 chiếc vào giỏ (tổng 2 <= 3)
      const item1 = await cartSvc.addItem(traveler1Id, {
        listingId: testListingMultiId,
        startDate: '2026-12-10',
        endDate: '2026-12-12',
        quantity: 1,
      });
      const item2 = await cartSvc.addItem(traveler2Id, {
        listingId: testListingMultiId,
        startDate: '2026-12-10',
        endDate: '2026-12-12',
        quantity: 1,
      });

      // Cả 2 cùng đồng thời update lên 2 chiếc (tổng 4 > 3)
      const results = await Promise.allSettled([
        cartSvc.updateItem(traveler1Id, item1.id, { quantity: 2 }),
        cartSvc.updateItem(traveler2Id, item2.id, { quantity: 2 }),
      ]);

      const successes = results.filter((r) => r.status === 'fulfilled');
      const failures = results.filter((r) => r.status === 'rejected');

      expect(successes.length).toBe(1);
      expect(failures.length).toBe(1);
      expect((failures[0] as PromiseRejectedResult).reason.message).toContain('Không đủ số lượng');

      // Clean up
      await prisma.cartItem.deleteMany({ where: { listingId: testListingMultiId } });
    });
  });

  describe('9. Checkout nhiều Listing với sorted ID locking', () => {
    it('Giỏ hàng chứa 2 listings khác nhau checkout thành công và atomic', async () => {
      await cartSvc.addItem(traveler1Id, {
        listingId: testListing1Id,
        startDate: '2026-12-10',
        endDate: '2026-12-11',
        quantity: 1,
      });
      await cartSvc.addItem(traveler1Id, {
        listingId: testListingMultiId,
        startDate: '2026-12-10',
        endDate: '2026-12-11',
        quantity: 1,
      });

      const res = await cartSvc.checkout(traveler1Id, { paymentMethod: 'MOMO' });
      expect(res.bookings.length).toBe(2);

      // Clean up
      await prisma.payment.deleteMany({ where: { booking: { travelerId: traveler1Id } } });
      await prisma.booking.deleteMany({ where: { travelerId: traveler1Id } });
    });
  });
});
