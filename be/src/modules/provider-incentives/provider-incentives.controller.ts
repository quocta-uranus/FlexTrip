import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AccessTokenGuard, AuthenticatedRequest } from '../auth/guards/access-token.guard';
import { ProviderIncentivesService } from './provider-incentives.service';

@ApiTags('provider-incentives')
@ApiBearerAuth()
@Controller()
@UseGuards(AccessTokenGuard, RolesGuard)
export class ProviderIncentivesController {
  constructor(private readonly service: ProviderIncentivesService) {}

  @Get('providers/me/incentive')
  @Roles(Role.PROVIDER)
  @ApiOperation({ summary: 'LOYALTY-03: Trạng thái top-rated, điểm và mức giảm phí hiện tại' })
  mine(@Req() req: AuthenticatedRequest) {
    return this.service.mine(req.authUserId);
  }

  @Get('admin/provider-incentives')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'LOYALTY-03: Danh sách Provider top-rated đang được ưu đãi' })
  list() {
    return this.service.listTopRated();
  }

  @Post('admin/provider-incentives/run')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'LOYALTY-03: Chạy tính lại ngay (không chờ job đêm)' })
  run() {
    return this.service.runNightly();
  }
}
