import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'PROF-01: Upload avatar (multipart/form-data, field "file")' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  setAvatar(
    @Req() req: AuthenticatedRequest,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Thiếu file ảnh (field "file")');
    if (!file.mimetype?.startsWith('image/')) {
      throw new BadRequestException('File phải là ảnh');
    }
    return this.svc.setAvatarFromFile(req.authUserId, file);
  }
}
