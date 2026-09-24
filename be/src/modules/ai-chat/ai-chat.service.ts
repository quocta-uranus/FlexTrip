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

type GroqResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
  error?: { message?: string };
};

const SYSTEM_PROMPT = `Bạn là FlexTrip AI, trợ lý của nền tảng thuê đồ và trải nghiệm du lịch FlexTrip tại Việt Nam.
Trả lời bằng tiếng Việt, ngắn gọn và hữu ích. Hãy dùng DỮ LIỆU HỆ THỐNG bên dưới khi người dùng hỏi về hồ sơ, booking hoặc listing của họ.
Chỉ coi dữ liệu hệ thống là nguồn chính xác; không bịa giá, tình trạng còn hàng hoặc trạng thái booking. Không tự tạo, sửa, hủy booking hay listing. Nếu người dùng muốn thực hiện một thao tác, hãy chỉ dẫn họ vào đúng màn hình trong FlexTrip.`;

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
    if (!conversation) throw new NotFoundException('Không tìm thấy cuộc trò chuyện AI.');
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
      data: { conversationId: conversation.id, role: AiChatRole.USER, content: dto.message.trim() },
    });

    const [history, context] = await Promise.all([
      this.prisma.aiChatMessage.findMany({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: 'desc' },
        take: 12,
      }),
      this.buildSystemContext(userId),
    ]);

    const answer = await this.ask([
      { role: 'system', content: `${SYSTEM_PROMPT}\n\nDỮ LIỆU HỆ THỐNG (chỉ dành cho người dùng hiện tại):\n${context}` },
      ...history.reverse().map((message) => ({
        role: message.role === AiChatRole.USER ? 'user' : 'assistant',
        content: message.content,
      })),
    ]);

    const assistantMessage = await this.prisma.aiChatMessage.create({
      data: { conversationId: conversation.id, role: AiChatRole.ASSISTANT, content: answer },
    });

    return { conversationId: conversation.id, message: assistantMessage };
  }

  private async buildSystemContext(userId: string) {
    const [user, bookings, ownListings, activeListings] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, roles: { select: { role: true } }, providerProfile: { select: { shopName: true } } },
      }),
      this.prisma.booking.findMany({
        where: { travelerId: userId },
        orderBy: { updatedAt: 'desc' },
        take: 6,
        select: { id: true, status: true, startDate: true, endDate: true, totalPrice: true, listing: { select: { title: true, location: true } } },
      }),
      this.prisma.listing.findMany({
        where: { providerId: userId },
        orderBy: { updatedAt: 'desc' },
        take: 8,
        select: { id: true, title: true, status: true, price: true, currency: true, location: true, category: true },
      }),
      this.prisma.listing.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: { id: true, title: true, price: true, currency: true, location: true, category: true },
      }),
    ]);

    return JSON.stringify({
      currentUser: user ? { name: user.name, roles: user.roles.map(({ role }) => role), shopName: user.providerProfile?.shopName ?? null } : null,
      recentBookings: bookings.map((booking) => ({
        id: booking.id,
        status: booking.status,
        startDate: booking.startDate.toISOString().slice(0, 10),
        endDate: booking.endDate.toISOString().slice(0, 10),
        totalPrice: booking.totalPrice.toString(),
        listing: booking.listing,
      })),
      myListings: ownListings.map((listing) => ({ ...listing, price: listing.price.toString() })),
      latestAvailableListings: activeListings.map((listing) => ({ ...listing, price: listing.price.toString() })),
    });
  }

  private async ask(messages: Array<{ role: string; content: string }>): Promise<string> {
    const apiKey = this.config.get<string>('GROQ_API_KEY');
    if (!apiKey) throw new ServiceUnavailableException('Trợ lý AI chưa được cấu hình API key.');

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.get<string>('GROQ_MODEL', 'openai/gpt-oss-20b'),
          temperature: 0.3,
          max_tokens: 700,
          messages,
        }),
      });
      const payload = (await response.json()) as GroqResponse;
      if (!response.ok) {
        this.logger.warn(`Groq request failed (${response.status}): ${payload.error?.message ?? 'Unknown error'}`);
        throw new ServiceUnavailableException('Trợ lý AI đang bận. Vui lòng thử lại sau ít phút.');
      }
      const answer = payload.choices?.[0]?.message?.content?.trim();
      if (!answer) throw new ServiceUnavailableException('Trợ lý AI chưa thể trả lời. Vui lòng thử lại.');
      return answer;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      this.logger.error('Could not reach Groq API', error instanceof Error ? error.stack : undefined);
      throw new ServiceUnavailableException('Không thể kết nối tới trợ lý AI. Vui lòng thử lại sau.');
    }
  }
}
