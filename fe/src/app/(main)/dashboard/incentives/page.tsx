'use client';

import { Award } from 'lucide-react';
import { PageHeader, PAGE_WIDTH } from '@/components/layout/page-header';
import { EmptyState } from '@/components/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useProviderIncentive } from '@/hooks/useProviderIncentive';

export default function IncentivesPage() {
  const { data, isLoading } = useProviderIncentive();

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Ưu đãi top-rated' }]}
        title="Ưu đãi Provider top-rated"
        subtitle="Provider có huy hiệu uy tín và điểm chất lượng đủ cao được giảm phí nền tảng cho các đơn hoàn thành. Điểm được tính lại mỗi đêm."
      />

      <div className={`${PAGE_WIDTH} space-y-6 pb-10`}>

      {isLoading ? <Skeleton className="h-40 w-full" /> : !data?.computed ? (
        <EmptyState icon={Award} title="Chưa có kết quả" description="Hệ thống sẽ tính điểm cho bạn trong lần chạy đêm tới." />
      ) : (
        <>
          <section className={`rounded-2xl border p-6 ${data.isTopRated ? 'border-emerald-200 bg-emerald-50' : 'border-border bg-card'}`}>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Điểm chất lượng</p>
                <p className="text-4xl font-extrabold text-foreground">{data.score}<span className="text-lg font-semibold text-muted-foreground"> / 100</span></p>
              </div>
              <div className="text-right">
                <p className={data.isTopRated ? 'font-bold text-emerald-700' : 'font-bold text-muted-foreground'}>{data.isTopRated ? 'Top-rated' : 'Chưa đạt top-rated'}</p>
                <p className="text-sm text-muted-foreground">
                  {data.isTopRated ? `Giảm ${data.feeDiscountPct}% điểm phí nền tảng` : `Cần tối thiểu ${data.reasons.minScore} điểm`}
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm text-foreground">{data.reasons.summary}</p>
            {!data.reasons.trusted && (
              <p className="mt-2 text-sm text-amber-700">Bạn cũng cần huy hiệu &quot;Provider uy tín&quot; (xem ở trang Đánh giá) để được ưu đãi.</p>
            )}
            <p className="mt-4 text-xs text-muted-foreground">
              Cập nhật {new Date(data.computedAt).toLocaleString('vi-VN')}. Ưu đãi áp dụng khi đơn hoàn thành, đến hết {new Date(data.validUntil).toLocaleString('vi-VN')} hoặc đến lần tính lại kế tiếp.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-foreground">Chi tiết điểm</h2>
            <ul className="space-y-3">
              {data.reasons.metrics.map((m) => (
                <li key={m.key} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{m.label} <span className="text-muted-foreground">· trọng số {m.weight}%</span></span>
                    <span className="font-semibold text-foreground">{m.display}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={m.label} aria-valuenow={Math.round(m.value)} aria-valuemin={0} aria-valuemax={100}>
                    <div className={`h-full rounded-full ${m.value >= 80 ? 'bg-emerald-500' : m.value >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${m.value}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
      </div>
    </>
  );
}
