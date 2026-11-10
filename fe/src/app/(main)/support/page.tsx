'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, LifeBuoy, Plus } from 'lucide-react';
import { Pagination } from '@/components/admin/pagination';
import { EmptyState } from '@/components/empty-state';
import { TicketCategoryBadge, TicketStatusBadge } from '@/components/support/ticket-parts';
import { Skeleton } from '@/components/ui/skeleton';
import { useFaqs, useMyTickets } from '@/hooks/useSupport';
import { formatDateTime } from '@/lib/format';
import { TICKET_CATEGORY_LABELS, TICKET_STATUS_LABELS } from '@/types/support';
import type { FaqPublic, TicketStatus } from '@/types/support';

type Tab = 'tickets' | 'faq';
const STATUS_FILTERS: Array<TicketStatus | 'ALL'> = ['ALL', 'OPEN', 'IN_PROGRESS', 'WAITING_USER', 'RESOLVED', 'CLOSED'];

function FaqList({ items }: { items: FaqPublic[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const groups = useMemo(() => {
    const map = new Map<string, FaqPublic[]>();
    for (const f of items) map.set(f.category, [...(map.get(f.category) ?? []), f]);
    return [...map.entries()];
  }, [items]);

  if (items.length === 0) {
    return <EmptyState icon={LifeBuoy} title="Chưa có câu hỏi thường gặp" description="Bạn có thể gửi ticket để được hỗ trợ trực tiếp." />;
  }
  return (
    <div className="space-y-6">
      {groups.map(([category, faqs]) => (
        <section key={category}>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {TICKET_CATEGORY_LABELS[category as keyof typeof TICKET_CATEGORY_LABELS]}
          </h2>
          <div className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
            {faqs.map((f) => {
              const open = openId === f.id;
              return (
                <div key={f.id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : f.id)}
                    aria-expanded={open}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-ink hover:bg-slate-50"
                  >
                    {f.question}
                    <ChevronDown className={`size-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                  </button>
                  {open && <p className="whitespace-pre-wrap px-5 pb-4 text-sm leading-relaxed text-slate-600">{f.answer}</p>}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

export default function SupportPage() {
  const [tab, setTab] = useState<Tab>('tickets');
  const [status, setStatus] = useState<TicketStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const tickets = useMyTickets(status, page);
  const faqs = useFaqs();

  return (
    <main className="min-h-screen bg-white">
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-24 sm:px-6 sm:pt-28">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Hỗ trợ</p>
          <h1 className="font-display mt-2 text-4xl font-medium leading-[1.05] tracking-[-0.03em] text-ink sm:text-5xl">Trung tâm hỗ trợ</h1>
          <p className="mt-3 text-sm text-slate-600">Xem câu hỏi thường gặp hoặc gửi yêu cầu cho đội ngũ FlexTrip.</p>
        </div>
        <Link
          href="/support/new"
          className="inline-flex h-11 items-center gap-2 rounded-full bg-brand px-5 text-sm font-bold text-white shadow-md shadow-brand/30 transition hover:bg-brand-blue active:scale-95"
        >
          <Plus className="size-4" /> Tạo ticket
        </Link>
      </div>

      <div className="mb-5 flex gap-2" role="tablist" aria-label="Trung tâm hỗ trợ">
        {([['tickets', 'Ticket của tôi'], ['faq', 'Câu hỏi thường gặp']] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={`inline-flex h-10 items-center rounded-full border px-4 text-sm font-semibold transition-colors ${
              tab === value ? 'border-ink bg-ink text-white shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-brand/50 hover:text-brand-blue'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'faq' ? (
        faqs.isLoading ? <Skeleton className="h-48 w-full" /> : <FaqList items={faqs.data ?? []} />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => { setStatus(s); setPage(1); }}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  status === s ? 'bg-brand/10 text-brand-blue ring-1 ring-brand/40' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {s === 'ALL' ? 'Tất cả' : TICKET_STATUS_LABELS[s]}
              </button>
            ))}
          </div>

          {tickets.isLoading ? (
            <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
          ) : (tickets.data?.items.length ?? 0) === 0 ? (
            <EmptyState
              icon={LifeBuoy}
              title="Bạn chưa có ticket nào"
              description="Nếu cần hỗ trợ thêm, hãy gửi yêu cầu và đội ngũ FlexTrip sẽ phản hồi sớm."
              action={<Link href="/support/new" className="inline-flex h-11 items-center rounded-full bg-brand px-6 text-sm font-bold text-white shadow-md shadow-brand/30 transition hover:bg-brand-blue">Tạo ticket</Link>}
            />
          ) : (
            <ul className="space-y-3">
              {tickets.data?.items.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/support/${t.id}`}
                    className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-soft transition hover:border-brand/50 hover:shadow-md"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-ink">{t.subject}</p>
                      <TicketStatusBadge status={t.status} />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <TicketCategoryBadge category={t.category} />
                      <span>{t.messageCount} phản hồi</span>
                      <span>· Cập nhật {formatDateTime(t.updatedAt)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Pagination page={page} totalPages={tickets.data?.totalPages ?? 1} onChange={setPage} />
        </>
      )}
    </div>
    </main>
  );
}
