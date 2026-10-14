import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard, AuthenticatedRequest } from '../auth/guards/access-token.guard';
import { MessagesQueryDto, SendMessageDto, StartConversationDto } from './messages.dto';
import { MessagesService } from './messages.service';

@ApiTags('messages')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('messages')
export class MessagesController {
  constructor(private readonly svc: MessagesService) {}

  @Get('conversations')
  list(@Req() req: AuthenticatedRequest) {
    return this.svc.listConversations(req.authUserId);
  }

  @Post('conversations')
  start(@Req() req: AuthenticatedRequest, @Body() dto: StartConversationDto) {
    return this.svc.startConversation(req.authUserId, dto.targetUserId);
  }

  @Get('conversations/:id/info')
  info(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.svc.conversationInfo(req.authUserId, id);
  }

  @Get('conversations/:id')
  history(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Query() q: MessagesQueryDto) {
    return this.svc.listMessages(req.authUserId, id, q);
  }

  @Post('conversations/:id')
  send(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() dto: SendMessageDto) {
    return this.svc.send(req.authUserId, id, dto);
  }

  @Post('conversations/:id/read')
  read(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.svc.markRead(req.authUserId, id);
  }
}
