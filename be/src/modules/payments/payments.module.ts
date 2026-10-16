import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { AuthModule } from '../auth/auth.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { WalletService } from './wallet.service';
import { CommissionService } from './commission.service';
import { RefundService } from './refund.service';
import { PaymentProcessor } from './payment.processor';
import { PayOsGateway } from './gateways/payos.gateway';
import { PaymentAiService } from '../payment-ai/payment-ai.service';
import { EscrowService } from './escrow.service';
import { PAYMENT_QUEUE } from './constants';
import { BOOKING_QUEUE } from '../booking/booking.constants';

@Module({
  imports: [
    ConfigModule,
    AuthModule,
    BullModule.registerQueue({ name: PAYMENT_QUEUE }),
    BullModule.registerQueue({ name: BOOKING_QUEUE }),
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    WalletService,
    CommissionService,
    EscrowService,
    RefundService,
    PaymentProcessor,
    PayOsGateway,
    PaymentAiService,
  ],
  exports: [PaymentsService, WalletService, EscrowService],
})
export class PaymentsModule {}
