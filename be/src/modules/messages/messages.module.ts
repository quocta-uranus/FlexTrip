import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MessagesGateway } from './messages.gateway';

@Module({
  imports: [AuthModule],
  providers: [MessagesGateway],
  exports: [MessagesGateway],
})
export class MessagesModule {}
