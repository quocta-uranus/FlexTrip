import {
  Body, Controller, Get, Param, Post, Query, Req, UseGuards,
} from '@nestjs/common';
// Note: Query is still used for wallet/transactions pagination
import { AccessTokenGuard, AuthenticatedRequest } from '../auth/guards/access-token.guard';
import { PaymentsService } from './payments.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { TopupDto } from './dto/topup.dto';
import { ConfirmPayosDto } from './dto/confirm-payos.dto';
import { PayoutRequestDto } from './dto/payout-request.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsSvc: PaymentsService) {}

  // POST /payments/bookings/:bookingId/initiate
  @UseGuards(AccessTokenGuard)
  @Post('bookings/:bookingId/initiate')
  initiatePayment(
    @Param('bookingId') bookingId: string,
    @Body() dto: InitiatePaymentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const ip = req.ip ?? req.socket.remoteAddress ?? '127.0.0.1';
    return this.paymentsSvc.initiatePayment(bookingId, req.authUserId, dto, ip);
  }

  // POST /payments/bookings/:bookingId/pay-rental — trả nốt tiền thuê sau khi provider duyệt
  @UseGuards(AccessTokenGuard)
  @Post('bookings/:bookingId/pay-rental')
  payRental(
    @Param('bookingId') bookingId: string,
    @Body() dto: InitiatePaymentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.paymentsSvc.payRental(bookingId, req.authUserId, dto);
  }

  // POST /payments/payos/confirm — return page re-checks the payment with PayOS
  @UseGuards(AccessTokenGuard)
  @Post('payos/confirm')
  confirmPayosReturn(@Body() dto: ConfirmPayosDto, @Req() req: AuthenticatedRequest) {
    return this.paymentsSvc.confirmPayosReturn(req.authUserId, dto.orderCode);
  }

  // POST /payments/payos/webhook — called by PayOS server (no auth guard)
  // PayOS sends JSON body with signature
  @Post('payos/webhook')
  payosWebhook(@Body() body: Record<string, unknown>) {
    return this.paymentsSvc.handlePayosWebhook(body);
  }

  // POST /payments/payos/topup-webhook — PayOS webhook for wallet top-up
  @Post('payos/topup-webhook')
  payosTopupWebhook(@Body() body: Record<string, unknown>) {
    return this.paymentsSvc.handleTopupPayosWebhook(body);
  }

  // POST /payments/wallet/topup/confirm — topup return page re-checks the payment with PayOS
  @UseGuards(AccessTokenGuard)
  @Post('wallet/topup/confirm')
  confirmTopupReturn(@Body() dto: ConfirmPayosDto, @Req() req: AuthenticatedRequest) {
    return this.paymentsSvc.confirmTopupReturn(req.authUserId, dto.orderCode);
  }

  // GET /payments/wallet
  @UseGuards(AccessTokenGuard)
  @Get('wallet')
  getWallet(@Req() req: AuthenticatedRequest) {
    return this.paymentsSvc.getWalletBalance(req.authUserId);
  }

  // GET /payments/wallet/transactions
  @UseGuards(AccessTokenGuard)
  @Get('wallet/transactions')
  getTransactions(
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.paymentsSvc.getWalletTransactions(
      req.authUserId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  // POST /payments/wallet/topup
  @UseGuards(AccessTokenGuard)
  @Post('wallet/topup')
  topup(@Body() dto: TopupDto, @Req() req: AuthenticatedRequest) {
    const ip = req.ip ?? req.socket.remoteAddress ?? '127.0.0.1';
    return this.paymentsSvc.initiateTopup(req.authUserId, dto, ip);
  }

  // POST /payments/wallet/payout
  @UseGuards(AccessTokenGuard)
  @Post('wallet/payout')
  requestPayout(@Body() dto: PayoutRequestDto, @Req() req: AuthenticatedRequest) {
    return this.paymentsSvc.requestPayout(req.authUserId, dto);
  }

  // GET /payments/invoices/:bookingId
  @UseGuards(AccessTokenGuard)
  @Get('invoices/:bookingId')
  getInvoice(
    @Param('bookingId') bookingId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.paymentsSvc.getInvoice(bookingId, req.authUserId);
  }

  // GET /payments/listings/:listingId/deposit-recommendation
  @UseGuards(AccessTokenGuard)
  @Get('listings/:listingId/deposit-recommendation')
  depositRecommendation(
    @Param('listingId') listingId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.paymentsSvc.getDepositRecommendation(listingId, req.authUserId);
  }
}
