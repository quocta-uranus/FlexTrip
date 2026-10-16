import { Controller, Get, Post, Param, Query, Body, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AccessTokenGuard, AuthenticatedRequest } from '../auth/guards/access-token.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaymentAiService } from './payment-ai.service';

@ApiTags('payment-ai')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, RolesGuard)
@Controller('payment-ai')
export class PaymentAiController {
  constructor(private readonly svc: PaymentAiService) {}

  @Get('deposit-recommendation/:listingId')
  @Roles(Role.TRAVELER)
  @ApiOperation({ summary: 'PAY-AI-02: Gợi ý mức cọc phù hợp cho traveler' })
  recommendDeposit(
    @Param('listingId') listingId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.svc.recommendDeposit(listingId, req.authUserId);
  }

  @Get('dispute-assist/:disputeId')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'PAY-AI-03: AI gợi ý hướng giải quyết tranh chấp (Admin)' })
  assistDispute(@Param('disputeId') disputeId: string) {
    return this.svc.assistDispute(disputeId);
  }

  @Get('cashflow-forecast')
  @Roles(Role.PROVIDER)
  @ApiOperation({ summary: 'PAY-AI-04: Dự báo doanh thu provider 30/60/90 ngày' })
  @ApiQuery({ name: 'days', enum: [30, 60, 90], required: false })
  cashflowForecast(
    @Req() req: AuthenticatedRequest,
    @Query('days') days?: string,
  ) {
    const d = (parseInt(days ?? '30', 10) as 30 | 60 | 90) || 30;
    return this.svc.cashflowForecast(req.authUserId, d);
  }
}
