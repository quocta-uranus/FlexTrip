import { StaffGuard } from '@/components/staff/staff-guard';
import { StaffSidebar } from '@/components/staff/staff-sidebar';

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <StaffGuard>
      <div className="flex min-h-[calc(100vh-4rem)] bg-[#f8fafc]">
        <StaffSidebar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </StaffGuard>
  );
}
