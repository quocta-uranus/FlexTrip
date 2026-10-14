'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, ClipboardList, Scale, UserCircle } from 'lucide-react';
import { useMe } from '@/hooks/useSession';

const NAV = [
  { href: '/staff', label: 'Dashboard', icon: CalendarDays, exact: true },
  { href: '/staff/bookings', label: 'Booking của tôi', icon: ClipboardList, exact: false },
  { href: '/staff/complete-profile', label: 'Hồ sơ', icon: UserCircle, exact: false },
];

export function StaffSidebar() {
  const pathname = usePathname();
  const { data: user } = useMe();
  const initials = user?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) ?? '?';

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-[#e2e8f3] bg-white">
      {/* Brand */}
      <div className="border-b border-[#e2e8f3] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-400 text-sm font-bold text-white shadow-sm">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-[#0f1729]">{user?.name ?? '—'}</p>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#2a7bd9]">Staff Operations</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href) && pathname !== '/staff';
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? 'bg-[#2a7bd9]/10 text-[#2a7bd9]'
                  : 'text-[#5a6b85] hover:bg-[#f8fafc] hover:text-[#0f1729]'
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-[#2a7bd9]' : 'text-[#8694ad]'}`} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Mediations shortcut */}
      <div className="border-t border-[#e2e8f3] px-3 py-3">
        <Link
          href="/staff#mediations"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#5a6b85] transition-colors hover:bg-[#f8fafc] hover:text-[#0f1729]"
        >
          <Scale className="h-4 w-4 shrink-0 text-[#8694ad]" />
          Biên bản thương lượng
        </Link>
      </div>
    </aside>
  );
}
