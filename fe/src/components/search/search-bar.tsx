'use client';

import { useState } from 'react';
import { Loader2, Search, Sparkles, X } from 'lucide-react';
import { aiSearchApi, type AiSearchResult } from '@/lib/api/ai-search';
import { cn } from '@/lib/utils';

const EXAMPLES = [
  'Lều cho 4 người đi Đà Lạt cuối tuần này, dưới 300k',
  'Flycam rẻ nhất ở Đà Nẵng',
  'Xe đẩy em bé khoảng 150 nghìn',
];

export type SearchMode = 'normal' | 'ai';

interface SearchBarProps {
  mode: SearchMode;
  onModeChange: (mode: SearchMode) => void;
  keyword: string;
  onKeywordChange: (keyword: string) => void;
  onSearch: () => void;
  // The location, date and price fields, shown inside the bar from the lg breakpoint up.
  filters: React.ReactNode;
  onAiResult: (result: AiSearchResult) => void;
  onAiClear: () => void;
}

export function SearchBar({
  mode,
  onModeChange,
  keyword,
  onKeywordChange,
  onSearch,
  filters,
  onAiResult,
  onAiClear,
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiSearchResult | null>(null);
  const ai = mode === 'ai';

  const runAi = async (text: string) => {
    const q = text.trim();
    if (q.length < 2 || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await aiSearchApi.parse(q);
      setResult(res);
      onAiResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tìm kiếm AI đang gặp sự cố, vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const clearAi = () => {
    setResult(null);
    setQuery('');
    setError(null);
    onAiClear();
  };

  const tab = (active: boolean) =>
    cn(
      'inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors',
      active ? 'bg-white text-ink shadow-sm' : 'text-slate-500 hover:text-ink',
    );

  return (
    <div>
      <div className="mb-2 ml-2 inline-flex rounded-full bg-slate-100 p-1" role="group" aria-label="Kiểu tìm kiếm">
        <button type="button" aria-pressed={!ai} onClick={() => onModeChange('normal')} className={tab(!ai)}>
          <Search className="h-4 w-4" />
          Tìm thường
        </button>
        <button type="button" aria-pressed={ai} onClick={() => onModeChange('ai')} className={tab(ai)}>
          <Sparkles className={cn('h-4 w-4', ai ? 'text-violet-600' : 'text-violet-500')} />
          Tìm bằng AI
        </button>
      </div>

      <div
        className={cn(
          'rounded-full border bg-white p-2 shadow-card transition-all',
          ai ? 'border-violet-300 ring-4 ring-violet-100' : 'border-sky-100',
        )}
      >
        {ai ? (
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Sparkles className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-violet-500" />
              <input
                id="ai-search-input"
                type="text"
                maxLength={200}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && runAi(query)}
                placeholder="Mô tả chuyến đi của bạn, ví dụ: lều cho 4 người đi Đà Lạt cuối tuần này, dưới 300k"
                className="h-12 w-full rounded-full bg-transparent pl-14 pr-4 text-[15px] font-medium text-ink outline-none placeholder:text-slate-400"
              />
            </div>
            <button
              type="button"
              onClick={() => runAi(query)}
              disabled={loading || query.trim().length < 2}
              className="inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-gradient-to-r from-brand to-violet-600 px-6 text-sm font-bold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              <span className="hidden sm:inline">Hỏi AI</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <div className="relative min-w-0 flex-1 lg:flex-[1.15]">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="search-keyword-input"
                type="text"
                placeholder="Tìm thiết bị, trải nghiệm…"
                value={keyword}
                onChange={(e) => onKeywordChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                className="h-12 w-full rounded-full bg-transparent pl-11 pr-4 text-sm font-medium text-ink outline-none placeholder:text-slate-400"
              />
            </div>
            <div className="hidden min-w-0 flex-[3] items-center lg:flex">
              <span aria-hidden="true" className="h-8 w-px shrink-0 bg-slate-200" />
              <div className="min-w-0 flex-1">{filters}</div>
            </div>
            <button
              type="button"
              onClick={onSearch}
              className="inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-brand px-6 text-sm font-bold text-white shadow-md shadow-brand/30 transition-colors hover:bg-brand-blue"
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Tìm kiếm</span>
            </button>
          </div>
        )}
      </div>

      {ai && (
        <div className="mt-3 px-2">
          {error && <p className="mb-2 text-xs text-red-500">{error}</p>}
          {result ? (
            <div className="flex items-start justify-between gap-3 rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3 text-[13px] text-violet-900">
              <p className="leading-relaxed">
                <span className="font-semibold">AI hiểu:</span>{' '}
                {result.fallback ? `${result.summary} (AI chưa phân tích được, đang tìm theo từ khoá.)` : result.summary}
                {result.relaxed.length > 0 && (
                  <span className="mt-1 block text-amber-700">
                    Chưa có sản phẩm khớp hoàn toàn nên đã bỏ điều kiện: {result.relaxed.join(', ')}.
                  </span>
                )}
              </p>
              <button
                type="button"
                onClick={clearAi}
                aria-label="Xoá kết quả AI"
                className="shrink-0 rounded-full p-1 hover:bg-violet-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => {
                    setQuery(ex);
                    void runAi(ex);
                  }}
                  className="rounded-full border border-violet-100 bg-white px-3.5 py-1.5 text-xs font-medium text-violet-700 transition hover:bg-violet-50"
                >
                  {ex}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
