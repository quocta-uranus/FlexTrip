'use client';

import { useState } from 'react';
import { Loader2, Sparkles, X } from 'lucide-react';
import { aiSearchApi, type AiSearchResult } from '@/lib/api/ai-search';

const EXAMPLES = [
  'Lều cho 4 người đi Đà Lạt cuối tuần này, dưới 300k',
  'Flycam rẻ nhất ở Đà Nẵng',
  'Xe đẩy em bé khoảng 150 nghìn',
];

interface Props {
  onResult: (result: AiSearchResult) => void;
  onClear: () => void;
}

export function AiSearchBox({ onResult, onClear }: Props) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiSearchResult | null>(null);

  const run = async (text: string) => {
    const q = text.trim();
    if (q.length < 2 || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await aiSearchApi.parse(q);
      setResult(res);
      onResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tìm kiếm AI đang gặp sự cố, vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setResult(null);
    setQuery('');
    setError(null);
    onClear();
  };

  return (
    <div className="pb-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Sparkles className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-500" />
          <input
            id="ai-search-input"
            type="text"
            maxLength={200}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && run(query)}
            placeholder="Hỏi AI: “lều cho 4 người đi Đà Lạt cuối tuần này, dưới 300k”"
            className="w-full rounded-full border border-violet-200 bg-violet-50/40 py-2.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition-all focus:ring-2 focus:ring-violet-400/30"
          />
        </div>
        <button
          type="button"
          onClick={() => run(query)}
          disabled={loading || query.trim().length < 2}
          className="flex shrink-0 items-center gap-2 rounded-full bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          <span className="hidden sm:inline">Tìm bằng AI</span>
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

      {result ? (
        <div className="mt-2 flex items-start justify-between gap-3 rounded-xl border border-violet-100 bg-violet-50 px-3.5 py-2.5 text-xs text-violet-900">
          <p className="leading-relaxed">
            <span className="font-semibold">AI hiểu:</span>{' '}
            {result.fallback ? `${result.summary} (AI chưa phân tích được, đang tìm theo từ khoá.)` : result.summary}
          </p>
          <button type="button" onClick={clear} aria-label="Xoá kết quả AI" className="shrink-0 rounded-full p-0.5 hover:bg-violet-100">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => {
                setQuery(ex);
                run(ex);
              }}
              className="rounded-full border border-violet-100 bg-white px-3 py-1 text-xs text-violet-700 transition hover:bg-violet-50"
            >
              {ex}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
