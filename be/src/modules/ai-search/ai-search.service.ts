import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ListingsService } from '../listings/listings.service';
import { ListingCategoryDto, PublicListingSortDto } from '../listings/listings.dto';
import { RecommendationsService, RecommendedListing } from '../recommendations/recommendations.service';
import { ParsedSearchFilters, buildDateAnchors, extractJson, sanitizeFilters, sanitizeNeeds } from './ai-search.parser';

export interface ParseSearchResult {
  // 'needs': situation-based query answered with a mixed list in `items`; 'filters': apply `filters` on the search page
  mode: 'filters' | 'needs';
  filters: ParsedSearchFilters;
  items?: RecommendedListing[];
  summary: string;
  total: number;
  // Filters we had to drop because the strict combination matched nothing
  relaxed: string[];
  // true when the LLM was unavailable and we fell back to a plain keyword search
  fallback: boolean;
}

const SYSTEM_PROMPT = `Bạn chuyển câu tìm kiếm tiếng Việt của khách thuê đồ du lịch thành bộ lọc JSON cho FlexTrip.
Chỉ trả về JSON thuần (không markdown), các khoá đều tuỳ chọn, chỉ điền khi suy ra được:
{"keyword": string, "needs": string[], "location": string, "category": string, "minPrice": number, "maxPrice": number, "dateFrom": "YYYY-MM-DD", "dateTo": "YYYY-MM-DD", "sort": string, "summary": string}

QUAN TRỌNG: khách thường mô tả NHU CẦU hoặc HOÀN CẢNH chứ không nêu tên món đồ (vd "tôi có em bé và đi du lịch ở Đà Nẵng", "đi biển cùng gia đình", "cuối tuần leo núi"). Khi đó:
- để trống keyword và category,
- điền "needs": 3–5 cụm ngắn (2–4 từ) là các MÓN ĐỒ THUÊ khác nhau mà người trong hoàn cảnh đó có thể cần, trải đủ nhiều nhóm (vd có em bé đi du lịch: "xe đẩy em bé", "ghế ngồi cho bé", "vali du lịch", "đồ đi biển cho bé").
Chỉ điền keyword khi khách nêu rõ tên một món đồ cụ thể (khi đó không cần needs). TUYỆT ĐỐI không chép cả câu hay cụm như "du lịch", "đi chơi", "chuyến đi", "tôi có" vào keyword.

Quy tắc:
- keyword: tên món đồ cốt lõi, 1–3 từ (vd "lều", "flycam", "xe đẩy"). Bỏ số người, địa điểm, giá, ngày.
- location: tên địa danh (vd "Đà Lạt", "Đà Nẵng"), không thêm "ở", "tại".
- category: một trong
  CAMERA_GEAR (máy ảnh, flycam, gopro, chụp ảnh, quay phim),
  CAMPING (lều, túi ngủ, bếp dã ngoại, cắm trại),
  TREKKING (ba lô, gậy, giày leo núi, trekking),
  BEACH (đồ bơi, ván lướt, kính lặn, đi biển),
  TRAVEL_ESSENTIALS (vali, sạc dự phòng, wifi di động, đi nước ngoài),
  FAMILY (em bé, trẻ nhỏ, con nhỏ, xe đẩy, ghế trẻ em, đi cùng gia đình).
  Điền khi nhu cầu thuộc rõ một nhóm.
- minPrice/maxPrice: giá thuê theo ngày bằng VND. "300k" = 300000, "1 triệu" = 1000000, "dưới X" -> maxPrice, "trên X" -> minPrice, "khoảng X" -> khoảng ±20%.
- dateFrom/dateTo: dùng đúng các mốc ngày được cung cấp trong "Mốc ngày", không tự tính lịch. Ngày không ghi năm thì lấy năm gần nhất không nằm trong quá khứ. Chỉ điền khi đủ cả hai ngày.
- sort: "price_asc" nếu khách muốn rẻ nhất, "price_desc" nếu đắt nhất, "rating" nếu đánh giá cao/tốt nhất.
- summary: MỘT câu tiếng Việt ngắn, dạng liệt kê điều đã lọc, ví dụ "Tìm đồ cho gia đình có em bé ở Đà Nẵng." Nếu khách nêu điều không lọc được (số người, màu sắc...) thì thêm "Chưa lọc theo <điều đó>." Không nhắc những thứ khách không nói.
Câu chỉ nêu giá, ngày hoặc địa điểm mà không nói món đồ vẫn HỢP LỆ: chỉ điền các trường đó (vd "các sản phẩm dưới 200k" chỉ có maxPrice). Chỉ trả {} khi câu hoàn toàn không liên quan thuê đồ du lịch.

Ví dụ:
"các sản phẩm dưới 200k" -> {"maxPrice":200000,"summary":"Tìm sản phẩm dưới 200.000₫."}
"tôi có em bé và đi du lịch ở đà nẵng" -> {"needs":["xe đẩy em bé","ghế ngồi cho bé","vali du lịch","đồ đi biển cho bé"],"location":"Đà Nẵng","summary":"Gợi ý đồ cho chuyến đi Đà Nẵng cùng em bé."}
"thuê lều đi Đà Lạt dưới 300k" -> {"keyword":"lều","category":"CAMPING","location":"Đà Lạt","maxPrice":300000,"summary":"Tìm lều ở Đà Lạt, dưới 300.000₫."}`;

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10;

@Injectable()
export class AiSearchService {
  private readonly logger = new Logger(AiSearchService.name);
  // Public endpoint backed by a paid LLM, so cap calls per client
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly config: ConfigService,
    private readonly listings: ListingsService,
    private readonly recommendations: RecommendationsService,
  ) {}

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
    // A long sentence as a keyword matches nothing, so only short queries are used verbatim
    const shortQuery = text.split(/\s+/).length <= 4;
    const fallbackFilters: ParsedSearchFilters = shortQuery ? { keyword: text.slice(0, 60) } : {};
    const fallback: ParseSearchResult = {
      mode: 'filters',
      filters: fallbackFilters,
      summary: shortQuery ? `Tìm theo từ khoá "${text.slice(0, 60)}".` : 'AI chưa hiểu rõ yêu cầu, hiển thị tất cả sản phẩm.',
      total: 0,
      relaxed: [],
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
      const needs = filters.keyword ? [] : sanitizeNeeds(raw);
      const summaryText =
        raw && typeof (raw as { summary?: unknown }).summary === 'string'
          ? (raw as { summary: string }).summary.trim().slice(0, 300)
          : '';

      if (needs.length > 0) {
        const byNeeds = await this.searchByNeeds(needs, filters, summaryText);
        if (byNeeds) return byNeeds;
      }
      if (Object.keys(filters).length === 0) return this.withTotal(fallback);

      const { filters: applied, relaxed, total } = await this.relax(filters);
      return {
        mode: 'filters',
        filters: applied,
        summary: summaryText || 'Đã áp dụng bộ lọc theo yêu cầu của bạn.',
        total,
        relaxed,
        fallback: false,
      };
    } catch (error) {
      this.logger.warn(`AI search parse failed: ${error instanceof Error ? error.message : error}`);
      return fallback;
    }
  }

  // Situation-based query: hard filters (place, price, dates) narrow the pool, then each need is matched semantically
  private async searchByNeeds(
    needs: string[],
    filters: ParsedSearchFilters,
    summary: string,
  ): Promise<ParseSearchResult | null> {
    const hard: ParsedSearchFilters = {
      location: filters.location, minPrice: filters.minPrice, maxPrice: filters.maxPrice,
      dateFrom: filters.dateFrom, dateTo: filters.dateTo, sort: filters.sort,
    };
    Object.keys(hard).forEach((k) => hard[k as keyof ParsedSearchFilters] === undefined && delete hard[k as keyof ParsedSearchFilters]);

    const steps: Array<{ label: string; keys: Array<keyof ParsedSearchFilters> }> = [
      { label: 'ngày thuê', keys: ['dateFrom', 'dateTo'] },
      { label: 'khoảng giá', keys: ['minPrice', 'maxPrice'] },
      { label: 'địa điểm', keys: ['location'] },
    ];
    const applied: ParsedSearchFilters = { ...hard };
    const relaxed: string[] = [];

    for (let i = 0; i <= steps.length; i++) {
      const pool = await this.candidatePool(applied);
      const ranked = await this.recommendations.rankByNeeds(pool, needs, 12);
      if (ranked.length > 0) {
        return {
          mode: 'needs',
          filters: applied,
          items: await this.recommendations.toListings(ranked),
          summary: summary || `Gợi ý đồ cho: ${needs.join(', ')}.`,
          total: ranked.length,
          relaxed,
          fallback: false,
        };
      }
      const step = steps[i];
      if (!step) break;
      if (!step.keys.some((k) => applied[k] !== undefined)) continue;
      step.keys.forEach((k) => delete applied[k]);
      relaxed.push(step.label);
    }
    return null;
  }

  private async candidatePool(filters: ParsedSearchFilters): Promise<string[]> {
    try {
      const res = await this.listings.findAll({
        ...filters,
        category: filters.category as ListingCategoryDto | undefined,
        sort: filters.sort as PublicListingSortDto | undefined,
        page: 1,
        limit: 50,
      });
      return res.items.map((l) => l.id);
    } catch {
      return [];
    }
  }

  private async withTotal(result: ParseSearchResult): Promise<ParseSearchResult> {
    return { ...result, total: await this.countMatches(result.filters) };
  }

  private async countMatches(filters: ParsedSearchFilters): Promise<number> {
    try {
      const res = await this.listings.findAll({
        ...filters,
        category: filters.category as ListingCategoryDto | undefined,
        sort: filters.sort as PublicListingSortDto | undefined,
        page: 1,
        limit: 1,
      });
      return res.total;
    } catch {
      return 0;
    }
  }

  // Strict AND filters often match nothing, so drop the least important ones one by one until something matches
  private async relax(filters: ParsedSearchFilters) {
    const steps: Array<{ label: string; keys: Array<keyof ParsedSearchFilters> }> = [
      { label: 'từ khoá', keys: ['keyword'] },
      { label: 'ngày thuê', keys: ['dateFrom', 'dateTo'] },
      { label: 'khoảng giá', keys: ['minPrice', 'maxPrice'] },
      { label: 'địa điểm', keys: ['location'] },
      { label: 'danh mục', keys: ['category'] },
    ];
    const current: ParsedSearchFilters = { ...filters };
    const relaxed: string[] = [];

    let total = await this.countMatches(current);
    for (const step of steps) {
      if (total > 0) break;
      if (!step.keys.some((k) => current[k] !== undefined)) continue;
      step.keys.forEach((k) => delete current[k]);
      relaxed.push(step.label);
      total = await this.countMatches(current);
    }
    return { filters: current, relaxed, total };
  }

  private todayInVietnam() {
    return buildDateAnchors(new Date());
  }
}
