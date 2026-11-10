'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { AlertCircle, CheckCircle2, Loader2, Send, Star } from 'lucide-react';
import { useCreateReview } from '@/hooks/useReviews';
import { reviewSchema, type ReviewFormValues } from '@/lib/validators/review.schema';
import { cn } from '@/lib/utils';

const RATING_LABELS = ['', 'Rất tệ', 'Chưa tốt', 'Bình thường', 'Tốt', 'Tuyệt vời'];

export function ReviewForm({ bookingId }: { bookingId: string }) {
  const createReview = useCreateReview();
  const [hover, setHover] = useState(0);
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { rating: 0, comment: '' },
  });
  const rating = useWatch({ control, name: 'rating' });
  const comment = useWatch({ control, name: 'comment' });
  // The stars preview the one under the pointer, and fall back to the chosen rating.
  const shown = hover || rating;

  return (
    <form
      onSubmit={handleSubmit((values) => createReview.mutate({ bookingId, ...values }))}
      className="rounded-3xl border border-sky-100 bg-white p-6 shadow-soft sm:p-7"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Đánh giá</p>
      <h2 className="font-display mt-2 text-2xl font-medium tracking-[-0.02em] text-ink">Đánh giá chuyến thuê</h2>
      <p className="mt-1.5 text-sm text-slate-600">
        Chia sẻ trải nghiệm thực tế của bạn để giúp cộng đồng lựa chọn tốt hơn.
      </p>

      <div className="mt-6">
        <p className="mb-2 text-sm font-semibold text-ink">Mức độ hài lòng</p>
        <div className="flex items-center gap-4">
          <div className="flex gap-1" role="radiogroup" aria-label="Số sao đánh giá" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                role="radio"
                aria-checked={rating === star}
                aria-label={`${star} sao`}
                onMouseEnter={() => setHover(star)}
                onFocus={() => setHover(star)}
                onBlur={() => setHover(0)}
                onClick={() => setValue('rating', star, { shouldValidate: true })}
                className="rounded-full p-1 transition-transform duration-200 hover:scale-110 active:scale-95"
              >
                <Star
                  className={cn(
                    'h-9 w-9 transition-colors duration-150',
                    star <= shown ? 'fill-amber-400 text-amber-400' : 'fill-slate-100 text-slate-200',
                  )}
                />
              </button>
            ))}
          </div>
          <span aria-live="polite" className={cn('text-sm font-bold', shown ? 'text-amber-600' : 'text-slate-400')}>
            {RATING_LABELS[shown] || 'Chọn số sao'}
          </span>
        </div>
        <input type="hidden" {...register('rating', { valueAsNumber: true })} />
        {errors.rating && <p className="mt-1.5 text-xs font-medium text-red-600">{errors.rating.message}</p>}
      </div>

      <div className="mt-6">
        <label htmlFor="review-comment" className="mb-2 block text-sm font-semibold text-ink">
          Nhận xét
        </label>
        <textarea
          id="review-comment"
          rows={5}
          maxLength={2000}
          placeholder="Sản phẩm, thái độ phục vụ và trải nghiệm nhận/trả đồ thế nào?"
          {...register('comment')}
          className={cn(
            'w-full resize-y rounded-2xl border bg-white px-4 py-3 text-[15px] leading-relaxed text-ink outline-none transition-colors placeholder:text-slate-400 focus:ring-2',
            errors.comment ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-brand focus:ring-brand/20',
          )}
        />
        <div className="mt-1.5 flex justify-between text-xs">
          <span className="font-medium text-red-600">{errors.comment?.message}</span>
          <span className="tabular-nums text-slate-400">{comment.length}/2000</span>
        </div>
      </div>

      {createReview.error && (
        <p className="mt-4 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {createReview.error.message}
        </p>
      )}
      {createReview.isSuccess && (
        <p className="mt-4 flex items-start gap-2 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          Cảm ơn bạn! Đánh giá đã được ghi nhận.
        </p>
      )}

      <button
        type="submit"
        disabled={createReview.isPending || createReview.isSuccess}
        className="mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brand px-7 text-sm font-bold text-white shadow-md shadow-brand/30 transition hover:bg-brand-blue active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
      >
        {createReview.isPending ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Đang gửi…</>
        ) : (
          <><Send className="h-4 w-4" /> Gửi đánh giá</>
        )}
      </button>
    </form>
  );
}
