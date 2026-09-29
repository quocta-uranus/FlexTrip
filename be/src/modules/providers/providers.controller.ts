import { Controller, Get, Patch, Req, UseGuards, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard, AuthenticatedRequest } from '../auth/guards/access-token.guard';
import { ProvidersService } from './providers.service';

@ApiTags('providers')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('providers')
export class ProvidersController {
  constructor(private readonly svc: ProvidersService) {}

  @Get('me')
  @ApiOperation({ summary: 'SHOP-01: Lấy hồ sơ Provider hiện tại' })
  me(@Req() req: AuthenticatedRequest) {
    return this.svc.getMyProfile(req.authUserId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'SHOP-02: Cập nhật hồ sơ Provider hiện tại' })
  updateMe(@Req() req: AuthenticatedRequest, @Body() body: any) {
    return this.svc.updateMyProfile(req.authUserId, body);
  }
}
