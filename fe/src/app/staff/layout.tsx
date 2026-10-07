import { StaffGuard } from '@/components/staff/staff-guard';

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <StaffGuard>
      <main className="min-h-[calc(100vh-4rem)] bg-slate-50">{children}</main>
    </StaffGuard>
  );
}
