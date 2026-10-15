import type { PenaltyRule } from '@/types/contract';

interface PenaltyTableProps {
  rules: PenaltyRule[];
  conditionNote?: string | null;
}

export function PenaltyTable({ rules, conditionNote }: PenaltyTableProps) {
  const fmt = (n: number) => n.toLocaleString('vi-VN');

  return (
    <div className="space-y-4">
      {conditionNote && (
        <div className="rounded-xl border p-4 text-sm" style={{ borderColor: '#fed7aa', background: '#fff7ed' }}>
          <p className="text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: '#c2410c' }}>
            Tình trạng sản phẩm (Provider khai báo)
          </p>
          <p style={{ color: '#7c2d12' }}>{conditionNote}</p>
        </div>
      )}

      {rules.length === 0 ? (
        <p className="text-sm" style={{ color: '#8694ad' }}>
          Không có mức phạt cụ thể. Hai bên thỏa thuận khi phát sinh thiệt hại.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border" style={{ borderColor: '#DCEFFB' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: '#f6fbfe', borderBottom: '1px solid #DCEFFB' }}>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide" style={{ color: '#5a6b85' }}>
                  Loại thiệt hại
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide" style={{ color: '#5a6b85' }}>
                  Mô tả
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide" style={{ color: '#5a6b85' }}>
                  Mức phạt (đ)
                </th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r, i) => (
                <tr
                  key={i}
                  style={{
                    borderBottom: i < rules.length - 1 ? '1px solid #f1f5f9' : 'none',
                    background: i % 2 === 0 ? '#fff' : '#fafcff',
                  }}
                >
                  <td className="px-4 py-3 font-medium" style={{ color: '#0f1729' }}>{r.item}</td>
                  <td className="px-4 py-3" style={{ color: '#5a6b85' }}>{r.description}</td>
                  <td className="px-4 py-3 text-right font-semibold" style={{ color: '#0f1729' }}>
                    {r.minAmount === r.maxAmount
                      ? fmt(r.minAmount)
                      : `${fmt(r.minAmount)} – ${fmt(r.maxAmount)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
