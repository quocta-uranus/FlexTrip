import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AuthModule } from '../auth/auth.module';
import { LoyaltyController } from './loyalty.controller';
import { LOYALTY_MAINTENANCE_QUEUE, LoyaltyMaintenanceProcessor } from './loyalty-maintenance.processor';
import { LoyaltyMaintenanceService } from './loyalty-maintenance.service';
import { LoyaltyService } from './loyalty.service';

@Module({
  imports: [AuthModule, BullModule.registerQueue({ name: LOYALTY_MAINTENANCE_QUEUE })],
  controllers: [LoyaltyController],
  providers: [LoyaltyService, LoyaltyMaintenanceService, LoyaltyMaintenanceProcessor],
  exports: [LoyaltyService],
})
export class LoyaltyModule {}
