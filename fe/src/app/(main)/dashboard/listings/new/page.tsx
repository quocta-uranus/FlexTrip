'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { listingSchema, type ListingInput } from '@/lib/validators/listing.schema';
import { useCreateListing } from '@/hooks/useListings';
import type { ListingCategory } from '@/types/listing';
import { CATEGORY_LABELS } from '@/types/listing';
import { ImageUploader } from '@/components/listing/image-uploader';

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

function Field({ label, error, required, children }: { label: string; error?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-900 dark:text-slate-100">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs" style={{ color: '#dc2626' }}>{error}</p>}
    </div>
  );
}

const inputCls ="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all placeholder:text-[#8694ad] focus:ring-2 focus:ring-[#2a7bd9]/30";
const inputStyle = { borderColor: '#DCEFFB', color: '#0f1729' };

export default function CreateListingPage() {
  const router = useRouter();
  const { mutate: createListing, isPending, error } = useCreateListing();
  const [amenities, setAmenities] = useState<string[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ListingInput>({
    resolver: zodResolver(listingSchema) as any,
    defaultValues: {
      currency: 'VND',
      amenities: [],
      imageUrls: [],
    },
  });

  const selectedCategory = watch('category');

  function toggleAmenity(a: string) {
    const next = amenities.includes(a) ? amenities.filter((x) => x !== a) : [...amenities, a];
    setAmenities(next);
    setValue('amenities', next);
  }

  function onSubmit(data: unknown) {
    createListing(data as ListingInput, {
      onSuccess: () => {
        router.push('/dashboard/listings');
      },
    });
  }

  return (
    <div className="min-h-screen" style={{ background: '#f6fbfe' }}>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Link href="/dashboard" style={{ color: '#2a7bd9' }}>Dashboard</Link>
          <span>/</span>
          <Link href="/dashboard/listings" style={{ color: '#2a7bd9' }}>Sản phẩm</Link>
          <span>/</span>
          <span className="text-slate-900 dark:text-slate-100">Tạo mới</span>
        </nav>

        <h1 className="mb-8 text-2xl font-bold text-slate-900 dark:text-slate-100">Thêm sản phẩm mới</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic info */}
          <div className="rounded-2xl border bg-white p-6 space-y-5 dark:bg-[#121A2C] dark:text-white dark:border-white/10" style={{ borderColor: '#DCEFFB' }}>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Thông tin cơ bản</h2>

            <Field label="Tiêu đề sản phẩm" error={errors.title?.message} required>
              <input
                id="listing-title-input"
                {...register('title')}
                placeholder="VD: Lều cắm trại 4 người North Face"
                className={inputCls}
                style={inputStyle}
              />
            </Field>

            <Field label="Danh mục" error={errors.category?.message} required>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => {
                  const active = selectedCategory === cat.value;
                  return (
                    <button
                      key={cat.value}
                      type="button"
                      id={`category-btn-${cat.value}`}
                      onClick={() => setValue('category', cat.value)}
                      className="flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all"
                      style={{
                        borderColor: active ? '#2a7bd9' : '#DCEFFB',
                        background: active ? 'rgba(42,123,217,0.08)' : '#fff',
                        color: active ? '#2a7bd9' : '#5a6b85',
                      }}
                    >
                      <span>{cat.icon}</span>
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label="Mô tả chi tiết" error={errors.description?.message} required>
              <textarea
                id="listing-description-input"
                {...register('description')}
                rows={5}
                placeholder="Mô tả chi tiết sản phẩm, tình trạng, cách sử dụng, lưu ý khi thuê…"
                className={`${inputCls} resize-none`}
                style={inputStyle}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Địa điểm nhận/trả" error={errors.location?.message} required>
                <input
                  id="listing-location-input"
                  {...register('location')}
                  placeholder="VD: Đà Lạt, Lâm Đồng"
                  className={inputCls}
                  style={inputStyle}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Giá/ngày" error={errors.price?.message} required>
                  <input
                    id="listing-price-input"
                    type="number"
                    min={0}
                    {...register('price')}
                    placeholder="150000"
                    className={inputCls}
                    style={inputStyle}
                  />
                </Field>
                <Field label="Đơn vị tiền tệ">
                  <select
                    {...register('currency')}
                    className={inputCls}
                    style={inputStyle}
                  >
                    <option className="bg-white dark:bg-[#1A263E] text-slate-900 dark:text-white" value="VND">VND</option>
                    <option className="bg-white dark:bg-[#1A263E] text-slate-900 dark:text-white" value="USD">USD</option>
                  </select>
                </Field>
              </div>
            </div>
          </div>

          {/* Amenities */}
          <div className="rounded-2xl border bg-white p-6 dark:bg-[#121A2C] dark:text-white dark:border-white/10" style={{ borderColor: '#DCEFFB' }}>
            <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-slate-100">Tiện ích & Thiết bị kèm theo</h2>
            <div className="mb-4 flex flex-wrap gap-2">
              {COMMON_AMENITIES.map((a) => {
                const selected = amenities.includes(a);
                return (
                  <button
                    key={a}
                    type="button"
                    id={`amenity-${a}`}
                    onClick={() => toggleAmenity(a)}
                    className="rounded-full border px-3 py-1.5 text-sm transition-all"
                    style={{
                      borderColor: selected ? '#2a7bd9' : '#DCEFFB',
                      background: selected ? 'rgba(42,123,217,0.08)' : '#fff',
                      color: selected ? '#2a7bd9' : '#5a6b85',
                    }}
                  >
                    {selected ? '✓ ' : ''}{a}
                  </button>
                );
              })}
            </div>
            {amenities.length > 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400">Đã chọn: {amenities.join(', ')}</p>
            )}
          </div>

          {/* Images */}
          <div className="rounded-2xl border bg-white p-6 space-y-3 dark:bg-[#121A2C] dark:text-white dark:border-white/10" style={{ borderColor: '#DCEFFB' }}>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Hình ảnh sản phẩm</h2>
            {errors.imageUrls && <p className="text-xs" style={{ color: '#dc2626' }}>{errors.imageUrls.message}</p>}
            <ImageUploader
              urls={imageUrls.filter(Boolean)}
              onChange={(urls) => { setImageUrls(urls); setValue('imageUrls', urls); }}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg border px-4 py-3 text-sm" style={{ borderColor: '#fca5a5', background: '#fef2f2', color: '#dc2626' }}>
              {error.message}
            </div>
          )}

          {/* Submit */}
          <div className="flex items-center justify-between">
            <Link
              href="/dashboard/listings"
              className="rounded-xl border px-6 py-3 text-sm font-medium transition-colors hover:bg-[#f1f5fa]"
              style={{ borderColor: '#DCEFFB', color: '#5a6b85' }}
            >
              Huỷ
            </Link>
            <button
              id="submit-listing-btn"
              type="submit"
              disabled={isPending}
              className="rounded-xl px-8 py-3 text-sm font-semibold text-white transition-all disabled:opacity-50"
              style={{ background: '#2a7bd9', boxShadow: '0 8px 24px -6px rgba(42,123,217,0.4)' }}
            >
              {isPending ? 'Đang tạo…' : 'Tạo sản phẩm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
