import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaService } from '../../prisma/prisma.service';
import { BenchmarkService } from './benchmark.service';
import type { DemandSnapshot, PriceSuggestion } from './price-ai.types';
import type { PriceSuggestionDto, RecordPriceDto } from './dto/price-suggestion.dto';
import { PriceSource } from '@prisma/client';

type AiOutput = {
  suggestedPrice: number;
  min: number;
  max: number;
  reason: string;
  confidence: number;
};

@Injectable()
export class PriceAiService {
  private readonly logger = new Logger(PriceAiService.name);
  private readonly gemini: ReturnType<GoogleGenerativeAI['getGenerativeModel']>;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private benchmark: BenchmarkService,
  ) {
    const genAI = new GoogleGenerativeAI(
      this.config.get<string>('GEMINI_API_KEY', ''),
    );
    this.gemini = genAI.getGenerativeModel({ model: 'gemini-3.8-flash' });
  }

  async suggest(dto: PriceSuggestionDto): Promise<PriceSuggestion> {
    const [bench, demand] = await Promise.all([
      this.benchmark.compute(dto.category, dto.location, dto.currentPrice, dto.listingId),
      this.getDemandSnapshot(dto.category, dto.location),
    ]);

    let aiOutput: AiOutput;
    try {
      aiOutput = await this.callGemini(dto, bench, demand);
    } catch (err) {
      this.logger.warn(`Gemini price suggestion failed, using statistical fallback: ${String(err)}`);
      aiOutput = this.statisticalFallback(bench, demand, dto.category);
    }

    return {
      suggestedPrice: aiOutput.suggestedPrice,
      range: { min: aiOutput.min, max: aiOutput.max },
      reason: aiOutput.reason,
      confidence: aiOutput.confidence,
      benchmark: bench,
      demand,
    };
  }

  async recordPrice(dto: RecordPriceDto, source: PriceSource): Promise<void> {
    await this.prisma.priceHistory.create({
      data: {
        listingId: dto.listingId,
        price: dto.price,
        source,
        aiScore: dto.aiScore,
        aiReason: dto.aiReason,
      },
    });
  }

  async getHistory(listingId: string, limit = 20) {
    return this.prisma.priceHistory.findMany({
      where: { listingId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  private async getDemandSnapshot(
    category: string,
    location: string,
  ): Promise<DemandSnapshot> {
    const cityToken = location.split(',').pop()?.trim() ?? location;
    const now = new Date();
    const days30ago = new Date(now.getTime() - 30 * 86400_000);
    const days60ago = new Date(now.getTime() - 60 * 86400_000);

    const [recent, baseline] = await Promise.all([
      this.prisma.booking.count({
        where: {
          listing: {
            category,
            location: { contains: cityToken, mode: 'insensitive' },
          },
          createdAt: { gte: days30ago },
        },
      }),
      this.prisma.booking.count({
        where: {
          listing: {
            category,
            location: { contains: cityToken, mode: 'insensitive' },
          },
          createdAt: { gte: days60ago, lt: days30ago },
        },
      }),
    ]);

    const score = this.normalizeScore(recent, baseline);
    const trend: DemandSnapshot['trend'] =
      recent > baseline * 1.1 ? 'UP' : recent < baseline * 0.9 ? 'DOWN' : 'FLAT';

    return { score, trend, recentBookings: recent, baselineBookings: baseline };
  }

  private normalizeScore(recent: number, baseline: number): number {
    if (baseline === 0 && recent === 0) return 40;
    if (baseline === 0) return Math.min(90, 40 + recent * 5);
    const ratio = recent / baseline;
    return Math.min(100, Math.max(5, Math.round(ratio * 50)));
  }

  // Category price anchors for VN rental market (1.5–3% of product value/day)
  private static readonly CATEGORY_ANCHORS: Record<string, { p25: number; p50: number; p75: number; label: string }> = {
    CAMERA_GEAR:       { p25: 120_000, p50: 200_000, p75: 350_000, label: 'GoPro/gimbal: 100–200k, camera/DSLR: 200–400k, DJI Osmo Pocket: 150–250k' },
    CAMPING:           { p25:  60_000, p50: 120_000, p75: 200_000, label: 'Lều solo: 60–100k, lều gia đình: 100–200k, bộ camping đầy đủ: 150–250k' },
    TREKKING:          { p25:  40_000, p50:  80_000, p75: 130_000, label: 'Ba lô: 40–100k, gậy trekking: 20–50k, bộ trekking đầy đủ: 80–150k' },
    BEACH:             { p25: 100_000, p50: 180_000, p75: 300_000, label: 'Ghế biển/phao: 50–100k, kayak: 150–300k, SUP: 200–350k' },
    TRAVEL_ESSENTIALS: { p25:  50_000, p50:  90_000, p75: 150_000, label: 'Vali cabin: 50–100k, vali lớn: 80–150k, balo du lịch: 40–80k' },
    FAMILY:            { p25:  80_000, p50: 150_000, p75: 250_000, label: 'Xe đẩy du lịch: 100–250k, ghế trẻ em: 80–150k, cũi du lịch: 100–200k' },
  };

  private async callGemini(
    dto: PriceSuggestionDto,
    bench: Awaited<ReturnType<BenchmarkService['compute']>>,
    demand: DemandSnapshot,
  ): Promise<AiOutput> {
    const anchor = PriceAiService.CATEGORY_ANCHORS[dto.category];
    const hasBenchmark = bench.sampleCount >= 3;

    const marketContext = hasBenchmark
      ? `Dữ liệu thị trường FlexTrip (${bench.sampleCount} sản phẩm cùng khu vực):
- p25: ${Math.round(bench.p25).toLocaleString('vi-VN')}đ/ngày
- p50 (trung vị): ${Math.round(bench.p50).toLocaleString('vi-VN')}đ/ngày
- p75: ${Math.round(bench.p75).toLocaleString('vi-VN')}đ/ngày`
      : `Chưa có dữ liệu nội bộ. Tham chiếu thị trường VN cho danh mục ${dto.category}:
${anchor ? `- Khoảng phổ biến: ${anchor.label}` : '- Dùng mức trung bình 1.5–3% giá trị sản phẩm/ngày'}`;

    const currentPriceCtx = dto.currentPrice
      ? `Giá Provider đang nhập: ${dto.currentPrice.toLocaleString('vi-VN')}đ/ngày`
      : 'Provider chưa nhập giá.';

    const prompt = `Bạn là chuyên gia định giá cho nền tảng cho thuê đồ du lịch FlexTrip (Việt Nam).

QUAN TRỌNG — đây là GIÁ THUÊ mỗi ngày (VND/ngày), KHÔNG phải giá bán:
• Giá thuê hợp lý = 1.5–3% giá trị sản phẩm/ngày
• Ví dụ: máy ảnh 10 triệu → 150.000–300.000đ/ngày; vali 2 triệu → 50.000–80.000đ/ngày
• KHÔNG đề xuất giá thuê vượt quá 5% giá trị sản phẩm/ngày

Thông tin sản phẩm:
- Tên: ${dto.title ?? '(chưa có tên)'}
- Danh mục: ${dto.category}
- Khu vực: ${dto.location}
- ${currentPriceCtx}
- ${marketContext}
- Nhu cầu thị trường: ${demand.score}/100 (${demand.trend === 'UP' ? 'đang tăng' : demand.trend === 'DOWN' ? 'đang giảm' : 'ổn định'})

Trả về JSON thuần (không markdown, không text bên ngoài):
{"suggestedPrice": <số nguyên VND bội số 1000>, "min": <số nguyên VND>, "max": <số nguyên VND>, "reason": "<1 câu tiếng Việt giải thích>", "confidence": <0.0-1.0>}`;

    const result = await this.gemini.generateContent(prompt);
    const text = result.response.text().trim();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in Gemini response');

    const parsed = JSON.parse(jsonMatch[0]) as Partial<AiOutput>;

    // Sanity clamp — prevent wildly out-of-range AI outputs
    const fallback = anchor ?? { p25: 50_000, p50: 150_000, p75: 400_000 };
    const maxSane = fallback.p75 * 3;
    const minSane = fallback.p25 * 0.3;
    const rawSuggested = Number(parsed.suggestedPrice ?? fallback.p50);
    const suggestedPrice = Math.round(Math.min(maxSane, Math.max(minSane, rawSuggested)) / 1000) * 1000;

    return {
      suggestedPrice,
      min: Math.round(Math.max(minSane, Number(parsed.min ?? suggestedPrice * 0.8)) / 1000) * 1000,
      max: Math.round(Math.min(maxSane, Number(parsed.max ?? suggestedPrice * 1.3)) / 1000) * 1000,
      reason: parsed.reason ?? 'Dựa trên dữ liệu thị trường.',
      confidence: Math.min(1, Math.max(0, Number(parsed.confidence ?? 0.5))),
    };
  }

  private statisticalFallback(
    bench: Awaited<ReturnType<BenchmarkService['compute']>>,
    demand: DemandSnapshot,
    category?: string,
  ): AiOutput {
    const anchor = category ? PriceAiService.CATEGORY_ANCHORS[category] : undefined;
    const base = bench.sampleCount >= 3 ? bench.p50 : (anchor?.p50 ?? 150_000);
    const multiplier = demand.trend === 'UP' ? 1.05 : demand.trend === 'DOWN' ? 0.95 : 1;
    const suggested = Math.round((base * multiplier) / 1000) * 1000;
    const p25 = bench.sampleCount >= 3 ? bench.p25 : (anchor?.p25 ?? suggested * 0.7);
    const p75 = bench.sampleCount >= 3 ? bench.p75 : (anchor?.p75 ?? suggested * 1.4);

    return {
      suggestedPrice: suggested,
      min: Math.round(p25 / 1000) * 1000,
      max: Math.round(p75 / 1000) * 1000,
      reason: bench.sampleCount >= 3
        ? 'Dựa trên thống kê thị trường.'
        : 'Dựa trên mức tham chiếu thị trường VN theo danh mục.',
      confidence: bench.sampleCount >= 5 ? 0.6 : anchor ? 0.4 : 0.2,
    };
  }
}
