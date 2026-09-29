import {
  BadRequestException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { BookingStatus, DeliveryMethod, NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AvailabilityService } from '../availability/availability.service';
import { AddCartItemDto, CheckoutDto, UpdateCartItemDto } from './dto/cart.dto';

const HOLD_MINUTES = 15;

const CART_ITEM_INCLUDE = {
  listing: {
    select: {
      id: true, title: true, imageUrls: true, location: true,
      price: true, currency: true, quantity: true, depositRate: true,
      minRentalDays: true, maxRentalDays: true,
      provider: { select: { id: true, name: true, avatarUrl: true } },
    },
  },
} satisfies Prisma.CartItemInclude;

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availabilitySvc: AvailabilityService,
  ) {}

  // ─── GET cart (lazy-cleanup expired items) ────────────────────────────────

  async getCart(travelerId: string) {
    // Remove expired holds silently
    await this.prisma.cartItem.deleteMany({
      where: {
        cart: { travelerId },
        holdExpiresAt: { lt: new Date() },
      },
    });

    const cart = await this.prisma.cart.findUnique({
      where: { travelerId },
      include: {
        items: {
          include: CART_ITEM_INCLUDE,
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!cart) return { items: [], total: 0, depositTotal: 0 };

    const items = cart.items.map((item) => this.enrichItem(item));
    const total = items.reduce((s, i) => s + i.subtotal, 0);
    const depositTotal = items.reduce((s, i) => s + i.depositAmount, 0);

    return { id: cart.id, items, total, depositTotal };
  }

  // ─── ADD item (BOOK-02: cart, BOOK-03: hold 15 phút) ─────────────────────

  async addItem(travelerId: string, dto: AddCartItemDto) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (startDate >= endDate)
      throw new BadRequestException('endDate phải sau startDate');
    if (startDate < new Date(new Date().toDateString()))
      throw new BadRequestException('Không thể chọn ngày trong quá khứ');

    const listing = await this.prisma.listing.findUnique({
      where: { id: dto.listingId },
      select: { id: true, status: true, price: true, providerId: true },
    });
    if (!listing) throw new NotFoundException('Listing không tồn tại');
    if (listing.status !== 'ACTIVE')
      throw new BadRequestException('Listing không còn hoạt động');
    if (listing.providerId === travelerId)
      throw new BadRequestException('Không thể thêm listing của chính mình vào giỏ');

    const qty = dto.quantity ?? 1;

    const check = await this.availabilitySvc.checkAvailability(
      dto.listingId, startDate, endDate, qty,
    );
    if (!check.available) {
      const msg: Record<string, string> = {
        BLOCKED_DATE: 'Listing không nhận đặt trong khoảng ngày này',
        INSUFFICIENT_STOCK: 'Không đủ số lượng',
        MIN_RENTAL_DAYS: 'Số ngày thuê chưa đạt tối thiểu',
        MAX_RENTAL_DAYS: 'Số ngày thuê vượt quá giới hạn',
      };
      throw new BadRequestException(msg[check.reason!] ?? 'Không khả dụng');
    }

    // Get or create cart
    const cart = await this.prisma.cart.upsert({
      where: { travelerId },
      create: { travelerId },
      update: {},
    });

    const holdExpiresAt = new Date(Date.now() + HOLD_MINUTES * 60_000);

    const item = await this.prisma.cartItem.create({
      data: {
        cartId: cart.id,
        listingId: dto.listingId,
        startDate,
        endDate,
        quantity: qty,
        deliveryMethod: dto.deliveryMethod ?? DeliveryMethod.PICKUP,
        deliveryAddress: dto.deliveryAddress,
        unitPrice: listing.price,
        holdExpiresAt,
      },
      include: CART_ITEM_INCLUDE,
    });

    return this.enrichItem(item);
  }

  // ─── UPDATE item (đổi ngày / qty / delivery) ──────────────────────────────

  async updateItem(travelerId: string, itemId: string, dto: UpdateCartItemDto) {
    const item = await this.assertItemOwner(travelerId, itemId);

    const startDate = dto.startDate ? new Date(dto.startDate) : new Date(item.startDate);
    const endDate = dto.endDate ? new Date(dto.endDate) : new Date(item.endDate);
    const qty = dto.quantity ?? item.quantity;

    if (startDate >= endDate)
      throw new BadRequestException('endDate phải sau startDate');

    // Re-check availability, bỏ qua hold của chính item này
    const check = await this.availabilitySvc.checkAvailability(
      item.listingId, startDate, endDate, qty, itemId,
    );
    if (!check.available) {
      const msg: Record<string, string> = {
        BLOCKED_DATE: 'Listing không nhận đặt trong khoảng ngày này',
        INSUFFICIENT_STOCK: 'Không đủ số lượng',
        MIN_RENTAL_DAYS: 'Số ngày thuê chưa đạt tối thiểu',
        MAX_RENTAL_DAYS: 'Số ngày thuê vượt quá giới hạn',
      };
      throw new BadRequestException(msg[check.reason!] ?? 'Không khả dụng');
    }

    const updated = await this.prisma.cartItem.update({
      where: { id: itemId },
      data: {
        startDate,
        endDate,
        quantity: qty,
        ...(dto.deliveryMethod ? { deliveryMethod: dto.deliveryMethod } : {}),
        ...(dto.deliveryAddress !== undefined ? { deliveryAddress: dto.deliveryAddress } : {}),
        // Renew hold
        holdExpiresAt: new Date(Date.now() + HOLD_MINUTES * 60_000),
      },
      include: CART_ITEM_INCLUDE,
    });

    return this.enrichItem(updated);
  }

  // ─── REMOVE item ──────────────────────────────────────────────────────────

  async removeItem(travelerId: string, itemId: string) {
    await this.assertItemOwner(travelerId, itemId);
    await this.prisma.cartItem.delete({ where: { id: itemId } });
    return { message: 'Đã xoá sản phẩm khỏi giỏ hàng' };
  }

  // ─── CHECKOUT (BOOK-02: multi-item → N bookings) ─────────────────────────

  async checkout(travelerId: string, dto: CheckoutDto) {
    const cart = await this.prisma.cart.findUnique({
      where: { travelerId },
      include: {
        items: {
          include: {
            listing: {
              select: {
                id: true, title: true, status: true, price: true,
                providerId: true, quantity: true, depositRate: true,
              },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0)
      throw new BadRequestException('Giỏ hàng trống');

    const now = new Date();

    // 1. Kiểm tra hold còn hợp lệ
    const expiredItems = cart.items.filter(
      (i) => !i.holdExpiresAt || i.holdExpiresAt < now,
    );
    if (expiredItems.length > 0) {
      // Xoá expired items khỏi cart
      await this.prisma.cartItem.deleteMany({
        where: { id: { in: expiredItems.map((i) => i.id) } },
      });
      throw new BadRequestException(
        `${expiredItems.length} sản phẩm đã hết thời gian giữ chỗ. Vui lòng thêm lại vào giỏ.`,
      );
    }

    // 2. Re-check availability từng item (race condition protection)
    for (const item of cart.items) {
      if (item.listing.status !== 'ACTIVE')
        throw new BadRequestException(`Listing "${item.listing.title}" không còn hoạt động`);

      const check = await this.availabilitySvc.checkAvailability(
        item.listingId,
        new Date(item.startDate),
        new Date(item.endDate),
        item.quantity,
        item.id, // exclude chính item này trong hold check
      );
      if (!check.available)
        throw new BadRequestException(
          `"${item.listing.title}" không còn khả dụng cho khoảng ngày đã chọn`,
        );
    }

    // 3. Tạo N bookings + N payments trong 1 transaction
    const bookings = await this.prisma.$transaction(async (tx) => {
      const created: Prisma.BookingGetPayload<{
        include: { listing: { select: { title: true; providerId: true } }; payment: true };
      }>[] = [];

      for (const item of cart.items) {
        const rentalDays =
          Math.round(
            (new Date(item.endDate).getTime() - new Date(item.startDate).getTime()) / 86_400_000,
          ) + 1;
        const unitPrice = item.listing.price.toNumber();
        const totalPrice = unitPrice * item.quantity * rentalDays;
        const depositAmount = totalPrice * item.listing.depositRate.toNumber();

        const booking = await tx.booking.create({
          data: {
            travelerId,
            listingId: item.listingId,
            startDate: item.startDate,
            endDate: item.endDate,
            quantity: item.quantity,
            totalPrice,
            depositAmount,
            deliveryMethod: item.deliveryMethod,
            deliveryAddress: item.deliveryAddress,
            status: BookingStatus.PENDING_APPROVAL,
          },
          include: {
            listing: { select: { title: true, providerId: true } },
            payment: true,
          },
        });

        await tx.payment.create({
          data: {
            bookingId: booking.id,
            amount: totalPrice,
            currency: 'VND',
            method: dto.paymentMethod,
            transactionId: dto.transactionRef ?? null,
            status: 'PAID',
          },
        });

        created.push(booking);
      }

      // Xoá cart sau khi tạo bookings thành công
      await tx.cart.delete({ where: { id: cart.id } });

      return created;
    });

    // 4. Notify từng provider (deduplicated)
    const providerIds = [...new Set(bookings.map((b) => b.listing.providerId))];
    await Promise.all(
      providerIds.map((providerId) => {
        const count = bookings.filter((b) => b.listing.providerId === providerId).length;
        return this.prisma.notification.create({
          data: {
            userId: providerId,
            type: NotificationType.BOOKING,
            title: `${count} yêu cầu đặt chỗ mới`,
            body: `Bạn có ${count} đơn thuê mới đang chờ duyệt.`,
            data: { bookingIds: bookings.filter((b) => b.listing.providerId === providerId).map((b) => b.id) } as Prisma.InputJsonValue,
          },
        });
      }),
    );

    return {
      message: `Đặt hàng thành công ${bookings.length} sản phẩm`,
      bookings: bookings.map((b) => ({
        id: b.id,
        listingTitle: b.listing.title,
        status: b.status,
      })),
    };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async assertItemOwner(travelerId: string, itemId: string) {
    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: { select: { travelerId: true } } },
    });
    if (!item) throw new NotFoundException('CartItem không tồn tại');
    if (item.cart.travelerId !== travelerId) throw new ForbiddenException();
    return item;
  }

  private enrichItem<T extends {
    id: string; startDate: Date; endDate: Date;
    quantity: number; unitPrice: Prisma.Decimal;
    listing: { depositRate: Prisma.Decimal };
    holdExpiresAt: Date | null;
  }>(item: T) {
    const rentalDays =
      Math.round((new Date(item.endDate).getTime() - new Date(item.startDate).getTime()) / 86_400_000) + 1;
    const unitPrice = item.unitPrice.toNumber();
    const subtotal = unitPrice * item.quantity * rentalDays;
    const depositAmount = subtotal * item.listing.depositRate.toNumber();
    const holdExpiresAt = item.holdExpiresAt;
    const isHoldValid = holdExpiresAt ? holdExpiresAt > new Date() : false;

    return { ...item, rentalDays, unitPrice, subtotal, depositAmount, isHoldValid };
  }
}
