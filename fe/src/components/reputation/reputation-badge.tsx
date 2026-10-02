import type {
  PublicReputationBadge,
  ReputationBadgeDetail,
} from '@/types/reputation';

const BADGE_STYLE = {
  TRUSTED_PROVIDER: {
    icon: '✓',
    className: 'border-amber-200 bg-amber-50 text-amber-800',
  },
  RELIABLE_TRAVELER: {
    icon: '◆',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  },
} as const;

export function ReputationBadge({ badge }: { badge: PublicReputationBadge }) {
  const style = BADGE_STYLE[badge.code];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${style.className}`}>
      <span aria-hidden>{style.icon}</span>
      {badge.label}
    </span>
  );
}

export function ReputationProgressCard({
  badge,
}: {
  badge: ReputationBadgeDetail;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/60 bg-white shadow-lg">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-emerald-50 px-6 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Uy tín tài khoản</p>
          <h3 className="mt-1 font-bold text-slate-950">{badge.label}</h3>
          <p className="mt-1 text-xs text-slate-600">{badge.description}</p>
        </div>
        {badge.achieved ? (
          <ReputationBadge badge={badge} />
        ) : (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Tiến độ {badge.progress}%</span>
        )}
      </div>
      <div className="space-y-4 p-6">
        {badge.metrics.map((metric) => (
          <div key={metric.key}>
            <div className="mb-1.5 flex items-center justify-between gap-4 text-sm">
              <span className="font-medium text-slate-700">{metric.label}</span>
              <span className={metric.met ? 'font-semibold text-emerald-700' : 'text-slate-500'}>
                {metric.current}{metric.unit === '%' ? '%' : ` ${metric.unit}`} / {metric.operator === 'GTE' ? '≥' : '≤'} {metric.target}{metric.unit === '%' ? '%' : ` ${metric.unit}`}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all" style={{ width: `${metric.progress}%` }} />
            </div>
          </div>
        ))}
        {!badge.achieved && badge.reasons.length > 0 && (
          <ul className="space-y-1 rounded-xl bg-slate-50 p-4 text-xs text-slate-600">
            {badge.reasons.map((reason) => <li key={reason}>• {reason}</li>)}
          </ul>
        )}
      </div>
    </section>
  );
}
