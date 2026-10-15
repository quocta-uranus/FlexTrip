import {
  ListingReadGuard,
  ListingReadRequest,
} from '../listing-access/listing-read.guard';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import {
  AccessTokenGuard,
  AuthenticatedRequest,
} from '../auth/guards/access-token.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AvailabilityService } from './availability.service';
import {
  AvailabilityQueryDto,
  BlockDatesDto,
  CheckAvailabilityDto,
  RentalConfigDto,
  UnblockDatesDto,
} from './dto/availability.dto';

@ApiTags('availability')
@Controller('listings/:listingId')
export class AvailabilityController {
  constructor(private readonly svc: AvailabilityService) {}

  // ─── Public ───────────────────────────────────────────────────────────────

  @Get('availability')
  @UseGuards(ListingReadGuard)
  @ApiOperation({ summary: 'Lấy blocked/booked dates theo khoảng thời gian' })
  async getAvailability(
    @Param('listingId') listingId: string,
    @Query() query: AvailabilityQueryDto,
    @Req() req: ListingReadRequest,
  ) {
    const data = await this.svc.getAvailability(
      listingId,
      query.from,
      query.to,
    );
    if (req.listingReadOwner) return data;
    return {
      ...data,
      manuallyBlocked: data.manuallyBlocked.map(({ date }) => ({ date })),
    };
  }

  @Post('availability/check')
  @UseGuards(ListingReadGuard)
  @HttpCode(200)
  @ApiOperation({ summary: 'Kiểm tra availability cho ngày + số lượng cụ thể' })
  checkAvailability(
    @Param('listingId') listingId: string,
    @Body() dto: CheckAvailabilityDto,
  ) {
    return this.svc.checkAvailability(
      listingId,
      new Date(dto.startDate),
      new Date(dto.endDate),
      dto.quantity ?? 1,
    );
  }

  @Get('rental-config')
  @UseGuards(ListingReadGuard)
  @ApiOperation({ summary: 'Lấy cấu hình min/max days và deposit rate' })
  getRentalConfig(@Param('listingId') listingId: string) {
    return this.svc.getRentalConfig(listingId);
  }

  // ─── Provider only ────────────────────────────────────────────────────────

  @Post('availability/block')
  @HttpCode(200)
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.PROVIDER)
  @ApiOperation({ summary: 'Provider: block ngày không cho thuê' })
  blockDates(
    @Param('listingId') listingId: string,
    @Body() dto: BlockDatesDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.svc.blockDates(listingId, req.authUserId, dto);
  }

  @Post('availability/unblock')
  @HttpCode(200)
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.PROVIDER)
  @ApiOperation({ summary: 'Provider: mở lại ngày đã block' })
  unblockDates(
    @Param('listingId') listingId: string,
    @Body() dto: UnblockDatesDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.svc.unblockDates(listingId, req.authUserId, dto);
  }

  @Put('rental-config')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.PROVIDER)
  @ApiOperation({ summary: 'Provider: cập nhật min/max rental days' })
  updateRentalConfig(
    @Param('listingId') listingId: string,
    @Body() dto: RentalConfigDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.svc.updateRentalConfig(listingId, req.authUserId, dto);
  }
}
