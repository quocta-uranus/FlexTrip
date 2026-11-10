import { TICKET_CATEGORY_LABELS, TICKET_STATUS_LABELS, TICKET_STATUS_STYLES } from '@/types/support';
import type { TicketCategory, TicketMessage, TicketPriority, TicketStatus } from '@/types/support';
import { formatDateTime } from '@/lib/format';

const PRIORITY_STYLES: Record<TicketPriority, string> = {
  URGENT: 'bg-red-100 text-red-700',
  HIGH: 'bg-orange-100 text-orange-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  LOW: 'bg-green-100 text-green-700',
};

export function TicketStatusBadge({ status, audience = 'user' }: { status: TicketStatus; audience?: 'user' | 'admin' }) {
  const label = audience === 'admin' && status === 'WAITING_USER' ? 'Chờ người dùng' : TICKET_STATUS_LABELS[status];
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${TICKET_STATUS_STYLES[status]}`}>{label}</span>;
}

export function TicketPriorityBadge({ priority }: { priority: TicketPriority }) {
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${PRIORITY_STYLES[priority]}`}>{priority}</span>;
}

export function TicketCategoryBadge({ category }: { category: TicketCategory }) {
  return (
    <span className="rounded-full bg-[#f1f5fa] px-2.5 py-1 text-xs font-semibold text-[#5a6b85]">
      {TICKET_CATEGORY_LABELS[category]}
    </span>
  );
}

/** Right-aligned bubbles are the viewer's own: staff messages for admins, requester messages otherwise. */
export function TicketThread({ messages, viewer }: { messages: TicketMessage[]; viewer: 'user' | 'admin' }) {
  if (messages.length === 0) {
    return <p className="py-6 text-center text-sm text-[#8694ad]">Chưa có phản hồi nào.</p>;
  }
  return (
    <ul className="space-y-3">
      {messages.map((m) => {
        const mine = viewer === 'admin' ? m.isStaff : !m.isStaff;
        return (
          <li key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                mine ? 'rounded-br-md bg-[#2a7bd9] text-white' : 'rounded-bl-md border border-[#e2e8f3] bg-white text-[#0f1729]'
              }`}
            >
              <p className={`mb-1 text-xs font-semibold ${mine ? 'text-white/80' : 'text-[#5a6b85]'}`}>
                {m.authorName} · {formatDateTime(m.createdAt)}
              </p>
              <p className="whitespace-pre-wrap break-words">{m.body}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
