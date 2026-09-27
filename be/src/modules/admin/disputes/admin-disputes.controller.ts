import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AccessTokenGuard, AuthenticatedRequest } from '../../auth/guards/access-token.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { requestContext } from '../../../common/request-context';
import { AdminDisputesService } from './admin-disputes.service';
import {
  ListDisputesQueryDto, ResolveDisputeDto, UpdateDisputePriorityDto, UpdateDisputeStatusDto,
} from './dto/admin-disputes.dto';

@ApiTags('admin-disputes')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/disputes')
export class AdminDisputesController {
  constructor(private readonly svc: AdminDisputesService) {}

  @Get()
  @ApiOperation({ summary: 'ADMIN-04: Danh sách tranh chấp' })
  list(@Query() q: ListDisputesQueryDto) {
    return this.svc.list(q);
  }

  @Get('stats')
  @ApiOperation({ summary: 'ADMIN-04: Thống kê tranh chấp' })
  stats() {
    return this.svc.stats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'ADMIN-04: Chi tiết tranh chấp + booking/payment/contract' })
  detail(@Param('id') id: string) {
    return this.svc.detail(id);
  }

  @Patch(':id/status')
  @HttpCode(200)
  @ApiOperation({ summary: 'ADMIN-04: Đổi trạng thái xử lý' })
  status(@Param('id') id: string, @Body() dto: UpdateDisputeStatusDto, @Req() req: AuthenticatedRequest) {
    return this.svc.changeStatus(id, dto, requestContext(req));
  }

  @Patch(':id/priority')
  @HttpCode(200)
  @ApiOperation({ summary: 'ADMIN-04: Đổi độ ưu tiên' })
  priority(@Param('id') id: string, @Body() dto: UpdateDisputePriorityDto, @Req() req: AuthenticatedRequest) {
    return this.svc.changePriority(id, dto, requestContext(req));
  }

  @Post(':id/resolve')
  @ApiOperation({ summary: 'ADMIN-04: Kết luận tranh chấp (có thể hoàn tiền)' })
  resolve(@Param('id') id: string, @Body() dto: ResolveDisputeDto, @Req() req: AuthenticatedRequest) {
    return this.svc.resolve(id, dto, requestContext(req));
  }
}
