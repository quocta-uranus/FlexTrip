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
import { ProfileService } from './profile.service';
import {
  ChangePasswordDto,
  CreatePreferenceDto,
  UpdatePreferenceDto,
} from './profile.dto';

@ApiTags('profile')
@Controller('profile')
export class ProfileController {
  constructor(private readonly svc: ProfileService) {}

  // Travel preferences
  @Get('preferences')
  @ApiOperation({ summary: 'PROF-02: Danh sách travel preferences' })
  list(@Req() req: any) {
    return this.svc.listPreferences(req.user.userId);
  }

  @Post('preferences')
  @ApiOperation({ summary: 'PROF-02: Thêm travel preference' })
  add(@Req() req: any, @Body() dto: CreatePreferenceDto) {
    return this.svc.addPreference(req.user.userId, dto);
  }

  @Patch('preferences/:id')
  @ApiOperation({ summary: 'PROF-02: Sửa preference' })
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdatePreferenceDto) {
    return this.svc.updatePreference(req.user.userId, id, dto);
  }

  @Delete('preferences/:id')
  @ApiOperation({ summary: 'PROF-02: Xoá preference' })
  remove(@Req() req: any, @Param('id') id: string) {
    return this.svc.deletePreference(req.user.userId, id);
  }

  // Password
  @Post('password')
  @ApiOperation({ summary: 'PROF-04: Đổi mật khẩu' })
  changePassword(@Req() req: any, @Body() dto: ChangePasswordDto) {
    return this.svc.changePassword(req.user.userId, dto);
  }

  // Avatar
  @Post('avatar')
  @ApiOperation({ summary: 'PROF-01: Cập nhật avatar' })
  setAvatar(@Req() req: any, @Body() body: { avatarUrl: string }) {
    return this.svc.setAvatar(req.user.userId, body.avatarUrl);
  }
}
