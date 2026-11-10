import {
  BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException, OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import {
  BookingStatus, CancelledBy, PaymentGateway, PaymentStatus, WalletTxType, TopupStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletService } from './wallet.service';
import { EscrowService } from './escrow.service';
import { PayOsGateway } from './gateways/payos.gateway';
import { PAYMENT_QUEUE, PaymentJob } from './constants';
import { BOOKING_QUEUE } from '../booking/booking.constants';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { TopupDto } from './dto/topup.dto';
import { PayoutRequestDto } from './dto/payout-request.dto';
import { PaymentAiService } from '../payment-ai/payment-ai.service';

@Injectable()
export class PaymentsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletSvc: WalletService,
    private readonly escrowSvc: EscrowService,
    private readonly payos: PayOsGateway,
    private readonly config: ConfigService,
    private readonly paymentAi: PaymentAiService,
    @InjectQueue(PAYMENT_QUEUE) private readonly paymentQueue: Queue,
    @InjectQueue(BOOKING_QUEUE) private readonly bookingQueue: Queue,
  ) {}

  // Register weekly payout-reminder repeatable job on startup
  async onApplicationBootstrap() {
    // BullMQ v5+ API: upsertJobScheduler replaces Queue.add with repeat option
    await this.paymentQueue.upsertJobScheduler(
      'payout-reminder-weekly',
      { pattern: '0 9 * * 1' }, // every Monday at 09:00
      { name: PaymentJob.PAYOUT_REMINDER, data: {}, opts: { removeOnComplete: true } },
    );
    this.logger.log('Payout reminder job scheduled (every Monday 09:00)');
  }

  // ─── PAY-01: Initiate payment for a booking ───────────────────────────────

  async initiatePayment(bookingId: string, travelerId: string, dto: InitiatePaymentDto, ipAddress?: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payment: true, listing: { select: { title: true } } },
    });
    if (!booking) throw new NotFoundException('Booking không tồn tại');
    if (booking.travelerId !== travelerId) throw new BadRequestException('Không có quyền thanh toán booking này');
    if (booking.status !== BookingStatus.PENDING_PAYMENT) {
      throw new BadRequestException('Booking không ở trạng thái chờ thanh toán');
    }

    const totalAmount = Number(booking.totalPrice);
    const depositAmount = Number(booking.depositAmount);
    const rentalAmount = totalAmount - depositAmount;
    const orderCode = `FT${Date.now().toString(36).toUpperCase()}`;

    // Lần 1 chỉ thu cọc; tiền thuê thu sau khi provider duyệt (payRental)
    const fraudResult = await this.paymentAi.fraudCheck({
      userId: travelerId, bookingId, amount: depositAmount,
      gateway: dto.gateway, ipAddress,
    }).catch(() => null);
    if (fraudResult?.action === 'BLOCK') {
      this.logger.warn(`Payment BLOCKED by fraud check: ${bookingId}, score=${fraudResult.riskScore}`);
      throw new ForbiddenException('Giao dịch bị từ chối do phát hiện rủi ro. Vui lòng liên hệ hỗ trợ.');
    }
    if (fraudResult?.action === 'REVIEW') {
      this.logger.warn(`Payment flagged for REVIEW: ${bookingId}, score=${fraudResult.riskScore}, flags=${fraudResult.flags.join(', ')}`);
    }

    // Cancel hold expiry job so booking is not auto-cancelled while payment is in progress
    await this.bookingQueue.remove(`hold-${bookingId}`).catch(() => null);

    if (depositAmount <= 0) {
      await this.prisma.$transaction([
        this.prisma.payment.upsert({
          where: { bookingId },
          create: {
            bookingId, totalAmount, rentalAmount, depositAmount,
            gateway: dto.gateway, gatewayOrderCode: orderCode, status: PaymentStatus.PAID,
          },
          update: {
            totalAmount, rentalAmount, depositAmount,
            gateway: dto.gateway, gatewayOrderCode: orderCode, status: PaymentStatus.PAID,
          },
        }),
        this.prisma.booking.update({
          where: { id: bookingId },
          data: { status: BookingStatus.PENDING_APPROVAL },
        }),
      ]);
      return { gateway: dto.gateway, status: 'PAID', orderCode };
    }

    if (dto.gateway === PaymentGateway.WALLET) {
      const balance = await this.walletSvc.getBalance(travelerId);
      if (balance.availableBalance < depositAmount) {
        throw new BadRequestException('Số dư ví không đủ để đặt cọc');
      }

      await this.prisma.$transaction(async (tx) => {
        const payment = await tx.payment.upsert({
          where: { bookingId },
          create: {
            bookingId,
            totalAmount,
            rentalAmount,
            depositAmount,
            gateway: PaymentGateway.WALLET,
            gatewayOrderCode: orderCode,
            status: PaymentStatus.PAID,
          },
          update: {
            totalAmount,
            rentalAmount,
            depositAmount,
            gateway: PaymentGateway.WALLET,
            gatewayOrderCode: orderCode,
            status: PaymentStatus.PAID,
          },
        });

        await tx.booking.update({
          where: { id: bookingId },
          data: { status: BookingStatus.PENDING_APPROVAL },
        });

        const wallet = await tx.wallet.findUnique({ where: { userId: travelerId } });
        if (!wallet) throw new BadRequestException('Wallet not found');

        await tx.wallet.update({
          where: { userId: travelerId },
          data: {
            availableBalance: { decrement: depositAmount },
            frozenBalance: { increment: depositAmount },
          },
        });
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.walletId,
            type: WalletTxType.FREEZE,
            amount: depositAmount,
            refType: 'payment',
            refId: payment.id,
            note: `Giữ cọc booking ${bookingId}`,
          },
        });
      });

      return { gateway: PaymentGateway.WALLET, status: 'PAID', orderCode };
    }

    if (dto.gateway === PaymentGateway.PAYOS) {
      const returnUrl = dto.returnUrl ?? this.config.get<string>('PAYOS_RETURN_URL') ?? 'http://localhost:3000/payment/return';
      const cancelUrl = dto.cancelUrl ?? this.config.get<string>('PAYOS_CANCEL_URL') ?? 'http://localhost:3000/payment/cancel';

      const result = await this.payos.initiate({
        orderCode,
        amount: depositAmount,
        description: `FT ${bookingId.slice(-8)}`,
        returnUrl,
        cancelUrl,
        ipAddress,
      });

      await this.prisma.payment.upsert({
        where: { bookingId },
        create: {
          bookingId,
          totalAmount,
          rentalAmount,
          depositAmount,
          gateway: PaymentGateway.PAYOS,
          gatewayOrderCode: result.orderCode,
          status: PaymentStatus.PENDING,
        },
        update: {
          totalAmount,
          rentalAmount,
          depositAmount,
          gateway: PaymentGateway.PAYOS,
          gatewayOrderCode: result.orderCode,
          status: PaymentStatus.PENDING,
          gatewayTransId: null,
        },
      });

      return { gateway: PaymentGateway.PAYOS, redirectUrl: result.redirectUrl, orderCode: result.orderCode };
    }

    throw new BadRequestException('Gateway không được hỗ trợ');
  }

  // ─── PAY-02: PayOS webhook ───────────────────────────────────────────────

  async handlePayosWebhook(body: Record<string, unknown>) {
    const result = this.payos.verifyWebhook(body);

    await this.prisma.paymentWebhookLog.create({
      data: {
        gateway: PaymentGateway.PAYOS,
        payload: body as object,
        verified: result.isValid,
      },
    });

    if (!result.isValid) return { code: '97', desc: 'Invalid signature' };

    const payment = await this.prisma.payment.findFirst({
      where: { OR: [{ gatewayOrderCode: result.orderCode }, { rentalOrderCode: result.orderCode }] },
      include: { booking: true },
    });
    if (!payment) {
      return (await this.tryTopupWebhook(body, result.orderCode)) ?? { code: '01', desc: 'Order not found' };
    }

    if (payment.rentalOrderCode === result.orderCode) {
      if (payment.rentalPaidAt) return { code: '00', desc: 'Already processed' };
      // Lần trả nốt thất bại thì giữ nguyên Payment (cọc vẫn PAID), khách có thể tạo link mới
      if (result.success) {
        await this.markRentalPaid(payment.id, payment.booking.id, PaymentGateway.PAYOS, result.transactionId, body);
      }
      return { code: '00', desc: 'Confirmed' };
    }

    if (payment.gatewayTransId) return { code: '00', desc: 'Already processed' };

    if (result.success) {
      await this.markPayosPaid(payment.id, payment.booking.id, result.transactionId, body, true);
    } else {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          gatewayTransId: result.transactionId,
          gatewayResponse: body as object,
        },
      });
    }

    return { code: '00', desc: 'Confirmed' };
  }

  // Fallback for when the PayOS webhook cannot reach the BE (e.g. localhost):
  // the return page asks us to re-check the payment status with PayOS itself.
  async confirmPayosReturn(userId: string, orderCode: string) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        OR: [
          { gatewayOrderCode: orderCode, gateway: PaymentGateway.PAYOS },
          { rentalOrderCode: orderCode },
        ],
      },
      include: { booking: true },
    });
    if (!payment) throw new NotFoundException('Không tìm thấy giao dịch');
    if (payment.booking.travelerId !== userId) throw new ForbiddenException('Không có quyền với giao dịch này');

    if (payment.rentalOrderCode === orderCode) {
      if (!payment.rentalPaidAt) {
        const info = await this.payos.getPaymentStatus(orderCode);
        if (!info.paid) throw new BadRequestException('PayOS chưa ghi nhận thanh toán cho giao dịch này');
        await this.markRentalPaid(payment.id, payment.booking.id, PaymentGateway.PAYOS, info.transactionId, info.raw);
      }
    } else if (payment.status !== PaymentStatus.PAID) {
      const info = await this.payos.getPaymentStatus(orderCode);
      if (!info.paid) throw new BadRequestException('PayOS chưa ghi nhận thanh toán cho giao dịch này');
      await this.markPayosPaid(payment.id, payment.booking.id, info.transactionId, info.raw, false);
    }

    const booking = await this.prisma.booking.findUniqueOrThrow({
      where: { id: payment.booking.id },
      select: { id: true, status: true },
    });
    return { bookingId: booking.id, status: booking.status };
  }

  // Shared by the webhook and confirmPayosReturn; only the first caller flips the state
  private async markPayosPaid(
    paymentId: string,
    bookingId: string,
    transactionId: string,
    response: unknown,
    linkWebhookLog: boolean,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.payment.updateMany({
        where: { id: paymentId, status: { not: PaymentStatus.PAID } },
        data: {
          status: PaymentStatus.PAID,
          gatewayTransId: transactionId,
          gatewayResponse: response as object,
        },
      });
      if (count === 0) return;

      if (linkWebhookLog) {
        await tx.paymentWebhookLog.updateMany({
          where: { gateway: PaymentGateway.PAYOS, paymentId: null },
          data: { paymentId },
        });
      }

      await tx.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.PENDING_APPROVAL },
      });
    });
  }

  // ─── PAY-01b: Traveler trả nốt tiền thuê sau khi provider duyệt ──────────

  async payRental(bookingId: string, travelerId: string, dto: InitiatePaymentDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payment: true },
    });
    if (!booking) throw new NotFoundException('Booking không tồn tại');
    if (booking.travelerId !== travelerId) throw new ForbiddenException('Không có quyền thanh toán booking này');
    const payment = booking.payment;
    if (booking.status !== BookingStatus.CONFIRMED || payment?.status !== PaymentStatus.PAID) {
      throw new BadRequestException('Booking chưa đến bước thanh toán tiền thuê');
    }
    if (payment.rentalPaidAt) throw new BadRequestException('Tiền thuê đã được thanh toán');
    if (booking.balanceDueAt && booking.balanceDueAt < new Date()) {
      throw new BadRequestException('Đã quá hạn thanh toán tiền thuê');
    }

    const rentalAmount = Number(payment.rentalAmount);

    if (dto.gateway === PaymentGateway.WALLET) {
      const balance = await this.walletSvc.getBalance(travelerId);
      if (balance.availableBalance < rentalAmount) throw new BadRequestException('Số dư ví không đủ');

      await this.prisma.$transaction(async (tx) => {
        const wallet = await tx.wallet.findUnique({ where: { userId: travelerId } });
        if (!wallet) throw new BadRequestException('Wallet not found');
        await tx.wallet.update({
          where: { userId: travelerId },
          data: { availableBalance: { decrement: rentalAmount } },
        });
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.walletId,
            type: WalletTxType.DEBIT,
            amount: rentalAmount,
            refType: 'payment',
            refId: payment.id,
            note: `Thanh toán tiền thuê booking ${bookingId}`,
          },
        });
        // Tiền thuê nằm trong escrow tới khi booking COMPLETED
        await this.escrowSvc.credit(rentalAmount, tx);
      });
      await this.markRentalPaid(payment.id, bookingId, PaymentGateway.WALLET, null, null);
      return { gateway: PaymentGateway.WALLET, status: 'PAID' };
    }

    if (dto.gateway === PaymentGateway.PAYOS) {
      const returnUrl = dto.returnUrl ?? this.config.get<string>('PAYOS_RETURN_URL') ?? 'http://localhost:3000/payment/return';
      const cancelUrl = dto.cancelUrl ?? this.config.get<string>('PAYOS_CANCEL_URL') ?? 'http://localhost:3000/payment/cancel';
      const result = await this.payos.initiate({
        orderCode: `FR${Date.now().toString(36).toUpperCase()}`,
        amount: rentalAmount,
        description: `FT ${bookingId.slice(-8)} thue`,
        returnUrl,
        cancelUrl,
      });
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { rentalOrderCode: result.orderCode, rentalGateway: PaymentGateway.PAYOS },
      });
      return { gateway: PaymentGateway.PAYOS, redirectUrl: result.redirectUrl, orderCode: result.orderCode };
    }

    throw new BadRequestException('Gateway không được hỗ trợ');
  }

  // The deposit is the first installment of the price, so once the balance is paid it stops being a hold:
  // a wallet-paid deposit leaves the frozen balance and joins the rental money in escrow
  private async applyDepositToPrice(paymentId: string) {
    const payment = await this.prisma.payment.findUniqueOrThrow({
      where: { id: paymentId },
      select: { gateway: true, depositAmount: true, booking: { select: { id: true, travelerId: true } } },
    });
    const deposit = Number(payment.depositAmount);
    if (payment.gateway !== PaymentGateway.WALLET || deposit <= 0) return;

    await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.update({
        where: { userId: payment.booking.travelerId },
        data: { frozenBalance: { decrement: deposit } },
      });
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.walletId,
          type: WalletTxType.DEBIT,
          amount: deposit,
          balanceAfter: wallet.availableBalance,
          refType: 'payment',
          refId: paymentId,
          note: `Cọc được tính vào tiền thuê booking ${payment.booking.id}`,
        },
      });
      await this.escrowSvc.credit(deposit, tx);
    });
  }

  // Shared by wallet / webhook / confirmPayosReturn; only the first caller flips the state
  private async markRentalPaid(
    paymentId: string,
    bookingId: string,
    gateway: PaymentGateway,
    transactionId: string | null,
    response: unknown,
  ) {
    const { count } = await this.prisma.payment.updateMany({
      where: { id: paymentId, rentalPaidAt: null },
      data: {
        rentalPaidAt: new Date(),
        rentalGateway: gateway,
        rentalTransId: transactionId,
        ...(response ? { gatewayResponse: response as object } : {}),
      },
    });
    if (count === 0) return;

    await this.applyDepositToPrice(paymentId);

    const booking = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { balanceDueAt: null },
      select: { listing: { select: { providerId: true, title: true } } },
    });
    await this.bookingQueue.remove(`balance-${bookingId}`).catch(() => null);
    await this.prisma.notification.create({
      data: {
        userId: booking.listing.providerId,
        type: 'PAYMENT',
        title: 'Khách đã thanh toán đủ',
        body: `Khách đã trả tiền thuê "${booking.listing.title}". Bạn có thể giao hàng.`,
        data: { bookingId },
      },
    });
  }

  // ─── Called by BookingService when booking transitions to COMPLETED ───────

  async onBookingCompleted(bookingId: string) {
    await this.paymentQueue.add(PaymentJob.COMMISSION_SPLIT, { bookingId }, {
      removeOnComplete: true,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });
  }

  // ─── Called by BookingService when booking is cancelled ──────────────────

  async onBookingCancelled(bookingId: string, cancelledBy: CancelledBy, bookingStatus: BookingStatus) {
    await this.paymentQueue.add(
      PaymentJob.AUTO_REFUND,
      { bookingId, cancelledBy, bookingStatus },
      { removeOnComplete: true, attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );
  }

  // ─── PAY-03: Wallet top-up ────────────────────────────────────────────────

  async initiateTopup(userId: string, dto: TopupDto, ipAddress?: string) {
    const wallet = await this.walletSvc.ensureWallet(userId);
    const orderCode = `TU${Date.now().toString(36).toUpperCase()}`;

    if (dto.gateway === PaymentGateway.PAYOS) {
      const returnUrl = dto.returnUrl ?? this.config.get<string>('PAYOS_RETURN_URL') ?? 'http://localhost:3000/wallet/topup/return';
      const cancelUrl = this.config.get<string>('PAYOS_CANCEL_URL') ?? 'http://localhost:3000/wallet/topup/cancel';
      const result = await this.payos.initiate({
        orderCode,
        amount: dto.amount,
        description: `Nap vi ${userId.slice(-6)}`,
        returnUrl,
        cancelUrl,
        ipAddress,
      });

      await this.prisma.topupRecord.create({
        data: {
          walletId: wallet.walletId,
          amount: dto.amount,
          gateway: PaymentGateway.PAYOS,
          gatewayOrderCode: result.orderCode,
          status: TopupStatus.PENDING,
        },
      });

      return { redirectUrl: result.redirectUrl, orderCode: result.orderCode };
    }

    throw new BadRequestException('Gateway không được hỗ trợ cho nạp ví');
  }

  async handleTopupPayosWebhook(body: Record<string, unknown>) {
    const result = this.payos.verifyWebhook(body);
    if (!result.isValid) return { code: '97', desc: 'Invalid signature' };

    const topup = await this.prisma.topupRecord.findFirst({
      where: { gatewayOrderCode: result.orderCode },
    });
    if (!topup) return { code: '01', desc: 'Order not found' };
    if (topup.status === TopupStatus.SUCCESS) return { code: '00', desc: 'Already processed' };

    if (result.success) {
      await this.settleTopup(topup.id, result.transactionId, result.amount, body);
    } else {
      await this.prisma.topupRecord.updateMany({
        where: { id: topup.id, status: TopupStatus.PENDING },
        data: { status: TopupStatus.FAILED, gatewayResponse: body as object },
      });
    }

    return { code: '00', desc: 'Confirmed' };
  }

  // PayOS only allows one webhook URL, so a top-up notification can land on the booking webhook
  private async tryTopupWebhook(body: Record<string, unknown>, orderCode: string) {
    const topup = await this.prisma.topupRecord.findFirst({ where: { gatewayOrderCode: orderCode } });
    return topup ? this.handleTopupPayosWebhook(body) : null;
  }

  // Fallback for when the webhook cannot reach the BE (e.g. localhost): re-check with PayOS itself
  async confirmTopupReturn(userId: string, orderCode: string) {
    const topup = await this.prisma.topupRecord.findFirst({
      where: { gatewayOrderCode: orderCode },
      include: { wallet: { select: { userId: true } } },
    });
    if (!topup) throw new NotFoundException('Không tìm thấy giao dịch nạp tiền');
    if (topup.wallet.userId !== userId) throw new ForbiddenException('Không có quyền với giao dịch này');

    if (topup.status !== TopupStatus.SUCCESS) {
      const info = await this.payos.getPaymentStatus(orderCode);
      if (!info.paid) throw new BadRequestException('PayOS chưa ghi nhận thanh toán cho giao dịch này');
      await this.settleTopup(topup.id, info.transactionId, Number(topup.amount), info.raw);
    }

    const wallet = await this.walletSvc.getBalance(userId);
    return { status: TopupStatus.SUCCESS, amount: Number(topup.amount), availableBalance: wallet.availableBalance };
  }

  // Shared by webhook and confirmTopupReturn; only the first caller credits the wallet
  private async settleTopup(topupId: string, transactionId: string, amount: number, response: unknown) {
    await this.prisma.$transaction(async (tx) => {
      const topup = await tx.topupRecord.findUniqueOrThrow({ where: { id: topupId } });
      const { count } = await tx.topupRecord.updateMany({
        where: { id: topupId, status: { not: TopupStatus.SUCCESS } },
        data: {
          status: TopupStatus.SUCCESS,
          gatewayTransId: transactionId,
          gatewayResponse: response as object,
        },
      });
      if (count === 0) return;

      const wallet = await tx.wallet.update({
        where: { walletId: topup.walletId },
        data: { availableBalance: { increment: amount } },
      });
      await tx.walletTransaction.create({
        data: {
          walletId: topup.walletId,
          type: WalletTxType.TOPUP,
          amount,
          balanceAfter: wallet.availableBalance,
          refType: 'topup',
          refId: topupId,
          note: 'Nạp ví qua PayOS',
        },
      });
    });
  }

  // ─── PAY-04: Payout request (provider / staff withdraw) ──────────────────

  async requestPayout(userId: string, dto: PayoutRequestDto) {
    const balance = await this.walletSvc.getBalance(userId);
    if (balance.availableBalance < dto.amount) {
      throw new BadRequestException('Số dư không đủ để rút');
    }
    return this.prisma.$transaction(async (tx) => {
      // Freeze amount — moves from available → frozen until admin approves/rejects
      await tx.wallet.update({
        where: { userId },
        data: {
          availableBalance: { decrement: dto.amount },
          frozenBalance: { increment: dto.amount },
        },
      });
      const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId } });
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.walletId,
          type: WalletTxType.FREEZE,
          amount: dto.amount,
          balanceAfter: wallet.availableBalance,
          note: `Giữ chờ rút tiền — chờ admin duyệt`,
        },
      });
      // Create withdrawal request for admin queue
      const request = await tx.withdrawRequest.create({
        data: {
          userId,
          amount: dto.amount,
          bankName: dto.bankName,
          bankAccount: dto.bankAccount,
          accountName: dto.accountName,
          note: dto.note,
        },
      });
      return { requestId: request.id, frozen: dto.amount, message: 'Yêu cầu rút tiền đã được ghi nhận. Admin sẽ xử lý trong 1–3 ngày làm việc.' };
    });
  }

  // ─── Wallet balance (for profile) ────────────────────────────────────────

  async getWalletBalance(userId: string) {
    return this.walletSvc.getBalance(userId);
  }

  async getWalletTransactions(userId: string, page = 1, limit = 20) {
    return this.walletSvc.getTransactions(userId, page, limit);
  }

  // PAY-07: Invoice data
  async getInvoice(bookingId: string, requesterId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        payment: true,
        listing: {
          select: {
            id: true, title: true, location: true, category: true, price: true, currency: true,
            provider: { select: { id: true, name: true, email: true } },
          },
        },
        traveler: { select: { id: true, name: true, email: true } },
      },
    });
    if (!booking) throw new NotFoundException('Booking không tồn tại');
    if (booking.travelerId !== requesterId && booking.listing?.provider?.id !== requesterId) {
      throw new NotFoundException('Booking không tồn tại');
    }

    const nights = Math.round(
      (new Date(booking.endDate).getTime() - new Date(booking.startDate).getTime()) / 86_400_000,
    );

    return {
      invoiceNumber: `INV-${booking.id.slice(-8).toUpperCase()}`,
      issuedAt: booking.payment?.updatedAt ?? booking.createdAt,
      booking: {
        id: booking.id,
        startDate: booking.startDate,
        endDate: booking.endDate,
        nights,
        quantity: booking.quantity,
        deliveryMethod: booking.deliveryMethod,
        deliveryAddress: booking.deliveryAddress,
      },
      listing: {
        title: booking.listing?.title ?? '—',
        location: booking.listing?.location ?? '—',
        category: booking.listing?.category ?? '—',
        unitPrice: Number(booking.listing?.price ?? 0),
        currency: booking.listing?.currency ?? 'VND',
      },
      traveler: {
        name: booking.traveler?.name ?? '—',
        email: booking.traveler?.email ?? '—',
      },
      provider: {
        name: booking.listing?.provider?.name ?? '—',
        email: booking.listing?.provider?.email ?? '—',
      },
      payment: {
        status: booking.payment?.status ?? 'PENDING',
        gateway: booking.payment?.gateway ?? '—',
        totalAmount: Number(booking.payment?.totalAmount ?? booking.totalPrice),
        rentalAmount: Number(booking.payment?.rentalAmount ?? 0),
        depositAmount: Number(booking.payment?.depositAmount ?? booking.depositAmount ?? 0),
        paidAt: booking.payment?.updatedAt ?? null,
      },
    };
  }

  // ─── PAY-AI: Deposit recommendation for traveler when creating booking ─────

  getDepositRecommendation(listingId: string, travelerId: string) {
    return this.paymentAi.recommendDeposit(listingId, travelerId);
  }
}
