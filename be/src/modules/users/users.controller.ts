import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  AccessTokenGuard,
  AuthenticatedRequest,
} from '../auth/guards/access-token.guard';
import { UsersService } from './users.service';
import { UpdateUserDto } from './users.dto';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly svc: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'PROF-01: Lấy hồ sơ hiện tại' })
  me(@Req() req: AuthenticatedRequest) {
    return this.svc.getMe(req.authUserId, req);
  }

  @Patch('me')
  @ApiOperation({ summary: 'PROF-01: Cập nhật hồ sơ' })
  updateMe(@Req() req: AuthenticatedRequest, @Body() dto: UpdateUserDto) {
    return this.svc.updateMe(req.authUserId, dto, req);
  }

  @Get('me/sessions')
  @ApiOperation({ summary: 'AUTH-06: Danh sách session đang hoạt động' })
  sessions(@Req() req: AuthenticatedRequest) {
    return this.svc.sessions(req.authUserId);
  }

  @Delete('me/sessions/:id')
  @ApiOperation({ summary: 'AUTH-06: Revoke 1 session' })
  revoke(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.svc.revokeSession(req.authUserId, id);
  }
}
