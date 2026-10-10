import { Controller, Get, Patch, Param, Req, UseGuards, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AccessTokenGuard, AuthenticatedRequest } from '../auth/guards/access-token.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ContractsService } from './contracts.service';

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

  @Get(':bookingId/can-sign')
  @Roles(Role.PROVIDER)
  @ApiOperation({ summary: 'Kiểm tra hợp đồng có thể ký không' })
  async canSign(@Param('bookingId') bookingId: string) {
    const contract = await this.svc.getStatusOnly(bookingId);
    return { canSign: contract?.status === 'TRAVELER_SIGNED' };
  }
}
