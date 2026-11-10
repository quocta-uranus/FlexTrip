import { AlertTriangle, CheckCircle2, Clock, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubmittedReviewProps {
  review: {
    rating: number;
    comment?: string | null;
    status: string;
    rejectionReason?: string | null;
  };
}

const STATUS_NOTE: Record<string, { text: string; className: string; Icon: typeof Clock }> = {
  PENDING: {
    text: 'AI đang phân tích đánh giá trước khi hiển thị công khai.',
    className: 'border-amber-200 bg-amber-50 text-amber-800',
    Icon: Clock,
  },
  FLAGGED: {
    text: 'Đánh giá cần Admin kiểm duyệt trước khi có thể công khai.',
    className: 'border-amber-200 bg-amber-50 text-amber-800',
    Icon: Clock,
  },
  PUBLISHED: {
    text: 'Đánh giá đã được công khai.',
    className: 'border-green-200 bg-green-50 text-green-700',
    Icon: CheckCircle2,
  },
};

export function SubmittedReview({ review }: SubmittedReviewProps) {
  const note = STATUS_NOTE[review.status];

  return (
    <section className="rounded-3xl border border-sky-100 bg-white p-6 shadow-soft sm:p-7">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Đánh giá</p>
      <h2 className="font-display mt-2 text-2xl font-medium tracking-[-0.02em] text-ink">Đánh giá của bạn</h2>

      <div className="mt-4 flex items-center gap-2" aria-label={`${review.rating} trên 5 sao`}>
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={cn('h-6 w-6', s <= review.rating ? 'fill-amber-400 text-amber-400' : 'fill-slate-100 text-slate-200')}
          />
        ))}
        <span className="ml-1 text-sm font-bold text-ink">{review.rating}.0</span>
      </div>

      {review.comment && <p className="mt-3 text-[15px] leading-relaxed text-slate-600">{review.comment}</p>}

      {note && (
        <p className={cn('mt-4 flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm font-medium', note.className)}>
          <note.Icon className="mt-0.5 h-4 w-4 shrink-0" />
          {note.text}
        </p>
      )}

      {review.status === 'REJECTED' && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-red-700">
            <AlertTriangle className="h-4 w-4" /> Đánh giá không được công khai
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-red-600">
            Lý do: {review.rejectionReason ?? 'Đánh giá không đáp ứng chính sách nội dung.'}
          </p>
          <p className="mt-1 text-xs text-red-500">Đánh giá này chỉ bạn và quản trị viên nhìn thấy.</p>
        </div>
      )}
    </section>
  );
}
