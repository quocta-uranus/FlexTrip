import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, Prisma, ReviewStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReviewDto } from './dto/review.dto';
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
  constructor(private readonly prisma: PrismaService) {}

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
