'use client';

import { useMemo, useState } from 'react';
import { Reveal, LiveDot } from '@/components/profile/wow';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { useAdminToast } from '@/components/admin/use-admin-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminConfig, useResetConfig, useUpdateConfig } from '@/hooks/admin/use-admin-config';
import { formatDateTime } from '@/lib/format';

const GROUP_ICONS: Record<string, string> = {
  fraud: '🛡️',
  moderation: '🔍',
  policies: '📋',
  commission: '💰',
  reputation: '🏅',
};

export default function AIConfigPage() {
  const { data: groups, isLoading } = useAdminConfig();
  const update = useUpdateConfig();
  const reset = useResetConfig();
  const toast = useAdminToast();
  const [draft, setDraft] = useState<Record<string, number>>({});
  const [resetOpen, setResetOpen] = useState(false);

  const serverValue = useMemo(
    () => Object.fromEntries((groups ?? []).flatMap((g) => g.items.map((i) => [i.key, i.value]))),
    [groups],
  );
  const changed = Object.keys(draft).filter((k) => draft[k] !== serverValue[k]);
  const value = (k: string) => draft[k] ?? serverValue[k];

  const updateConfig = (id: string, v: number) => setDraft((d) => ({ ...d, [id]: v }));

  const handleSave = () => {
    const values = Object.fromEntries(changed.map((k) => [k, draft[k]]));
    update.mutate(values, {
      onSuccess: () => {
        setDraft({});
        toast.success('Đã lưu cấu hình');
      },
      onError: toast.error,
    });
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <span className="rounded-lg bg-[#0f1729] px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-white">ADMIN-08</span>
            <LiveDot label="CONFIGURING" tone="blue" />
          </div>
          <h1 className="text-3xl font-bold" style={{ color: '#0f1729' }}>AI Model Configuration</h1>
          <p className="mt-1 text-sm" style={{ color: '#5a6b85' }}>Điều chỉnh ngưỡng cảnh báo gian lận, độ nhạy kiểm duyệt AI, và ngưỡng chính sách vận hành</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setResetOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all hover:bg-[#f1f5fa]"
            style={{ borderColor: '#e2e8f3', color: '#5a6b85' }}
          >
            Reset to Defaults
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={changed.length === 0 || update.isPending}
            className="inline-flex items-center gap-2 rounded-full bg-[#16a34a] px-5 py-2 text-sm font-semibold text-white shadow-lg transition-all hover:bg-[#15803d] disabled:opacity-50"
          >
            {update.isPending ? 'Saving...' : `Save ${changed.length > 0 ? `(${changed.length})` : ''}`}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64 w-full rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {(groups ?? []).map((group, gi) => (
            <Reveal key={group.group} delay={gi * 100}>
              <div className="rounded-2xl border bg-white p-6" style={{ borderColor: '#e2e8f3' }}>
                <div className="mb-5 flex items-center gap-3">
                  <span className="text-2xl">{GROUP_ICONS[group.group] ?? '⚙️'}</span>
                  <h3 className="text-lg font-bold" style={{ color: '#0f1729' }}>{group.label}</h3>
                </div>
                <div className="space-y-5">
                  {group.items.map((config) => {
                    const dirty = changed.includes(config.key);
                    const current = value(config.key) ?? config.value;
                    return (
                      <div
                        key={config.key}
                        className="rounded-xl border p-4 transition-all"
                        style={{
                          borderColor: dirty ? '#2a7bd9' : '#f1f5fa',
                          background: dirty ? 'rgba(42,123,217,0.03)' : '#f8fafc',
                        }}
                      >
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div>
                            <label className="text-sm font-semibold" style={{ color: '#0f1729' }}>{config.label}</label>
                            <p className="mt-1 text-xs" style={{ color: '#5a6b85' }}>{config.description}</p>
                            {config.updatedAt && (
                              <p className="mt-1 text-[11px] text-slate-400">
                                Mặc định: {config.default} · Cập nhật {formatDateTime(config.updatedAt)} bởi {config.updatedBy?.name ?? '—'}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min={config.min}
                              max={config.max}
                              step={config.step}
                              value={current}
                              onChange={(e) => updateConfig(config.key, Number(e.target.value))}
                              onBlur={() => {
                                const v = value(config.key);
                                if (v === undefined) return;
                                const clamped = Math.min(config.max, Math.max(config.min, v));
                                if (clamped !== v) updateConfig(config.key, clamped);
                              }}
                              className="w-24 rounded-lg border bg-white px-3 py-1.5 text-right text-sm font-bold outline-none focus:ring-2"
                              style={{ borderColor: '#e2e8f3' }}
                            />
                            <span className="text-xs font-medium" style={{ color: '#5a6b85' }}>{config.unit}</span>
                          </div>
                        </div>
                        <div className="relative">
                          <input
                            type="range"
                            min={config.min}
                            max={config.max}
                            step={config.step}
                            value={current}
                            onChange={(e) => updateConfig(config.key, Number(e.target.value))}
                            className="w-full cursor-pointer"
                            style={{ accentColor: '#2a7bd9' }}
                          />
                          <div className="mt-1 flex justify-between text-[10px]" style={{ color: '#8694ad' }}>
                            <span>{config.min}</span>
                            <span>{config.max}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h4 className="font-bold text-amber-800">Lưu ý trước khi lưu</h4>
            <p className="mt-1 text-sm text-amber-700">Thay đổi có hiệu lực ngay và được ghi vào Audit Log.</p>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Khôi phục toàn bộ 12 ngưỡng về mặc định?"
        description="Mọi thay đổi hiện tại sẽ bị ghi đè."
        confirmLabel="Khôi phục mặc định"
        tone="danger"
        pending={reset.isPending}
        onConfirm={() => {
          reset.mutate(undefined, {
            onSuccess: () => {
              setDraft({});
              setResetOpen(false);
              toast.success('Đã khôi phục mặc định');
            },
            onError: toast.error,
          });
        }}
      />
      {toast.node}
    </div>
  );
}
