import { Body, Controller, Get, Header, HttpCode, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role, WithdrawStatus } from '@prisma/client';
import { AccessTokenGuard, AuthenticatedRequest } from '../../auth/guards/access-token.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { requestContext } from '../../../common/request-context';
import { DateRangeQueryDto } from '../../../common/dto/date-range.dto';
import { AdminTransactionsService } from './admin-transactions.service';
import { AdminPayoutsService } from './admin-payouts.service';
import { AdminWithdrawService, ProcessWithdrawDto } from './admin-withdraw.service';
import {
  GeneratePayoutsDto, ListPayoutsQueryDto, ListTransactionsQueryDto, UpdatePayoutDto,
} from './dto/admin-finance.dto';

@ApiTags('admin-finance')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/finance')
export class AdminFinanceController {
  constructor(
    private readonly tx: AdminTransactionsService,
    private readonly payouts: AdminPayoutsService,
    private readonly withdraws: AdminWithdrawService,
  ) {}

  @Get('transactions')
  @ApiOperation({ summary: 'ADMIN-05: Danh sách giao dịch' })
  transactions(@Query() q: ListTransactionsQueryDto) {
    return this.tx.list(q);
  }

  @Get('transactions/export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="transactions.csv"')
  @ApiOperation({ summary: 'ADMIN-05: Xuất CSV giao dịch' })
  exportTransactions(@Query() q: ListTransactionsQueryDto) {
    return this.tx.exportCsv(q);
  }

  @Get('summary')
  @ApiOperation({ summary: 'ADMIN-05: Tổng quan tài chính & đối soát' })
  summary(@Query() q: DateRangeQueryDto) {
    return this.tx.summary(q);
  }

  @Post('payouts/generate')
  @ApiOperation({ summary: 'ADMIN-05: Chạy đối soát — tạo/tính lại payout theo kỳ' })
  generate(@Body() dto: GeneratePayoutsDto, @Req() req: AuthenticatedRequest) {
    return this.payouts.generate(dto, requestContext(req));
  }

  @Get('payouts')
  @ApiOperation({ summary: 'ADMIN-05: Danh sách payout' })
  listPayouts(@Query() q: ListPayoutsQueryDto) {
    return this.payouts.list(q);
  }

  @Get('payouts/export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="payouts.csv"')
  @ApiOperation({ summary: 'ADMIN-05: Xuất CSV payout' })
  exportPayouts(@Query() q: ListPayoutsQueryDto) {
    return this.payouts.exportCsv(q);
  }

  @Patch('payouts/:id')
  @HttpCode(200)
  @ApiOperation({ summary: 'ADMIN-05: Ghi nhận chi trả / đổi trạng thái payout' })
  updatePayout(@Param('id') id: string, @Body() dto: UpdatePayoutDto, @Req() req: AuthenticatedRequest) {
    return this.payouts.update(id, dto, requestContext(req));
  }

  // ── Withdraw requests (individual cash-out from provider/staff wallet) ──

  @Get('platform-summary')
  @ApiOperation({ summary: 'ADMIN-05: Tổng quan ví nền tảng — escrow + doanh thu + pending withdrawals' })
  platformSummary() {
    return this.withdraws.platformSummary();
  }

  @Get('withdraw-requests')
  @ApiOperation({ summary: 'ADMIN-05: Danh sách yêu cầu rút tiền' })
  listWithdraws(@Query('status') status?: string) {
    const s = status && status !== 'ALL' ? (status as WithdrawStatus) : undefined;
    return this.withdraws.list(s);
  }

  @Patch('withdraw-requests/:id')
  @HttpCode(200)
  @ApiOperation({ summary: 'ADMIN-05: Duyệt hoặc từ chối yêu cầu rút tiền' })
  processWithdraw(@Param('id') id: string, @Body() dto: ProcessWithdrawDto, @Req() req: AuthenticatedRequest) {
    return this.withdraws.process(id, dto, requestContext(req));
  }
}
