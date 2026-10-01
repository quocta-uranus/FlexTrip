import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { requestContext } from '../../common/request-context';
import {
  AccessTokenGuard,
  AuthenticatedRequest,
} from '../auth/guards/access-token.guard';
import { CreateReviewDto, RespondToReviewDto } from './dto/review.dto';
import { ReviewsService } from './reviews.service';

@ApiTags('reviews')
@Controller()
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Post('reviews')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.TRAVELER)
  @ApiOperation({
    summary: 'REVIEW-01: Traveler đánh giá một booking đã hoàn thành',
  })
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateReviewDto) {
    return this.reviews.create(req.authUserId, dto);
  }

  @Get('reviews/mine')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.TRAVELER)
  @ApiOperation({
    summary: 'REVIEW-01: Danh sách đánh giá của Traveler hiện tại',
  })
  mine(@Req() req: AuthenticatedRequest) {
    return this.reviews.findMine(req.authUserId);
  }

  @Get('reviews/received')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.PROVIDER)
  @ApiOperation({
    summary: 'REVIEW-02: Danh sách đánh giá công khai Provider nhận được',
  })
  received(@Req() req: AuthenticatedRequest) {
    return this.reviews.findReceived(req.authUserId);
  }

  @Put('reviews/:id/response')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.PROVIDER)
  @ApiOperation({
    summary: 'REVIEW-02: Provider tạo hoặc cập nhật phản hồi đánh giá',
  })
  respond(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: RespondToReviewDto,
  ) {
    return this.reviews.respond(
      req.authUserId,
      id,
      dto,
      requestContext(req, Role.PROVIDER),
    );
  }

  @Get('listings/:listingId/reviews')
  @ApiOperation({
    summary: 'REVIEW-01: Danh sách đánh giá công khai của listing',
  })
  published(@Param('listingId') listingId: string) {
    return this.reviews.findPublishedForListing(listingId);
  }
}
