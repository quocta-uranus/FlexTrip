import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LinkPreviewService } from './link-preview.service';
import { MessagesController } from './messages.controller';
import { MessagesGateway } from './messages.gateway';
import { MessagesService } from './messages.service';

@Module({
  imports: [AuthModule],
  controllers: [MessagesController],
  providers: [MessagesService, LinkPreviewService, MessagesGateway],
  exports: [MessagesGateway],
})
export class MessagesModule {}
