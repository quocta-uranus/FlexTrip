import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ModifyBookingController } from './modify-booking.controller';
import { ModifyBookingService } from './modify-booking.service';
import { AuthModule } from '../auth/auth.module';
import { AvailabilityModule } from '../availability/availability.module';
import { BOOKING_QUEUE } from '../booking/booking.constants';

@Module({
  imports: [
    AuthModule,
    AvailabilityModule,
    BullModule.registerQueue({ name: BOOKING_QUEUE }),
  ],
  controllers: [ModifyBookingController],
  providers: [ModifyBookingService],
})
export class ModifyBookingModule {}
