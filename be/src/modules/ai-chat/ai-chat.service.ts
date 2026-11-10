import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AiChatRole } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { AiChatDto } from './ai-chat.dto';
import {
  hasFlexTripIntent,
  hasTravelDetailIntent,
  isTravelPlanningConversation,
} from './ai-chat-scope';

type GroqResponse = {
  choices?: Array<{
    finish_reason?: string | null;
    message?: { content?: string | null };
  }>;
  error?: { message?: string };
};

type GeocodingResponse = {
  results?: Array<{
    name: string;
    latitude: number;
    longitude: number;
    admin1?: string;
    country?: string;
    timezone?: string;
  }>;
};

type ForecastResponse = {
  daily?: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    apparent_temperature_max: number[];
    precipitation_probability_max: number[];
    precipitation_sum: number[];
    wind_speed_10m_max: number[];
    uv_index_max: number[];
  };
};

const SYSTEM_PROMPT = `Bạn là FlexTrip AI, trợ lý của nền tảng thuê đồ và trải nghiệm du lịch FlexTrip tại Việt Nam.
Trả lời bằng tiếng Việt, ngắn gọn và hữu ích. Hãy dùng DỮ LIỆU HỆ THỐNG bên dưới khi người dùng hỏi về hồ sơ, booking hoặc listing của họ.
Chỉ coi dữ liệu hệ thống là nguồn chính xác; không bịa giá, tình trạng còn hàng hoặc trạng thái booking. Không tự tạo, sửa, hủy booking hay listing. Nếu người dùng muốn thực hiện một thao tác, hãy chỉ dẫn họ vào đúng màn hình trong FlexTrip.

CÁC MÀN HÌNH THỰC TẾ CỦA FLEXTRIP (đường dẫn chỉ dùng để tạo liên kết, không đọc cho khách):
- Mọi người dùng: Khám phá (/search); Giỏ hàng (/cart); Thông báo (/notifications); Tin nhắn (/messages); Hồ sơ cá nhân (/profile).
- Traveler: Đặt thuê hoặc Đơn thuê của tôi (/bookings); Lịch sử chuyến thuê (/profile/history); Thông tin thanh toán (/profile/payments).
- Provider: Dashboard (/dashboard); Sản phẩm của tôi (/dashboard/listings); Thêm sản phẩm (/dashboard/listings/new); Quản lý đơn thuê (/dashboard/bookings); Cập nhật Shop (/profile/shop); Đánh giá (/dashboard/reviews).
- Người muốn trở thành Provider: Đăng ký trở thành nhà cung cấp (/become-provider).
- Chỉ hướng dẫn chức năng phù hợp với role trong currentUser. Không hướng dẫn người dùng thường truy cập màn hình Admin hoặc Staff.
- Viết cho khách hàng phổ thông, không viết như tài liệu cho lập trình viên. Không dùng các từ route, endpoint, ID, URL, pathname và không hiển thị đường dẫn thô như /bookings hoặc ký hiệu <id>.
- Khi hướng dẫn thao tác, nêu tối đa 4 bước dựa trên tên nút hoặc tên menu khách nhìn thấy. Nếu cần dẫn khách tới màn hình, dùng liên kết có nhãn thân thiện theo đúng dạng [Mở đơn thuê của tôi](/bookings); tuyệt đối không để đường dẫn đứng riêng.
- Không tạo liên kết chi tiết booking hoặc hợp đồng khi không có mã booking thật trong DỮ LIỆU HỆ THỐNG. Nếu không chắc một tính năng tồn tại, nói rõ và gợi ý màn hình gần nhất, không bịa đường dẫn.

TƯ VẤN THUÊ ĐỒ BẰNG NGÔN NGỮ TỰ NHIÊN:
- Hiểu nhu cầu từ cách nói tự nhiên, kể cả khi người dùng chỉ mô tả điểm đến, số người, trẻ em hoặc hoạt động dự kiến.
- Đưa ra danh sách ngắn theo mức ưu tiên: thiết yếu, hữu ích và chỉ cần khi có hoạt động đặc biệt. Giải thích mỗi món dựa trên điểm đến, nhóm người, thời lượng, cách di chuyển/lưu trú và hoạt động đã biết.
- Cân nhắc an toàn, sự thoải mái, kích thước/hành lý và nhu cầu của trẻ nhỏ hoặc người lớn tuổi. Không đưa lời khuyên y tế chuyên môn.
- Không khẳng định thời tiết hiện tại. Nếu ngày đi hoặc điều kiện thời tiết chưa rõ, nói đây là yếu tố cần xác nhận.
- Khi có DỮ LIỆU DỰ BÁO THỜI TIẾT, dùng đúng số liệu đó để tư vấn quần áo và đồ thuê. Nêu rõ đây là dự báo có thể thay đổi, ghi nguồn Open-Meteo và không tự bịa số liệu ngoài dữ liệu được cung cấp.
- Chỉ gọi một món là "có trên FlexTrip" khi món đó xuất hiện trong availableListings. Khi giới thiệu listing thật, ghi đúng tên, giá, địa điểm và tạo liên kết thân thiện dạng [Xem sản phẩm](/listings/<mã sản phẩm thật>). Không được biến gợi ý chung thành listing có thật.
- Hệ thống sẽ tự bổ sung các câu hỏi làm rõ sau câu trả lời, vì vậy bạn chỉ cần đưa ra gợi ý ban đầu và không lặp lại phần câu hỏi này.
- Không bắt người dùng phải cung cấp đủ mọi dữ kiện mới được tư vấn.
- Với câu trả lời tiếp theo như "3 ngày", "có trẻ nhỏ" hoặc "đi biển", hãy hiểu theo ngữ cảnh các tin nhắn trước.
- Hộp chat có chiều rộng nhỏ: không dùng bảng Markdown, URL đầy đủ hoặc đường dẫn thô; dùng câu ngắn, danh sách gạch đầu dòng và liên kết có nhãn dễ hiểu.

PHẠM VI TRẢ LỜI:
- Mặc định, chỉ trả lời các câu hỏi về FlexTrip, thuê đồ, du lịch, listings, Provider, booking, thanh toán, tài khoản hoặc cách sử dụng website.
- Nếu câu hỏi không liên quan đến các nội dung trên, TUYỆT ĐỐI không trả lời nội dung câu hỏi ngay. Chỉ trả lời đúng ý sau: "Câu hỏi này chưa liên quan đến FlexTrip. Bạn có muốn mình trả lời với tư cách trợ lý tổng quát không?"
- Nếu tin nhắn ngay sau đó xác nhận rõ ràng như "có", "đồng ý", "được", "hãy trả lời" hoặc tương đương, hãy trả lời câu hỏi ngoài phạm vi trước đó một cách ngắn gọn. Nếu người dùng không xác nhận, hãy tiếp tục hỗ trợ nội dung FlexTrip.
- Khi đã trả lời một câu hỏi ngoài phạm vi theo xác nhận, quay lại chính sách mặc định cho câu hỏi tiếp theo.`;

const OUT_OF_SCOPE_CONFIRMATION =
  'Câu hỏi này chưa liên quan đến FlexTrip. Bạn có muốn mình trả lời với tư cách trợ lý tổng quát không?';

@Injectable()
export class AiChatService {
  private readonly logger = new Logger(AiChatService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async listConversations(userId: string) {
    return this.prisma.aiChatConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
  }

  async getConversation(userId: string, conversationId: string) {
    const conversation = await this.prisma.aiChatConversation.findFirst({
      where: { id: conversationId, userId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!conversation)
      throw new NotFoundException('Không tìm thấy cuộc trò chuyện AI.');
    return conversation;
  }

  async chat(userId: string, dto: AiChatDto) {
    const conversation = dto.conversationId
      ? await this.getConversation(userId, dto.conversationId)
      : await this.prisma.aiChatConversation.create({
          data: { userId, title: dto.message.trim().slice(0, 80) },
          include: { messages: true },
        });

    await this.prisma.aiChatMessage.create({
      data: {
        conversationId: conversation.id,
        role: AiChatRole.USER,
        content: dto.message.trim(),
      },
    });

    const history = await this.prisma.aiChatMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'desc' },
      take: 12,
    });

    const isConfirmingPreviousQuestion =
      history[1]?.role === AiChatRole.ASSISTANT &&
      history[1]?.content === OUT_OF_SCOPE_CONFIRMATION &&
      this.isConfirmation(dto.message);
    const scopeContext = [...history]
      .reverse()
      .map((message) => `${message.role}: ${message.content}`)
      .join('\n');

    let answer: string;
    if (
      !isConfirmingPreviousQuestion &&
      !(await this.isFlexTripRelated(dto.message, scopeContext))
    ) {
      // This response is generated locally, so Groq cannot bypass the confirmation step.
      answer = OUT_OF_SCOPE_CONFIRMATION;
    } else {
      const chronologicalHistory = [...history].reverse();
      const userConversation = chronologicalHistory
        .filter((message) => message.role === AiChatRole.USER)
        .map((message) => message.content)
        .join('\n');
      const context = await this.buildSystemContext(userId, userConversation);
      const weatherContext = await this.buildWeatherContext(userConversation);
      answer = await this.ask([
        {
          role: 'system',
          content: `${SYSTEM_PROMPT}\n\nDỮ LIỆU HỆ THỐNG (chỉ dành cho người dùng hiện tại):\n${context}\n\nDỮ LIỆU DỰ BÁO THỜI TIẾT:\n${weatherContext ?? 'Không có dữ liệu thời tiết cho yêu cầu này.'}`,
        },
        ...chronologicalHistory.map((message) => ({
          role: message.role === AiChatRole.USER ? 'user' : 'assistant',
          content: message.content,
        })),
        ...(isConfirmingPreviousQuestion
          ? [
              {
                role: 'system',
                content:
                  'Người dùng vừa xác nhận được trả lời câu hỏi ngoài phạm vi trước đó. Hãy trả lời câu hỏi đó ngay.',
              },
            ]
          : []),
      ]);

      if (
        !isConfirmingPreviousQuestion &&
        isTravelPlanningConversation(userConversation)
      ) {
        const followUpQuestions = await this.generateTravelFollowUps(
          userConversation,
          answer,
        );
        if (followUpQuestions.length > 0) {
          answer += `\n\nĐể mình tư vấn sát hơn, bạn cho mình biết thêm:\n${followUpQuestions
            .map((question) => `- ${question}`)
            .join('\n')}`;
        }
      }
    }

    const assistantMessage = await this.prisma.aiChatMessage.create({
      data: {
        conversationId: conversation.id,
        role: AiChatRole.ASSISTANT,
        content: answer,
      },
    });

    return { conversationId: conversation.id, message: assistantMessage };
  }

  private async buildSystemContext(userId: string, searchIntent: string) {
    const [user, bookings, ownListings, activeListings] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          name: true,
          roles: { select: { role: true } },
          providerProfile: { select: { shopName: true } },
        },
      }),
      this.prisma.booking.findMany({
        where: { travelerId: userId },
        orderBy: { updatedAt: 'desc' },
        take: 6,
        select: {
          id: true,
          status: true,
          startDate: true,
          endDate: true,
          totalPrice: true,
          listing: { select: { title: true, location: true } },
        },
      }),
      this.prisma.listing.findMany({
        where: { providerId: userId },
        orderBy: { updatedAt: 'desc' },
        take: 8,
        select: {
          id: true,
          title: true,
          status: true,
          price: true,
          currency: true,
          location: true,
          category: true,
        },
      }),
      this.prisma.listing.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true,
          title: true,
          description: true,
          price: true,
          currency: true,
          location: true,
          category: true,
          amenities: true,
          quantity: true,
          minRentalDays: true,
          maxRentalDays: true,
        },
      }),
    ]);

    return JSON.stringify({
      currentUser: user
        ? {
            name: user.name,
            roles: user.roles.map(({ role }) => role),
            shopName: user.providerProfile?.shopName ?? null,
          }
        : null,
      recentBookings: bookings.map((booking) => ({
        id: booking.id,
        status: booking.status,
        startDate: booking.startDate.toISOString().slice(0, 10),
        endDate: booking.endDate.toISOString().slice(0, 10),
        totalPrice: booking.totalPrice.toString(),
        listing: booking.listing,
      })),
      myListings: ownListings.map((listing) => ({
        ...listing,
        price: listing.price.toString(),
      })),
      availableListings: activeListings
        .map((listing) => ({
          listing,
          relevance: this.calculateListingRelevance(
            searchIntent,
            [
              listing.title,
              listing.description,
              listing.location,
              listing.category,
              ...listing.amenities,
            ].join(' '),
          ),
        }))
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, 12)
        .map(({ listing }) => ({
          ...listing,
          description: listing.description.slice(0, 320),
          price: listing.price.toString(),
        })),
    });
  }

  private calculateListingRelevance(searchIntent: string, listingText: string) {
    const terms = this.normalizeText(searchIntent)
      .split(/\W+/)
      .filter((term) => term.length >= 3);
    const searchable = this.normalizeText(listingText);
    return [...new Set(terms)].reduce(
      (score, term) => score + (searchable.includes(term) ? 1 : 0),
      0,
    );
  }

  private normalizeText(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/đ/g, 'd');
  }

  private async buildWeatherContext(
    conversation: string,
  ): Promise<string | null> {
    if (
      !isTravelPlanningConversation(conversation) &&
      !this.hasWeatherIntent(conversation)
    )
      return null;

    try {
      const location = await this.extractTravelLocation(conversation);
      if (!location) return null;

      const geocodingUrl = new URL(
        'https://geocoding-api.open-meteo.com/v1/search',
      );
      geocodingUrl.search = new URLSearchParams({
        name: location,
        count: '1',
        language: 'vi',
        countryCode: 'VN',
        format: 'json',
      }).toString();
      const geocodingResponse = await fetch(geocodingUrl, {
        signal: AbortSignal.timeout(8_000),
      });
      if (!geocodingResponse.ok) return null;
      const place = ((await geocodingResponse.json()) as GeocodingResponse)
        .results?.[0];
      if (!place) return null;

      const forecastUrl = new URL('https://api.open-meteo.com/v1/forecast');
      forecastUrl.search = new URLSearchParams({
        latitude: String(place.latitude),
        longitude: String(place.longitude),
        daily: [
          'weather_code',
          'temperature_2m_max',
          'temperature_2m_min',
          'apparent_temperature_max',
          'precipitation_probability_max',
          'precipitation_sum',
          'wind_speed_10m_max',
          'uv_index_max',
        ].join(','),
        timezone: place.timezone ?? 'Asia/Ho_Chi_Minh',
        forecast_days: '7',
      }).toString();
      const forecastResponse = await fetch(forecastUrl, {
        signal: AbortSignal.timeout(8_000),
      });
      if (!forecastResponse.ok) return null;
      const daily = ((await forecastResponse.json()) as ForecastResponse).daily;
      if (!daily?.time?.length) return null;

      return JSON.stringify({
        source: 'Open-Meteo',
        note: 'Dự báo có thể thay đổi; nên kiểm tra lại gần ngày khởi hành.',
        location: [place.name, place.admin1, place.country]
          .filter(Boolean)
          .join(', '),
        fetchedAt: new Date().toISOString(),
        days: daily.time.map((date, index) => ({
          date,
          condition: this.describeWeatherCode(daily.weather_code[index]),
          temperatureMinC: daily.temperature_2m_min[index],
          temperatureMaxC: daily.temperature_2m_max[index],
          apparentMaxC: daily.apparent_temperature_max[index],
          precipitationProbabilityPercent:
            daily.precipitation_probability_max[index],
          precipitationMm: daily.precipitation_sum[index],
          maxWindKmh: daily.wind_speed_10m_max[index],
          uvIndexMax: daily.uv_index_max[index],
        })),
      });
    } catch (error) {
      this.logger.warn(
        `Could not load weather forecast: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return null;
    }
  }

  private hasWeatherIntent(message: string) {
    const normalized = this.normalizeText(message);
    return [
      'thoi tiet',
      'du bao',
      'nhiet do',
      'mua',
      'nang',
      'bao',
      'gio manh',
    ].some((term) => normalized.includes(term));
  }

  private async extractTravelLocation(
    conversation: string,
  ): Promise<string | null> {
    const raw = await this.ask(
      [
        {
          role: 'system',
          content:
            'Trích xuất điểm đến tại Việt Nam từ cuộc trò chuyện. Chỉ trả JSON hợp lệ dạng {"location":"Đà Nẵng"}. Nếu chưa có điểm đến cụ thể, trả {"location":null}. Không suy đoán, không Markdown.',
        },
        { role: 'user', content: conversation },
      ],
      300,
      0,
    );
    const json = raw.match(/\{[\s\S]*\}/)?.[0];
    if (!json) return null;
    const parsed = JSON.parse(json) as { location?: unknown };
    return typeof parsed.location === 'string' && parsed.location.trim()
      ? parsed.location.trim()
      : null;
  }

  private describeWeatherCode(code: number | undefined) {
    if (code === 0) return 'Trời quang';
    if (code === 1 || code === 2) return 'Ít mây';
    if (code === 3) return 'Nhiều mây';
    if (code === 45 || code === 48) return 'Có sương mù';
    if (code !== undefined && code >= 51 && code <= 57) return 'Mưa phùn';
    if (code !== undefined && code >= 61 && code <= 67) return 'Có mưa';
    if (code !== undefined && code >= 71 && code <= 77) return 'Có tuyết';
    if (code !== undefined && code >= 80 && code <= 82) return 'Mưa rào';
    if (code !== undefined && code >= 85 && code <= 86) return 'Mưa tuyết';
    if (code !== undefined && code >= 95) return 'Có dông';
    return 'Chưa xác định';
  }

  private async generateTravelFollowUps(
    conversation: string,
    recommendation: string,
  ): Promise<string[]> {
    try {
      const raw = await this.ask(
        [
          {
            role: 'system',
            content: `Bạn là chuyên gia tư vấn chuẩn bị đồ du lịch tại Việt Nam. Hãy xác định thông tin còn thiếu có thể làm thay đổi đáng kể gợi ý thuê đồ. Câu hỏi phải phù hợp riêng với điểm đến, thành phần đoàn và kế hoạch đã nêu; không hỏi lại thông tin đã có. Ưu tiên các yếu tố thực sự hữu ích như thời điểm/thời lượng, hoạt động, kiểu lưu trú/di chuyển, ngân sách, nhu cầu trẻ nhỏ/người lớn tuổi và yêu cầu an toàn. Chỉ trả về JSON hợp lệ dạng {"questions":["..."]}, tối đa 3 câu tiếng Việt. Không Markdown, không giải thích.`,
          },
          {
            role: 'user',
            content: `CUỘC TRÒ CHUYỆN:\n${conversation}\n\nGỢI Ý ĐÃ ĐƯA RA:\n${recommendation}`,
          },
        ],
        500,
        0.15,
      );
      const json = raw.match(/\{[\s\S]*\}/)?.[0];
      if (!json) return [];
      const parsed = JSON.parse(json) as { questions?: unknown };
      if (!Array.isArray(parsed.questions)) return [];
      return parsed.questions
        .filter(
          (question): question is string =>
            typeof question === 'string' && question.trim().length > 0,
        )
        .map((question) => question.trim())
        .slice(0, 3);
    } catch (error) {
      this.logger.warn(
        `Could not generate travel follow-up questions: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return [];
    }
  }

  private isConfirmation(message: string) {
    return /^\s*(có|co|đồng ý|dong y|được|duoc|ok|oke|okay|hãy trả lời|hay tra loi)\s*[.!]?\s*$/i.test(
      message,
    );
  }

  private async isFlexTripRelated(
    question: string,
    conversationContext: string,
  ) {
    if (hasFlexTripIntent(question) || hasTravelDetailIntent(question))
      return true;

    const apiKey = this.config.get<string>('GROQ_API_KEY');
    if (!apiKey)
      throw new ServiceUnavailableException(
        'Trợ lý AI chưa được cấu hình API key.',
      );

    try {
      const response = await fetch(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.config.get<string>('GROQ_MODEL', 'openai/gpt-oss-20b'),
            temperature: 0,
            max_completion_tokens: 32,
            reasoning_effort: 'low',
            messages: [
              {
                role: 'system',
                content:
                  'Phân loại TIN NHẮN HIỆN TẠI dựa trên cả lịch sử trò chuyện. Trả về FLEXTRIP nếu tin nhắn liên quan FlexTrip, thuê đồ, du lịch, hoạt động trong chuyến đi, listing, Provider, booking, thanh toán, tài khoản, cách dùng website, hoặc là câu trả lời ngắn cho câu hỏi tư vấn du lịch trước đó (ví dụ số ngày, ngân sách, thành viên, trẻ nhỏ, sở thích, hoạt động). Chỉ trả về GENERAL khi người dùng rõ ràng chuyển sang chủ đề không liên quan. Không giải thích.',
              },
              {
                role: 'user',
                content: `LỊCH SỬ:\n${conversationContext}\n\nTIN NHẮN HIỆN TẠI:\n${question}`,
              },
            ],
          }),
        },
      );
      const payload = (await response.json()) as GroqResponse;
      if (!response.ok)
        throw new Error(
          payload.error?.message ?? 'Scope classification failed',
        );
      return (
        payload.choices?.[0]?.message?.content
          ?.trim()
          .toUpperCase()
          .includes('FLEXTRIP') ?? false
      );
    } catch (error) {
      this.logger.error(
        'Could not classify AI chat scope',
        error instanceof Error ? error.stack : undefined,
      );
      // Failing closed prevents an unrelated question from bypassing confirmation.
      return false;
    }
  }

  private async ask(
    messages: Array<{ role: string; content: string }>,
    maxTokens = 1200,
    temperature = 0.3,
  ): Promise<string> {
    const apiKey = this.config.get<string>('GROQ_API_KEY');
    if (!apiKey)
      throw new ServiceUnavailableException(
        'Trợ lý AI chưa được cấu hình API key.',
      );

    try {
      const response = await fetch(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.config.get<string>('GROQ_MODEL', 'openai/gpt-oss-20b'),
            temperature,
            max_completion_tokens: maxTokens,
            reasoning_effort: 'low',
            messages,
          }),
        },
      );
      const payload = (await response.json()) as GroqResponse;
      if (!response.ok) {
        this.logger.warn(
          `Groq request failed (${response.status}): ${payload.error?.message ?? 'Unknown error'}`,
        );
        throw new ServiceUnavailableException(
          'Trợ lý AI đang bận. Vui lòng thử lại sau ít phút.',
        );
      }
      const answer = payload.choices?.[0]?.message?.content?.trim();
      if (!answer) {
        this.logger.warn(
          `Groq returned an empty answer (finish reason: ${payload.choices?.[0]?.finish_reason ?? 'unknown'})`,
        );
        if (maxTokens < 2000) {
          return this.ask(messages, 2000, temperature);
        }
        throw new ServiceUnavailableException(
          'Trợ lý AI chưa thể trả lời. Vui lòng thử lại.',
        );
      }
      return answer;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      this.logger.error(
        'Could not reach Groq API',
        error instanceof Error ? error.stack : undefined,
      );
      throw new ServiceUnavailableException(
        'Không thể kết nối tới trợ lý AI. Vui lòng thử lại sau.',
      );
    }
  }
}
