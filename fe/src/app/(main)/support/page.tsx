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
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-[#8694ad]">
            {TICKET_CATEGORY_LABELS[category as keyof typeof TICKET_CATEGORY_LABELS]}
          </h2>
          <div className="divide-y divide-[#e2e8f3] overflow-hidden rounded-2xl border border-[#e2e8f3] bg-white">
            {faqs.map((f) => {
              const open = openId === f.id;
              return (
                <div key={f.id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : f.id)}
                    aria-expanded={open}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-[#0f1729] hover:bg-[#f8fafc]"
                  >
                    {f.question}
                    <ChevronDown className={`size-4 shrink-0 text-[#8694ad] transition-transform ${open ? 'rotate-180' : ''}`} />
                  </button>
                  {open && <p className="whitespace-pre-wrap px-5 pb-4 text-sm leading-relaxed text-[#5a6b85]">{f.answer}</p>}
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
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-[#2a7bd9]">Hỗ trợ</p>
          <h1 className="mt-1 text-3xl font-bold text-[#0f1729]">Trung tâm hỗ trợ</h1>
          <p className="mt-1 text-sm text-[#5a6b85]">Xem câu hỏi thường gặp hoặc gửi yêu cầu cho đội ngũ FlexTrip.</p>
        </div>
        <Link
          href="/support/new"
          className="inline-flex items-center gap-2 rounded-xl bg-[#2a7bd9] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1e5aa8]"
        >
          <Plus className="size-4" /> Tạo ticket
        </Link>
      </div>

      <div className="mb-5 flex gap-2">
        {([['tickets', 'Ticket của tôi'], ['faq', 'Câu hỏi thường gặp']] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold ${
              tab === value ? 'border-[#2a7bd9] bg-[#2a7bd9] text-white' : 'border-[#b9dafa] bg-white text-[#2a7bd9] hover:bg-[#f1f8ff]'
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
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  status === s ? 'bg-[#0f1729] text-white' : 'bg-[#f1f5fa] text-[#5a6b85] hover:bg-[#e2e8f3]'
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
              action={<Link href="/support/new" className="rounded-xl bg-[#2a7bd9] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1e5aa8]">Tạo ticket</Link>}
            />
          ) : (
            <ul className="space-y-3">
              {tickets.data?.items.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/support/${t.id}`}
                    className="block rounded-2xl border border-[#e2e8f3] bg-white p-4 transition-colors hover:border-[#b9dafa] hover:bg-[#f8fbff]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-[#0f1729]">{t.subject}</p>
                      <TicketStatusBadge status={t.status} />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#8694ad]">
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
    </main>
  );
}
