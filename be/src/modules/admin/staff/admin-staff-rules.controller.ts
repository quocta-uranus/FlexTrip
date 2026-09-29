import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AccessTokenGuard, AuthenticatedRequest } from '../../auth/guards/access-token.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { requestContext } from '../../../common/request-context';
import { AdminStaffRulesService } from './admin-staff-rules.service';
import { CreateStaffRuleDto, UpdateStaffRuleDto } from './dto/admin-staff-rules.dto';

@ApiTags('admin-staff')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/staff-rules')
export class AdminStaffRulesController {
  constructor(private readonly svc: AdminStaffRulesService) {}

  @Get()
  @ApiOperation({ summary: 'ADMIN-10: Danh sách rule phân công' })
  list() {
    return this.svc.list();
  }

  @Post()
  @ApiOperation({ summary: 'ADMIN-10: Tạo rule phân công' })
  create(@Body() dto: CreateStaffRuleDto, @Req() req: AuthenticatedRequest) {
    return this.svc.create(dto, requestContext(req));
  }

  @Patch(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'ADMIN-10: Sửa rule' })
  update(@Param('id') id: string, @Body() dto: UpdateStaffRuleDto, @Req() req: AuthenticatedRequest) {
    return this.svc.update(id, dto, requestContext(req));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'ADMIN-10: Xoá rule' })
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.svc.remove(id, requestContext(req));
  }
}
