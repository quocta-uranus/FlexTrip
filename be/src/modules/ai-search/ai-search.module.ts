import { Module } from '@nestjs/common';
import { ListingsModule } from '../listings/listings.module';
import { RecommendationsModule } from '../recommendations/recommendations.module';
import { AiSearchController } from './ai-search.controller';
import { AiSearchService } from './ai-search.service';

@Module({
  imports: [ListingsModule, RecommendationsModule],
  controllers: [AiSearchController],
  providers: [AiSearchService],
})
export class AiSearchModule {}
