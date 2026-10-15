import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AdminBookingsService } from './admin-bookings.service';
import { ListAdminBookingsQueryDto } from './dto/admin-bookings.dto';

@ApiTags('admin-bookings')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/bookings-overview')
export class AdminBookingsController {
  constructor(private readonly svc: AdminBookingsService) {}

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
}
