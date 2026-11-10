import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AuthModule } from '../auth/auth.module';
import { ReputationModule } from '../reputation/reputation.module';
import { GroqJsonService } from '../support/groq-json.service';
import { PROVIDER_INCENTIVE_QUEUE } from './provider-incentives.constants';
import { ProviderIncentivesController } from './provider-incentives.controller';
import { ProviderIncentivesProcessor } from './provider-incentives.processor';
import { ProviderIncentivesService } from './provider-incentives.service';

@Module({
  imports: [AuthModule, ReputationModule, BullModule.registerQueue({ name: PROVIDER_INCENTIVE_QUEUE })],
  controllers: [ProviderIncentivesController],
  providers: [ProviderIncentivesService, ProviderIncentivesProcessor, GroqJsonService],
})
export class ProviderIncentivesModule {}
