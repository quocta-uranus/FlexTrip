import {
  NotificationType,
  Prisma,
  PrismaClient,
  ReviewStatus,
} from '@prisma/client';

const prisma = new PrismaClient();
const MARKER_NAME = 'REVIEW_TEST_SEED';

function argument(name: string): string | undefined {
  const prefix = `--${name}=`;
  const inline = process.argv.find((value) => value.startsWith(prefix));
  if (inline) return inline.slice(prefix.length).trim();

  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1]?.trim() : undefined;
}

function notificationReviewId(data: Prisma.JsonValue | null): string | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const reviewId = (data as Prisma.JsonObject).reviewId;
  return typeof reviewId === 'string' ? reviewId : null;
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Không được cleanup booking review trong production.');
  }

  const email = argument('email')?.toLowerCase();
  if (!email) {
    throw new Error(
      'Thiếu email. Ví dụ: npm run cleanup:review-bookings -- --email="traveler@example.com"',
    );
  }

  const traveler = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true },
  });
  if (!traveler) throw new Error(`Không tìm thấy tài khoản ${email}.`);

  const markerPrefix = `[${MARKER_NAME}:${traveler.id}:`;
  const bookings = await prisma.booking.findMany({
    where: {
      travelerId: traveler.id,
      notes: { startsWith: markerPrefix },
    },
    select: {
      id: true,
      review: { select: { id: true, targetId: true } },
    },
  });

  if (bookings.length === 0) {
    console.log(
      `Không còn booking mẫu Review của ${traveler.name} (${traveler.email}).`,
    );
    return;
  }

  const bookingIds = bookings.map(({ id }) => id);
  const reviews = bookings.flatMap(({ review }) => (review ? [review] : []));
  const reviewIds = reviews.map(({ id }) => id);
  const providerIds = [...new Set(reviews.map(({ targetId }) => targetId))];

  const [paymentCount, auditCount, reviewNotifications] = await Promise.all([
    prisma.payment.count({ where: { bookingId: { in: bookingIds } } }),
    reviewIds.length
      ? prisma.auditLog.count({ where: { entityId: { in: reviewIds } } })
      : 0,
    reviewIds.length
      ? prisma.notification.findMany({
          where: { type: NotificationType.REVIEW },
          select: { id: true, data: true },
        })
      : [],
  ]);
  const reviewIdSet = new Set(reviewIds);
  const notificationIds = reviewNotifications
    .filter(({ data }) => {
      const reviewId = notificationReviewId(data);
      return reviewId !== null && reviewIdSet.has(reviewId);
    })
    .map(({ id }) => id);

  console.table({
    booking: bookings.length,
    review: reviewIds.length,
    payment: paymentCount,
    notification: notificationIds.length,
    audit: auditCount,
  });

  const deleted = await prisma.$transaction(async (tx) => {
    const notifications = notificationIds.length
      ? await tx.notification.deleteMany({
          where: { id: { in: notificationIds } },
        })
      : { count: 0 };
    const audits = reviewIds.length
      ? await tx.auditLog.deleteMany({
          where: { entityId: { in: reviewIds } },
        })
      : { count: 0 };
    const deletedReviews = reviewIds.length
      ? await tx.review.deleteMany({ where: { id: { in: reviewIds } } })
      : { count: 0 };
    const payments = await tx.payment.deleteMany({
      where: { bookingId: { in: bookingIds } },
    });
    const deletedBookings = await tx.booking.deleteMany({
      where: {
        id: { in: bookingIds },
        travelerId: traveler.id,
        notes: { startsWith: markerPrefix },
      },
    });

    for (const providerId of providerIds) {
      const aggregate = await tx.review.aggregate({
        where: { targetId: providerId, status: ReviewStatus.PUBLISHED },
        _avg: { rating: true },
        _count: { _all: true },
      });
      await tx.providerProfile.updateMany({
        where: { userId: providerId },
        data: {
          ratingAvg: aggregate._avg.rating ?? 0,
          reviewsCount: aggregate._count._all,
        },
      });
    }

    return {
      booking: deletedBookings.count,
      review: deletedReviews.count,
      payment: payments.count,
      notification: notifications.count,
      audit: audits.count,
    };
  });

  console.log(
    `Đã xóa dữ liệu booking mẫu Review của ${traveler.name} (${traveler.email}).`,
  );
  console.table(deleted);
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Không thể cleanup booking review: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
