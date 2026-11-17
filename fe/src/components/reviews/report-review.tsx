'use client';

import { useState } from 'react';
import { useReportReview } from '@/hooks/useReviews';
import { REPORT_REASON_LABEL, type Review, type ReviewReportReason } from '@/types/review';

const REASONS = Object.keys(REPORT_REASON_LABEL) as ReviewReportReason[];

/** Provider flags a public review; it stays visible until an admin decides. */
export function ReportReview({ review }: { review: Review }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReviewReportReason>('FAKE_REVIEW');
  const [details, setDetails] = useState('');
  const report = useReportReview();
  const trimmed = details.trim();
  const needsDetails = reason === 'OTHER';
  const invalid = (needsDetails && !trimmed) || trimmed.length > 1000;

  if (review.myReport) {
    const { status } = review.myReport;
    return (
      <p
        className={`mt-3 text-xs font-medium ${status === 'DISMISSED' ? 'text-slate-500' : 'text-amber-700'}`}
      >
        {status === 'OPEN' && 'Bạn đã báo cáo đánh giá này, quản trị viên đang xem xét.'}
        {status === 'DISMISSED' && 'Báo cáo của bạn đã được xem xét và không được chấp nhận.'}
        {status === 'UPHELD' && 'Báo cáo của bạn được chấp nhận.'}
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 text-xs font-semibold text-slate-500 hover:text-red-600 hover:underline"
      >
        Báo cáo đánh giá này
      </button>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (invalid) return;
        report.mutate(
          { reviewId: review.id, reason, details: trimmed || undefined },
          { onSuccess: () => setOpen(false) },
        );
      }}
      className="mt-4 rounded-xl border border-red-100 bg-red-50/50 p-4"
    >
      <p className="text-sm font-semibold text-slate-900">Báo cáo đánh giá</p>
      <p className="mt-1 text-xs leading-5 text-slate-600">
        Đánh giá vẫn hiển thị công khai cho đến khi quản trị viên quyết định. Vui lòng chỉ báo cáo khi nội dung sai sự
        thật hoặc vi phạm chính sách, không dùng để ẩn đánh giá chưa hài lòng.
      </p>

      <label className="mt-3 block text-xs font-medium text-slate-700" htmlFor={`report-reason-${review.id}`}>
        Lý do
      </label>
      <select
        id={`report-reason-${review.id}`}
        value={reason}
        onChange={(event) => setReason(event.target.value as ReviewReportReason)}
        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
      >
        {REASONS.map((value) => (
          <option key={value} value={value}>
            {REPORT_REASON_LABEL[value]}
          </option>
        ))}
      </select>

      <label className="mt-3 block text-xs font-medium text-slate-700" htmlFor={`report-details-${review.id}`}>
        Chi tiết {needsDetails ? '(bắt buộc)' : '(không bắt buộc)'}
      </label>
      <textarea
        id={`report-details-${review.id}`}
        value={details}
        onChange={(event) => setDetails(event.target.value)}
        rows={3}
        maxLength={1000}
        placeholder="Ví dụ: Người này chưa từng thuê sản phẩm của shop."
        className="mt-1 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
      <p className="mt-1 text-right text-xs text-slate-500">{details.length}/1000</p>

      {report.error && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{report.error.message}</p>
      )}
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600"
        >
          Hủy
        </button>
        <button
          type="submit"
          disabled={invalid || report.isPending}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {report.isPending ? 'Đang gửi…' : 'Gửi báo cáo'}
        </button>
      </div>
    </form>
  );
}
