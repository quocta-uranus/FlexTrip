import { ListingAccessModule } from '../listing-access/listing-access.module';
import { Module } from '@nestjs/common';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule, ListingAccessModule],
  controllers: [AvailabilityController],
  providers: [AvailabilityService],
  exports: [AvailabilityService], // Phase 3 (booking) sẽ import
})
export class AvailabilityModule {}
