import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AccessTokenGuard, AuthenticatedRequest } from '../../auth/guards/access-token.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { requestContext } from '../../../common/request-context';
import { AdminStaffBookingsService } from './admin-staff-bookings.service';
import { AssignStaffDto, ListAssignableBookingsQueryDto } from './dto/admin-staff-rules.dto';

@ApiTags('admin-staff')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/bookings')
export class AdminStaffBookingsController {
  constructor(private readonly svc: AdminStaffBookingsService) {}

  @Get()
  @ApiOperation({ summary: 'ADMIN-10: Booking cần/đã phân công' })
  list(@Query() q: ListAssignableBookingsQueryDto) {
    return this.svc.list(q);
  }

  @Patch(':id/assign')
  @HttpCode(200)
  @ApiOperation({ summary: 'ADMIN-10: Gán nhân viên cho booking' })
  assign(@Param('id') id: string, @Body() dto: AssignStaffDto, @Req() req: AuthenticatedRequest) {
    return this.svc.assign(id, dto, requestContext(req));
  }

  @Post(':id/auto-assign')
  @ApiOperation({ summary: 'ADMIN-10: Tự gán theo rule khu vực' })
  autoAssign(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.svc.autoAssign(id, requestContext(req));
  }

  @Delete(':id/assign')
  @ApiOperation({ summary: 'ADMIN-10: Bỏ gán nhân viên' })
  unassign(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.svc.unassign(id, requestContext(req));
  }
}
