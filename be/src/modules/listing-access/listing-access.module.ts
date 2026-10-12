import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ListingReadGuard } from './listing-read.guard';

@Module({
  imports: [AuthModule],
  providers: [ListingReadGuard],
  exports: [ListingReadGuard],
})
export class ListingAccessModule {}
