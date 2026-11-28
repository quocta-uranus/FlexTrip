import { Body, Controller, Get, HttpCode, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AccessTokenGuard, AuthenticatedRequest } from '../../auth/guards/access-token.guard';
import { requestContext } from '../../../common/request-context';
import { AdminOverdueService } from './admin-overdue.service';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AdminBookingsService } from './admin-bookings.service';
import { ListAdminBookingsQueryDto, ResolveOverdueHandoverDto } from './dto/admin-bookings.dto';

@ApiTags('admin-bookings')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/bookings-overview')
export class AdminBookingsController {
  constructor(
    private readonly svc: AdminBookingsService,
    private readonly overdue: AdminOverdueService,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Thống kê booking theo trạng thái' })
  stats() {
    return this.svc.stats();
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách tất cả booking (admin)' })
  list(@Query() q: ListAdminBookingsQueryDto) {
    return this.svc.list(q);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết booking (admin)' })
  detail(@Param('id') id: string) {
    return this.svc.detail(id);
  }

  @Post(':id/overdue-handover')
  @HttpCode(200)
  @ApiOperation({ summary: 'Huỷ đơn quá hạn bàn giao theo bên có lỗi' })
  resolveHandover(@Param('id') id: string, @Body() dto: ResolveOverdueHandoverDto, @Req() req: AuthenticatedRequest) {
    return this.overdue.resolveHandover(id, dto, requestContext(req));
  }

  @Post(':id/late-return-dispute')
  @HttpCode(200)
  @ApiOperation({ summary: 'Mở tranh chấp cho đơn trả trễ' })
  lateReturn(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.overdue.openLateReturnDispute(id, requestContext(req));
  }
}
