import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';
import {
  AccessTokenGuard,
  AuthenticatedRequest,
} from '../auth/guards/access-token.guard';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách thông báo của Traveler/Provider hiện tại' })
  findAll(
    @Req() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('type') type?: NotificationType,
  ) {
    return this.notifications.findAll(req.authUserId, {
      limit,
      unreadOnly,
      type: Object.values(NotificationType).includes(type as NotificationType)
        ? type
        : undefined,
    });
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Đánh dấu tất cả thông báo đã đọc' })
  markAllAsRead(@Req() req: AuthenticatedRequest) {
    return this.notifications.markAllAsRead(req.authUserId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Đánh dấu một thông báo đã đọc' })
  markAsRead(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.notifications.markAsRead(req.authUserId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa một thông báo' })
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.notifications.remove(req.authUserId, id);
  }
}
