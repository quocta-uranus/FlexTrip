import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { DenyRoles } from '../../common/decorators/deny-roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import {
  AccessTokenGuard,
  AuthenticatedRequest,
} from '../auth/guards/access-token.guard';
import {
  ResolveGuestWishlistDto,
  SyncWishlistDto,
  WishlistListingParamDto,
  WishlistQueryDto,
} from './wishlist.dto';
import { WishlistService } from './wishlist.service';

@ApiTags('wishlist')
@ApiBearerAuth()
@Controller('wishlist')
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(Role.TRAVELER, Role.PROVIDER)
@DenyRoles(Role.ADMIN, Role.STAFF)
export class WishlistController {
  constructor(private readonly service: WishlistService) {}

  @Get()
  @ApiOperation({ summary: 'SRC-07: Danh sách thiết bị yêu thích' })
  list(@Req() req: AuthenticatedRequest, @Query() query: WishlistQueryDto) {
    return this.service.list(req.authUserId, query);
  }

  @Get('ids')
  @ApiOperation({ summary: 'SRC-07: Các Listing ID đang yêu thích' })
  ids(@Req() req: AuthenticatedRequest) {
    return this.service.ids(req.authUserId);
  }

  @Post('sync')
  @ApiOperation({ summary: 'SRC-07: Gộp Wishlist Guest vào tài khoản' })
  sync(@Req() req: AuthenticatedRequest, @Body() dto: SyncWishlistDto) {
    return this.service.sync(req.authUserId, dto.listingIds);
  }

  @Post(':listingId')
  @ApiOperation({ summary: 'SRC-07: Thêm thiết bị yêu thích' })
  add(
    @Req() req: AuthenticatedRequest,
    @Param() params: WishlistListingParamDto,
  ) {
    return this.service.add(req.authUserId, params.listingId);
  }

  @Delete(':listingId')
  @ApiOperation({ summary: 'SRC-07: Bỏ thiết bị yêu thích' })
  remove(
    @Req() req: AuthenticatedRequest,
    @Param() params: WishlistListingParamDto,
  ) {
    return this.service.remove(req.authUserId, params.listingId);
  }
}

@ApiTags('wishlist')
@Controller('wishlist/guest')
export class GuestWishlistController {
  constructor(private readonly service: WishlistService) {}

  @Post('resolve')
  @ApiOperation({
    summary: 'SRC-07: Lấy thông tin công khai cho Wishlist Guest',
  })
  resolve(@Body() dto: ResolveGuestWishlistDto) {
    return this.service.resolveGuest(dto.listingIds);
  }
}
