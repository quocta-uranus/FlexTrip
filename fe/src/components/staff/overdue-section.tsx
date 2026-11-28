'use client';

import Link from 'next/link';
import { OverdueBadge } from '@/components/overdue-badge';
import { Card, CardContent } from '@/components/ui/card';
import { useMyBookings } from '@/hooks/use-staff-operations';

// Independent of the date picker, so late work does not disappear from today's view
export function OverdueSection() {
  const { data } = useMyBookings({ overdue: 'true', limit: 50 });
  const bookings = data?.items ?? [];
  if (!bookings.length) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-base font-bold text-red-600">Quá hạn ({data?.total ?? bookings.length})</h2>
      <Card className="border-0 shadow-sm ring-1 ring-red-200">
        <CardContent className="p-0">
          <ul className="divide-y divide-slate-100">
            {bookings.map((booking) => (
              <li key={booking.id}>
                <Link href={`/staff/bookings/${booking.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 hover:bg-red-50">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#0f1729]">{booking.listing.title}</p>
                    <p className="text-xs text-[#8694ad]">
                      {booking.traveler.name} · {booking.traveler.phone ?? booking.traveler.email}
                    </p>
                  </div>
                  <OverdueBadge booking={booking} />
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}
