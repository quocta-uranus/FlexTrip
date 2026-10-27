import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PublicStatsService } from './public-stats.service';
import { PublicStatsDto, FeaturedReviewDto } from './public-stats.dto';

@ApiTags('Public Stats')
@Controller('public')
export class PublicStatsController {
  constructor(private readonly statsService: PublicStatsService) {}

  @Get('stats')
  @ApiOperation({
    summary: 'Lấy thống kê hoạt động nền tảng công khai (cache Redis 5 phút)',
  })
  @ApiResponse({ status: 200, type: PublicStatsDto })
  async getStats(): Promise<PublicStatsDto> {
    return this.statsService.getPublicStats();
  }

  @Get('reviews/featured')
  @ApiOperation({
    summary: 'Lấy danh sách đánh giá nổi bật đã công khai (rating >= 4)',
  })
  @ApiResponse({ status: 200, type: [FeaturedReviewDto] })
  async getFeaturedReviews(): Promise<FeaturedReviewDto[]> {
    return this.statsService.getFeaturedReviews();
  }
}
