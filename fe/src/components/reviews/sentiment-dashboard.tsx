import type { SentimentDashboardData } from '@/types/review';

const SENTIMENTS = [
  { key: 'positive', label: 'Tích cực', color: 'bg-emerald-500', text: 'text-emerald-700' },
  { key: 'neutral', label: 'Trung lập', color: 'bg-amber-400', text: 'text-amber-700' },
  { key: 'negative', label: 'Tiêu cực', color: 'bg-rose-500', text: 'text-rose-700' },
] as const;

function dateLabel(value: string, granularity: SentimentDashboardData['granularity']) {
  const date = new Date(`${value}T00:00:00Z`);
  if (granularity === 'MONTH') return date.toLocaleDateString('vi-VN', { month: 'short', year: '2-digit', timeZone: 'UTC' });
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });
}

export function SentimentDashboard({ data }: { data: SentimentDashboardData }) {
  const latest = data.trend.at(-1);
  const previous = data.trend.at(-2);
  const negativePeak = data.trend.reduce<(typeof data.trend)[number] | null>((peak, item) => (!peak || item.negative > peak.negative ? item : peak), null);
  const changes =
    latest && previous
      ? [
          { label: 'Tích cực', delta: latest.positive - previous.positive, goodWhenPositive: true },
          { label: 'Tiêu cực', delta: latest.negative - previous.negative, goodWhenPositive: false },
        ]
      : [];

  return (
    <section className="mb-6 rounded-2xl border border-[#DCEFFB] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 text-sm text-white">✦</span>
            <h2 className="font-bold text-slate-950">Phân tích cảm xúc bằng AI</h2>
          </div>
          <p className="mt-2 text-sm text-slate-500">Tổng hợp từ đánh giá đã công khai và được AI phân tích.</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-4 py-2 text-right text-xs text-slate-500">
          <b className="block text-lg text-slate-900">
            {data.analyzedReviews}/{data.totalReviews}
          </b>
          đánh giá đã phân tích
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {SENTIMENTS.map(({ key, label, color, text }) => {
          const value = data.sentiment[key];
          return (
            <div key={key} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <span className={`text-sm font-semibold ${text}`}>{label}</span>
                <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-950">{value.percentage}%</p>
              <p className="text-xs text-slate-500">{value.count} đánh giá</p>
            </div>
          );
        })}
      </div>

      <div className="mt-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Cảm xúc theo thời gian</h3>
            <p className="mt-0.5 text-xs text-slate-500">Mỗi hàng tương ứng với một mốc trong khoảng đã chọn.</p>
          </div>
          {data.unknownReviews > 0 && (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{data.unknownReviews} đánh giá cũ chưa phân tích</span>
          )}
        </div>

        <div className="mb-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-slate-600">
          {SENTIMENTS.map(({ key, label, color }) => (
            <span key={key} className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
              {label}
            </span>
          ))}
        </div>

        {data.trend.length === 0 ? (
          <div className="rounded-xl bg-slate-50 py-10 text-center text-sm text-slate-500">Chưa có kết quả AI trong khoảng thời gian này.</div>
        ) : (
          <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
            {data.trend.map((item, index) => {
              const total = item.positive + item.neutral + item.negative;
              const positive = total ? (item.positive / total) * 100 : 0;
              const neutral = total ? (item.neutral / total) * 100 : 0;
              const negative = total ? (item.negative / total) * 100 : 0;
              const isLatest = index === data.trend.length - 1;

              return (
                <article key={item.start} className={`rounded-xl border p-4 ${isLatest ? 'border-blue-200 bg-blue-50/40' : 'border-slate-100 bg-slate-50/70'}`}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{dateLabel(item.start, data.granularity)}</span>
                      {isLatest && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-700">Mới nhất</span>}
                    </div>
                    <span className="text-xs font-medium text-slate-500">{total} đánh giá</span>
                  </div>
                  <div
                    className="flex h-3.5 w-full overflow-hidden rounded-full bg-slate-200"
                    aria-label={`${item.positive} tích cực, ${item.neutral} trung lập, ${item.negative} tiêu cực`}
                  >
                    {positive > 0 && <div className="bg-emerald-500" style={{ width: `${positive}%` }} />}
                    {neutral > 0 && <div className="bg-amber-400" style={{ width: `${neutral}%` }} />}
                    {negative > 0 && <div className="bg-rose-500" style={{ width: `${negative}%` }} />}
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-lg bg-emerald-50 px-2 py-2 text-emerald-700">
                      <b className="block text-sm">{item.positive}</b>Tích cực
                    </div>
                    <div className="rounded-lg bg-amber-50 px-2 py-2 text-amber-700">
                      <b className="block text-sm">{item.neutral}</b>Trung lập
                    </div>
                    <div className="rounded-lg bg-rose-50 px-2 py-2 text-rose-700">
                      <b className="block text-sm">{item.negative}</b>Tiêu cực
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-5 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-cyan-50 p-4">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm text-white">✦</span>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Điểm đáng chú ý</h3>
            <p className="text-xs text-slate-500">So sánh mốc mới nhất với mốc liền trước</p>
          </div>
        </div>
        {changes.length === 0 ? (
          <p className="mt-3 rounded-lg bg-white/70 px-3 py-2 text-sm text-slate-600">Cần dữ liệu ở ít nhất hai mốc thời gian để so sánh xu hướng.</p>
        ) : (
          <ul className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
            {changes.map(({ label, delta, goodWhenPositive }) => {
              const improved = delta === 0 || delta > 0 === goodWhenPositive;
              return (
                <li key={label} className="flex items-center gap-3 rounded-lg bg-white/80 px-3 py-2.5">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full font-bold ${improved ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}
                  >
                    {delta > 0 ? '↑' : delta < 0 ? '↓' : '→'}
                  </span>
                  <span>
                    <b>{label}</b> {delta === 0 ? 'không đổi' : `${delta > 0 ? 'tăng' : 'giảm'} ${Math.abs(delta)}`}.
                  </span>
                </li>
              );
            })}
            {negativePeak && negativePeak.negative > 0 && (
              <li className="flex items-center gap-3 rounded-lg bg-white/80 px-3 py-2.5 sm:col-span-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 font-bold text-amber-700">!</span>
                <span>
                  Nhiều đánh giá tiêu cực nhất vào <b>{dateLabel(negativePeak.start, data.granularity)}</b>: {negativePeak.negative} đánh giá.
                </span>
              </li>
            )}
          </ul>
        )}
      </div>
    </section>
  );
}
