import { ListingReadGuard } from '../listing-access/listing-read.guard';
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { DenyRoles } from '../../common/decorators/deny-roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { requestContext } from '../../common/request-context';
import {
  AccessTokenGuard,
  AuthenticatedRequest,
} from '../auth/guards/access-token.guard';
import {
  AppealReviewDto,
  CreateReviewDto,
  EditReviewDto,
  ReportReviewDto,
  RespondToReviewDto,
  ReviewSentimentQueryDto,
} from './dto/review.dto';
import { ReviewsService } from './reviews.service';

@ApiTags('reviews')
@Controller()
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Post('reviews')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.TRAVELER, Role.PROVIDER)
  @DenyRoles(Role.ADMIN)
  @ApiOperation({
    summary: 'REVIEW-01: Traveler đánh giá một booking đã hoàn thành',
  })
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateReviewDto) {
    return this.reviews.create(req.authUserId, dto);
  }

  @Patch('reviews/:id')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.TRAVELER, Role.PROVIDER)
  @DenyRoles(Role.ADMIN)
  @ApiOperation({
    summary:
      'REVIEW-01: Traveler sửa đánh giá của mình một lần trong thời hạn, review được kiểm duyệt lại',
  })
  edit(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: EditReviewDto,
  ) {
    return this.reviews.edit(
      req.authUserId,
      id,
      dto,
      requestContext(req, Role.TRAVELER),
    );
  }

  @Post('reviews/:id/appeal')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.TRAVELER, Role.PROVIDER)
  @DenyRoles(Role.ADMIN)
  @ApiOperation({
    summary: 'REVIEW-03: Traveler khiếu nại một lần khi đánh giá bị từ chối',
  })
  appeal(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: AppealReviewDto,
  ) {
    return this.reviews.appeal(
      req.authUserId,
      id,
      dto,
      requestContext(req, Role.TRAVELER),
    );
  }

  @Post('reviews/:id/report')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.PROVIDER)
  @ApiOperation({
    summary:
      'REVIEW-03: Provider báo cáo đánh giá sai sự thật hoặc vi phạm, admin sẽ xử lý',
  })
  report(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: ReportReviewDto,
  ) {
    return this.reviews.report(
      req.authUserId,
      id,
      dto,
      requestContext(req, Role.PROVIDER),
    );
  }

  @Get('reviews/policy')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({
    summary: 'REVIEW-01: Hạn đánh giá và thời gian được sửa do admin cấu hình',
  })
  policy() {
    return this.reviews.policy();
  }

  @Get('reviews/mine')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.TRAVELER, Role.PROVIDER)
  @DenyRoles(Role.ADMIN)
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

  @Get('reviews/sentiment')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.PROVIDER, Role.ADMIN)
  @ApiOperation({
    summary: 'REVIEW-04: Xu hướng cảm xúc từ các review đã được AI phân tích',
  })
  sentiment(
    @Req() req: AuthenticatedRequest,
    @Query() query: ReviewSentimentQueryDto,
  ) {
    return this.reviews.getSentimentDashboard(
      req.authUserId,
      req.authRoles ?? [],
      query,
    );
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
  @UseGuards(ListingReadGuard)
  @ApiOperation({
    summary: 'REVIEW-01: Danh sách đánh giá công khai của listing',
  })
  published(@Param('listingId') listingId: string) {
    return this.reviews.findPublishedForListing(listingId);
  }
}
