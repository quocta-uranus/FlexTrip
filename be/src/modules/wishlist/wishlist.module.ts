import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import {
  GuestWishlistController,
  WishlistController,
} from './wishlist.controller';
import { WishlistService } from './wishlist.service';

@Module({
  imports: [AuthModule],
  controllers: [GuestWishlistController, WishlistController],
  providers: [WishlistService],
  exports: [WishlistService],
})
export class WishlistModule {}
