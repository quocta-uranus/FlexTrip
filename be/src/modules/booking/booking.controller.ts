import {
  Body, Controller, Get, HttpCode, Param, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AccessTokenGuard, AuthenticatedRequest } from '../auth/guards/access-token.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { BookingService } from './booking.service';
import {
  CancelBookingDto, ConfirmPaymentDto, CreateBookingDto,
  DeclineBookingDto, ListBookingsQueryDto,
} from './dto/booking.dto';

@ApiTags('bookings')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('bookings')
export class BookingController {
  constructor(private readonly svc: BookingService) {}

  // ─── Traveler ─────────────────────────────────────────────────────────────

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.TRAVELER)
  @ApiOperation({ summary: 'BOOK-01: Tạo booking mới' })
  create(@Body() dto: CreateBookingDto, @Req() req: AuthenticatedRequest) {
    return this.svc.create(req.authUserId, dto);
  }

  @Post(':id/confirm-payment')
  @HttpCode(200)
  @UseGuards(RolesGuard)
  @Roles(Role.TRAVELER)
  @ApiOperation({ summary: 'BOOK-01: Xác nhận đã thanh toán → PENDING_APPROVAL' })
  confirmPayment(
    @Param('id') id: string,
    @Body() dto: ConfirmPaymentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.svc.confirmPayment(id, req.authUserId, dto);
  }

  // ─── Both ─────────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'BOOK-06: Danh sách bookings (traveler hoặc provider)' })
  findAll(@Query() query: ListBookingsQueryDto, @Req() req: AuthenticatedRequest) {
    return this.svc.findAll(req.authUserId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'BOOK-06: Chi tiết booking' })
  findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.svc.findOne(id, req.authUserId);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @ApiOperation({ summary: 'BOOK-07: Huỷ booking (Traveler hoặc Provider)' })
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelBookingDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.svc.cancel(id, req.authUserId, dto);
  }

  // ─── Provider ─────────────────────────────────────────────────────────────

  @Post(':id/approve')
  @HttpCode(200)
  @UseGuards(RolesGuard)
  @Roles(Role.PROVIDER)
  @ApiOperation({ summary: 'BOOK-04: Provider duyệt booking → CONFIRMED' })
  approve(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.svc.approve(id, req.authUserId);
  }

  @Post(':id/decline')
  @HttpCode(200)
  @UseGuards(RolesGuard)
  @Roles(Role.PROVIDER)
  @ApiOperation({ summary: 'BOOK-04: Provider từ chối booking → CANCELLED + hoàn tiền' })
  decline(
    @Param('id') id: string,
    @Body() dto: DeclineBookingDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.svc.decline(id, req.authUserId, dto);
  }

  @Post(':id/start')
  @HttpCode(200)
  @UseGuards(RolesGuard)
  @Roles(Role.PROVIDER)
  @ApiOperation({ summary: 'BOOK-04: Provider bắt đầu cho thuê → IN_PROGRESS' })
  start(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.svc.start(id, req.authUserId);
  }

  @Post(':id/complete')
  @HttpCode(200)
  @UseGuards(RolesGuard)
  @Roles(Role.PROVIDER)
  @ApiOperation({ summary: 'BOOK-04: Provider hoàn thành cho thuê → COMPLETED' })
  complete(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.svc.complete(id, req.authUserId);
  }
}
