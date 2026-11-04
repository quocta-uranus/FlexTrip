import { Body, Controller, Delete, Get, Header, HttpCode, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AccessTokenGuard, AuthenticatedRequest } from '../../auth/guards/access-token.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { requestContext } from '../../../common/request-context';
import { AdminReportsService } from './admin-reports.service';
import { AdminReportSchedulesService } from './admin-report-schedules.service';
import { CreateReportScheduleDto, ExportReportQueryDto, UpdateReportScheduleDto } from './dto/admin-reports.dto';

@ApiTags('admin-reports')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/reports')
export class AdminReportsController {
  constructor(
    private readonly reports: AdminReportsService,
    private readonly schedules: AdminReportSchedulesService,
  ) {}

  @Get('export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="report.csv"')
  @ApiOperation({ summary: 'REPORT-01: Xuất báo cáo doanh thu/booking/hoa hồng theo khoảng thời gian' })
  export(@Query() q: ExportReportQueryDto, @Req() req: AuthenticatedRequest) {
    return this.reports.export(q, requestContext(req));
  }

  @Get('schedules')
  @ApiOperation({ summary: 'REPORT-02: Danh sách lịch gửi báo cáo' })
  listSchedules() {
    return this.schedules.list();
  }

  @Post('schedules')
  @ApiOperation({ summary: 'REPORT-02: Tạo lịch gửi báo cáo định kỳ qua email' })
  createSchedule(@Body() dto: CreateReportScheduleDto, @Req() req: AuthenticatedRequest) {
    return this.schedules.create(dto, requestContext(req));
  }

  @Patch('schedules/:id')
  @ApiOperation({ summary: 'REPORT-02: Sửa / tạm dừng lịch gửi báo cáo' })
  updateSchedule(@Param('id') id: string, @Body() dto: UpdateReportScheduleDto, @Req() req: AuthenticatedRequest) {
    return this.schedules.update(id, dto, requestContext(req));
  }

  @Delete('schedules/:id')
  @ApiOperation({ summary: 'REPORT-02: Xoá lịch gửi báo cáo' })
  removeSchedule(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.schedules.remove(id, requestContext(req));
  }

  @Post('schedules/:id/run')
  @HttpCode(200)
  @ApiOperation({ summary: 'REPORT-02: Gửi thử ngay một lịch báo cáo' })
  runSchedule(@Param('id') id: string) {
    return this.schedules.runNow(id);
  }
}
