import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { DenyRoles } from '../../common/decorators/deny-roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AccessTokenGuard, AuthenticatedRequest } from '../auth/guards/access-token.guard';
import { ReferralListQueryDto } from './dto/referrals.dto';
import { ReferralsService } from './referrals.service';

@ApiTags('referrals')
@ApiBearerAuth()
@Controller('referrals')
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(Role.TRAVELER, Role.PROVIDER)
@DenyRoles(Role.ADMIN, Role.STAFF)
export class ReferralsController {
  constructor(private readonly referrals: ReferralsService) {}

  @Get('me')
  @ApiOperation({ summary: 'LOYALTY-02: Mã giới thiệu, thống kê và mức thưởng' })
  me(@Req() req: AuthenticatedRequest) {
    return this.referrals.me(req.authUserId);
  }

  @Get('me/list')
  @ApiOperation({ summary: 'LOYALTY-02: Danh sách bạn bè đã giới thiệu' })
  list(@Req() req: AuthenticatedRequest, @Query() query: ReferralListQueryDto) {
    return this.referrals.list(req.authUserId, query);
  }
}
