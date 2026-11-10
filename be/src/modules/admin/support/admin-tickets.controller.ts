import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AccessTokenGuard, AuthenticatedRequest } from '../../auth/guards/access-token.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { requestContext } from '../../../common/request-context';
import { AdminTicketsService } from './admin-tickets.service';
import { AdminReplyDto, ListTicketsQueryDto, UpdateTicketDto } from './dto/admin-support.dto';

@ApiTags('admin-support')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/support/tickets')
export class AdminTicketsController {
  constructor(private readonly svc: AdminTicketsService) {}

  @Get()
  @ApiOperation({ summary: 'SUPPORT-02: Danh sách ticket' })
  list(@Query() q: ListTicketsQueryDto) {
    return this.svc.list(q);
  }

  @Get('stats')
  @ApiOperation({ summary: 'SUPPORT-02: Thống kê ticket' })
  stats() {
    return this.svc.stats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'SUPPORT-02: Chi tiết ticket và hội thoại' })
  detail(@Param('id') id: string) {
    return this.svc.detail(id);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'SUPPORT-02: Phản hồi ticket' })
  reply(@Param('id') id: string, @Body() dto: AdminReplyDto, @Req() req: AuthenticatedRequest) {
    return this.svc.reply(id, dto, requestContext(req));
  }

  @Patch(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'SUPPORT-02/03: Đổi trạng thái, phân loại, ưu tiên hoặc người phụ trách' })
  update(@Param('id') id: string, @Body() dto: UpdateTicketDto, @Req() req: AuthenticatedRequest) {
    return this.svc.update(id, dto, requestContext(req));
  }

  @Post(':id/retriage')
  @HttpCode(200)
  @ApiOperation({ summary: 'SUPPORT-03: Chạy lại AI phân loại và đặt ưu tiên' })
  retriage(@Param('id') id: string) {
    return this.svc.retriage(id);
  }
}
