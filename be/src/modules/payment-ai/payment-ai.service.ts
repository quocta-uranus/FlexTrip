import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaService } from '../../prisma/prisma.service';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface FraudCheckInput {
  userId: string;
  bookingId: string;
  amount: number;
  gateway: string;
  ipAddress?: string;
}

export interface FraudCheckResult {
  riskScore: number;          // 0–100
  action: 'ALLOW' | 'REVIEW' | 'BLOCK';
  flags: string[];
}

export interface DepositRecommendation {
  recommendedRate: number;    // 0.10 – 0.60
  minRate: number;
  maxRate: number;
  reasoning: string;
  confidence: number;
}

export interface DisputeAssistResult {
  recommendation: 'full_refund' | 'partial_refund' | 'no_refund' | 'provider_wins';
  suggestedRefundPct: number; // 0–100
  reasoning: string;
  confidence: number;
  keyEvidence: string[];
}

export interface CashflowForecast {
  forecastDays: 30 | 60 | 90;
  projectedRevenue: number;
  confirmedRevenue: number;   // từ confirmed bookings
  projectedBookings: number;
  avgRevenuePerBooking: number;
  trend: 'up' | 'stable' | 'down';
  reasoning: string;
}

// ─── Service ────────────────────────────────────────────────────────────────

@Injectable()
export class PaymentAiService {
  private readonly logger = new Logger(PaymentAiService.name);
  private readonly gemini: ReturnType<GoogleGenerativeAI['getGenerativeModel']>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const genAI = new GoogleGenerativeAI(
      this.config.get<string>('GEMINI_API_KEY', ''),
    );
    this.gemini = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
  }

  // ─── 9.1 Fraud risk scoring ─────────────────────────────────────────────

  async fraudCheck(input: FraudCheckInput): Promise<FraudCheckResult> {
    const [user, recentBookings, recentFails, disputes, completedBookingCount, kycApp] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: input.userId },
        select: { id: true, createdAt: true },
      }),
      this.prisma.booking.findMany({
        where: { travelerId: input.userId, createdAt: { gte: new Date(Date.now() - 3_600_000) } },
        select: { id: true },
      }),
      this.prisma.payment.findMany({
        where: {
          booking: { travelerId: input.userId },
          status: 'FAILED',
          createdAt: { gte: new Date(Date.now() - 86_400_000) },
        },
        select: { id: true },
      }),
      this.prisma.dispute.findMany({
        where: { openedById: input.userId },
        select: { id: true },
      }),
      this.prisma.booking.count({ where: { travelerId: input.userId } }),
      this.prisma.kycApplication.findFirst({
        where: { userId: input.userId },
        select: { status: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const accountAgedays = user
      ? Math.floor((Date.now() - new Date(user.createdAt).getTime()) / 86_400_000)
      : 0;
    const totalBookings = completedBookingCount;
    const kycStatus = kycApp?.status ?? 'NONE';

    const context = {
      accountAgeDays: accountAgedays,
      totalBookings,
      kycStatus,
      bookingsLastHour: recentBookings.length,
      failedPaymentsLast24h: recentFails.length,
      disputeCount: disputes.length,
      amount: input.amount,
      gateway: input.gateway,
    };

    const prompt = `Bạn là hệ thống phát hiện gian lận thanh toán của FlexTrip (nền tảng cho thuê thiết bị du lịch tại Việt Nam).

Phân tích rủi ro giao dịch sau và trả về JSON:

Dữ liệu:
${JSON.stringify(context, null, 2)}

Quy tắc đánh giá:
- accountAgeDays < 7 và amount > 1.000.000 → +30 điểm
- bookingsLastHour > 2 → +25 điểm (velocity abuse)
- failedPaymentsLast24h > 2 → +20 điểm
- disputeCount > 2 → +15 điểm
- kycStatus = 'NONE' và amount > 2.000.000 → +15 điểm
- totalBookings > 5 và kycStatus = 'APPROVED' → -20 điểm (good history)

Trả về JSON hợp lệ (không có markdown):
{
  "riskScore": <0-100>,
  "action": "ALLOW" | "REVIEW" | "BLOCK",
  "flags": ["<lý do 1>", "<lý do 2>"]
}

action: ALLOW nếu riskScore < 40, REVIEW nếu 40-79, BLOCK nếu >= 80`;

    try {
      const result = await this.gemini.generateContent(prompt);
      const text = result.response.text().trim();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in response');
      return JSON.parse(jsonMatch[0]) as FraudCheckResult;
    } catch (err) {
      this.logger.warn(`Fraud check AI failed, using rule-based fallback: ${String(err)}`);
      return this.fraudCheckFallback(context);
    }
  }

  // ─── 9.2 Dynamic deposit recommendation ────────────────────────────────

  async recommendDeposit(listingId: string, travelerId: string): Promise<DepositRecommendation> {
    const [listing, completedBookings, disputeCount, kycApp] = await Promise.all([
      this.prisma.listing.findUnique({
        where: { id: listingId },
        select: {
          category: true, price: true, depositRate: true,
          isHighValue: true, marketValue: true,
        },
      }),
      this.prisma.booking.count({ where: { travelerId, status: 'COMPLETED' } }),
      this.prisma.dispute.count({ where: { booking: { travelerId } } }),
      this.prisma.kycApplication.findFirst({
        where: { userId: travelerId },
        select: { status: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    if (!listing) return { recommendedRate: 0.30, minRate: 0.20, maxRate: 0.50, reasoning: 'Listing không tồn tại', confidence: 0 };

    const kycStatus = kycApp?.status ?? 'NONE';
    const marketValue = listing.marketValue ? Number(listing.marketValue) : Number(listing.price) * 30;

    const context = {
      category: listing.category,
      isHighValue: listing.isHighValue,
      marketValue,
      currentDepositRate: Number(listing.depositRate),
      travelerCompletedBookings: completedBookings,
      travelerKycStatus: kycStatus,
      travelerDisputeCount: disputeCount,
    };

    const prompt = `Bạn là AI tính mức cọc phù hợp cho FlexTrip (nền tảng cho thuê thiết bị du lịch VN).

Dữ liệu:
${JSON.stringify(context, null, 2)}

Nguyên tắc:
- Thiết bị giá trị cao (isHighValue = true) → cọc tối thiểu 40%
- Traveler chưa KYC + mới (<3 booking) → cọc tối thiểu 35%
- Traveler đã KYC + lịch sử tốt (>5 completed, 0 dispute) → cọc 15–25%
- Camera, drone → cọc cao hơn 10% so với đồ cắm trại cùng giá
- Cọc tối đa 60%, tối thiểu 10%

Trả về JSON hợp lệ (không có markdown):
{
  "recommendedRate": <0.10-0.60>,
  "minRate": <0.10-0.60>,
  "maxRate": <0.10-0.60>,
  "reasoning": "<1 câu giải thích ngắn gọn bằng tiếng Việt>",
  "confidence": <0.0-1.0>
}`;

    try {
      const result = await this.gemini.generateContent(prompt);
      const text = result.response.text().trim();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in response');
      return JSON.parse(jsonMatch[0]) as DepositRecommendation;
    } catch (err) {
      this.logger.warn(`Deposit recommendation AI failed, using fallback: ${String(err)}`);
      return this.depositFallback(listing.isHighValue, kycStatus, completedBookings, disputeCount);
    }
  }

  // ─── 9.3 Dispute resolution assistant ──────────────────────────────────

  async assistDispute(disputeId: string): Promise<DisputeAssistResult> {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        booking: {
          include: {
            listing: { select: { title: true, category: true, penaltyRules: true } },
            payment: { select: { totalAmount: true, depositAmount: true } },
            contract: {
              select: {
                penaltyRules: true,
                checkInPhotos: true,
                checkOutPhotos: true,
                productConditionNote: true,
              },
            },
          },
        },
      },
    });

    if (!dispute) {
      return {
        recommendation: 'partial_refund',
        suggestedRefundPct: 50,
        reasoning: 'Không tìm thấy tranh chấp',
        confidence: 0,
        keyEvidence: [],
      };
    }

    const contract = dispute.booking.contract;
    const checkInPhotoCount = contract?.checkInPhotos?.length ?? 0;
    const checkOutPhotos = (contract?.checkOutPhotos ?? []) as Array<{ uploadedBy: string }>;
    const providerOutPhotos = checkOutPhotos.filter((p) => p.uploadedBy === 'PROVIDER').length;
    const travelerOutPhotos = checkOutPhotos.filter((p) => p.uploadedBy === 'TRAVELER').length;

    const context = {
      disputeType: dispute.type,
      disputeDescription: dispute.description,
      claimAmount: dispute.requestedAmount ? Number(dispute.requestedAmount) : null,
      depositAmount: dispute.booking.payment ? Number(dispute.booking.payment.depositAmount) : 0,
      totalAmount: dispute.booking.payment ? Number(dispute.booking.payment.totalAmount) : 0,
      listingCategory: dispute.booking.listing.category,
      penaltyRules: contract?.penaltyRules ?? [],
      productConditionNote: contract?.productConditionNote ?? null,
      checkInPhotoCount,
      providerOutPhotoCount: providerOutPhotos,
      travelerOutPhotoCount: travelerOutPhotos,
    };

    const prompt = `Bạn là trợ lý giải quyết tranh chấp của FlexTrip (nền tảng cho thuê thiết bị du lịch VN).
Admin sẽ là người ra quyết định cuối — bạn chỉ đưa ra gợi ý dựa trên bằng chứng.

Dữ liệu tranh chấp:
${JSON.stringify(context, null, 2)}

Phân tích:
- checkInPhotoCount = 0 → bằng chứng giao hàng yếu, lợi cho traveler
- providerOutPhotoCount > 0 → có bằng chứng hư hỏng
- Nếu claimAmount > depositAmount → chỉ có thể phán quyết tối đa depositAmount
- Tham chiếu penaltyRules để đánh giá mức phạt hợp lý

Trả về JSON hợp lệ (không có markdown):
{
  "recommendation": "full_refund" | "partial_refund" | "no_refund" | "provider_wins",
  "suggestedRefundPct": <0-100>,
  "reasoning": "<2-3 câu phân tích bằng tiếng Việt>",
  "confidence": <0.0-1.0>,
  "keyEvidence": ["<bằng chứng 1>", "<bằng chứng 2>"]
}

full_refund = hoàn 100% deposit cho traveler
no_refund = giữ 100% deposit cho provider
partial_refund = hoàn một phần
provider_wins = provider giữ toàn bộ do traveler vi phạm nghiêm trọng`;

    try {
      const result = await this.gemini.generateContent(prompt);
      const text = result.response.text().trim();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in response');
      return JSON.parse(jsonMatch[0]) as DisputeAssistResult;
    } catch (err) {
      this.logger.warn(`Dispute assist AI failed: ${String(err)}`);
      return {
        recommendation: 'partial_refund',
        suggestedRefundPct: 50,
        reasoning: 'AI không thể phân tích. Admin vui lòng xem xét thủ công.',
        confidence: 0,
        keyEvidence: [],
      };
    }
  }

  // ─── 9.4 Provider cashflow forecast ─────────────────────────────────────

  async cashflowForecast(providerId: string, days: 30 | 60 | 90): Promise<CashflowForecast> {
    const cutoff = new Date(Date.now() - 90 * 86_400_000);
    const futureCutoff = new Date(Date.now() + days * 86_400_000);

    const [confirmedBookings, historicalBookings, listings] = await Promise.all([
      // Confirmed/in-progress bookings trong tương lai
      this.prisma.booking.findMany({
        where: {
          listing: { providerId },
          status: { in: ['CONFIRMED', 'IN_PROGRESS'] },
          startDate: { lte: futureCutoff },
        },
        select: { totalPrice: true, startDate: true, endDate: true },
      }),
      // Lịch sử 90 ngày
      this.prisma.booking.findMany({
        where: {
          listing: { providerId },
          status: 'COMPLETED',
          createdAt: { gte: cutoff },
        },
        select: { totalPrice: true, depositAmount: true, createdAt: true },
      }),
      this.prisma.listing.count({ where: { providerId, status: 'ACTIVE' } }),
    ]);

    const confirmedRevenue = confirmedBookings.reduce(
      (s, b) => s + (Number(b.totalPrice) - Number(b.totalPrice) * 0.10), // sau commission
      0,
    );

    const avgMonthlyRevenue =
      historicalBookings.length > 0
        ? historicalBookings.reduce((s, b) => s + Number(b.totalPrice), 0) / 3
        : 0;

    const projectedRevenue = Math.round(
      confirmedRevenue + avgMonthlyRevenue * (days / 30) * 0.6, // 60% conversion estimate
    );

    const context = {
      days,
      activeListings: listings,
      confirmedBookingCount: confirmedBookings.length,
      confirmedRevenue: Math.round(confirmedRevenue),
      historicalMonthlyAvg: Math.round(avgMonthlyRevenue),
      historical90DayBookings: historicalBookings.length,
    };

    const prompt = `Bạn là AI dự báo doanh thu cho provider FlexTrip (nền tảng cho thuê thiết bị du lịch VN).

Dữ liệu:
${JSON.stringify(context, null, 2)}

Hãy phân tích và dự báo doanh thu ${days} ngày tới.
Lưu ý: providerNet = 90% của totalPrice (sau khi trừ 10% platform commission).

Trả về JSON hợp lệ (không có markdown):
{
  "projectedRevenue": <số tiền VNĐ>,
  "confirmedRevenue": ${Math.round(confirmedRevenue)},
  "projectedBookings": <số đơn dự kiến>,
  "avgRevenuePerBooking": <số tiền trung bình>,
  "trend": "up" | "stable" | "down",
  "reasoning": "<2 câu phân tích bằng tiếng Việt>"
}`;

    try {
      const result = await this.gemini.generateContent(prompt);
      const text = result.response.text().trim();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in response');
      const parsed = JSON.parse(jsonMatch[0]);
      return { ...parsed, forecastDays: days } as CashflowForecast;
    } catch (err) {
      this.logger.warn(`Cashflow forecast AI failed, using stat fallback: ${String(err)}`);
      return {
        forecastDays: days,
        projectedRevenue,
        confirmedRevenue: Math.round(confirmedRevenue),
        projectedBookings: confirmedBookings.length + Math.round(historicalBookings.length * days / 90 * 0.5),
        avgRevenuePerBooking: historicalBookings.length > 0
          ? Math.round(historicalBookings.reduce((s, b) => s + Number(b.totalPrice), 0) / historicalBookings.length)
          : 0,
        trend: avgMonthlyRevenue > 0 ? 'stable' : 'down',
        reasoning: 'Dự báo dựa trên số liệu thống kê 90 ngày gần nhất.',
      };
    }
  }

  // ─── Fallbacks ──────────────────────────────────────────────────────────

  private fraudCheckFallback(ctx: {
    accountAgeDays: number;
    totalBookings: number;
    kycStatus: string;
    bookingsLastHour: number;
    failedPaymentsLast24h: number;
    disputeCount: number;
    amount: number;
  }): FraudCheckResult {
    let score = 0;
    const flags: string[] = [];

    if (ctx.accountAgeDays < 7 && ctx.amount > 1_000_000) { score += 30; flags.push('Tài khoản mới + giao dịch lớn'); }
    if (ctx.bookingsLastHour > 2) { score += 25; flags.push('Nhiều booking trong 1 giờ'); }
    if (ctx.failedPaymentsLast24h > 2) { score += 20; flags.push('Nhiều lần thanh toán thất bại'); }
    if (ctx.disputeCount > 2) { score += 15; flags.push('Lịch sử tranh chấp cao'); }
    if (ctx.kycStatus === 'NONE' && ctx.amount > 2_000_000) { score += 15; flags.push('Chưa KYC + giao dịch lớn'); }
    if (ctx.totalBookings > 5 && ctx.kycStatus === 'APPROVED') score -= 20;

    score = Math.max(0, Math.min(100, score));
    return {
      riskScore: score,
      action: score >= 80 ? 'BLOCK' : score >= 40 ? 'REVIEW' : 'ALLOW',
      flags,
    };
  }

  private depositFallback(
    isHighValue: boolean,
    kycStatus: string,
    completedBookings: number,
    disputeCount: number,
  ): DepositRecommendation {
    let rate = 0.30;
    if (isHighValue) rate = Math.max(rate, 0.40);
    if (kycStatus === 'NONE') rate = Math.max(rate, 0.35);
    if (completedBookings > 5 && disputeCount === 0 && kycStatus === 'APPROVED') rate = 0.20;
    if (disputeCount > 1) rate = Math.min(0.50, rate + 0.10);
    return {
      recommendedRate: rate,
      minRate: Math.max(0.10, rate - 0.10),
      maxRate: Math.min(0.60, rate + 0.10),
      reasoning: 'Mức cọc được tính theo lịch sử giao dịch và trạng thái KYC.',
      confidence: 0.7,
    };
  }
}
