import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AccessTokenGuard, AuthenticatedRequest } from '../auth/guards/access-token.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { SupportService } from './support.service';
import { CreateTicketDto, ListMyTicketsQueryDto, TicketReplyDto } from './dto/support.dto';

@ApiTags('support')
@Controller('support')
export class SupportController {
  constructor(private readonly svc: SupportService) {}

  @Get('faqs')
  @ApiOperation({ summary: 'SUPPORT-04: FAQ đã xuất bản (công khai)' })
  faqs() {
    return this.svc.listFaqs();
  }

  @Post('tickets')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.TRAVELER, Role.PROVIDER)
  @ApiOperation({ summary: 'SUPPORT-01: Gửi ticket hỗ trợ' })
  create(@Body() dto: CreateTicketDto, @Req() req: AuthenticatedRequest) {
    return this.svc.create(req.authUserId, dto);
  }

  @Get('tickets')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.TRAVELER, Role.PROVIDER)
  @ApiOperation({ summary: 'SUPPORT-01: Ticket của tôi' })
  list(@Query() q: ListMyTicketsQueryDto, @Req() req: AuthenticatedRequest) {
    return this.svc.listMine(req.authUserId, q);
  }

  @Get('tickets/:id')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.TRAVELER, Role.PROVIDER)
  @ApiOperation({ summary: 'SUPPORT-01: Chi tiết ticket và hội thoại' })
  detail(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.svc.detail(req.authUserId, id);
  }

  @Post('tickets/:id/messages')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.TRAVELER, Role.PROVIDER)
  @ApiOperation({ summary: 'SUPPORT-01: Bổ sung phản hồi vào ticket' })
  reply(@Param('id') id: string, @Body() dto: TicketReplyDto, @Req() req: AuthenticatedRequest) {
    return this.svc.reply(req.authUserId, id, dto);
  }

  @Patch('tickets/:id/close')
  @HttpCode(200)
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.TRAVELER, Role.PROVIDER)
  @ApiOperation({ summary: 'SUPPORT-01: Đóng ticket của tôi' })
  close(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.svc.close(req.authUserId, id);
  }
}
