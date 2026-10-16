import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { CommissionService } from './commission.service';
import { RefundService } from './refund.service';
import { PAYMENT_QUEUE, PaymentJob } from './constants';
import { CancelledBy, BookingStatus, NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

interface CommissionJobData { bookingId: string; }
interface DepositJobData { bookingId: string; }
interface RefundJobData { bookingId: string; cancelledBy: CancelledBy; bookingStatus: BookingStatus; }

const MIN_PAYOUT_NOTIFY = 50_000; // only notify if availableBalance ≥ 50k VND

@Processor(PAYMENT_QUEUE)
export class PaymentProcessor extends WorkerHost {
  private readonly logger = new Logger(PaymentProcessor.name);

  constructor(
    private readonly commission: CommissionService,
    private readonly refund: RefundService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case PaymentJob.COMMISSION_SPLIT:
        await this.handleCommissionSplit(job.data as CommissionJobData);
        break;
      case PaymentJob.DEPOSIT_RELEASE:
        await this.handleDepositRelease(job.data as DepositJobData);
        break;
      case PaymentJob.AUTO_REFUND:
        await this.handleAutoRefund(job.data as RefundJobData);
        break;
      case PaymentJob.PAYOUT_REMINDER:
        await this.handlePayoutReminder();
        break;
      default:
        this.logger.warn(`Unknown payment job: ${job.name}`);
    }
  }

  private async handleCommissionSplit({ bookingId }: CommissionJobData) {
    this.logger.log(`Splitting commission for booking ${bookingId}`);
    await this.commission.split(bookingId);
  }

  private async handleDepositRelease({ bookingId }: DepositJobData) {
    this.logger.log(`Releasing deposit for booking ${bookingId}`);
    await this.refund.releaseDeposit(bookingId);
  }

  private async handleAutoRefund({ bookingId, cancelledBy, bookingStatus }: RefundJobData) {
    this.logger.log(`Processing cancellation refund for booking ${bookingId}`);
    await this.refund.processCancellationRefund(bookingId, cancelledBy, bookingStatus);
  }

  private async handlePayoutReminder() {
    // Find wallets with enough balance that haven't had a payout request in the last 7 days
    const wallets = await this.prisma.wallet.findMany({
      where: { availableBalance: { gte: MIN_PAYOUT_NOTIFY } },
      select: {
        userId: true,
        availableBalance: true,
      },
    });

    this.logger.log(`Payout reminder: checking ${wallets.length} wallets`);

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const notifyOps: Promise<unknown>[] = [];
    for (const wallet of wallets) {
      // Skip if user already has a pending request or made one recently
      const recentRequest = await this.prisma.withdrawRequest.findFirst({
        where: {
          userId: wallet.userId,
          createdAt: { gte: sevenDaysAgo },
        },
      });
      if (recentRequest) continue;

      const balanceVnd = Number(wallet.availableBalance).toLocaleString('vi-VN');
      notifyOps.push(
        this.prisma.notification.create({
          data: {
            userId: wallet.userId,
            type: NotificationType.PAYMENT,
            title: 'Nhắc nhở: Bạn có thể rút tiền',
            body: `Ví của bạn có ${balanceVnd}₫ chưa rút. Vào mục Ví → Rút tiền để yêu cầu thanh toán.`,
            data: {} as Prisma.InputJsonValue,
          },
        }),
      );
    }

    await Promise.allSettled(notifyOps);
    this.logger.log(`Payout reminder: sent ${notifyOps.length} notifications`);
  }
}
