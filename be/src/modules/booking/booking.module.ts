import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { BookingProcessor } from './booking.processor';
import { AuthModule } from '../auth/auth.module';
import { AvailabilityModule } from '../availability/availability.module';
import { ContractsModule } from '../contracts/contracts.module';
import { BOOKING_QUEUE } from './booking.constants';

@Module({
  imports: [
    AuthModule,
    AvailabilityModule,
    ContractsModule,
    BullModule.registerQueue({ name: BOOKING_QUEUE }),
  ],
  controllers: [BookingController],
  providers: [BookingService, BookingProcessor],
  exports: [BookingService],
})
export class BookingModule {}
