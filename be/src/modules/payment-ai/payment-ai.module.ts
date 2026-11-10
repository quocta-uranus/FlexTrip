import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentAiService } from './payment-ai.service';
import { PaymentAiController } from './payment-ai.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [ConfigModule, AuthModule],
  controllers: [PaymentAiController],
  providers: [PaymentAiService],
  exports: [PaymentAiService],
})
export class PaymentAiModule {}
