import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { DenyRoles } from '../../common/decorators/deny-roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AccessTokenGuard, AuthenticatedRequest } from '../auth/guards/access-token.guard';
import { ValidateVoucherDto } from './dto/voucher.dto';
import { VouchersService } from './vouchers.service';

@ApiTags('vouchers')
@ApiBearerAuth()
@Controller('vouchers')
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(Role.TRAVELER, Role.PROVIDER)
@DenyRoles(Role.ADMIN, Role.STAFF)
export class VouchersController {
  constructor(private readonly vouchers: VouchersService) {}

  @Get('mine')
  @ApiOperation({ summary: 'LOYALTY-04: Voucher dùng được và lịch sử dùng' })
  mine(@Req() req: AuthenticatedRequest) {
    return this.vouchers.mine(req.authUserId);
  }

  @Post('validate')
  @HttpCode(200)
  @ApiOperation({ summary: 'LOYALTY-04: Xem trước số tiền giảm khi áp mã' })
  validate(@Req() req: AuthenticatedRequest, @Body() dto: ValidateVoucherDto) {
    return this.vouchers.validate(req.authUserId, dto);
  }
}
