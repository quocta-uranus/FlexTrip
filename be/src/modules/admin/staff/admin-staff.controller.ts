import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AccessTokenGuard, AuthenticatedRequest } from '../../auth/guards/access-token.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { requestContext } from '../../../common/request-context';
import { AdminStaffService } from './admin-staff.service';
import { CreateStaffDto, ListStaffQueryDto, UpdateStaffDto } from './dto/admin-staff.dto';

@ApiTags('admin-staff')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/staff')
export class AdminStaffController {
  constructor(private readonly svc: AdminStaffService) {}

  @Get()
  @ApiOperation({ summary: 'ADMIN-10: Danh sách nhân viên vận hành' })
  list(@Query() q: ListStaffQueryDto) {
    return this.svc.list(q);
  }

  @Get('stats')
  @ApiOperation({ summary: 'ADMIN-10: Thống kê nhân sự & phân công' })
  stats() {
    return this.svc.stats();
  }

  @Post()
  @ApiOperation({ summary: 'ADMIN-10: Tạo tài khoản nhân viên + gửi lời mời' })
  create(@Body() dto: CreateStaffDto, @Req() req: AuthenticatedRequest) {
    return this.svc.create(dto, requestContext(req));
  }

  @Patch(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'ADMIN-10: Cập nhật nhân viên' })
  update(@Param('id') id: string, @Body() dto: UpdateStaffDto, @Req() req: AuthenticatedRequest) {
    return this.svc.update(id, dto, requestContext(req));
  }

  @Post(':id/resend-invite')
  @HttpCode(200)
  @ApiOperation({ summary: 'ADMIN-10: Gửi lại lời mời' })
  resend(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.svc.resendInvite(id, requestContext(req));
  }
}
