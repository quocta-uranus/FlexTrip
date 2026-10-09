import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  AccessTokenGuard,
  AuthenticatedRequest,
} from '../auth/guards/access-token.guard';
import { ReputationService } from './reputation.service';

@ApiTags('reputation')
@Controller('reputation')
export class ReputationController {
  constructor(private readonly reputation: ReputationService) {}

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({
    summary: 'REVIEW-05: Tiến độ uy tín của người dùng hiện tại',
  })
  mine(@Req() req: AuthenticatedRequest) {
    return this.reputation.getMine(req.authUserId);
  }

  @Get('users/:userId')
  @ApiOperation({ summary: 'REVIEW-05: Huy hiệu công khai của người dùng' })
  publicBadges(@Param('userId') userId: string) {
    return this.reputation.getPublic(userId);
  }
}
