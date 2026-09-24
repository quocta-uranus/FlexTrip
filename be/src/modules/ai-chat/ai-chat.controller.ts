import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { AuthenticatedRequest } from '../auth/guards/access-token.guard';
import { AiChatDto } from './ai-chat.dto';
import { AiChatService } from './ai-chat.service';

@ApiTags('AI chat')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('ai-chat')
export class AiChatController {
  constructor(private readonly aiChat: AiChatService) {}

  @Get('conversations')
  @ApiOperation({ summary: 'Get the current user AI chat history' })
  listConversations(@Req() req: AuthenticatedRequest) {
    return this.aiChat.listConversations(req.authUserId);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get one current user AI conversation' })
  getConversation(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.aiChat.getConversation(req.authUserId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Chat with the FlexTrip AI assistant' })
  chat(@Req() req: AuthenticatedRequest, @Body() dto: AiChatDto) {
    return this.aiChat.chat(req.authUserId, dto);
  }
}
