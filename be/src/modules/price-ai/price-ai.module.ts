import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AuthModule } from '../auth/auth.module';
import { PriceAiController } from './price-ai.controller';
import { PriceAiService } from './price-ai.service';
import { BenchmarkService } from './benchmark.service';
import { DemandForecastService } from './demand-forecast.service';
import { AdjustmentService } from './adjustment.service';
import { OptimizationService } from './optimization.service';
import { CalendarService } from './calendar.service';
import { AutoAdjustService } from './auto-adjust.service';
import { AutoAdjustProcessor, PRICE_AUTO_ADJUST_QUEUE } from './auto-adjust.processor';

@Module({
  imports: [
    AuthModule,
    BullModule.registerQueue({ name: PRICE_AUTO_ADJUST_QUEUE }),
  ],
  controllers: [PriceAiController],
  providers: [
    PriceAiService,
    BenchmarkService,
    DemandForecastService,
    AdjustmentService,
    OptimizationService,
    CalendarService,
    AutoAdjustService,
    AutoAdjustProcessor,
  ],
  exports: [PriceAiService],
})
export class PriceAiModule {}
