import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AccessTokenGuard, AuthenticatedRequest } from '../../auth/guards/access-token.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { requestContext } from '../../../common/request-context';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { AdminVouchersService } from './admin-vouchers.service';
import {
  CreatePromoBudgetDto, CreateVoucherDto, ListVouchersQueryDto, UpdatePromoBudgetDto, UpdateVoucherDto,
} from './dto/admin-voucher.dto';

@ApiTags('admin-vouchers')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminVouchersController {
  constructor(private readonly service: AdminVouchersService) {}

  @Get('vouchers')
  @ApiOperation({ summary: 'LOYALTY-04: Danh sách voucher' })
  list(@Query() query: ListVouchersQueryDto) {
    return this.service.list(query);
  }

  @Post('vouchers')
  @ApiOperation({ summary: 'LOYALTY-04: Tạo voucher' })
  create(@Body() dto: CreateVoucherDto, @Req() req: AuthenticatedRequest) {
    return this.service.create(dto, requestContext(req));
  }

  @Patch('vouchers/:id')
  @ApiOperation({ summary: 'LOYALTY-04: Sửa / tạm dừng voucher' })
  update(@Param('id') id: string, @Body() dto: UpdateVoucherDto, @Req() req: AuthenticatedRequest) {
    return this.service.update(id, dto, requestContext(req));
  }

  @Get('vouchers/:id/redemptions')
  @ApiOperation({ summary: 'LOYALTY-04: Lượt dùng của voucher' })
  redemptions(@Param('id') id: string, @Query() query: PaginationQueryDto) {
    return this.service.redemptions(id, query as ListVouchersQueryDto);
  }

  @Get('promo-budgets')
  @ApiOperation({ summary: 'LOYALTY-04: Ngân sách khuyến mãi' })
  budgets() {
    return this.service.listBudgets();
  }

  @Post('promo-budgets')
  @ApiOperation({ summary: 'LOYALTY-04: Tạo ngân sách khuyến mãi' })
  createBudget(@Body() dto: CreatePromoBudgetDto, @Req() req: AuthenticatedRequest) {
    return this.service.createBudget(dto, requestContext(req));
  }

  @Patch('promo-budgets/:id')
  @ApiOperation({ summary: 'LOYALTY-04: Sửa ngân sách khuyến mãi' })
  updateBudget(@Param('id') id: string, @Body() dto: UpdatePromoBudgetDto, @Req() req: AuthenticatedRequest) {
    return this.service.updateBudget(id, dto, requestContext(req));
  }
}
