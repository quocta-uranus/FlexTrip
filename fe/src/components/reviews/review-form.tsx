'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { useCreateReview } from '@/hooks/useReviews';
import { reviewSchema, type ReviewFormValues } from '@/lib/validators/review.schema';

export function ReviewForm({ bookingId }: { bookingId: string }) {
  const createReview = useCreateReview();
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

  return (
    <form
      onSubmit={handleSubmit((values) => createReview.mutate({ bookingId, ...values }))}
      className="rounded-2xl border bg-white p-5"
      style={{ borderColor: '#DCEFFB' }}
    >
      <h2 className="text-base font-semibold" style={{ color: '#0f1729' }}>Đánh giá chuyến thuê</h2>
      <p className="mt-1 text-sm" style={{ color: '#8694ad' }}>
        Chia sẻ trải nghiệm thực tế của bạn để giúp cộng đồng lựa chọn tốt hơn.
      </p>

      <div className="mt-4">
        <p className="mb-2 text-sm font-medium" style={{ color: '#5a6b85' }}>Mức độ hài lòng</p>
        <div className="flex gap-1" role="radiogroup" aria-label="Số sao đánh giá">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={rating === star}
              aria-label={`${star} sao`}
              onClick={() => setValue('rating', star, { shouldValidate: true })}
              className="p-1 text-3xl transition-transform hover:scale-110"
              style={{ color: star <= rating ? '#f59e0b' : '#dbe3ef' }}
            >
              ★
            </button>
          ))}
        </div>
        <input type="hidden" {...register('rating', { valueAsNumber: true })} />
        {errors.rating && <p className="mt-1 text-xs text-red-600">{errors.rating.message}</p>}
      </div>

      <div className="mt-4">
        <label htmlFor="review-comment" className="mb-2 block text-sm font-medium" style={{ color: '#5a6b85' }}>
          Nhận xét
        </label>
        <textarea
          id="review-comment"
          rows={5}
          maxLength={2000}
          placeholder="Sản phẩm, thái độ phục vụ và trải nghiệm nhận/trả đồ thế nào?"
          {...register('comment')}
          className="w-full resize-y rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#2a7bd9]/20"
          style={{ borderColor: errors.comment ? '#fca5a5' : '#DCEFFB', color: '#0f1729' }}
        />
        <div className="mt-1 flex justify-between text-xs">
          <span className="text-red-600">{errors.comment?.message}</span>
          <span style={{ color: '#8694ad' }}>{comment.length}/2000</span>
        </div>
      </div>

      {createReview.error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {createReview.error.message}
        </p>
      )}
      {createReview.isSuccess && (
        <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          Cảm ơn bạn! Đánh giá đã được ghi nhận.
        </p>
      )}

      <button
        type="submit"
        disabled={createReview.isPending || createReview.isSuccess}
        className="mt-4 rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        style={{ background: '#2a7bd9' }}
      >
        {createReview.isPending ? 'Đang gửi…' : 'Gửi đánh giá'}
      </button>
    </form>
  );
}
