import { Body, Controller, Get, HttpCode, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AccessTokenGuard, AuthenticatedRequest } from '../../auth/guards/access-token.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { requestContext } from '../../../common/request-context';
import { AdminUsersService } from './admin-users.service';
import { ListUsersQueryDto, SuspendUserDto, UnsuspendUserDto } from './dto/admin-users.dto';

@ApiTags('admin-users')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly svc: AdminUsersService) {}

  @Get()
  @ApiOperation({ summary: 'ADMIN-01: Danh sách người dùng' })
  list(@Query() q: ListUsersQueryDto) {
    return this.svc.list(q);
  }

  @Get('stats')
  @ApiOperation({ summary: 'ADMIN-01: Thống kê người dùng' })
  stats() {
    return this.svc.stats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'ADMIN-01: Chi tiết người dùng' })
  detail(@Param('id') id: string) {
    return this.svc.detail(id);
  }

  @Patch(':id/suspend')
  @HttpCode(200)
  @ApiOperation({ summary: 'ADMIN-01: Khoá tài khoản' })
  suspend(@Param('id') id: string, @Body() dto: SuspendUserDto, @Req() req: AuthenticatedRequest) {
    return this.svc.suspend(id, dto, requestContext(req));
  }

  @Patch(':id/unsuspend')
  @HttpCode(200)
  @ApiOperation({ summary: 'ADMIN-01: Mở khoá tài khoản' })
  unsuspend(@Param('id') id: string, @Body() dto: UnsuspendUserDto, @Req() req: AuthenticatedRequest) {
    return this.svc.unsuspend(id, dto, requestContext(req));
  }
}
