'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useQueries } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import { providerApplicationApi } from '@/lib/api/client';

const POLL_MS = 60_000;
const opts = { staleTime: POLL_MS, refetchInterval: POLL_MS, retry: false } as const;
const SEEN_KEY = 'flextrip_admin_seen';

type Counts = Record<string, number | undefined>;

function readSeen(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(SEEN_KEY) ?? '{}') as Record<string, number>;
  } catch {
    return {};
  }
}

function writeSeen(value: Record<string, number>) {
  try {
    window.localStorage.setItem(SEEN_KEY, JSON.stringify(value));
  } catch {
    // storage blocked: the badge just comes back on the next visit
  }
}

// What the admin has already looked at: opening a page marks everything in it as seen, and handling items lowers the mark
// with the total, so the next newcomer is always counted again.
export function seenCounts(totals: Counts, stored: Record<string, number>, pathname: string): Record<string, number> {
  const seen: Record<string, number> = {};
  for (const [href, total] of Object.entries(totals)) {
    if (total === undefined) continue;
    seen[href] = pathname.startsWith(href) ? total : Math.min(stored[href] ?? 0, total);
  }
  return seen;
}

export function unseenCounts(totals: Counts, seen: Record<string, number>): Record<string, number> {
  return Object.fromEntries(Object.entries(totals).map(([href, total]) => [href, Math.max(0, (total ?? 0) - (seen[href] ?? 0))]));
}

// Counts for the admin menu, keyed by the menu item's href: new work since the admin last opened that page.
export function useAdminSidebarCounts(enabled: boolean): Record<string, number> {
  const pathname = usePathname();
  const [providers, tickets, disputes, staff] = useQueries({
    queries: [
      { queryKey: ['admin', 'sidebar', 'provider-applications'], queryFn: () => providerApplicationApi.list('PENDING'), enabled, ...opts },
      { queryKey: ['admin', 'tickets', 'stats'], queryFn: adminApi.tickets.stats, enabled, ...opts },
      { queryKey: ['admin', 'disputes', 'stats'], queryFn: adminApi.disputes.stats, enabled, ...opts },
      { queryKey: ['admin', 'staff', 'stats'], queryFn: adminApi.staff.stats, enabled, ...opts },
    ],
  });

  const totals: Counts = {
    '/admin/02-provider-registration': providers.data?.length,
    '/admin/12-support-tickets': tickets.data?.byStatus.OPEN,
    '/admin/04-disputes-refunds': disputes.data?.byStatus.OPEN,
    '/admin/10-staff-management': staff.data?.unassignedBookings,
  };

  const seen = seenCounts(totals, readSeen(), pathname);

  useEffect(() => {
    writeSeen({ ...readSeen(), ...seen });
  });

  return unseenCounts(totals, seen);
}
