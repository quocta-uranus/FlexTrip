'use client';

/**
 * PROF-02 — TravelPreferencesSection
 *
 * Rules:
 * 1. Cache preferences theo userId (xử lý trong hook, không lặp ở đây).
 * 2. Không tự làm tròn ngân sách, hiển thị giá trị nguyên từ backend (Decimal → string JSON).
 * 3. Chỉ gửi budgetMin/Max/Scope khi người dùng THỰC SỰ chỉnh sửa ngân sách trong form.
 *    Khi chỉ sửa tripType / preferredCategories → payload KHÔNG bao gồm budget fields.
 * 4. Xác nhận trước khi xoá.
 * 5. Không implement Wishlist / SRC-07.
 */

import { useState, useId } from 'react';
import {
  useTravelPreferences,
  useCreatePreference,
  useUpdatePreference,
  useDeletePreference,
} from '@/hooks/useTravelPreferences';
import {
  LISTING_CATEGORIES,
  CATEGORY_ICONS,
  CATEGORY_LABELS,
} from '@/constants/categories';
import type { ListingCategory } from '@/constants/categories';
import {
  MAX_RENTAL_BUDGET,
  RENTAL_PER_TRIP,
} from '@/types/preference';
import type { TravelPreference, UpdatePreferencePayload } from '@/types/preference';

// ─── constants ───────────────────────────────────────────────────────────────

const TRIP_TYPE_OPTIONS: { value: string; label: string; emoji: string }[] = [
  { value: 'leisure',  label: 'Nghỉ dưỡng',  emoji: '🏖️' },
  { value: 'business', label: 'Công tác',     emoji: '💼' },
  { value: 'trekking', label: 'Trekking',     emoji: '🥾' },
  { value: 'mixed',    label: 'Hỗn hợp',      emoji: '🗺️' },
];

function tripTypeLabel(value: string) {
  return TRIP_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}
function tripTypeEmoji(value: string) {
  return TRIP_TYPE_OPTIONS.find((o) => o.value === value)?.emoji ?? '✈️';
}

// ─── helpers ─────────────────────────────────────────────────────────────────

/**
 * Chuyển budgetMin/Max (string | number | null) từ API thành chuỗi hiển thị.
 * Không tự làm tròn — trả nguyên giá trị string nếu là string.
 */
function fmtBudget(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === '') return '';
  const n = typeof v === 'string' ? parseFloat(v) : v;
  if (isNaN(n)) return String(v);
  return n.toLocaleString('vi-VN');
}

function budgetDisplay(pref: TravelPreference): string {
  const hasMin = pref.budgetMin !== null && pref.budgetMin !== undefined && pref.budgetMin !== '';
  const hasMax = pref.budgetMax !== null && pref.budgetMax !== undefined && pref.budgetMax !== '';

  if (!hasMin && !hasMax) return 'Chưa thiết lập';
  if (hasMin && hasMax) return `${fmtBudget(pref.budgetMin)} – ${fmtBudget(pref.budgetMax)} ₫`;
  if (hasMin) return `Từ ${fmtBudget(pref.budgetMin)} ₫`;
  return `Đến ${fmtBudget(pref.budgetMax)} ₫`;
}

/**
 * Validate ngân sách nhập vào.
 * - Cho phép rỗng (không bắt buộc).
 * - Cho phép 0.
 * - Không vượt MAX_RENTAL_BUDGET (99,999,999.99).
 * Returns error string hoặc null nếu hợp lệ.
 */
function validateBudgetField(raw: string, label: string): string | null {
  if (raw.trim() === '') return null; // optional
  const n = parseFloat(raw.replace(/,/g, ''));
  if (isNaN(n)) return `${label} phải là số hợp lệ.`;
  if (n < 0) return `${label} không được âm.`;
  if (n > MAX_RENTAL_BUDGET) return `${label} tối đa ${fmtBudget(MAX_RENTAL_BUDGET)} ₫.`;
  return null;
}

function validateBudgetRange(minRaw: string, maxRaw: string): string | null {
  const minV = validateBudgetField(minRaw, 'Ngân sách tối thiểu');
  if (minV) return minV;
  const maxV = validateBudgetField(maxRaw, 'Ngân sách tối đa');
  if (maxV) return maxV;

  if (minRaw.trim() !== '' && maxRaw.trim() !== '') {
    const min = parseFloat(minRaw.replace(/,/g, ''));
    const max = parseFloat(maxRaw.replace(/,/g, ''));
    if (!isNaN(min) && !isNaN(max) && min > max) {
      return 'Ngân sách tối thiểu không được lớn hơn tối đa.';
    }
  }
  return null;
}

/** Parse raw string sang number | null để gửi API. Không làm tròn. */
function parseBudgetValue(raw: string): number | null {
  if (raw.trim() === '') return null;
  const n = parseFloat(raw.replace(/,/g, ''));
  return isNaN(n) ? null : n;
}

// ─── Form state ───────────────────────────────────────────────────────────────

interface FormState {
  tripType: string;
  preferredCategories: ListingCategory[];
  budgetMinRaw: string;
  budgetMaxRaw: string;
  /** true nếu người dùng đã chạm vào ít nhất 1 budget field trong lần edit này */
  budgetTouched: boolean;
}

function defaultForm(): FormState {
  return {
    tripType: 'leisure',
    preferredCategories: [],
    budgetMinRaw: '',
    budgetMaxRaw: '',
    budgetTouched: false,
  };
}

function prefToForm(pref: TravelPreference): FormState {
  return {
    tripType: pref.tripType || 'leisure',
    preferredCategories: (pref.preferredCategories ?? []) as ListingCategory[],
    budgetMinRaw:
      pref.budgetMin !== null && pref.budgetMin !== undefined
        ? String(pref.budgetMin)
        : '',
    budgetMaxRaw:
      pref.budgetMax !== null && pref.budgetMax !== undefined
        ? String(pref.budgetMax)
        : '',
    budgetTouched: false, // reset: chỉ mark touched khi user sửa ngân sách
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CategoryBadge({ cat }: { cat: ListingCategory }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ background: 'rgba(42,123,217,0.08)', color: '#1e5aa8' }}
    >
      <span>{CATEGORY_ICONS[cat]}</span>
      <span>{CATEGORY_LABELS[cat]}</span>
    </span>
  );
}

function PreferenceCard({
  pref,
  onEdit,
  onDelete,
}: {
  pref: TravelPreference;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="rounded-2xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
      style={{ borderColor: 'rgba(42,123,217,0.12)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl" aria-hidden="true">
            {tripTypeEmoji(pref.tripType)}
          </span>
          <div>
            <p className="font-semibold text-gray-800" style={{ lineHeight: 1.3 }}>
              {tripTypeLabel(pref.tripType)}
            </p>
            <p className="mt-0.5 text-xs text-gray-400">
              Cập nhật {new Date(pref.updatedAt).toLocaleDateString('vi-VN')}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={onEdit}
            className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-blue-50"
            style={{ borderColor: 'rgba(42,123,217,0.3)', color: '#2a7bd9' }}
            aria-label="Sửa sở thích du lịch"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            Sửa
          </button>
          <button
            onClick={onDelete}
            className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-red-50"
            style={{ borderColor: 'rgba(239,68,68,0.3)', color: '#dc2626' }}
            aria-label="Xoá sở thích du lịch"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Xoá
          </button>
        </div>
      </div>

      {/* Categories */}
      {pref.preferredCategories.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(pref.preferredCategories as ListingCategory[]).map((cat) => (
            <CategoryBadge key={cat} cat={cat} />
          ))}
        </div>
      )}

      {/* Budget */}
      <div className="mt-3 flex items-center gap-2">
        <svg
          className="h-4 w-4 shrink-0 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="text-sm text-gray-600">
          <span className="font-medium">Ngân sách thuê/chuyến: </span>
          {budgetDisplay(pref)}
        </span>
      </div>
    </div>
  );
}

// ─── Toast ───────────────────────────────────────────────────────────────────

function InlineToast({
  message,
  type,
}: {
  message: string;
  type: 'success' | 'error';
}) {
  return (
    <div
      role="alert"
      className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium"
      style={{
        background:
          type === 'success'
            ? 'rgba(16,185,129,0.1)'
            : 'rgba(239,68,68,0.1)',
        color: type === 'success' ? '#059669' : '#dc2626',
        border: `1px solid ${
          type === 'success'
            ? 'rgba(16,185,129,0.3)'
            : 'rgba(239,68,68,0.3)'
        }`,
      }}
    >
      {type === 'success' ? (
        <svg
          className="h-4 w-4 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg
          className="h-4 w-4 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      )}
      {message}
    </div>
  );
}

// ─── Delete confirm dialog ────────────────────────────────────────────────────

function DeleteConfirmDialog({
  onConfirm,
  onCancel,
  loading,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Xác nhận xoá"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div
          className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
          style={{ background: 'rgba(239,68,68,0.1)' }}
        >
          <svg
            className="h-6 w-6 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </div>
        <h3 className="text-base font-bold text-gray-800">
          Xoá sở thích du lịch?
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Thao tác này không thể hoàn tác.
        </p>
        <div className="mt-5 flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-xl border py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
          >
            {loading ? 'Đang xoá...' : 'Xoá'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Preference Form ──────────────────────────────────────────────────────────

interface PreferenceFormProps {
  initialForm: FormState;
  isEdit: boolean;
  onSubmit: (form: FormState) => Promise<void>;
  onCancel: () => void;
  submitting: boolean;
  error: string | null;
}

function PreferenceForm({
  initialForm,
  isEdit,
  onSubmit,
  onCancel,
  submitting,
  error,
}: PreferenceFormProps) {
  const [form, setForm] = useState<FormState>(initialForm);
  const [budgetError, setBudgetError] = useState<string | null>(null);
  const formId = useId();

  function toggleCategory(cat: ListingCategory) {
    setForm((s) => ({
      ...s,
      preferredCategories: s.preferredCategories.includes(cat)
        ? s.preferredCategories.filter((c) => c !== cat)
        : [...s.preferredCategories, cat],
    }));
  }

  function handleBudgetChange(
    field: 'budgetMinRaw' | 'budgetMaxRaw',
    val: string,
  ) {
    setForm((s) => ({ ...s, [field]: val, budgetTouched: true }));
    setBudgetError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const rangeErr = validateBudgetRange(form.budgetMinRaw, form.budgetMaxRaw);
    if (rangeErr) {
      setBudgetError(rangeErr);
      return;
    }
    setBudgetError(null);
    await onSubmit(form);
  }

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-5" noValidate>
      {/* Trip type */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-gray-700">
          Loại chuyến đi
        </label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TRIP_TYPE_OPTIONS.map((opt) => {
            const active = form.tripType === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() =>
                  setForm((s) => ({ ...s, tripType: opt.value }))
                }
                className="flex flex-col items-center gap-1 rounded-xl border px-3 py-3 text-sm font-medium transition-all"
                style={{
                  borderColor: active ? '#2a7bd9' : 'rgba(0,0,0,0.1)',
                  background: active ? 'rgba(42,123,217,0.08)' : '#fff',
                  color: active ? '#1e5aa8' : '#6b7280',
                  boxShadow: active
                    ? '0 0 0 2px rgba(42,123,217,0.2)'
                    : undefined,
                }}
                aria-pressed={active}
              >
                <span className="text-xl" aria-hidden="true">
                  {opt.emoji}
                </span>
                {opt.label}
              </button>
            );
          })}
        </div>
        {/* Giữ giá trị cũ nếu không có trong danh sách */}
        {!TRIP_TYPE_OPTIONS.find((o) => o.value === form.tripType) && (
          <p className="mt-2 text-xs text-gray-400">
            Loại chuyến đi hiện tại:{' '}
            <span className="font-medium text-gray-600">{form.tripType}</span>
          </p>
        )}
      </div>

      {/* Categories */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-gray-700">
          Danh mục thiết bị yêu thích{' '}
          <span className="font-normal text-gray-400">(tùy chọn)</span>
        </label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {LISTING_CATEGORIES.map((cat) => {
            const selected = form.preferredCategories.includes(cat.value);
            return (
              <label
                key={cat.value}
                className="flex cursor-pointer items-center gap-2.5 rounded-xl border p-3 transition-all"
                style={{
                  borderColor: selected ? cat.color : 'rgba(0,0,0,0.1)',
                  background: selected ? cat.bg : '#fff',
                }}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={selected}
                  onChange={() => toggleCategory(cat.value)}
                />
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-md text-base"
                  style={{
                    background: selected ? cat.color : 'transparent',
                  }}
                  aria-hidden="true"
                >
                  {selected ? (
                    <svg
                      className="h-4 w-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    <span>{cat.emoji}</span>
                  )}
                </span>
                <span
                  className="text-sm font-medium"
                  style={{ color: selected ? cat.color : '#374151' }}
                >
                  {cat.label}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Budget */}
      <div>
        <label className="mb-1 block text-sm font-semibold text-gray-700">
          Ngân sách thuê cho một chuyến đi (₫)
          <span className="ml-1 font-normal text-gray-400">(tùy chọn)</span>
        </label>
        <p className="mb-2 text-xs text-gray-400">
          Để trống nếu chưa xác định. Có thể nhập một phía hoặc cả hai.
        </p>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <input
              type="number"
              min="0"
              max={MAX_RENTAL_BUDGET}
              step="0.01"
              placeholder="Tối thiểu"
              value={form.budgetMinRaw}
              onChange={(e) =>
                handleBudgetChange('budgetMinRaw', e.target.value)
              }
              className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all focus:ring-2"
              style={{
                borderColor: budgetError ? '#ef4444' : 'rgba(0,0,0,0.12)',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              }}
              aria-label="Ngân sách tối thiểu"
            />
          </div>
          <span className="text-gray-400">–</span>
          <div className="flex-1">
            <input
              type="number"
              min="0"
              max={MAX_RENTAL_BUDGET}
              step="0.01"
              placeholder="Tối đa"
              value={form.budgetMaxRaw}
              onChange={(e) =>
                handleBudgetChange('budgetMaxRaw', e.target.value)
              }
              className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all focus:ring-2"
              style={{
                borderColor: budgetError ? '#ef4444' : 'rgba(0,0,0,0.12)',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              }}
              aria-label="Ngân sách tối đa"
            />
          </div>
        </div>
        {budgetError && (
          <p className="mt-1.5 text-xs text-red-500" role="alert">
            {budgetError}
          </p>
        )}
      </div>

      {/* Server error */}
      {error && <InlineToast message={error} type="error" />}

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="flex-1 rounded-xl border py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
        >
          Hủy
        </button>
        <button
          type="submit"
          form={formId}
          disabled={submitting}
          className="flex-1 rounded-xl py-3 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #2a7bd9, #1e5aa8)' }}
        >
          {submitting
            ? isEdit
              ? 'Đang lưu...'
              : 'Đang thêm...'
            : isEdit
              ? 'Lưu thay đổi'
              : 'Thêm sở thích'}
        </button>
      </div>
    </form>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TravelPreferencesSection() {
  const { data: preferences, isLoading, isError } = useTravelPreferences();
  const createMutation = useCreatePreference();
  const updateMutation = useUpdatePreference();
  const deleteMutation = useDeletePreference();

  /** null → đóng form; 'new' → thêm mới; string id → sửa */
  const [formMode, setFormMode] = useState<null | 'new' | string>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

  function openNew() {
    setMutationError(null);
    setFormMode('new');
  }

  function openEdit(id: string) {
    setMutationError(null);
    setFormMode(id);
  }

  function closeForm() {
    setFormMode(null);
    setMutationError(null);
  }

  // ── Submit: Create ──────────────────────────────────────────────────────────
  async function handleCreate(form: FormState) {
    setMutationError(null);
    try {
      const budgetErr = validateBudgetRange(form.budgetMinRaw, form.budgetMaxRaw);
      if (budgetErr) {
        setMutationError(budgetErr);
        return;
      }

      await createMutation.mutateAsync({
        tripType: form.tripType,
        preferredCategories: form.preferredCategories,
        ...(form.budgetTouched && {
          budgetMin: parseBudgetValue(form.budgetMinRaw),
          budgetMax: parseBudgetValue(form.budgetMaxRaw),
          budgetScope:
            form.budgetMinRaw.trim() !== '' ||
            form.budgetMaxRaw.trim() !== ''
              ? RENTAL_PER_TRIP
              : null,
        }),
      });
      closeForm();
      showToast('Đã thêm sở thích du lịch!', 'success');
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Thêm sở thích thất bại.';
      setMutationError(msg);
    }
  }

  // ── Submit: Update ──────────────────────────────────────────────────────────
  async function handleUpdate(id: string, form: FormState) {
    setMutationError(null);
    try {
      const budgetErr = validateBudgetRange(form.budgetMinRaw, form.budgetMaxRaw);
      if (budgetErr) {
        setMutationError(budgetErr);
        return;
      }

      const payload: UpdatePreferencePayload = {
        tripType: form.tripType,
        preferredCategories: form.preferredCategories,
      };

      /**
       * Chỉ gửi budget fields khi người dùng THỰC SỰ chỉnh sửa ngân sách.
       * Nếu chỉ sửa tripType / preferredCategories → không đính kèm budget cũ.
       */
      if (form.budgetTouched) {
        const hasValue =
          form.budgetMinRaw.trim() !== '' || form.budgetMaxRaw.trim() !== '';
        payload.budgetMin = parseBudgetValue(form.budgetMinRaw);
        payload.budgetMax = parseBudgetValue(form.budgetMaxRaw);
        payload.budgetScope = hasValue ? RENTAL_PER_TRIP : null;
      }

      await updateMutation.mutateAsync({ id, data: payload });
      closeForm();
      showToast('Đã cập nhật sở thích!', 'success');
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Cập nhật sở thích thất bại.';
      setMutationError(msg);
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    try {
      await deleteMutation.mutateAsync(id);
      setDeleteTarget(null);
      showToast('Đã xoá sở thích.', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Xoá thất bại.';
      setDeleteTarget(null);
      showToast(msg, 'error');
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <section
      id="so-thich"
      aria-label="Sở thích du lịch"
      className="scroll-mt-28 overflow-hidden rounded-3xl border border-sky-100 bg-white shadow-soft"
    >
      {/* ── Section header matching FlexTrip profile cards ── */}
      <div className="px-6 pb-1 pt-6 sm:px-7 sm:pt-7">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-brand-blue">
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h2 className="font-display text-xl font-medium leading-tight tracking-[-0.02em] text-ink">
                Sở thích du lịch
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Tùy chọn — gợi ý chuyến đi phù hợp với bạn
              </p>
            </div>
          </div>
          {!formMode && (
            <button
              onClick={openNew}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 transition-colors hover:border-brand/50 hover:text-brand-blue"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Thêm sở thích
            </button>
          )}
        </div>
      </div>

      <div className="p-6">
        {/* ── Toast ── */}
        {toast && (
          <div className="mb-4">
            <InlineToast message={toast.message} type={toast.type} />
          </div>
        )}

        {/* ── Loading ── */}
        {isLoading && (
          <div className="flex items-center gap-2 py-6 text-sm text-gray-400">
            <svg
              className="h-4 w-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Đang tải sở thích...
          </div>
        )}

        {/* ── Error state ── */}
        {isError && (
          <InlineToast
            message="Không tải được danh sách sở thích. Thử tải lại trang."
            type="error"
          />
        )}

        {/* ── Empty state ── */}
        {!isLoading &&
          !isError &&
          (preferences?.length ?? 0) === 0 &&
          !formMode && (
            <div
              className="rounded-2xl border-2 border-dashed py-10 text-center"
              style={{ borderColor: 'rgba(42,123,217,0.2)' }}
            >
              <span className="text-4xl" aria-hidden="true">
                🗺️
              </span>
              <p className="mt-3 text-sm font-medium text-gray-600">
                Bạn chưa có sở thích du lịch nào.
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Thêm sở thích để FlexTrip gợi ý thiết bị phù hợp.
              </p>
              <button
                onClick={openNew}
                className="mt-4 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90"
                style={{
                  background: 'linear-gradient(135deg, #2a7bd9, #1e5aa8)',
                }}
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Thêm sở thích đầu tiên
              </button>
            </div>
          )}

        {/* ── Form thêm mới (khi bấm 'Thêm sở thích') ── */}
        {formMode === 'new' && (
          <div
            className="mb-5 rounded-2xl border-2 bg-blue-50/20 p-5 shadow-sm ring-4 ring-blue-50"
            style={{ borderColor: '#2a7bd9' }}
          >
            <div
              className="mb-4 flex items-center justify-between border-b pb-3"
              style={{ borderColor: 'rgba(42,123,217,0.1)' }}
            >
              <h3 className="text-base font-bold text-gray-800">
                Thêm sở thích du lịch mới
              </h3>
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                Mới
              </span>
            </div>
            <PreferenceForm
              key="new-pref"
              initialForm={defaultForm()}
              isEdit={false}
              onSubmit={handleCreate}
              onCancel={closeForm}
              submitting={createMutation.isPending}
              error={mutationError}
            />
          </div>
        )}

        {/* ── Preference list với in-place edit ── */}
        {!isLoading && !isError && (preferences?.length ?? 0) > 0 && (
          <div className="space-y-3">
            {preferences!.map((pref) =>
              formMode === pref.id ? (
                <div
                  key={pref.id}
                  className="rounded-2xl border-2 bg-blue-50/20 p-5 shadow-sm ring-4 ring-blue-50 transition-all"
                  style={{ borderColor: '#2a7bd9' }}
                >
                  <div
                    className="mb-4 flex items-center justify-between border-b pb-3"
                    style={{ borderColor: 'rgba(42,123,217,0.1)' }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl" aria-hidden="true">
                        {tripTypeEmoji(pref.tripType)}
                      </span>
                      <h3 className="text-base font-bold text-gray-800">
                        Sửa sở thích du lịch
                      </h3>
                    </div>
                    <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                      Đang chỉnh sửa
                    </span>
                  </div>
                  <PreferenceForm
                    key={pref.id}
                    initialForm={prefToForm(pref)}
                    isEdit={true}
                    onSubmit={(form) => handleUpdate(pref.id, form)}
                    onCancel={closeForm}
                    submitting={updateMutation.isPending}
                    error={mutationError}
                  />
                </div>
              ) : (
                <PreferenceCard
                  key={pref.id}
                  pref={pref}
                  onEdit={() => openEdit(pref.id)}
                  onDelete={() => setDeleteTarget(pref.id)}
                />
              ),
            )}
          </div>
        )}

        {/* ── Delete confirm dialog ── */}
        {deleteTarget && (
          <DeleteConfirmDialog
            onConfirm={() => handleDelete(deleteTarget)}
            onCancel={() => setDeleteTarget(null)}
            loading={deleteMutation.isPending}
          />
        )}
      </div>
    </section>
  );
}
