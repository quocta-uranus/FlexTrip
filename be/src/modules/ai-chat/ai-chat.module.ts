import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AiChatController } from './ai-chat.controller';
import { AiChatService } from './ai-chat.service';

@Module({
  imports: [AuthModule],
  controllers: [AiChatController],
  providers: [AiChatService],
})
export class AiChatModule {}
