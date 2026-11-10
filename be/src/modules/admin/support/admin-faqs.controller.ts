import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AccessTokenGuard, AuthenticatedRequest } from '../../auth/guards/access-token.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { requestContext } from '../../../common/request-context';
import { AdminFaqsService } from './admin-faqs.service';
import { FaqDto, ListFaqsQueryDto, UpdateFaqDto } from './dto/admin-support.dto';

@ApiTags('admin-support')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/support/faqs')
export class AdminFaqsController {
  constructor(private readonly svc: AdminFaqsService) {}

  @Get()
  @ApiOperation({ summary: 'SUPPORT-04: Danh sách FAQ (cả bản nháp)' })
  list(@Query() q: ListFaqsQueryDto) {
    return this.svc.list(q);
  }

  @Get('suggestions')
  @ApiOperation({ summary: 'SUPPORT-04: AI đề xuất FAQ từ các ticket lặp lại' })
  suggestions() {
    return this.svc.suggestions();
  }

  @Post()
  @ApiOperation({ summary: 'SUPPORT-04: Tạo FAQ' })
  create(@Body() dto: FaqDto, @Req() req: AuthenticatedRequest) {
    return this.svc.create(dto, requestContext(req));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'SUPPORT-04: Sửa / ẩn / hiện FAQ' })
  update(@Param('id') id: string, @Body() dto: UpdateFaqDto, @Req() req: AuthenticatedRequest) {
    return this.svc.update(id, dto, requestContext(req));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'SUPPORT-04: Xoá FAQ' })
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.svc.remove(id, requestContext(req));
  }
}
