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
import { memoryStorage } from 'multer';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { DenyRoles } from '../../common/decorators/deny-roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
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
  @UseGuards(RolesGuard)
  @Roles(Role.TRAVELER, Role.PROVIDER)
  @DenyRoles(Role.ADMIN)
  @ApiOperation({ summary: 'PROF-02: Danh sách travel preferences' })
  list(@Req() req: AuthenticatedRequest) {
    return this.svc.listPreferences(req.authUserId);
  }

  @Post('preferences')
  @UseGuards(RolesGuard)
  @Roles(Role.TRAVELER, Role.PROVIDER)
  @DenyRoles(Role.ADMIN)
  @ApiOperation({
    summary: 'PROF-02: Thêm travel preference',
    description:
      'Danh mục Listing hợp lệ; ngân sách VNĐ tiền thuê/chuyến, chưa gồm cọc và giao hàng.',
  })
  add(@Req() req: AuthenticatedRequest, @Body() dto: CreatePreferenceDto) {
    return this.svc.addPreference(req.authUserId, dto);
  }

  @Patch('preferences/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.TRAVELER, Role.PROVIDER)
  @DenyRoles(Role.ADMIN)
  @ApiOperation({
    summary: 'PROF-02: Sửa preference',
    description:
      'Chỉ sửa bản ghi của mình. Bỏ qua trường để giữ nguyên; null xoá ngân sách, [] xoá danh mục. Ngân sách cũ cần xác nhận RENTAL_PER_TRIP khi chỉnh.',
  })
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdatePreferenceDto,
  ) {
    return this.svc.updatePreference(req.authUserId, id, dto);
  }

  @Delete('preferences/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.TRAVELER, Role.PROVIDER)
  @DenyRoles(Role.ADMIN)
  @ApiOperation({
    summary: 'PROF-02: Xoá preference',
    description: '404 nếu bản ghi không tồn tại hoặc không thuộc người dùng.',
  })
  remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.svc.deletePreference(req.authUserId, id);
  }

  @Post('password')
  @ApiOperation({ summary: 'PROF-04: Đổi mật khẩu' })
  changePassword(
    @Req() req: AuthenticatedRequest,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.svc.changePassword(req.authUserId, dto);
  }

  @Post('avatar')
  @ApiOperation({
    summary: 'PROF-01: Upload avatar (multipart/form-data, field "file")',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
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
