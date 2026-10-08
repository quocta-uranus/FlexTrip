import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { requestContext } from '../../../common/request-context';
import {
  AccessTokenGuard,
  AuthenticatedRequest,
} from '../../auth/guards/access-token.guard';
import { AdminReviewsService } from './admin-reviews.service';
import {
  ListAdminReviewsQueryDto,
  ModerateReviewDto,
} from './dto/admin-reviews.dto';

@ApiTags('admin-reviews')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/reviews')
export class AdminReviewsController {
  constructor(private readonly reviews: AdminReviewsService) {}

  @Get()
  @ApiOperation({ summary: 'REVIEW-03: Danh sách đánh giá để kiểm duyệt' })
  list(@Query() query: ListAdminReviewsQueryDto) {
    return this.reviews.list(query);
  }

  @Patch(':id/moderate')
  @HttpCode(200)
  @ApiOperation({ summary: 'REVIEW-03: Duyệt hoặc từ chối đánh giá' })
  moderate(
    @Param('id') id: string,
    @Body() dto: ModerateReviewDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.reviews.moderate(id, dto, requestContext(req, Role.ADMIN));
  }

  @Post(':id/reanalyze')
  @HttpCode(202)
  @ApiOperation({ summary: 'REVIEW-03: Phân tích lại đánh giá bằng AI' })
  reanalyze(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.reviews.reanalyze(id, requestContext(req, Role.ADMIN));
  }
}
