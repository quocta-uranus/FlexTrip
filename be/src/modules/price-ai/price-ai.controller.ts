import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { PriceAiService } from './price-ai.service';
import { DemandForecastService } from './demand-forecast.service';
import { AdjustmentService } from './adjustment.service';
import { BenchmarkService } from './benchmark.service';
import { OptimizationService } from './optimization.service';
import { CalendarService } from './calendar.service';
import { AutoAdjustService } from './auto-adjust.service';
import { PriceSuggestionDto, RecordPriceDto } from './dto/price-suggestion.dto';
import { UpdatePriceConfigDto } from './dto/price-config.dto';
import { PriceSource } from '@prisma/client';

@UseGuards(AccessTokenGuard)
@Controller('price-ai')
export class PriceAiController {
  constructor(
    private service: PriceAiService,
    private forecast: DemandForecastService,
    private adjustmentSvc: AdjustmentService,
    private benchmark: BenchmarkService,
    private optimization: OptimizationService,
    private calendar: CalendarService,
    private autoAdjust: AutoAdjustService,
  ) {}

  // ── PRICE-01 ────────────────────────────────────────────────────────────
  @Post('suggest')
  suggest(@Body() dto: PriceSuggestionDto) {
    return this.service.suggest(dto);
  }

  // ── PRICE-02 ────────────────────────────────────────────────────────────
  @Get('adjustments/:listingId')
  getAdjustment(@Param('listingId') listingId: string) {
    return this.adjustmentSvc.suggest(listingId);
  }

  // ── PRICE-03 ────────────────────────────────────────────────────────────
  @Get('forecast')
  demandForecast(
    @Query('region') region: string,
    @Query('category') category: string,
    @Query('days') days?: string,
  ) {
    const d = Number(days ?? 30);
    const validated = ([30, 60, 90] as const).includes(d as 30 | 60 | 90) ? (d as 30 | 60 | 90) : 30;
    return this.forecast.forecast(region, category, validated);
  }

  // ── PRICE-04 ────────────────────────────────────────────────────────────
  @Get('benchmark/:listingId')
  detailedBenchmark(@Param('listingId') listingId: string) {
    return this.benchmark.detail(listingId);
  }

  // ── PRICE-05 ────────────────────────────────────────────────────────────
  @Get('optimization/:listingId')
  getOptimization(@Param('listingId') listingId: string) {
    return this.optimization.compute(listingId);
  }

  // ── PRICE-07 ────────────────────────────────────────────────────────────
  @Get('calendar/:listingId')
  getCalendar(
    @Param('listingId') listingId: string,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const now = new Date();
    const y = year ? parseInt(year, 10) : now.getFullYear();
    const m = month ? parseInt(month, 10) : now.getMonth() + 1;
    return this.calendar.getMonth(listingId, y, m);
  }

  // ── PRICE-06 ────────────────────────────────────────────────────────────
  @Post('record')
  record(
    @Body() dto: RecordPriceDto,
    @Query('source') source: PriceSource = PriceSource.MANUAL,
  ) {
    return this.service.recordPrice(dto, source);
  }

  @Get('history/:listingId')
  history(@Param('listingId') listingId: string, @Query('limit') limit?: string) {
    return this.service.getHistory(listingId, limit ? parseInt(limit, 10) : 20);
  }

  // ── PRICE-08 ────────────────────────────────────────────────────────────
  @Get('config/:listingId')
  getConfig(@Param('listingId') listingId: string) {
    return this.autoAdjust.getConfig(listingId);
  }

  @Patch('config/:listingId')
  updateConfig(
    @Param('listingId') listingId: string,
    @Body() dto: UpdatePriceConfigDto,
    @Req() req: Request & { user?: { sub?: string } },
  ) {
    const userId = req.user?.sub ?? '';
    return this.autoAdjust.updateConfig(listingId, dto, userId);
  }
}
