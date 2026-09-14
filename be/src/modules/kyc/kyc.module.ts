import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { KycController } from './kyc.controller';
import { KycService } from './kyc.service';

@Module({
  imports: [AuthModule],
  controllers: [KycController],
  providers: [KycService, AccessTokenGuard],
})
export class KycModule {}
