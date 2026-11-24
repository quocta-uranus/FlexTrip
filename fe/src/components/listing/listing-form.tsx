'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader, PAGE_WIDTH } from '@/components/layout/page-header';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertCircle, AlignLeft, Calendar, Check, DollarSign, Image as ImageIcon,
  ArrowRight, ChevronDown, Loader2, MapPin, Package, Pencil, Plus, Scale, Tag, Trash2,
} from 'lucide-react';
import { listingSchema, type ListingInput } from '@/lib/validators/listing.schema';
import { ImageUploader } from '@/components/listing/image-uploader';
import { AiDescriptionPanel } from '@/components/listing/AiDescriptionPanel';
import { PriceSuggestionCard } from '@/components/pricing/PriceSuggestionCard';
import { AutoAdjustSettings } from '@/components/pricing/AutoAdjustSettings';
import { LISTING_CATEGORIES } from '@/constants/categories';
import { COMMON_AMENITIES, VN_PROVINCES } from '@/constants/listing-form';
import type { Listing } from '@/types/listing';

const inputCls = [
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800',
  'outline-none ring-0 transition-all placeholder:text-slate-300',
  'focus:border-[#2a7bd9] focus:ring-2 focus:ring-[#2a7bd9]/15',
  'hover:border-slate-300',
].join(' ');

const fmtMoney = (n: unknown) => (Number(n) || 0).toLocaleString('vi-VN');

function SectionCard({ id, icon, title, subtitle, children, fill = false }: {
  id?: string;
  icon: React.ReactNode; title: string; subtitle?: string; children: React.ReactNode;
  /** Stretch to the height of the grid cell, so two cards side by side end on the same line. */
  fill?: boolean;
}) {
  return (
    <div id={id} className={`scroll-mt-28 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/[0.05] ${fill ? 'flex h-full flex-col' : ''}`}>
      <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#eff6ff] text-[#2a7bd9]">
          {icon}
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>
      </div>
      <div className={`p-6 ${fill ? 'flex flex-1 flex-col' : ''}`}>{children}</div>
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="flex items-center gap-1 text-xs text-red-500">
      <AlertCircle className="h-3 w-3 shrink-0" />{message}
    </p>
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
      <FieldError message={error} />
    </div>
  );
}

// Edit sends null to clear marketValue, create just omits it
function toPayload(data: ListingInput, mode: 'create' | 'edit') {
  const marketValue = data.marketValue && data.marketValue > 0 ? data.marketValue : undefined;
  return {
    ...data,
    conditionNote: data.conditionNote?.trim() || undefined,
    marketValue: mode === 'edit' ? (marketValue ?? null) : marketValue,
    penaltyRules: data.penaltyRules ?? [],
  };
}

export type ListingFormPayload = ReturnType<typeof toPayload>;

interface Props {
  mode: 'create' | 'edit';
  listing?: Listing;
  isPending: boolean;
  errorMessage?: string;
  onSubmit: (payload: ListingFormPayload) => void;
}

export function ListingForm({ mode, listing, isPending, errorMessage, onSubmit }: Props) {
  const isEdit = mode === 'edit';
  const [amenities, setAmenities] = useState<string[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [aiImprovements, setAiImprovements] = useState<string[]>([]);
  const [invalidSubmit, setInvalidSubmit] = useState(false);
  const [openPenalty, setOpenPenalty] = useState<number | null>(null);

  const { register, handleSubmit, setValue, watch, reset, control, formState: { errors } } = useForm<ListingInput>({
    resolver: zodResolver(listingSchema) as never,
    defaultValues: { currency: 'VND', amenities: [], imageUrls: [], penaltyRules: [] },
  });
  const { fields: penaltyFields, append: appendPenalty, remove: removePenalty } = useFieldArray({
    control,
    name: 'penaltyRules',
  });

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
      penaltyRules: Array.isArray(listing.penaltyRules) ? listing.penaltyRules : [],
      conditionNote: listing.conditionNote ?? '',
      marketValue: listing.marketValue ? Number(listing.marketValue) : undefined,
    });
    setAmenities(listing.amenities);
    setImageUrls(listing.imageUrls);
  }, [listing, reset]);

  const selectedCategory = watch('category');
  const watchLocation = watch('location') ?? '';
  const watchTitle = watch('title') ?? '';
  const watchDescription = watch('description') ?? '';
  const watchPrice = Number(watch('price')) || 0;
  const watchPenalties = watch('penaltyRules') ?? [];

  const provinceOptions: string[] = [...VN_PROVINCES];
  // Older listings may hold a free-text location that is not in the province list
  if (watchLocation && !provinceOptions.includes(watchLocation)) provinceOptions.unshift(watchLocation);

  function toggleAmenity(a: string) {
    const next = amenities.includes(a) ? amenities.filter((x) => x !== a) : [...amenities, a];
    setAmenities(next);
    setValue('amenities', next);
  }

  // Plain text field that only accepts digits: no spinner arrows, no letters, no "e" or minus signs
  function moneyInput(name: Parameters<typeof register>[0]) {
    return {
      ...register(name, {
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
          e.target.value = e.target.value.replace(/\D/g, '');
        },
      }),
      type: 'text' as const,
      inputMode: 'numeric' as const,
      autoComplete: 'off',
    };
  }

  const INVALID_FIELDS = [
    { key: 'title', label: 'Tiêu đề sản phẩm', section: 'sec-basic' },
    { key: 'location', label: 'Khu vực nhận/trả hàng', section: 'sec-basic' },
    { key: 'category', label: 'Danh mục', section: 'sec-basic' },
    { key: 'description', label: 'Mô tả sản phẩm', section: 'sec-description' },
    { key: 'price', label: 'Giá thuê', section: 'sec-price' },
    { key: 'imageUrls', label: 'Hình ảnh', section: 'sec-images' },
    { key: 'conditionNote', label: 'Tình trạng sản phẩm', section: 'sec-terms' },
    { key: 'marketValue', label: 'Giá trị thị trường', section: 'sec-terms' },
    { key: 'penaltyRules', label: 'Bảng mức phạt', section: 'sec-terms' },
  ];
  const invalidFields = INVALID_FIELDS.filter((f) => (errors as Record<string, unknown>)[f.key]);

  function jumpToField(key: string, section: string) {
    const input = document.querySelector<HTMLElement>(`[name="${key}"]`);
    const target = input ?? document.getElementById(section);
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    input?.focus({ preventScroll: true });
  }

  const titleText = isEdit ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới';

  return (
    <div className="min-h-screen bg-[#f3f8fd]">
      <PageHeader
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Sản phẩm', href: '/dashboard/listings' },
          { label: isEdit ? 'Chỉnh sửa' : 'Tạo mới' },
        ]}
        title={titleText}
        subtitle={isEdit ? 'Cập nhật thông tin sản phẩm của bạn' : 'Điền đầy đủ thông tin để sản phẩm dễ tìm kiếm hơn'}
        actions={
          isEdit && listing ? (
            <Link
              href={`/dashboard/listings/${listing.id}/calendar`}
              className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-[#2a7bd9] shadow-sm transition-all hover:bg-blue-50"
            >
              <Calendar className="h-4 w-4" />
              Quản lý lịch
            </Link>
          ) : undefined
        }
      />

      <div className={`${PAGE_WIDTH} pb-8`}>
        <form
          onSubmit={handleSubmit(
            (data) => { setInvalidSubmit(false); onSubmit(toPayload(data, mode)); },
            () => {
              setInvalidSubmit(true);
              requestAnimationFrame(() =>
                document.querySelector('[data-invalid-banner]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
              );
            },
          )}
          className="grid gap-5 lg:grid-cols-2"
        >
          <div className="lg:col-span-2">
          <SectionCard id="sec-basic" icon={<Tag className="h-4 w-4" />} title="Thông tin cơ bản" subtitle="Tên sản phẩm, khu vực và danh mục">
            <div className="space-y-5">
              <div className="grid gap-5 md:grid-cols-[3fr_2fr]">
              <Field label="Tiêu đề sản phẩm" error={errors.title?.message} required
                hint="Tên rõ ràng, nổi bật để khách hàng dễ tìm kiếm">
                <input
                  {...register('title')}
                  placeholder="VD: Lều cắm trại 4 người North Face Stormbreaker"
                  className={inputCls}
                />
              </Field>

              <Field label="Khu vực nhận/trả hàng" error={errors.location?.message} required
                hint="Tỉnh/thành phố nơi khách đến nhận và trả sản phẩm">
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <select
                    {...register('location')}
                    className={`${inputCls} cursor-pointer appearance-none pl-10 pr-10`}
                  >
                    <option value="" disabled>Chọn tỉnh / thành phố…</option>
                    {provinceOptions.map((p) => (
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
              </Field>
              </div>

              <Field label="Danh mục" error={errors.category?.message} required>
                <div className="mt-1 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
                  {LISTING_CATEGORIES.map(({ value, label, description: sub, Icon, color, bg }) => {
                    const active = selectedCategory === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setValue('category', value, { shouldValidate: true })}
                        className="relative flex flex-col items-center gap-2.5 rounded-xl border-2 px-3 py-4 text-center transition-all"
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
          </div>

          <SectionCard
            id="sec-description"
            icon={<AlignLeft className="h-4 w-4" />}
            title="Mô tả sản phẩm"
            fill
            subtitle="Tình trạng, cách dùng, lưu ý — càng chi tiết càng tốt"
          >
            <div className="flex flex-1 flex-col gap-4">
              <textarea
                {...register('description')}
                rows={6}
                placeholder="VD: Lều còn mới 95%, chống nước cấp 3000mm, dễ dựng, phù hợp cho 4 người. Kèm theo túi đựng và cọc lều."
                className={`${inputCls} min-h-36 flex-1 resize-none`}
              />
              <FieldError message={errors.description?.message} />
              {aiImprovements.length > 0 && (
                <div className="rounded-lg bg-[#2a7bd9]/[0.06] px-3 py-2">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#2a7bd9]">AI đã cải thiện:</p>
                  {aiImprovements.map((imp, i) => <p key={i} className="text-xs text-slate-500">• {imp}</p>)}
                </div>
              )}
              <AiDescriptionPanel
                title={watchTitle}
                description={watchDescription}
                category={selectedCategory ?? ''}
                location={watchLocation}
                amenities={amenities}
                price={watchPrice > 0 ? watchPrice : undefined}
                onDescription={(d) => setValue('description', d, { shouldValidate: true })}
                onOptimized={(d, imps) => { setValue('description', d, { shouldValidate: true }); setAiImprovements(imps); }}
              />
            </div>
          </SectionCard>

          <div className="space-y-5">
          <SectionCard id="sec-price" icon={<DollarSign className="h-4 w-4" />} title="Giá thuê" subtitle="Giá mỗi ngày bằng VND">
            <div className="space-y-4">
              <Field label="Giá / ngày (₫)" error={errors.price?.message} required>
                <input {...moneyInput('price')} placeholder="150000" className={inputCls} />
              </Field>

              {watchPrice > 0 && (
                <div className="flex items-center gap-3 rounded-xl bg-[#eff6ff] px-4 py-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2a7bd9]/10">
                    <span className="text-sm font-bold text-[#2a7bd9]">₫</span>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Giá hiển thị</p>
                    <p className="text-sm font-bold text-[#2a7bd9]">{watchPrice.toLocaleString('vi-VN')} ₫ / ngày</p>
                  </div>
                </div>
              )}

              <PriceSuggestionCard
                category={selectedCategory ?? ''}
                location={watchLocation}
                title={watchTitle}
                currentPrice={watchPrice > 0 ? watchPrice : undefined}
                listingId={isEdit ? listing?.id : undefined}
                onApply={(price) => setValue('price', price, { shouldValidate: true })}
              />
            </div>
          </SectionCard>

          <SectionCard id="sec-images" icon={<ImageIcon className="h-4 w-4" />} title="Hình ảnh sản phẩm" subtitle="Ảnh rõ nét giúp khách tin tưởng và dễ quyết định thuê hơn">
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
              onChange={(urls) => { setImageUrls(urls); setValue('imageUrls', urls, { shouldValidate: true }); }}
            />
            <div className="mt-3"><FieldError message={errors.imageUrls?.message} /></div>
          </SectionCard>
          </div>

          {isEdit && listing && <div className="lg:col-span-2"><AutoAdjustSettings listingId={listing.id} /></div>}

          <div className="lg:col-span-2">
          <SectionCard icon={<Package className="h-4 w-4" />} title="Tiện ích & Thiết bị kèm theo" subtitle="Chọn những gì đi kèm khi thuê sản phẩm">
            <div className="flex flex-wrap gap-2">
              {COMMON_AMENITIES.map((a) => {
                const selected = amenities.includes(a);
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => toggleAmenity(a)}
                    className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all ${
                      selected
                        ? 'border-[#2a7bd9] bg-[#eff6ff] text-[#2a7bd9] ring-2 ring-[#2a7bd9]/15'
                        : 'border-slate-200 bg-white text-slate-500'
                    }`}
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
          </div>

          <div className="lg:col-span-2">
          <SectionCard
            id="sec-terms"
            icon={<Scale className="h-4 w-4" />}
            title="Điều khoản & Mức phạt"
            subtitle="Không bắt buộc — thông tin này được in vào hợp đồng thuê"
          >
            <div className="grid items-start gap-5 lg:grid-cols-2">
              <div className="space-y-5">
              <Field label="Tình trạng sản phẩm hiện tại" error={errors.conditionNote?.message}>
                <textarea
                  {...register('conditionNote')}
                  rows={3}
                  placeholder="VD: Lều còn tốt, thanh nhôm có xước nhỏ ở cọc số 3. Khoá kéo hoạt động bình thường."
                  className={`${inputCls} resize-none`}
                />
              </Field>

              <Field
                label="Giá trị thị trường (VND)"
                error={errors.marketValue?.message}
                hint="Nếu ≥ 5.000.000 ₫, hợp đồng được đánh dấu Giá trị cao và thêm điều khoản bảo hiểm."
              >
                <input {...moneyInput('marketValue')} placeholder="VD: 3500000" className={inputCls} />
              </Field>
              </div>

              <div>
                <p className="mb-3 text-sm font-medium text-slate-700">Bảng mức phạt</p>
                {penaltyFields.length === 0 && (
                  <p className="mb-3 text-xs text-slate-400">
                    Chưa có mức phạt nào. Nếu để trống, hai bên tự thỏa thuận khi phát sinh thiệt hại.
                  </p>
                )}
                <div className="max-h-[19rem] space-y-2 overflow-y-auto pr-1">
                  {penaltyFields.map((field, i) => {
                    const rowErrors = errors.penaltyRules?.[i];
                    const isOpen = openPenalty === i || !!rowErrors;
                    const row = watchPenalties[i];
                    const min = Number(row?.minAmount) || 0;
                    const max = Number(row?.maxAmount) || 0;
                    return (
                      <div
                        key={field.id}
                        className={`rounded-xl border bg-white transition-colors ${isOpen ? 'border-[#2a7bd9] p-3.5' : 'border-slate-200 px-3.5 py-2.5'}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#2a7bd9]/10 text-xs font-semibold text-[#2a7bd9]">
                            {i + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-800">{row?.item || 'Mức phạt chưa đặt tên'}</p>
                            {!isOpen && row?.description && <p className="truncate text-xs text-slate-400">{row.description}</p>}
                          </div>
                          {!isOpen && (
                            <span className="shrink-0 rounded-full bg-[#2a7bd9]/[0.08] px-2.5 py-0.5 text-xs font-medium text-[#1e5aa8]">
                              {min === max ? fmtMoney(min) : `${fmtMoney(min)} – ${fmtMoney(max)}`}
                            </span>
                          )}
                          <button
                            type="button"
                            aria-label={isOpen ? 'Thu gọn' : 'Sửa mức phạt'}
                            onClick={() => setOpenPenalty(openPenalty === i ? null : i)}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                          >
                            {isOpen ? <ChevronDown className="h-4 w-4 rotate-180" /> : <Pencil className="h-4 w-4" />}
                          </button>
                          {!isOpen && (
                            <button
                              type="button"
                              aria-label="Xoá mức phạt"
                              onClick={() => { removePenalty(i); setOpenPenalty(null); }}
                              className="rounded-lg p-1.5 text-red-400 transition hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                        {isOpen && (
                          <div className="mt-3">
                            <div className="grid gap-3 sm:grid-cols-2">
                              <Field label="Loại thiệt hại" error={rowErrors?.item?.message}>
                                <input {...register(`penaltyRules.${i}.item`)} placeholder="VD: Mất cọc lều" className={inputCls} />
                              </Field>
                              <Field label="Mô tả" error={rowErrors?.description?.message}>
                                <input {...register(`penaltyRules.${i}.description`)} placeholder="VD: Mất 1 cọc lều" className={inputCls} />
                              </Field>
                              <Field label="Tối thiểu (₫)" error={rowErrors?.minAmount?.message}>
                                <input {...moneyInput(`penaltyRules.${i}.minAmount`)} placeholder="50000" className={inputCls} />
                              </Field>
                              <Field label="Tối đa (₫)" error={rowErrors?.maxAmount?.message}>
                                <input {...moneyInput(`penaltyRules.${i}.maxAmount`)} placeholder="200000" className={inputCls} />
                              </Field>
                            </div>
                            <div className="mt-3 flex items-center justify-between">
                              <button
                                type="button"
                                onClick={() => { removePenalty(i); setOpenPenalty(null); }}
                                className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Xoá mức phạt này
                              </button>
                              <button
                                type="button"
                                onClick={() => setOpenPenalty(null)}
                                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[#2a7bd9] transition hover:bg-[#2a7bd9]/10"
                              >
                                Xong
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => { appendPenalty({ item: '', description: '', minAmount: 0, maxAmount: 0 }); setOpenPenalty(penaltyFields.length); }}
                  className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-[#2a7bd9] transition hover:bg-slate-50"
                >
                  <Plus className="h-4 w-4" />
                  Thêm mức phạt
                </button>
              </div>
            </div>
          </SectionCard>
          </div>

          {invalidSubmit && invalidFields.length > 0 && (
            <div data-invalid-banner className="rounded-2xl border border-red-200 bg-white px-5 py-4 lg:col-span-2">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-50 text-red-500">
                  <AlertCircle className="h-4 w-4" />
                </span>
                <p className="text-sm font-semibold text-slate-800">
                  Cần bổ sung {invalidFields.length} mục trước khi {isEdit ? 'lưu' : 'tạo'}
                </p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {invalidFields.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => jumpToField(f.key, f.section)}
                    className="flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600 transition hover:bg-red-100"
                  >
                    {f.label}
                    <ArrowRight className="h-3 w-3" />
                  </button>
                ))}
              </div>
            </div>
          )}
          {errorMessage && (
            <div className="flex items-start gap-3 lg:col-span-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <p className="whitespace-pre-line text-sm text-red-600">{errorMessage}</p>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 lg:col-span-2">
            <Link
              href="/dashboard/listings"
              className="rounded-xl px-5 py-2.5 text-sm font-medium text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-700"
            >
              Huỷ
            </Link>
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#2a7bd9] to-[#1d6bc0] px-8 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#2a7bd9]/40 transition-all hover:brightness-110 active:scale-95 disabled:opacity-60"
            >
              {isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" />{isEdit ? 'Đang lưu…' : 'Đang tạo…'}</>
              ) : (
                <><Check className="h-4 w-4" />{isEdit ? 'Lưu thay đổi' : 'Tạo sản phẩm'}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
