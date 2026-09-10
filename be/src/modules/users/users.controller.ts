import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { UpdateUserDto } from './users.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly svc: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'PROF-01: Lấy hồ sơ hiện tại' })
  me(@Req() req: any) {
    return this.svc.getMe(req.user.userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'PROF-01: Cập nhật hồ sơ' })
  updateMe(@Req() req: any, @Body() dto: UpdateUserDto) {
    return this.svc.updateMe(req.user.userId, dto);
  }

  @Post('me/roles/:role')
  @ApiOperation({ summary: 'Thêm role (vd upgrade lên Provider)' })
  addRole(@Req() req: any, @Param('role') role: Role) {
    return this.svc.addRole(req.user.userId, role);
  }

  @Delete('me/roles/:role')
  @ApiOperation({ summary: 'Thu hồi role' })
  removeRole(@Req() req: any, @Param('role') role: Role) {
    return this.svc.removeRole(req.user.userId, role);
  }

  @Get('me/sessions')
  @ApiOperation({ summary: 'AUTH-06: Danh sách session đang hoạt động' })
  sessions(@Req() req: any) {
    return this.svc.sessions(req.user.userId);
  }

  @Delete('me/sessions/:id')
  @ApiOperation({ summary: 'AUTH-06: Revoke 1 session' })
  revoke(@Req() req: any, @Param('id') id: string) {
    return this.svc.revokeSession(req.user.userId, id);
  }
}
