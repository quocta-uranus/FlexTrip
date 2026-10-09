import {
  Body, Controller, Get, Param, Post, Req, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AccessTokenGuard, AuthenticatedRequest } from '../auth/guards/access-token.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { DenyRoles } from '../../common/decorators/deny-roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ModifyBookingService } from './modify-booking.service';
import { CreateModifyRequestDto, RespondModifyRequestDto } from './dto/modify-booking.dto';

@ApiTags('Booking — Modify Requests')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(Role.TRAVELER, Role.PROVIDER)
@DenyRoles(Role.ADMIN)
@Controller('bookings/:bookingId/modify-requests')
export class ModifyBookingController {
  constructor(private readonly svc: ModifyBookingService) {}

  @Post()
  @ApiOperation({ summary: 'BOOK-05: Traveler yêu cầu thay đổi ngày/số lượng booking' })
  createRequest(
    @Param('bookingId') bookingId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateModifyRequestDto,
  ) {
    return this.svc.createRequest(bookingId, req.authUserId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'BOOK-05: Xem danh sách modify requests của booking' })
  listRequests(
    @Param('bookingId') bookingId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.svc.listRequests(bookingId, req.authUserId);
  }

  @Post(':requestId/accept')
  @ApiOperation({ summary: 'BOOK-05: Provider chấp nhận yêu cầu thay đổi' })
  acceptRequest(
    @Param('bookingId') _bookingId: string,
    @Param('requestId') requestId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: RespondModifyRequestDto,
  ) {
    return this.svc.acceptRequest(requestId, req.authUserId, dto);
  }

  @Post(':requestId/reject')
  @ApiOperation({ summary: 'BOOK-05: Provider từ chối yêu cầu thay đổi' })
  rejectRequest(
    @Param('bookingId') _bookingId: string,
    @Param('requestId') requestId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: RespondModifyRequestDto,
  ) {
    return this.svc.rejectRequest(requestId, req.authUserId, dto);
  }
}
