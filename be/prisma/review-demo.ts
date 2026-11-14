/**
 * Dữ liệu demo để test thủ công nghiệp vụ đánh giá (REVIEW-01..04).
 *
 *   npm run seed:review-demo      tạo (hoặc làm mới) dữ liệu demo
 *   npm run cleanup:review-demo   xóa toàn bộ dữ liệu demo
 *
 * Chỉ chạy trên DB local. Chạy lại seed sẽ xóa dữ liệu demo cũ rồi tạo lại,
 * nên dùng được để "reset" các kịch bản sau khi đã thử (vd. đã hết lượt sửa).
 * Script chỉ đụng tới 2 tài khoản demo bên dưới và dữ liệu gắn với chúng.
 */
import {
  BookingStatus,
  ListingStatus,
  Prisma,
  PrismaClient,
  ReviewStatus,
  Role,
  ShopCategory,
  UserStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const TRAVELER_EMAIL = 'demo-traveler@flextrip.dev';
const PROVIDER_EMAIL = 'demo-provider@flextrip.dev';
const PASSWORD = 'Demo@123456';
const LISTING_TITLE = '[DEMO] Lều cắm trại 4 người';
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const ago = (ms: number) => new Date(Date.now() - ms);

function assertLocalDatabase() {
  if (process.env.NODE_ENV === 'production')
    throw new Error('Không chạy script demo trong production.');
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('Thiếu DATABASE_URL.');
  const host = new URL(url).hostname;
  if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(host))
    throw new Error(`DATABASE_URL trỏ tới "${host}", chỉ cho phép DB local.`);
}

async function removeDemoData(): Promise<number> {
  const users = await prisma.user.findMany({
    where: { email: { in: [TRAVELER_EMAIL, PROVIDER_EMAIL] } },
    select: { id: true },
  });
  const userIds = users.map((user) => user.id);
  if (!userIds.length) return 0;

  await prisma.$transaction(async (tx) => {
    const listings = await tx.listing.findMany({
      where: { providerId: { in: userIds } },
      select: { id: true },
    });
    const listingIds = listings.map((listing) => listing.id);
    const bookings = await tx.booking.findMany({
      where: {
        OR: [
          { travelerId: { in: userIds } },
          { listingId: { in: listingIds } },
        ],
      },
      select: { id: true },
    });
    const bookingIds = bookings.map((booking) => booking.id);
    const reviews = await tx.review.findMany({
      where: {
        OR: [
          { authorId: { in: userIds } },
          { targetId: { in: userIds } },
          { listingId: { in: listingIds } },
        ],
      },
      select: { id: true },
    });
    const reviewIds = reviews.map((review) => review.id);

    await tx.reviewReport.deleteMany({
      where: {
        OR: [
          { reviewId: { in: reviewIds } },
          { reporterId: { in: userIds } },
        ],
      },
    });
    await tx.notification.deleteMany({ where: { userId: { in: userIds } } });
    await tx.review.deleteMany({ where: { id: { in: reviewIds } } });

    await tx.payment.deleteMany({ where: { bookingId: { in: bookingIds } } });
    await tx.contract.deleteMany({ where: { bookingId: { in: bookingIds } } });
    await tx.bookingModifyRequest.deleteMany({
      where: { bookingId: { in: bookingIds } },
    });
    await tx.cartItem.deleteMany({ where: { listingId: { in: listingIds } } });
    await tx.wishlist.deleteMany({
      where: {
        OR: [{ userId: { in: userIds } }, { listingId: { in: listingIds } }],
      },
    });
    await tx.listingAvailability.deleteMany({
      where: { listingId: { in: listingIds } },
    });
    await tx.listingFlag.deleteMany({
      where: { listingId: { in: listingIds } },
    });
    await tx.priceHistory.deleteMany({
      where: { listingId: { in: listingIds } },
    });
    await tx.searchHistory.deleteMany({ where: { userId: { in: userIds } } });
    await tx.authSession.deleteMany({ where: { userId: { in: userIds } } });

    await tx.booking.deleteMany({ where: { id: { in: bookingIds } } });
    await tx.listing.deleteMany({ where: { id: { in: listingIds } } });
    await tx.providerProfile.deleteMany({ where: { userId: { in: userIds } } });
    await tx.userRole.deleteMany({ where: { userId: { in: userIds } } });
    await tx.user.deleteMany({ where: { id: { in: userIds } } });
  });
  return userIds.length;
}

async function createUser(email: string, name: string, role: Role) {
  return prisma.user.create({
    data: {
      email,
      name,
      password: await bcrypt.hash(PASSWORD, 10),
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      roles: { create: [{ role }] },
    },
  });
}

async function seed() {
  const traveler = await createUser(TRAVELER_EMAIL, 'Demo Traveler', Role.TRAVELER);
  const provider = await createUser(PROVIDER_EMAIL, 'Demo Provider', Role.PROVIDER);
  await prisma.providerProfile.create({
    data: {
      userId: provider.id,
      shopName: 'Demo Outdoor Shop',
      ownerName: provider.name,
      category: ShopCategory.OTHER,
      pickupAddress: 'Quận 1, TP.HCM',
    },
  });
  const listing = await prisma.listing.create({
    data: {
      title: LISTING_TITLE,
      description: 'Listing dùng để test đánh giá. Có thể xóa bằng npm run cleanup:review-demo.',
      price: new Prisma.Decimal(150000),
      location: 'Quận 1, TP.HCM',
      category: 'TREKKING',
      imageUrls: ['https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800'],
      amenities: [],
      status: ListingStatus.ACTIVE,
      providerId: provider.id,
    },
  });

  /** Booking đã hoàn thành, ngày trả đồ cách đây `endedDaysAgo` ngày. */
  const booking = async (endedDaysAgo: number, note: string) => {
    const end = ago(endedDaysAgo * DAY);
    return prisma.booking.create({
      data: {
        travelerId: traveler.id,
        listingId: listing.id,
        status: BookingStatus.COMPLETED,
        startDate: new Date(end.getTime() - 2 * DAY),
        endDate: end,
        totalPrice: new Prisma.Decimal(300000),
        depositAmount: new Prisma.Decimal(0),
        quantity: 1,
        notes: `[REVIEW_DEMO] ${note}`,
      },
    });
  };

  // Review cũ hơn 24 giờ để không kích hoạt tín hiệu "gửi dồn dập" khi bạn gửi review mới,
  // nhưng vẫn còn trong 48 giờ để thử chức năng sửa.
  const review = (
    bookingId: string | null,
    status: ReviewStatus,
    rating: number,
    comment: string,
    extra: Partial<Prisma.ReviewUncheckedCreateInput> = {},
  ) =>
    prisma.review.create({
      data: {
        authorId: traveler.id,
        targetId: provider.id,
        listingId: listing.id,
        bookingId,
        rating,
        comment,
        status,
        sentiment: rating >= 4 ? 'POSITIVE' : rating <= 2 ? 'NEGATIVE' : 'NEUTRAL',
        createdAt: ago(26 * HOUR),
        // Review đã đăng được coi là đã qua AI, nếu không bộ quét sẽ gửi chúng đi phân tích lại.
        ...(status === ReviewStatus.PUBLISHED
          ? { moderatedAt: ago(26 * HOUR), moderationSource: 'AI' as const }
          : {}),
        ...extra,
      },
    });

  // ── Booking chưa có review: test gửi đánh giá, hạn đánh giá, nhắc đánh giá, gian lận ──
  const fresh = [] as string[];
  for (const label of ['A', 'B', 'C', 'D'])
    fresh.push((await booking(1, `Chưa đánh giá ${label}`)).id);
  const reminder = await booking(4, 'Chưa đánh giá, đủ 3 ngày để nhận nhắc');
  const expired = await booking(40, 'Chưa đánh giá, đã quá hạn 30 ngày');

  // ── Review của traveler ở từng trạng thái: test sửa 1 lần và khiếu nại ──
  const published = await review(
    (await booking(3, 'Review đã công khai')).id,
    ReviewStatus.PUBLISHED,
    5,
    'Lều chắc chắn, chủ shop giao đúng giờ và hỗ trợ nhiệt tình.',
  );
  const rejected = await review(
    (await booking(3, 'Review bị từ chối, chưa khiếu nại')).id,
    ReviewStatus.REJECTED,
    1,
    'Dịch vụ rất tệ, mọi người đừng nên thuê ở đây nữa nhé.',
    {
      moderationSource: 'ADMIN',
      moderationNote: 'Nội dung có dấu hiệu spam.',
      moderatedAt: new Date(),
    },
  );
  const appealed = await review(
    (await booking(3, 'Review đã khiếu nại, chờ admin')).id,
    ReviewStatus.FLAGGED,
    2,
    'Lều bị rách một góc, mình phải tự vá lại mới dùng được.',
    {
      moderationSource: 'ADMIN',
      moderationNote: 'Nội dung có dấu hiệu spam.',
      appealedAt: new Date(),
      appealNote: 'Tôi đã thuê thật và có hóa đơn, nội dung phản ánh đúng trải nghiệm.',
    },
  );
  const finalRejected = await review(
    (await booking(3, 'Review khiếu nại không được chấp nhận')).id,
    ReviewStatus.REJECTED,
    1,
    'Nội dung này đã bị từ chối sau khi khiếu nại, không thể khiếu nại lần hai.',
    {
      moderationSource: 'ADMIN',
      moderationNote: 'Nội dung xúc phạm.',
      moderatedAt: ago(DAY),
      appealedAt: ago(DAY),
      appealNote: 'Xin xem xét lại giúp tôi.',
    },
  );
  const edited = await review(
    (await booking(3, 'Review đã sửa một lần')).id,
    ReviewStatus.PUBLISHED,
    4,
    'Sau khi dùng thêm một đêm, mình thấy lều rất ổn, chỉ hơi nặng.',
    { editedAt: new Date() },
  );

  // ── Review gửi tới Provider (không gắn booking): test phản hồi, báo cáo, admin xử lý báo cáo ──
  const unanswered = await review(null, ReviewStatus.PUBLISHED, 2, 'Giao hàng trễ nửa tiếng và nhân viên không nhiệt tình lắm.');
  const reported = await review(null, ReviewStatus.PUBLISHED, 1, 'Chủ shop lừa đảo, tôi chưa từng thuê nhưng muốn chia sẻ cho mọi người.');
  await prisma.reviewReport.create({
    data: {
      reviewId: reported.id,
      reporterId: provider.id,
      reason: 'FAKE_REVIEW',
      details: 'Người này chưa từng thuê sản phẩm của shop.',
    },
  });
  const replyLimit = await review(null, ReviewStatus.PUBLISHED, 3, 'Lều ổn nhưng hơi nặng, mong shop có thêm lựa chọn nhẹ hơn.', {
    response: 'Cảm ơn bạn đã góp ý, chúng tôi sẽ cải thiện.',
    respondedAt: ago(2 * HOUR),
    responseEdits: 2,
  });

  // Đã đăng nhưng AI gắn nhãn đáng ngờ (sao mâu thuẫn nội dung): hiện ở bộ lọc "Đã đăng, cần xem lại" của admin.
  const suspicious = await review(null, ReviewStatus.PUBLISHED, 5, 'Sản phẩm rất tệ, bị hỏng và không giống mô tả.', {
    sentiment: 'NEGATIVE',
    suspicionScore: 80,
    analysisReasons: ['[RULE] Số sao và nội dung đánh giá có dấu hiệu mâu thuẫn.'],
  });

  const stats = await prisma.review.aggregate({
    where: { targetId: provider.id, status: ReviewStatus.PUBLISHED },
    _avg: { rating: true },
    _count: { _all: true },
  });
  await prisma.providerProfile.update({
    where: { userId: provider.id },
    data: { ratingAvg: stats._avg.rating ?? 0, reviewsCount: stats._count._all },
  });

  console.log('\nĐã tạo dữ liệu demo đánh giá.\n');
  console.log(`Traveler : ${TRAVELER_EMAIL} / ${PASSWORD}`);
  console.log(`Provider : ${PROVIDER_EMAIL} / ${PASSWORD}`);
  console.log('Admin    : dùng tài khoản admin có sẵn của bạn\n');
  console.table([
    { kịch_bản: 'Gửi review mới (A, B, C, D)', bookingId: fresh.join('  ') },
    { kịch_bản: 'Nhắc đánh giá (4 ngày)', bookingId: reminder.id },
    { kịch_bản: 'Quá hạn đánh giá (40 ngày)', bookingId: expired.id },
    { kịch_bản: 'Review công khai: sửa 1 lần', bookingId: published.bookingId },
    { kịch_bản: 'Review bị từ chối: sửa / khiếu nại', bookingId: rejected.bookingId },
    { kịch_bản: 'Review đã khiếu nại (admin xem)', bookingId: appealed.bookingId },
    { kịch_bản: 'Khiếu nại bị từ chối (cuối cùng)', bookingId: finalRejected.bookingId },
    { kịch_bản: 'Review đã sửa 1 lần', bookingId: edited.bookingId },
  ]);
  console.table([
    { kịch_bản: 'Provider chưa phản hồi / báo cáo', reviewId: unanswered.id },
    { kịch_bản: 'Có báo cáo đang mở (admin xử lý)', reviewId: reported.id },
    { kịch_bản: 'Phản hồi đã hết lượt sửa', reviewId: replyLimit.id },
    { kịch_bản: 'Đã đăng, AI gắn nhãn cần xem lại', reviewId: suspicious.id },
  ]);
  console.log(`Mở booking tại: http://localhost:3000/bookings/<bookingId>`);
}

async function main() {
  assertLocalDatabase();
  const removed = await removeDemoData();
  if (process.argv.includes('--cleanup')) {
    console.log(
      removed
        ? 'Đã xóa dữ liệu demo đánh giá.'
        : 'Không có dữ liệu demo để xóa.',
    );
    return;
  }
  if (removed) console.log('Đã xóa dữ liệu demo cũ, tạo lại từ đầu.');
  await seed();
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Không thể chạy script demo: ${message}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
