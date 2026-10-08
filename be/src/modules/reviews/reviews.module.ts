import { Module } from '@nestjs/common';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { AuthModule } from '../auth/auth.module';
import { ReputationModule } from '../reputation/reputation.module';
import { BullModule } from '@nestjs/bullmq';
import { SystemConfigModule } from '../system-config/system-config.module';
import { ReviewAiAnalyzerService } from './review-ai-analyzer.service';
import { REVIEW_MODERATION_QUEUE } from './review-moderation.constants';
import { ReviewModerationProcessor } from './review-moderation.processor';
import { ReviewModerationService } from './review-moderation.service';

@Module({
  imports: [
    AuthModule,
    ReputationModule,
    SystemConfigModule,
    BullModule.registerQueue({ name: REVIEW_MODERATION_QUEUE }),
  ],
  controllers: [ReviewsController],
  providers: [
    ReviewsService,
    ReviewAiAnalyzerService,
    ReviewModerationService,
    ReviewModerationProcessor,
  ],
  exports: [ReviewsService, ReviewModerationService],
})
export class ReviewsModule {}
