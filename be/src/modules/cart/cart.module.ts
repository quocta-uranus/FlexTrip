import { Module } from '@nestjs/common';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { AuthModule } from '../auth/auth.module';
import { AvailabilityModule } from '../availability/availability.module';
import { VouchersModule } from '../vouchers/vouchers.module';

@Module({
  imports: [AuthModule, AvailabilityModule, VouchersModule],
  controllers: [CartController],
  providers: [CartService],
})
export class CartModule {}
