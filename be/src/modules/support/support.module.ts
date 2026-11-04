import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AuthModule } from '../auth/auth.module';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';
import { GroqJsonService } from './groq-json.service';
import { TicketTriageService } from './ticket-triage.service';
import { SupportTriageProcessor } from './support-triage.processor';
import { SUPPORT_TRIAGE_QUEUE } from './support.constants';

@Module({
  imports: [AuthModule, BullModule.registerQueue({ name: SUPPORT_TRIAGE_QUEUE })],
  controllers: [SupportController],
  providers: [SupportService, GroqJsonService, TicketTriageService, SupportTriageProcessor],
  exports: [GroqJsonService, TicketTriageService],
})
export class SupportModule {}
