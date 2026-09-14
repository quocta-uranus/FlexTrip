import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  AccessTokenGuard,
  AuthenticatedRequest,
} from '../auth/guards/access-token.guard';
import { ProfileService } from './profile.service';
import {
  ChangePasswordDto,
  CreatePreferenceDto,
  UpdatePreferenceDto,
} from './profile.dto';

@ApiTags('profile')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('profile')
export class ProfileController {
  constructor(private readonly svc: ProfileService) {}

  @Get('preferences')
  @ApiOperation({ summary: 'PROF-02: Danh sách travel preferences' })
  list(@Req() req: AuthenticatedRequest) {
    return this.svc.listPreferences(req.authUserId);
  }

  @Post('preferences')
  @ApiOperation({ summary: 'PROF-02: Thêm travel preference' })
  add(@Req() req: AuthenticatedRequest, @Body() dto: CreatePreferenceDto) {
    return this.svc.addPreference(req.authUserId, dto);
  }

  @Patch('preferences/:id')
  @ApiOperation({ summary: 'PROF-02: Sửa preference' })
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdatePreferenceDto,
  ) {
    return this.svc.updatePreference(req.authUserId, id, dto);
  }

  @Delete('preferences/:id')
  @ApiOperation({ summary: 'PROF-02: Xoá preference' })
  remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.svc.deletePreference(req.authUserId, id);
  }

  @Post('password')
  @ApiOperation({ summary: 'PROF-04: Đổi mật khẩu' })
  changePassword(@Req() req: AuthenticatedRequest, @Body() dto: ChangePasswordDto) {
    return this.svc.changePassword(req.authUserId, dto);
  }

  @Post('avatar')
  @ApiOperation({ summary: 'PROF-01: Cập nhật avatar' })
  setAvatar(@Req() req: AuthenticatedRequest, @Body() body: { avatarUrl: string }) {
    return this.svc.setAvatar(req.authUserId, body.avatarUrl);
  }
}
