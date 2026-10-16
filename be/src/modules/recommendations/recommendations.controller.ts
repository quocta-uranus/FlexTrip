import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard, AuthenticatedRequest } from '../auth/guards/access-token.guard';
import { RecommendationsService } from './recommendations.service';

const clampLimit = (raw?: string) => Math.min(Math.max(Number(raw) || 8, 1), 12);

@ApiTags('Recommendations')
@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly svc: RecommendationsService) {}

  @Get('similar/:listingId')
  @ApiOperation({ summary: 'AIREC: sản phẩm tương tự một listing' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  similar(@Param('listingId') listingId: string, @Query('limit') limit?: string) {
    return this.svc.similar(listingId, clampLimit(limit));
  }

  @Get('for-you')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'AIREC: gợi ý cá nhân hoá theo wishlist, đơn thuê, đánh giá' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  forYou(@Req() req: AuthenticatedRequest, @Query('limit') limit?: string) {
    return this.svc.forYou(req.authUserId, clampLimit(limit));
  }
}
