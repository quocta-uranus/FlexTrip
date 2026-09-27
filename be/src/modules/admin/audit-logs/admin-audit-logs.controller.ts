import { Controller, Get, Header, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AdminAuditLogsService } from './admin-audit-logs.service';
import { ListAuditLogsQueryDto } from './dto/admin-audit-logs.dto';

@ApiTags('admin-audit-logs')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/audit-logs')
export class AdminAuditLogsController {
  constructor(private readonly svc: AdminAuditLogsService) {}

  @Get()
  @ApiOperation({ summary: 'ADMIN-09: Lịch sử thao tác' })
  list(@Query() q: ListAuditLogsQueryDto) {
    return this.svc.list(q);
  }

  @Get('stats')
  @ApiOperation({ summary: 'ADMIN-09: Thống kê thao tác' })
  stats() {
    return this.svc.stats();
  }

  @Get('export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="audit-logs.csv"')
  @ApiOperation({ summary: 'ADMIN-09: Xuất CSV' })
  export(@Query() q: ListAuditLogsQueryDto) {
    return this.svc.exportCsv(q);
  }
}
