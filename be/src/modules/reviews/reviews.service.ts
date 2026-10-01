import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingStatus,
  NotificationType,
  Prisma,
  ReviewStatus,
} from '@prisma/client';
import { RequestContext } from '../../common/request-context';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateReviewDto, RespondToReviewDto } from './dto/review.dto';
import { moderateReviewWithRules } from './review-moderation.rules';

const PUBLIC_REVIEW_SELECT = {
  id: true,
  rating: true,
  comment: true,
  status: true,
  listingId: true,
  bookingId: true,
  response: true,
  respondedAt: true,
  createdAt: true,
  updatedAt: true,
  author: { select: { id: true, name: true, avatarUrl: true } },
} satisfies Prisma.ReviewSelect;

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(authorId: string, dto: CreateReviewDto) {
    const moderation = moderateReviewWithRules(dto.comment);
    const status = moderation.flagged
      ? ReviewStatus.FLAGGED
      : ReviewStatus.PUBLISHED;

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const booking = await tx.booking.findUnique({
            where: { id: dto.bookingId },
            select: {
              id: true,
              status: true,
              travelerId: true,
              listingId: true,
              review: { select: { id: true } },
              listing: { select: { providerId: true } },
            },
          });

          if (!booking) throw new NotFoundException('Booking không tồn tại');
          if (booking.travelerId !== authorId)
            throw new ForbiddenException(
              'Bạn chỉ có thể đánh giá booking của mình',
            );
          if (booking.status !== BookingStatus.COMPLETED)
            throw new ConflictException({
              code: 'BOOKING_NOT_COMPLETED',
              message: 'Chỉ booking đã hoàn thành mới được đánh giá.',
            });
          if (booking.review)
            throw new ConflictException({
              code: 'REVIEW_ALREADY_EXISTS',
              message: 'Booking này đã được đánh giá.',
            });

          const review = await tx.review.create({
            data: {
              bookingId: booking.id,
              listingId: booking.listingId,
              authorId,
              targetId: booking.listing.providerId,
              rating: dto.rating,
              comment: dto.comment,
              status,
              moderationNote: moderation.flagged
                ? moderation.reasons.join(',')
                : null,
            },
            select: PUBLIC_REVIEW_SELECT,
          });

          if (status === ReviewStatus.PUBLISHED) {
            await this.refreshProviderRating(tx, booking.listing.providerId);
          }

          return review;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      ) {
        const existing = await this.prisma.review.findUnique({
          where: { bookingId: dto.bookingId },
          select: { id: true },
        });
        if (!existing) throw error;
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ['P2002', 'P2034'].includes(error.code)
      ) {
        throw new ConflictException({
          code: 'REVIEW_ALREADY_EXISTS',
          message: 'Booking này đã được đánh giá.',
        });
      }
      throw error;
    }
  }

  findMine(authorId: string) {
    return this.prisma.review.findMany({
      where: { authorId },
      orderBy: { createdAt: 'desc' },
      select: {
        ...PUBLIC_REVIEW_SELECT,
        listing: { select: { id: true, title: true, imageUrls: true } },
        target: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
  }

  findPublishedForListing(listingId: string) {
    return this.prisma.review.findMany({
      where: { listingId, status: ReviewStatus.PUBLISHED },
      orderBy: { createdAt: 'desc' },
      select: PUBLIC_REVIEW_SELECT,
    });
  }

  findReceived(providerId: string) {
    return this.prisma.review.findMany({
      where: { targetId: providerId, status: ReviewStatus.PUBLISHED },
      orderBy: { createdAt: 'desc' },
      select: {
        ...PUBLIC_REVIEW_SELECT,
        listing: { select: { id: true, title: true, imageUrls: true } },
      },
    });
  }

  async respond(
    providerId: string,
    reviewId: string,
    dto: RespondToReviewDto,
    ctx: RequestContext,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.review.findUnique({
        where: { id: reviewId },
        select: {
          id: true,
          targetId: true,
          authorId: true,
          status: true,
          response: true,
          respondedAt: true,
          listingId: true,
        },
      });

      if (!existing) throw new NotFoundException('Đánh giá không tồn tại');
      if (existing.targetId !== providerId)
        throw new ForbiddenException(
          'Bạn chỉ có thể phản hồi đánh giá dành cho mình',
        );
      if (existing.status !== ReviewStatus.PUBLISHED)
        throw new ConflictException({
          code: 'REVIEW_NOT_PUBLISHED',
          message: 'Chỉ đánh giá đã công khai mới có thể được phản hồi.',
        });

      const now = new Date();
      const firstResponse = await tx.review.updateMany({
        where: {
          id: reviewId,
          targetId: providerId,
          status: ReviewStatus.PUBLISHED,
          response: null,
        },
        data: { response: dto.response, respondedAt: now },
      });
      const isCreate = firstResponse.count === 1;

      if (!isCreate) {
        await tx.review.update({
          where: { id: reviewId },
          data: { response: dto.response, respondedAt: now },
        });
      }

      const updated = await tx.review.findUniqueOrThrow({
        where: { id: reviewId },
        select: PUBLIC_REVIEW_SELECT,
      });

      await this.audit.log(tx, ctx, {
        action: isCreate
          ? 'REVIEW_RESPONSE_CREATED'
          : 'REVIEW_RESPONSE_UPDATED',
        entityType: 'Review',
        entityId: reviewId,
        before: {
          response: existing.response,
          respondedAt: existing.respondedAt,
        },
        after: { response: updated.response, respondedAt: updated.respondedAt },
      });

      if (isCreate) {
        await tx.notification.create({
          data: {
            userId: existing.authorId,
            type: NotificationType.REVIEW,
            title: 'Provider đã phản hồi đánh giá của bạn',
            body: 'Provider đã gửi phản hồi cho đánh giá bạn đã đăng.',
            data: {
              reviewId,
              listingId: existing.listingId,
            },
          },
        });
      }

      return updated;
    });
  }

  private async refreshProviderRating(
    tx: Prisma.TransactionClient,
    providerId: string,
  ) {
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
}
