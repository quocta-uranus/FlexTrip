import { Body, Controller, Get, HttpCode, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { DenyRoles } from '../../common/decorators/deny-roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AccessTokenGuard, AuthenticatedRequest } from '../auth/guards/access-token.guard';
import { LoyaltyTransactionsQueryDto, RedeemRewardDto } from './dto/loyalty.dto';
import { LoyaltyService } from './loyalty.service';

@ApiTags('loyalty')
@ApiBearerAuth()
@Controller('loyalty')
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(Role.TRAVELER, Role.PROVIDER)
@DenyRoles(Role.ADMIN, Role.STAFF)
export class LoyaltyController {
  constructor(private readonly loyalty: LoyaltyService) {}

  @Get('me')
  @ApiOperation({ summary: 'LOYALTY-01: Số dư điểm và mốc đổi thưởng kế tiếp' })
  me(@Req() req: AuthenticatedRequest) {
    return this.loyalty.me(req.authUserId);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'LOYALTY-01: Lịch sử điểm' })
  transactions(@Req() req: AuthenticatedRequest, @Query() query: LoyaltyTransactionsQueryDto) {
    return this.loyalty.transactions(req.authUserId, query);
  }

  @Get('rewards')
  @ApiOperation({ summary: 'LOYALTY-01: Bảng mốc đổi thưởng' })
  rewards() {
    return this.loyalty.rewards();
  }

  @Post('redeem')
  @HttpCode(200)
  @ApiOperation({ summary: 'LOYALTY-01: Đổi điểm lấy voucher' })
  redeem(@Req() req: AuthenticatedRequest, @Body() dto: RedeemRewardDto) {
    return this.loyalty.redeem(req.authUserId, dto.rewardId);
  }
}
