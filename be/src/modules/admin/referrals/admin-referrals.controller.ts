import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AdminReferralListQueryDto } from '../../referrals/dto/referrals.dto';
import { AdminReferralsService } from './admin-referrals.service';

@ApiTags('admin-referrals')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/referrals')
export class AdminReferralsController {
  constructor(private readonly service: AdminReferralsService) {}

  @Get()
  @ApiOperation({ summary: 'LOYALTY-02: Danh sách giới thiệu, lọc theo trạng thái (REJECTED = nghi gian lận)' })
  list(@Query() query: AdminReferralListQueryDto) {
    return this.service.list(query);
  }
}
