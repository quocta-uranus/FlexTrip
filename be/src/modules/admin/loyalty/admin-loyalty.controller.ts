import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AccessTokenGuard, AuthenticatedRequest } from '../../auth/guards/access-token.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { requestContext } from '../../../common/request-context';
import { AdminLoyaltyService } from './admin-loyalty.service';
import { CreateRewardDto, UpdateRewardDto } from './dto/admin-loyalty.dto';

@ApiTags('admin-loyalty')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/loyalty')
export class AdminLoyaltyController {
  constructor(private readonly service: AdminLoyaltyService) {}

  @Get('stats')
  @ApiOperation({ summary: 'LOYALTY-01: Thống kê điểm thưởng' })
  stats() {
    return this.service.stats();
  }

  @Get('rewards')
  @ApiOperation({ summary: 'LOYALTY-01: Bảng mốc đổi thưởng (gồm cả mốc đã tắt)' })
  rewards() {
    return this.service.listRewards();
  }

  @Post('rewards')
  @ApiOperation({ summary: 'LOYALTY-01: Thêm mốc đổi thưởng' })
  create(@Body() dto: CreateRewardDto, @Req() req: AuthenticatedRequest) {
    return this.service.createReward(dto, requestContext(req));
  }

  @Patch('rewards/:id')
  @ApiOperation({ summary: 'LOYALTY-01: Sửa / tắt mốc đổi thưởng' })
  update(@Param('id') id: string, @Body() dto: UpdateRewardDto, @Req() req: AuthenticatedRequest) {
    return this.service.updateReward(id, dto, requestContext(req));
  }
}
