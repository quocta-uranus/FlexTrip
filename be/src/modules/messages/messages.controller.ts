import {
  Body, CanActivate, Controller, Delete, ExecutionContext, Get, Injectable, Param, Patch, Post, Query, Req,
  UploadedFiles, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard, AuthenticatedRequest } from '../auth/guards/access-token.guard';
import { MAX_FILE_BYTES, MAX_FILES } from './attachment-validator';
import { EditMessageDto, MessagesQueryDto, SendMessageDto, SharedQueryDto, StartConversationDto } from './messages.dto';
import { MessagesService } from './messages.service';

// Guards run before the multer interceptor, so outsiders are rejected before any upload is buffered.
@Injectable()
class ConversationMemberGuard implements CanActivate {
  constructor(private readonly svc: MessagesService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest & { params: { id: string } }>();
    await this.svc.requireMember(req.authUserId, req.params.id);
    return true;
  }
}

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

  @Patch(':id')
  edit(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() dto: EditMessageDto) {
    return this.svc.edit(req.authUserId, id, dto.content);
  }

  @Delete(':id')
  remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.svc.remove(req.authUserId, id);
  }

  @Post('conversations/:id/attachments')
  @UseGuards(ConversationMemberGuard)
  @UseInterceptors(FilesInterceptor('files', MAX_FILES, { storage: memoryStorage(), limits: { fileSize: MAX_FILE_BYTES } }))
  upload(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[] | undefined,
  ) {
    return this.svc.uploadAttachments(req.authUserId, id, files);
  }

  @Get('conversations/:id/shared')
  shared(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Query() q: SharedQueryDto) {
    return this.svc.shared(req.authUserId, id, q.kind, q);
  }
}
