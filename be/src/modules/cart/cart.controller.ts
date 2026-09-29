import {
  Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard, AuthenticatedRequest } from '../auth/guards/access-token.guard';
import { CartService } from './cart.service';
import { AddCartItemDto, CheckoutDto, UpdateCartItemDto } from './dto/cart.dto';

@ApiTags('Cart')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartSvc: CartService) {}

  @Get()
  @ApiOperation({ summary: 'BOOK-02: Xem giỏ hàng' })
  getCart(@Req() req: AuthenticatedRequest) {
    return this.cartSvc.getCart(req.authUserId);
  }

  @Post('items')
  @ApiOperation({ summary: 'BOOK-02: Thêm sản phẩm vào giỏ (hold 15 phút)' })
  addItem(@Req() req: AuthenticatedRequest, @Body() dto: AddCartItemDto) {
    return this.cartSvc.addItem(req.authUserId, dto);
  }

  @Patch('items/:itemId')
  @ApiOperation({ summary: 'BOOK-02: Cập nhật sản phẩm trong giỏ' })
  updateItem(
    @Req() req: AuthenticatedRequest,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartSvc.updateItem(req.authUserId, itemId, dto);
  }

  @Delete('items/:itemId')
  @ApiOperation({ summary: 'BOOK-02: Xoá sản phẩm khỏi giỏ' })
  removeItem(
    @Req() req: AuthenticatedRequest,
    @Param('itemId') itemId: string,
  ) {
    return this.cartSvc.removeItem(req.authUserId, itemId);
  }

  @Post('checkout')
  @ApiOperation({ summary: 'BOOK-02: Thanh toán giỏ hàng → tạo N bookings' })
  checkout(@Req() req: AuthenticatedRequest, @Body() dto: CheckoutDto) {
    return this.cartSvc.checkout(req.authUserId, dto);
  }
}
