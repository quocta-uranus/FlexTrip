'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { listingSchema, type ListingInput } from '@/lib/validators/listing.schema';
import { useListing, useUpdateListing } from '@/hooks/useListings';
import { listingApi } from '@/lib/api/client';
import { ImageUploader } from '@/components/listing/image-uploader';
import type { ListingCategory } from '@/types/listing';
import { CATEGORY_LABELS } from '@/types/listing';

const CATEGORIES: Array<{ value: ListingCategory; label: string; icon: string }> = [
  { value: 'CAMPING_TREKKING', label: 'Cắm trại & Trekking', icon: '⛺' },
  { value: 'VEHICLE', label: 'Phương tiện', icon: '🚵' },
  { value: 'STAY', label: 'Chỗ ở', icon: '🏡' },
  { value: 'EXPERIENCE', label: 'Trải nghiệm', icon: '🌄' },
  { value: 'OTHER', label: 'Khác', icon: '📦' },
];

const COMMON_AMENITIES = [
  'Lều', 'Túi ngủ', 'Đèn pin', 'Bếp dã ngoại', 'Nồi/Chảo', 'Bộ dụng cụ sơ cứu',
  'Ba lô', 'Cọc lều', 'Áo mưa', 'GPS/Bản đồ', 'Nón bảo hiểm', 'Mũ bảo hộ',
];

function Field({ label, error, required, children }: {
  label: string; error?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium" style={{ color: '#0f1729' }}>
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs" style={{ color: '#dc2626' }}>{error}</p>}
    </div>
  );
}

const inputCls = "w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all placeholder:text-[#8694ad] focus:ring-2 focus:ring-[#2a7bd9]/30";
const inputStyle = { borderColor: '#DCEFFB', color: '#0f1729' };

// ─── AI Suggestion Panel ──────────────────────────────────────────────────────

function AiPanel({
  title, description, category, location, amenities, price,
  onDescription, onOptimized,
}: {
  title: string; description: string; category: string; location: string;
  amenities: string[]; price: number;
  onDescription: (d: string) => void;
  onOptimized: (d: string, improvements: string[]) => void;
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const [qualityResult, setQualityResult] = useState<{
    score: number; grade: string; suggestions: string[];
    breakdown: Record<string, number>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runAi(action: string) {
    setLoading(action);
    setError(null);
    try {
      if (action === 'generate') {
        const res = await listingApi.aiGenerateDescription({
          title, category, location, amenities, price: price || undefined,
        });
        onDescription(res.description);
      } else if (action === 'optimize') {
        const res = await listingApi.aiOptimize({ description, title, category });
        onOptimized(res.optimized, res.improvements);
      } else if (action === 'quality') {
        const res = await listingApi.aiQualityScore({
          title, description, category, imageUrls: [], amenities, price: price || undefined,
        });
        setQualityResult(res);
      }
    } catch {
      setError('AI không khả dụng. Kiểm tra ANTHROPIC_API_KEY.');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="rounded-2xl border bg-white p-6 space-y-4" style={{ borderColor: '#DCEFFB' }}>
      <div className="flex items-center gap-2">
        <span className="text-lg">🤖</span>
        <h2 className="text-base font-semibold" style={{ color: '#0f1729' }}>AI Assistant</h2>
        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase" style={{ background: 'rgba(42,123,217,0.1)', color: '#2a7bd9' }}>Beta</span>
      </div>

      {error && (
        <p className="rounded-lg px-3 py-2 text-xs" style={{ background: 'rgba(239,68,68,0.08)', color: '#dc2626' }}>{error}</p>
      )}

      <div className="grid gap-2 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => runAi('generate')}
          disabled={!title || !category || !location || loading === 'generate'}
          className="flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all hover:bg-[#f6fbfe] disabled:opacity-40"
          style={{ borderColor: '#DCEFFB', color: '#0f1729' }}
        >
          {loading === 'generate' ? <span className="animate-spin">⏳</span> : '✍️'}
          <div className="text-left">
            <p className="font-semibold text-xs">Tạo mô tả</p>
            <p className="text-[10px]" style={{ color: '#8694ad' }}>LIST-04: AI soạn từ đầu</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => runAi('optimize')}
          disabled={description.length < 20 || loading === 'optimize'}
          className="flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all hover:bg-[#f6fbfe] disabled:opacity-40"
          style={{ borderColor: '#DCEFFB', color: '#0f1729' }}
        >
          {loading === 'optimize' ? <span className="animate-spin">⏳</span> : '✨'}
          <div className="text-left">
            <p className="font-semibold text-xs">Tối ưu mô tả</p>
            <p className="text-[10px]" style={{ color: '#8694ad' }}>LIST-07: Copywriting AI</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => runAi('quality')}
          disabled={!title || !description || loading === 'quality'}
          className="flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all hover:bg-[#f6fbfe] disabled:opacity-40"
          style={{ borderColor: '#DCEFFB', color: '#0f1729' }}
        >
          {loading === 'quality' ? <span className="animate-spin">⏳</span> : '📊'}
          <div className="text-left">
            <p className="font-semibold text-xs">Chấm điểm</p>
            <p className="text-[10px]" style={{ color: '#8694ad' }}>LIST-05: Quality Score</p>
          </div>
        </button>
      </div>

      {qualityResult && (
        <div className="rounded-xl p-4 space-y-3" style={{ background: '#f8fbff' }}>
          <div className="flex items-center gap-3">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-bold text-white"
              style={{
                background: qualityResult.score >= 70 ? '#16a34a' : qualityResult.score >= 50 ? '#ca8a04' : '#dc2626',
              }}
            >
              {qualityResult.grade}
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: '#0f1729' }}>{qualityResult.score}/100</p>
              <p className="text-xs" style={{ color: '#5a6b85' }}>Điểm chất lượng tin đăng</p>
            </div>
          </div>
          {qualityResult.suggestions?.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold" style={{ color: '#0f1729' }}>Gợi ý cải thiện:</p>
              <ul className="space-y-1">
                {qualityResult.suggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs" style={{ color: '#5a6b85' }}>
                    <span className="mt-0.5 shrink-0 text-[#2a7bd9]">→</span> {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EditListingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: listing, isLoading } = useListing(id);
  const { mutate: update, isPending, error } = useUpdateListing(id);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>(['']);
  const [aiImprovements, setAiImprovements] = useState<string[]>([]);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<ListingInput>({
    resolver: zodResolver(listingSchema) as any,
    defaultValues: { currency: 'VND', amenities: [], imageUrls: [] },
  });

  const selectedCategory = watch('category');
  const watchTitle = watch('title') ?? '';
  const watchDescription = watch('description') ?? '';
  const watchLocation = watch('location') ?? '';
  const watchPrice = watch('price') ?? 0;

  useEffect(() => {
    if (!listing) return;
    reset({
      title: listing.title,
      description: listing.description,
      price: Number(listing.price),
      currency: listing.currency,
      location: listing.location,
      category: listing.category,
      amenities: listing.amenities,
      imageUrls: listing.imageUrls,
      latitude: listing.latitude ?? undefined,
      longitude: listing.longitude ?? undefined,
    });
    setAmenities(listing.amenities);
    setImageUrls(listing.imageUrls.length ? listing.imageUrls : ['']);
  }, [listing, reset]);

  function toggleAmenity(a: string) {
    const next = amenities.includes(a) ? amenities.filter((x) => x !== a) : [...amenities, a];
    setAmenities(next);
    setValue('amenities', next);
  }

  function onSubmit(data: unknown) {
    update(data as Partial<ListingInput>, {
      onSuccess: () => router.push('/dashboard/listings'),
    });
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: '#f6fbfe' }}>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#2a7bd9] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#f6fbfe' }}>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <nav className="mb-6 flex items-center gap-2 text-xs" style={{ color: '#8694ad' }}>
          <Link href="/dashboard" style={{ color: '#2a7bd9' }}>Dashboard</Link>
          <span>/</span>
          <Link href="/dashboard/listings" style={{ color: '#2a7bd9' }}>Sản phẩm</Link>
          <span>/</span>
          <span style={{ color: '#0f1729' }}>Chỉnh sửa</span>
        </nav>

        <h1 className="mb-8 text-2xl font-bold" style={{ color: '#0f1729' }}>Chỉnh sửa sản phẩm</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="rounded-2xl border bg-white p-6 space-y-5" style={{ borderColor: '#DCEFFB' }}>
            <h2 className="text-base font-semibold" style={{ color: '#0f1729' }}>Thông tin cơ bản</h2>

            <Field label="Tiêu đề sản phẩm" error={errors.title?.message} required>
              <input {...register('title')} placeholder="VD: Lều cắm trại 4 người North Face" className={inputCls} style={inputStyle} />
            </Field>

            <Field label="Danh mục" error={errors.category?.message} required>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => {
                  const active = selectedCategory === cat.value;
                  return (
                    <button key={cat.value} type="button" onClick={() => setValue('category', cat.value)}
                      className="flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all"
                      style={{ borderColor: active ? '#2a7bd9' : '#DCEFFB', background: active ? 'rgba(42,123,217,0.08)' : '#fff', color: active ? '#2a7bd9' : '#5a6b85' }}>
                      <span>{cat.icon}</span>{cat.label}
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label="Mô tả chi tiết" error={errors.description?.message} required>
              <textarea {...register('description')} rows={5}
                placeholder="Mô tả chi tiết sản phẩm…"
                className={`${inputCls} resize-none`} style={inputStyle} />
              {aiImprovements.length > 0 && (
                <div className="mt-2 rounded-lg px-3 py-2" style={{ background: 'rgba(42,123,217,0.06)' }}>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: '#2a7bd9' }}>AI đã cải thiện:</p>
                  {aiImprovements.map((imp, i) => <p key={i} className="text-xs" style={{ color: '#5a6b85' }}>• {imp}</p>)}
                </div>
              )}
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Địa điểm nhận/trả" error={errors.location?.message} required>
                <input {...register('location')} placeholder="VD: Đà Lạt, Lâm Đồng" className={inputCls} style={inputStyle} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Giá/ngày" error={errors.price?.message} required>
                  <input type="number" min={0} {...register('price')} placeholder="150000" className={inputCls} style={inputStyle} />
                </Field>
                <Field label="Tiền tệ">
                  <select {...register('currency')} className={inputCls} style={inputStyle}>
                    <option value="VND">VND</option>
                    <option value="USD">USD</option>
                  </select>
                </Field>
              </div>
            </div>
          </div>

          {/* Amenities */}
          <div className="rounded-2xl border bg-white p-6" style={{ borderColor: '#DCEFFB' }}>
            <h2 className="mb-4 text-base font-semibold" style={{ color: '#0f1729' }}>Tiện ích kèm theo</h2>
            <div className="flex flex-wrap gap-2">
              {COMMON_AMENITIES.map((a) => {
                const selected = amenities.includes(a);
                return (
                  <button key={a} type="button" onClick={() => toggleAmenity(a)}
                    className="rounded-full border px-3 py-1.5 text-sm transition-all"
                    style={{ borderColor: selected ? '#2a7bd9' : '#DCEFFB', background: selected ? 'rgba(42,123,217,0.08)' : '#fff', color: selected ? '#2a7bd9' : '#5a6b85' }}>
                    {selected ? '✓ ' : ''}{a}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Images */}
          <div className="rounded-2xl border bg-white p-6 space-y-3" style={{ borderColor: '#DCEFFB' }}>
            <h2 className="text-base font-semibold" style={{ color: '#0f1729' }}>Hình ảnh</h2>
            <ImageUploader
              urls={imageUrls.filter(Boolean)}
              onChange={(urls) => { setImageUrls(urls); setValue('imageUrls', urls); }}
            />
          </div>

          {/* AI Panel */}
          <AiPanel
            title={watchTitle} description={watchDescription}
            category={selectedCategory ?? ''} location={watchLocation}
            amenities={amenities} price={Number(watchPrice)}
            onDescription={(d) => setValue('description', d)}
            onOptimized={(d, imps) => { setValue('description', d); setAiImprovements(imps); }}
          />

          {error && (
            <div className="rounded-lg border px-4 py-3 text-sm" style={{ borderColor: '#fca5a5', background: '#fef2f2', color: '#dc2626' }}>
              {(error as Error).message}
            </div>
          )}

          <div className="flex items-center justify-between">
            <Link href="/dashboard/listings"
              className="rounded-xl border px-6 py-3 text-sm font-medium hover:bg-[#f1f5fa]"
              style={{ borderColor: '#DCEFFB', color: '#5a6b85' }}>
              Huỷ
            </Link>
            <button type="submit" disabled={isPending}
              className="rounded-xl px-8 py-3 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: '#2a7bd9', boxShadow: '0 8px 24px -6px rgba(42,123,217,0.4)' }}>
              {isPending ? 'Đang lưu…' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
