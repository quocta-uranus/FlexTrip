'use client';

import { useState } from 'react';
import { listingApi } from '@/lib/api/client';

type Props = {
  title: string;
  description: string;
  category: string;
  location: string;
  amenities: string[];
  price?: number;
  onDescription: (d: string) => void;
  onOptimized: (d: string, improvements: string[]) => void;
};

type QualityResult = {
  score: number;
  grade: string;
  suggestions: string[];
  breakdown: Record<string, number>;
};

export function AiDescriptionPanel({
  title, description, category, location, amenities, price,
  onDescription, onOptimized,
}: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [qualityResult, setQualityResult] = useState<QualityResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);

  async function runAi(action: string) {
    setLoading(action);
    setError(null);
    try {
      if (action === 'generate') {
        const res = await listingApi.aiGenerateDescription({
          title, category, location, amenities, price: price || undefined,
        });
        onDescription(res.description);
        setGenerated(true);
        setTimeout(() => setGenerated(false), 3000);
      } else if (action === 'optimize') {
        const res = await listingApi.aiOptimize({ description, title, category });
        onOptimized(res.optimized, res.improvements ?? []);
      } else if (action === 'quality') {
        const res = await listingApi.aiQualityScore({
          title, description, category, imageUrls: [], amenities, price: price || undefined,
        });
        setQualityResult(res);
      }
    } catch {
      setError('AI không khả dụng lúc này. Thử lại sau.');
    } finally {
      setLoading(null);
    }
  }

  const canGenerate = !!(title && category && location);
  const canOptimize = description.length >= 20;
  const canScore = !!(title && description);

  return (
    <div className="overflow-hidden rounded-2xl border bg-white" style={{ borderColor: '#e2e8f3' }}>
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b px-5 py-3.5" style={{ borderColor: '#f1f5f9', background: '#fafcff' }}>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2a7bd9]/10">
          <svg className="h-4 w-4 text-[#2a7bd9]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold" style={{ color: '#0f1729' }}>AI Hỗ trợ mô tả</span>
          <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide" style={{ background: '#2a7bd9', color: 'white' }}>Gemini</span>
        </div>
        <p className="ml-auto text-[11px]" style={{ color: '#8694ad' }}>
          Điền tên sản phẩm + danh mục + địa điểm để bật AI
        </p>
      </div>

      <div className="p-5 space-y-4">
        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: '#fef2f2', border: '1px solid #fca5a5' }}>
            <svg className="h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <p className="text-xs" style={{ color: '#dc2626' }}>{error}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="grid gap-2.5 sm:grid-cols-3">
          {/* Generate */}
          <button
            type="button"
            onClick={() => runAi('generate')}
            disabled={!canGenerate || loading === 'generate'}
            className="group flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all hover:border-[#2a7bd9]/30 hover:bg-[#eff6ff] disabled:cursor-not-allowed disabled:opacity-40"
            style={{ borderColor: '#e2e8f3' }}
          >
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors" style={{ background: '#eff6ff' }}>
              {loading === 'generate' ? (
                <svg className="h-4 w-4 animate-spin text-[#2a7bd9]" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : generated ? (
                <svg className="h-4 w-4 text-[#16a34a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              ) : (
                <svg className="h-4 w-4 text-[#2a7bd9]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                </svg>
              )}
            </div>
            <div>
              <p className="text-xs font-bold" style={{ color: generated ? '#16a34a' : '#0f1729' }}>
                {generated ? 'Đã tạo!' : 'Tạo mô tả'}
              </p>
              <p className="mt-0.5 text-[10px] leading-relaxed" style={{ color: '#8694ad' }}>
                {canGenerate ? 'AI soạn mô tả hấp dẫn từ đầu' : 'Cần tên + danh mục + địa điểm'}
              </p>
            </div>
          </button>

          {/* Optimize */}
          <button
            type="button"
            onClick={() => runAi('optimize')}
            disabled={!canOptimize || loading === 'optimize'}
            className="group flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all hover:border-[#7c3aed]/30 hover:bg-[#f5f3ff] disabled:cursor-not-allowed disabled:opacity-40"
            style={{ borderColor: '#e2e8f3' }}
          >
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: '#f5f3ff' }}>
              {loading === 'optimize' ? (
                <svg className="h-4 w-4 animate-spin text-[#7c3aed]" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="h-4 w-4 text-[#7c3aed]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              )}
            </div>
            <div>
              <p className="text-xs font-bold" style={{ color: '#0f1729' }}>Tối ưu mô tả</p>
              <p className="mt-0.5 text-[10px] leading-relaxed" style={{ color: '#8694ad' }}>
                {canOptimize ? 'AI viết lại hấp dẫn hơn' : 'Nhập mô tả trước (≥20 ký tự)'}
              </p>
            </div>
          </button>

          {/* Quality score */}
          <button
            type="button"
            onClick={() => runAi('quality')}
            disabled={!canScore || loading === 'quality'}
            className="group flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all hover:border-[#ca8a04]/30 hover:bg-[#fffbeb] disabled:cursor-not-allowed disabled:opacity-40"
            style={{ borderColor: '#e2e8f3' }}
          >
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: '#fffbeb' }}>
              {loading === 'quality' ? (
                <svg className="h-4 w-4 animate-spin text-[#ca8a04]" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="h-4 w-4 text-[#ca8a04]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
              )}
            </div>
            <div>
              <p className="text-xs font-bold" style={{ color: '#0f1729' }}>Chấm điểm</p>
              <p className="mt-0.5 text-[10px] leading-relaxed" style={{ color: '#8694ad' }}>
                {canScore ? 'Đánh giá chất lượng tin đăng' : 'Cần tên + mô tả'}
              </p>
            </div>
          </button>
        </div>

        {/* Quality result */}
        {qualityResult && (
          <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: '#e2e8f3', background: '#fafcff' }}>
            <div className="flex items-center gap-3">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-xl font-black text-white shadow-sm"
                style={{
                  background: qualityResult.score >= 70 ? '#16a34a' : qualityResult.score >= 50 ? '#ca8a04' : '#dc2626',
                }}
              >
                {qualityResult.grade}
              </div>
              <div>
                <p className="text-2xl font-black" style={{ color: '#0f1729' }}>{qualityResult.score}<span className="text-sm font-medium text-slate-400">/100</span></p>
                <p className="text-xs" style={{ color: '#5a6b85' }}>Điểm chất lượng tin đăng</p>
              </div>
              {/* Breakdown mini bars */}
              {qualityResult.breakdown && (
                <div className="ml-auto grid grid-cols-5 gap-1.5">
                  {Object.entries(qualityResult.breakdown).map(([k, v]) => (
                    <div key={k} className="flex flex-col items-center gap-0.5">
                      <div className="h-8 w-3 rounded-full bg-[#f1f5fa] overflow-hidden flex items-end">
                        <div
                          className="w-full rounded-full transition-all"
                          style={{
                            height: `${Math.round((v / (k === 'description' ? 30 : k === 'images' ? 25 : k === 'title' ? 20 : k === 'amenities' ? 15 : 10)) * 100)}%`,
                            background: v > 0 ? '#2a7bd9' : '#e2e8f3',
                          }}
                        />
                      </div>
                      <span className="text-[8px]" style={{ color: '#8694ad' }}>{k.slice(0, 3)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {qualityResult.suggestions?.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-bold" style={{ color: '#0f1729' }}>Gợi ý cải thiện:</p>
                <ul className="space-y-1.5">
                  {qualityResult.suggestions.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs" style={{ color: '#5a6b85' }}>
                      <span className="mt-0.5 shrink-0 font-bold text-[#2a7bd9]">→</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
