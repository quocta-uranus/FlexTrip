import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { DateRangeQueryDto } from '../../../common/dto/date-range.dto';
import { AdminCommissionsService, ListCommissionsQueryDto } from './admin-commissions.service';

@ApiTags('admin-finance')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/finance/commissions')
export class AdminCommissionsController {
  constructor(private readonly svc: AdminCommissionsService) {}

  @Get()
  @ApiOperation({ summary: 'PAY-08: Danh sách hoa hồng theo kỳ' })
  list(@Query() q: ListCommissionsQueryDto) {
    return this.svc.list(q);
  }

  @Get('booking/:bookingId')
  @ApiOperation({ summary: 'PAY-08: Chi tiết ledger một booking' })
  detail(@Param('bookingId') bookingId: string) {
    return this.svc.detail(bookingId);
  }

  @Get('staff/:staffId')
  @ApiOperation({ summary: 'PAY-08: Hoa hồng của một staff theo kỳ' })
  byStaff(@Param('staffId') staffId: string, @Query() q: DateRangeQueryDto) {
    return this.svc.byStaff(staffId, q);
  }
}
