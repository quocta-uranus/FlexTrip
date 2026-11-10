import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ReferralsController } from './referrals.controller';
import { ReferralsModule } from './referrals.module';

@Module({ imports: [AuthModule, ReferralsModule], controllers: [ReferralsController] })
export class ReferralsHttpModule {}
