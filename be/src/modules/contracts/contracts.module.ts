import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ContractsService } from './contracts.service';
import { ContractsController } from './contracts.controller';
import { AuthModule } from '../auth/auth.module';
import { BOOKING_QUEUE } from '../booking/booking.constants';

@Module({
  imports: [
    AuthModule,
    BullModule.registerQueue({ name: BOOKING_QUEUE }),
  ],
  controllers: [ContractsController],
  providers: [ContractsService],
  exports: [ContractsService],
})
export class ContractsModule {}
