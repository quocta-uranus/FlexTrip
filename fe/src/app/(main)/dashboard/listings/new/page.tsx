'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { listingSchema, type ListingInput } from '@/lib/validators/listing.schema';
import { useCreateListing } from '@/hooks/useListings';
import { ImageUploader } from '@/components/listing/image-uploader';
import { ChevronRight, Check, AlertCircle, Loader2, ArrowLeft, MapPin, Tag, AlignLeft, DollarSign, Image, Package } from 'lucide-react';
import { LISTING_CATEGORIES } from '@/constants/categories';
import { PriceSuggestionCard } from '@/components/pricing/PriceSuggestionCard';
import { AiDescriptionPanel } from '@/components/listing/AiDescriptionPanel';

// ── Vietnam provinces ──────────────────────────────────────────────────────────
const VN_PROVINCES = [
  // Popular destinations first
  'Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ',
  'Lâm Đồng (Đà Lạt)', 'Khánh Hòa (Nha Trang)', 'Thừa Thiên Huế', 'Quảng Nam (Hội An)',
  'Bà Rịa - Vũng Tàu', 'Kiên Giang (Phú Quốc)', 'Lào Cai (Sa Pa)', 'Hà Giang',
  // Alphabetical
  'An Giang', 'Bắc Giang', 'Bắc Kạn', 'Bạc Liêu', 'Bắc Ninh', 'Bến Tre',
  'Bình Định', 'Bình Dương', 'Bình Phước', 'Bình Thuận', 'Cà Mau', 'Cao Bằng',
  'Đắk Lắk', 'Đắk Nông', 'Điện Biên', 'Đồng Nai', 'Đồng Tháp',
  'Gia Lai', 'Hà Nam', 'Hà Tĩnh', 'Hải Dương', 'Hậu Giang', 'Hòa Bình',
  'Hưng Yên', 'Kon Tum', 'Lai Châu', 'Lạng Sơn', 'Long An',
  'Nam Định', 'Nghệ An', 'Ninh Bình', 'Ninh Thuận', 'Phú Thọ', 'Phú Yên',
  'Quảng Bình', 'Quảng Ngãi', 'Quảng Ninh', 'Quảng Trị', 'Sóc Trăng',
  'Sơn La', 'Tây Ninh', 'Thái Bình', 'Thái Nguyên', 'Thanh Hóa',
  'Tiền Giang', 'Trà Vinh', 'Tuyên Quang', 'Vĩnh Long', 'Vĩnh Phúc', 'Yên Bái',
] as const;

const COMMON_AMENITIES = [
  'Lều', 'Túi ngủ', 'Đèn pin', 'Bếp dã ngoại', 'Nồi/Chảo', 'Bộ dụng cụ sơ cứu',
  'Ba lô', 'Cọc lều', 'Áo mưa', 'GPS/Bản đồ', 'Nón bảo hiểm', 'Mũ bảo hộ',
  'Áo phao', 'Mái chèo', 'Dây buộc', 'Bạt lót sàn',
];

// ── Reusable components ────────────────────────────────────────────────────────

function SectionCard({ icon, title, subtitle, children }: {
  icon: React.ReactNode; title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/[0.05]">
      <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#eff6ff] text-[#2a7bd9]">
          {icon}
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Field({ label, error, required, hint, children }: {
  label: string; error?: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-700">
        {label}{required && <span className="ml-0.5 text-red-400">*</span>}
      </label>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
      {children}
      {error && (
        <p className="flex items-center gap-1 text-xs text-red-500">
          <AlertCircle className="h-3 w-3 shrink-0" />{error}
        </p>
      )}
    </div>
  );
}

const inputCls = [
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800',
  'outline-none ring-0 transition-all placeholder:text-slate-300',
  'focus:border-[#2a7bd9] focus:ring-2 focus:ring-[#2a7bd9]/15',
  'hover:border-slate-300',
].join(' ');

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CreateListingPage() {
  const router = useRouter();
  const { mutate: createListing, isPending, error } = useCreateListing();
  const [amenities, setAmenities] = useState<string[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ListingInput>({
    resolver: zodResolver(listingSchema) as any,
    defaultValues: { currency: 'VND', amenities: [], imageUrls: [] },
  });

  const selectedCategory = watch('category');
  const watchLocation = watch('location') ?? '';
  const watchTitle = watch('title') ?? '';
  const watchDescription = watch('description') ?? '';
  const watchPrice = watch('price');

  function toggleAmenity(a: string) {
    const next = amenities.includes(a) ? amenities.filter((x) => x !== a) : [...amenities, a];
    setAmenities(next);
    setValue('amenities', next);
  }

  function onSubmit(data: unknown) {
    createListing(data as ListingInput, {
      onSuccess: () => router.push('/dashboard/listings'),
    });
  }

  return (
    <div className="min-h-screen bg-[#f3f8fd]">

      {/* ── Page header ── */}
      <div className="bg-white shadow-sm ring-1 ring-black/[0.04]">
        <div className="mx-auto max-w-3xl px-4 py-5 sm:px-6">
          <nav className="mb-3 flex items-center gap-1.5 text-xs text-slate-400">
            <Link href="/dashboard" className="hover:text-[#2a7bd9] transition-colors">Dashboard</Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/dashboard/listings" className="hover:text-[#2a7bd9] transition-colors">Sản phẩm</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="font-medium text-slate-600">Tạo mới</span>
          </nav>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Thêm sản phẩm mới</h1>
              <p className="mt-0.5 text-sm text-slate-400">Điền đầy đủ thông tin để sản phẩm dễ tìm kiếm hơn</p>
            </div>
            <Link
              href="/dashboard/listings"
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition-all hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Quay lại
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

          {/* ── Section 1: Basic info — Title · Location · Category ── */}
          <SectionCard
            icon={<Tag className="h-4 w-4" />}
            title="Thông tin cơ bản"
            subtitle="Tên sản phẩm, khu vực và danh mục"
          >
            <div className="space-y-5">

              {/* Title */}
              <Field label="Tiêu đề sản phẩm" error={errors.title?.message} required
                hint="Tên rõ ràng, nổi bật để khách hàng dễ tìm kiếm">
                <input
                  {...register('title')}
                  placeholder="VD: Lều cắm trại 4 người North Face Stormbreaker"
                  className={inputCls}
                />
              </Field>

              {/* Location dropdown */}
              <Field label="Khu vực nhận/trả hàng" error={errors.location?.message} required
                hint="Tỉnh/thành phố nơi khách đến nhận và trả sản phẩm">
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <select
                    {...register('location')}
                    className={`${inputCls} cursor-pointer appearance-none pl-10 pr-10`}
                    defaultValue=""
                  >
                    <option value="" disabled>Chọn tỉnh / thành phố…</option>
                    {VN_PROVINCES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <svg
                    className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                {/* Selected province badge */}
                {watchLocation && (
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#eff6ff] px-3 py-1">
                    <MapPin className="h-3 w-3 text-[#2a7bd9]" />
                    <span className="text-xs font-semibold text-[#2a7bd9]">{watchLocation}</span>
                  </div>
                )}
              </Field>

              {/* Category grid */}
              <Field label="Danh mục" error={errors.category?.message} required>
                <div className="mt-1 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {LISTING_CATEGORIES.map(({ value, label, description: sub, Icon, color, bg }) => {
                    const active = selectedCategory === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setValue('category', value)}
                        className="relative flex items-start gap-3 rounded-xl border-2 p-3.5 text-left transition-all"
                        style={{
                          borderColor: active ? color : '#e2e8f0',
                          background: active ? bg : '#fff',
                          boxShadow: active ? `0 0 0 3px ${color}18` : 'none',
                        }}
                      >
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                          style={{ background: active ? `${color}20` : '#f8fafc' }}
                        >
                          <Icon className="h-[18px] w-[18px]" style={{ color: active ? color : '#94a3b8' }} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold" style={{ color: active ? color : '#334155' }}>{label}</p>
                          <p className="mt-0.5 text-[11px] leading-tight text-slate-400">{sub}</p>
                        </div>
                        {active && (
                          <div
                            className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full"
                            style={{ background: color }}
                          >
                            <Check className="h-3 w-3 text-white" strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </Field>
            </div>
          </SectionCard>

          {/* ── Section 2: Description + AI ── */}
          <SectionCard
            icon={<AlignLeft className="h-4 w-4" />}
            title="Mô tả sản phẩm"
            subtitle="Tình trạng, cách dùng, lưu ý — càng chi tiết càng tốt"
          >
            <div className="space-y-4">
              <textarea
                {...register('description')}
                rows={6}
                placeholder="VD: Lều còn mới 95%, chống nước cấp 3000mm, dễ dựng, phù hợp cho 4 người. Kèm theo túi đựng và cọc lều. Lưu ý: vui lòng trả đúng hẹn và vệ sinh trước khi trả."
                className={`${inputCls} resize-none`}
              />
              {errors.description && (
                <p className="flex items-center gap-1 text-xs text-red-500">
                  <AlertCircle className="h-3 w-3 shrink-0" />{errors.description.message}
                </p>
              )}

              {/* AI Panel — enabled when title + category + location filled */}
              <AiDescriptionPanel
                title={watchTitle}
                description={watchDescription}
                category={selectedCategory ?? ''}
                location={watchLocation}
                amenities={amenities}
                price={watchPrice > 0 ? watchPrice : undefined}
                onDescription={(d) => setValue('description', d, { shouldValidate: true })}
                onOptimized={(d) => setValue('description', d, { shouldValidate: true })}
              />
            </div>
          </SectionCard>

          {/* ── Section 3: Price ── */}
          <SectionCard
            icon={<DollarSign className="h-4 w-4" />}
            title="Giá thuê"
            subtitle="Giá mỗi ngày bằng VND"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <Field label="Giá / ngày (₫)" error={errors.price?.message} required>
                    <input
                      type="number"
                      min={0}
                      {...register('price')}
                      placeholder="150000"
                      className={inputCls}
                    />
                  </Field>
                </div>
                <Field label="Tiền tệ">
                  <select {...register('currency')} className={inputCls}>
                    <option value="VND">VND</option>
                    <option value="USD">USD</option>
                  </select>
                </Field>
              </div>

              {/* Price preview */}
              {watchPrice > 0 && (
                <div className="flex items-center gap-3 rounded-xl bg-[#eff6ff] px-4 py-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2a7bd9]/10">
                    <span className="text-sm font-bold text-[#2a7bd9]">₫</span>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Giá hiển thị</p>
                    <p className="text-sm font-bold text-[#2a7bd9]">
                      {Number(watchPrice).toLocaleString('vi-VN')} ₫ / ngày
                    </p>
                  </div>
                </div>
              )}

              {/* AI Price Suggestion */}
              <PriceSuggestionCard
                category={selectedCategory ?? ''}
                location={watchLocation}
                title={watchTitle}
                currentPrice={watchPrice > 0 ? watchPrice : undefined}
                onApply={(price) => setValue('price', price, { shouldValidate: true })}
              />
            </div>
          </SectionCard>

          {/* ── Section 4: Images ── */}
          <SectionCard
            icon={<Image className="h-4 w-4" />}
            title="Hình ảnh sản phẩm"
            subtitle="Ảnh rõ nét giúp tăng tỷ lệ thuê lên 3×"
          >
            {errors.imageUrls && (
              <p className="mb-3 flex items-center gap-1 text-xs text-red-500">
                <AlertCircle className="h-3 w-3" />{errors.imageUrls.message}
              </p>
            )}
            <div className="mb-4 grid grid-cols-3 gap-2">
              {[
                { emoji: '☀️', tip: 'Chụp đủ ánh sáng' },
                { emoji: '📐', tip: 'Nhiều góc, cận cảnh' },
                { emoji: '✨', tip: 'Sản phẩm sạch sẽ' },
              ].map(({ emoji, tip }) => (
                <div key={tip} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                  <span className="text-base">{emoji}</span>
                  <span className="text-[11px] text-slate-500">{tip}</span>
                </div>
              ))}
            </div>
            <ImageUploader
              urls={imageUrls.filter(Boolean)}
              onChange={(urls) => { setImageUrls(urls); setValue('imageUrls', urls); }}
            />
          </SectionCard>

          {/* ── Section 5: Amenities ── */}
          <SectionCard
            icon={<Package className="h-4 w-4" />}
            title="Tiện ích & Thiết bị kèm theo"
            subtitle="Chọn những gì đi kèm khi thuê sản phẩm"
          >
            <div className="flex flex-wrap gap-2">
              {COMMON_AMENITIES.map((a) => {
                const selected = amenities.includes(a);
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => toggleAmenity(a)}
                    className="flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all"
                    style={{
                      borderColor: selected ? '#2a7bd9' : '#e2e8f0',
                      background: selected ? '#eff6ff' : '#fff',
                      color: selected ? '#2a7bd9' : '#64748b',
                      boxShadow: selected ? '0 0 0 2px rgba(42,123,217,0.15)' : 'none',
                    }}
                  >
                    {selected && <Check className="h-3 w-3" strokeWidth={3} />}
                    {a}
                  </button>
                );
              })}
            </div>
            {amenities.length > 0 && (
              <p className="mt-4 text-xs text-slate-400">
                Đã chọn <strong className="text-slate-600">{amenities.length}</strong> tiện ích: {amenities.join(' · ')}
              </p>
            )}
          </SectionCard>

          {/* ── Error banner ── */}
          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <p className="text-sm text-red-600">{error.message}</p>
            </div>
          )}

          {/* ── Actions ── */}
          <div className="flex items-center justify-between gap-4 rounded-2xl bg-white px-6 py-4 shadow-sm ring-1 ring-black/[0.04]">
            <Link
              href="/dashboard/listings"
              className="flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition-all hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Huỷ
            </Link>
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 rounded-xl px-8 py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-60 hover:brightness-110 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #2a7bd9 0%, #1d6bc0 100%)',
                boxShadow: '0 4px 16px -4px rgba(42,123,217,0.5)',
              }}
            >
              {isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Đang tạo…</>
              ) : (
                <><Check className="h-4 w-4" />Tạo sản phẩm</>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
