import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ChatStorage } from './chat-storage.service';
import { LinkPreviewService } from './link-preview.service';
import { MessagesController } from './messages.controller';
import { MessagesGateway } from './messages.gateway';
import { MessagesService } from './messages.service';

@Module({
  imports: [AuthModule],
  controllers: [MessagesController],
  providers: [MessagesService, LinkPreviewService, MessagesGateway, ChatStorage],
  exports: [MessagesGateway],
})
export class MessagesModule {}
