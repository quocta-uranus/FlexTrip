'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { useAppealReview, useEditReview } from '@/hooks/useReviews';
import {
  appealSchema,
  reviewSchema,
  type AppealFormValues,
  type ReviewFormValues,
} from '@/lib/validators/review.schema';
import type { Review } from '@/types/review';

const fieldClass =
  'w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20';

function reviewNotice(review: Review) {
  if (review.appealedAt) {
    if (review.status === 'FLAGGED')
      return { tone: 'text-amber-700', text: 'Khiếu nại của bạn đang chờ quản trị viên xem xét.' };
    if (review.status === 'REJECTED')
      return {
        tone: 'text-red-600',
        text: review.canEdit
          ? 'Khiếu nại đã được xem xét và đánh giá vẫn bị từ chối. Bạn vẫn có thể viết lại nội dung một lần.'
          : 'Khiếu nại đã được xem xét và đánh giá vẫn bị từ chối. Đây là quyết định cuối cùng.',
      };
    if (review.status === 'PUBLISHED')
      return { tone: 'text-green-700', text: 'Khiếu nại được chấp nhận, đánh giá đã được công khai.' };
  }
  if (review.editedAt) return { tone: 'text-muted-foreground', text: 'Bạn đã chỉnh sửa đánh giá này một lần.' };
  return null;
}

function EditPanel({ review, onClose }: { review: Review; onClose: () => void }) {
  const edit = useEditReview();
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { rating: review.rating, comment: review.comment ?? '' },
  });
  const rating = useWatch({ control, name: 'rating' });
  const comment = useWatch({ control, name: 'comment' });

  return (
    <form
      onSubmit={handleSubmit((values) =>
        edit.mutate({ reviewId: review.id, ...values }, { onSuccess: onClose }),
      )}
      className="mt-4 rounded-xl border border-border bg-muted/40 p-4"
    >
      <p className="text-sm font-semibold text-foreground">Sửa đánh giá</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        Bạn chỉ được sửa <b>một lần</b>.
        {review.status === 'PUBLISHED'
          ? ' Nội dung mới được kiểm tra tự động; nếu vi phạm quy định, đánh giá sẽ bị ẩn.'
          : ' Nội dung mới được kiểm tra lại; nếu hợp lệ, đánh giá sẽ được công khai.'}
      </p>

      <div className="mt-3 flex gap-1" role="radiogroup" aria-label="Số sao đánh giá">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={rating === star}
            aria-label={`${star} sao`}
            onClick={() => setValue('rating', star, { shouldValidate: true })}
            className={`p-1 text-2xl transition-transform hover:scale-110 ${star <= rating ? 'text-amber-500' : 'text-slate-300'}`}
          >
            ★
          </button>
        ))}
      </div>
      {errors.rating && <p className="mt-1 text-xs text-red-600">{errors.rating.message}</p>}

      <textarea
        rows={4}
        maxLength={2000}
        aria-label="Nội dung đánh giá"
        {...register('comment')}
        className={`${fieldClass} mt-3`}
      />
      <div className="mt-1 flex justify-between text-xs">
        <span className="text-red-600">{errors.comment?.message}</span>
        <span className="text-muted-foreground">{comment.length}/2000</span>
      </div>

      {edit.error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{edit.error.message}</p>
      )}
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-full border border-border px-4 py-2 text-sm">
          Hủy
        </button>
        <button
          type="submit"
          disabled={edit.isPending}
          className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {edit.isPending ? 'Đang lưu…' : 'Lưu thay đổi'}
        </button>
      </div>
    </form>
  );
}

function AppealPanel({ review, onClose }: { review: Review; onClose: () => void }) {
  const appeal = useAppealReview();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<AppealFormValues>({
    resolver: zodResolver(appealSchema),
    defaultValues: { reason: '' },
  });
  const reason = useWatch({ control, name: 'reason' });

  return (
    <form
      onSubmit={handleSubmit((values) =>
        appeal.mutate({ reviewId: review.id, reason: values.reason }, { onSuccess: onClose }),
      )}
      className="mt-4 rounded-xl border border-border bg-muted/40 p-4"
    >
      <p className="text-sm font-semibold text-foreground">Khiếu nại quyết định từ chối</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        Bạn chỉ được khiếu nại <b>một lần</b>. Hãy nêu lý do vì sao đánh giá của bạn phù hợp chính sách. Quản trị viên sẽ
        xem xét lại; nếu muốn đổi nội dung, hãy chọn &quot;Sửa đánh giá&quot; thay vì khiếu nại.
      </p>
      <textarea
        rows={4}
        maxLength={1000}
        aria-label="Lý do khiếu nại"
        placeholder="Ví dụ: Tôi đã thuê thật và nội dung phản ánh đúng trải nghiệm của tôi…"
        {...register('reason')}
        className={`${fieldClass} mt-3`}
      />
      <div className="mt-1 flex justify-between text-xs">
        <span className="text-red-600">{errors.reason?.message}</span>
        <span className="text-muted-foreground">{reason.length}/1000</span>
      </div>
      {appeal.error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{appeal.error.message}</p>
      )}
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-full border border-border px-4 py-2 text-sm">
          Hủy
        </button>
        <button
          type="submit"
          disabled={appeal.isPending}
          className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {appeal.isPending ? 'Đang gửi…' : 'Gửi khiếu nại'}
        </button>
      </div>
    </form>
  );
}

/** Edit-once and appeal controls for a Traveler's own review; the server decides eligibility via canEdit/canAppeal. */
export function ReviewActions({ review }: { review: Review }) {
  const [panel, setPanel] = useState<'edit' | 'appeal' | null>(null);
  const notice = reviewNotice(review);
  if (!notice && !review.canEdit && !review.canAppeal) return null;

  return (
    <div className="mt-4">
      {notice && <p className={`text-xs ${notice.tone}`}>{notice.text}</p>}
      {panel === null && (review.canEdit || review.canAppeal) && (
        <div className="mt-2 flex flex-wrap gap-2">
          {review.canEdit && (
            <button
              type="button"
              onClick={() => setPanel('edit')}
              className="rounded-full border border-border px-4 py-1.5 text-sm font-semibold text-foreground hover:bg-muted"
            >
              Sửa đánh giá
            </button>
          )}
          {review.canAppeal && (
            <button
              type="button"
              onClick={() => setPanel('appeal')}
              className="rounded-full border border-red-200 px-4 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50"
            >
              Khiếu nại
            </button>
          )}
        </div>
      )}
      {panel === 'edit' && <EditPanel review={review} onClose={() => setPanel(null)} />}
      {panel === 'appeal' && <AppealPanel review={review} onClose={() => setPanel(null)} />}
    </div>
  );
}
