import { Module } from '@nestjs/common';
import { ReferralsService } from './referrals.service';

// Cố ý không import AuthModule: AuthModule cần ReferralsService khi đăng ký, nên controller nằm ở ReferralsHttpModule để tránh vòng phụ thuộc
@Module({ providers: [ReferralsService], exports: [ReferralsService] })
export class ReferralsModule {}
