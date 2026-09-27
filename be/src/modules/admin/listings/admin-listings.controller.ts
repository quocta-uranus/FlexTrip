import { Body, Controller, Get, HttpCode, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AccessTokenGuard, AuthenticatedRequest } from '../../auth/guards/access-token.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { requestContext } from '../../../common/request-context';
import { AdminListingsService } from './admin-listings.service';
import { ListAdminListingsQueryDto, ModerateListingDto } from './dto/admin-listings.dto';

@ApiTags('admin-listings')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/listings')
export class AdminListingsController {
  constructor(private readonly svc: AdminListingsService) {}

  @Get()
  @ApiOperation({ summary: 'ADMIN-03: Danh sách tin cần kiểm duyệt' })
  list(@Query() q: ListAdminListingsQueryDto) {
    return this.svc.list(q);
  }

  @Get('stats')
  @ApiOperation({ summary: 'ADMIN-03: Thống kê kiểm duyệt' })
  stats() {
    return this.svc.stats();
  }

  @Get(':id/flags')
  @ApiOperation({ summary: 'ADMIN-03: Lịch sử báo cáo của tin' })
  flags(@Param('id') id: string) {
    return this.svc.flags(id);
  }

  @Patch(':id/moderate')
  @HttpCode(200)
  @ApiOperation({ summary: 'ADMIN-03: Ẩn / gỡ / khôi phục / giữ tin' })
  moderate(@Param('id') id: string, @Body() dto: ModerateListingDto, @Req() req: AuthenticatedRequest) {
    return this.svc.moderate(id, dto, requestContext(req));
  }
}
