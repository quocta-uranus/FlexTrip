import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ParsedSearchFilters, buildDateAnchors, extractJson, sanitizeFilters } from './ai-search.parser';

export interface ParseSearchResult {
  filters: ParsedSearchFilters;
  summary: string;
  // true when the LLM was unavailable and we fell back to a plain keyword search
  fallback: boolean;
}

const SYSTEM_PROMPT = `Bạn chuyển câu tìm kiếm tiếng Việt của khách thuê đồ du lịch thành bộ lọc JSON cho FlexTrip.
Chỉ trả về JSON thuần (không markdown), các khoá đều tuỳ chọn, chỉ điền khi khách NÓI RÕ:
{"keyword": string, "location": string, "category": string, "minPrice": number, "maxPrice": number, "dateFrom": "YYYY-MM-DD", "dateTo": "YYYY-MM-DD", "sort": string, "summary": string}

Quy tắc:
- keyword: cụm danh từ cốt lõi của món đồ, 1–3 từ (vd "lều", "flycam", "xe đẩy"). Bỏ từ thừa, bỏ số người, địa điểm, giá, ngày.
- location: tên địa danh (vd "Đà Lạt", "Đà Nẵng"), không thêm "ở", "tại".
- category: một trong CAMERA_GEAR (máy ảnh, flycam, gopro), CAMPING (lều, túi ngủ, bếp dã ngoại), TREKKING (ba lô, gậy, giày leo núi), BEACH (đồ bơi, ván lướt, kính lặn), TRAVEL_ESSENTIALS (vali, sạc dự phòng, wifi di động), FAMILY (xe đẩy, ghế trẻ em). Chỉ điền khi chắc chắn.
- minPrice/maxPrice: giá thuê theo ngày bằng VND. "300k" = 300000, "1 triệu" = 1000000, "dưới X" -> maxPrice, "trên X" -> minPrice, "khoảng X" -> khoảng ±20%.
- dateFrom/dateTo: dùng đúng các mốc ngày được cung cấp trong "Mốc ngày", không tự tính lịch. Ngày không ghi năm thì lấy năm gần nhất không nằm trong quá khứ. Chỉ điền khi đủ cả hai ngày.
- sort: "price_asc" nếu khách muốn rẻ nhất, "price_desc" nếu đắt nhất, "rating" nếu đánh giá cao/tốt nhất.
- summary: MỘT câu tiếng Việt ngắn, dạng liệt kê điều đã lọc, ví dụ "Tìm lều ở Đà Lạt, dưới 300.000₫, 17–18/10." Nếu khách nêu điều không lọc được (số người, màu sắc...) thì thêm "Chưa lọc theo <điều đó>." Không nhắc những thứ khách không nói.
Nếu câu không liên quan thuê đồ du lịch, chỉ trả {"keyword": <câu gốc rút gọn>}.`;

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10;

@Injectable()
export class AiSearchService {
  private readonly logger = new Logger(AiSearchService.name);
  // Public endpoint backed by a paid LLM, so cap calls per client
  private readonly hits = new Map<string, number[]>();

  constructor(private readonly config: ConfigService) {}

  allow(clientKey: string): boolean {
    const now = Date.now();
    const recent = (this.hits.get(clientKey) ?? []).filter((t) => now - t < WINDOW_MS);
    if (recent.length >= MAX_PER_WINDOW) {
      this.hits.set(clientKey, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(clientKey, recent);
    if (this.hits.size > 5000) this.hits.clear();
    return true;
  }

  async parse(query: string): Promise<ParseSearchResult> {
    const text = query.trim();
    const fallback: ParseSearchResult = {
      filters: { keyword: text.slice(0, 60) },
      summary: `Tìm theo từ khoá "${text.slice(0, 60)}".`,
      fallback: true,
    };

    const apiKey = this.config.get<string>('GROQ_API_KEY');
    if (!apiKey) return fallback;

    const today = this.todayInVietnam();
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.get<string>('GROQ_MODEL', 'openai/gpt-oss-20b'),
          temperature: 0,
          max_completion_tokens: 600,
          reasoning_effort: 'low',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: `${today.anchors}\nCâu tìm kiếm: ${text}` },
          ],
        }),
      });
      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string | null } }>;
        error?: { message?: string };
      };
      if (!response.ok) throw new Error(payload.error?.message ?? `HTTP ${response.status}`);

      const raw = extractJson(payload.choices?.[0]?.message?.content ?? '');
      const filters = sanitizeFilters(raw, today.date);
      if (Object.keys(filters).length === 0) return fallback;

      const summary =
        raw && typeof (raw as { summary?: unknown }).summary === 'string'
          ? (raw as { summary: string }).summary.trim().slice(0, 300)
          : '';
      return { filters, summary: summary || 'Đã áp dụng bộ lọc theo yêu cầu của bạn.', fallback: false };
    } catch (error) {
      this.logger.warn(`AI search parse failed: ${error instanceof Error ? error.message : error}`);
      return fallback;
    }
  }

  private todayInVietnam() {
    return buildDateAnchors(new Date());
  }
}
