import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { DateRangeQueryDto } from '../../../common/dto/date-range.dto';
import { AdminAnalyticsService } from './admin-analytics.service';
import { TimeseriesQueryDto } from './dto/admin-analytics.dto';

@ApiTags('admin-analytics')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminAnalyticsController {
  constructor(private readonly svc: AdminAnalyticsService) {}

  @Get('analytics/overview')
  @ApiOperation({ summary: 'ADMIN-06: KPI tổng quan' })
  overview(@Query() q: DateRangeQueryDto) {
    return this.svc.overview(q);
  }

  @Get('analytics/timeseries')
  @ApiOperation({ summary: 'ADMIN-06: Chuỗi thời gian doanh thu/booking/user' })
  timeseries(@Query() q: TimeseriesQueryDto) {
    return this.svc.timeseries(q);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'ADMIN: Số liệu trang tổng quan admin' })
  dashboard() {
    return this.svc.dashboard();
  }
}
