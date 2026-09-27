import { Body, Controller, Get, HttpCode, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AccessTokenGuard, AuthenticatedRequest } from '../../auth/guards/access-token.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { requestContext } from '../../../common/request-context';
import { SystemConfigService } from '../../system-config/system-config.service';
import { ResetConfigDto, UpdateConfigDto } from './dto/admin-config.dto';

@ApiTags('admin-config')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/config')
export class AdminConfigController {
  constructor(private readonly config: SystemConfigService) {}

  @Get()
  @ApiOperation({ summary: 'ADMIN-08: Xem cấu hình ngưỡng' })
  get() {
    return this.config.getAll();
  }

  @Put()
  @ApiOperation({ summary: 'ADMIN-08: Cập nhật cấu hình' })
  update(@Body() dto: UpdateConfigDto, @Req() req: AuthenticatedRequest) {
    return this.config.update(dto.values, requestContext(req));
  }

  @Post('reset')
  @HttpCode(200)
  @ApiOperation({ summary: 'ADMIN-08: Khôi phục mặc định' })
  reset(@Body() dto: ResetConfigDto, @Req() req: AuthenticatedRequest) {
    return this.config.reset(dto.keys, requestContext(req));
  }
}
