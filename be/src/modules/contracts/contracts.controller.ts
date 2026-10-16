import { Body, Controller, Get, Patch, Post, Param, Req, UseGuards, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AccessTokenGuard, AuthenticatedRequest } from '../auth/guards/access-token.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ContractsService } from './contracts.service';
import { CheckinDto, CheckoutDto } from './dto/contract.dto';

@ApiTags('contracts')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(Role.TRAVELER, Role.PROVIDER)
@Controller('contracts/booking')
export class ContractsController {
  constructor(private readonly svc: ContractsService) {}

  @Get(':bookingId/preview')
  @ApiOperation({ summary: 'CONTR-01: Preview hợp đồng trước khi ký (traveler)' })
  preview(@Param('bookingId') bookingId: string, @Req() req: AuthenticatedRequest) {
    return this.svc.preview(bookingId, req.authUserId);
  }

  @Get(':bookingId')
  @ApiOperation({ summary: 'CONTR-01: Lấy hợp đồng đã ký' })
  getByBooking(@Param('bookingId') bookingId: string, @Req() req: AuthenticatedRequest) {
    return this.svc.getByBooking(bookingId, req.authUserId);
  }

  @Patch(':bookingId/provider-sign')
  @HttpCode(204)
  @Roles(Role.PROVIDER)
  @ApiOperation({ summary: 'CONTR-01: Provider ký hợp đồng → Booking CONFIRMED' })
  providerSign(@Param('bookingId') bookingId: string, @Req() req: AuthenticatedRequest) {
    return this.svc.providerSign(bookingId, req.authUserId);
  }

  @Post(':bookingId/traveler-sign')
  @HttpCode(204)
  @Roles(Role.TRAVELER)
  @ApiOperation({ summary: 'CONTR-01: Traveler ký hợp đồng (trước khi thanh toán)' })
  travelerSign(@Param('bookingId') bookingId: string, @Req() req: AuthenticatedRequest) {
    return this.svc.travelerSign(bookingId, req.authUserId);
  }

  @Get(':bookingId/can-sign')
  @Roles(Role.PROVIDER)
  @ApiOperation({ summary: 'Kiểm tra hợp đồng có thể ký không' })
  async canSign(@Param('bookingId') bookingId: string) {
    const contract = await this.svc.getStatusOnly(bookingId);
    return { canSign: contract?.status === 'TRAVELER_SIGNED' };
  }

  @Patch(':bookingId/checkin')
  @HttpCode(204)
  @Roles(Role.PROVIDER)
  @ApiOperation({ summary: 'CONTR-03+04: Provider checkin — upload CCCD + ≥3 ảnh → IN_PROGRESS' })
  checkin(
    @Param('bookingId') bookingId: string,
    @Body() dto: CheckinDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.svc.checkin(bookingId, req.authUserId, dto);
  }

  @Patch(':bookingId/checkout')
  @HttpCode(204)
  @Roles(Role.TRAVELER, Role.PROVIDER)
  @ApiOperation({ summary: 'CONTR-04: Upload ảnh trả đồ; Provider có thể chọn complete/dispute' })
  checkout(
    @Param('bookingId') bookingId: string,
    @Body() dto: CheckoutDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.svc.checkout(bookingId, req.authUserId, dto);
  }
}
