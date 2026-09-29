'use client';

import { Reveal, LiveDot } from '@/components/profile/wow';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useStaffStats } from '@/hooks/admin/use-admin-staff';
import { StaffTab } from './_components/staff-tab';
import { RulesTab } from './_components/rules-tab';
import { BookingsTab } from './_components/bookings-tab';

export default function StaffManagementPage() {
  const { data: stats, isLoading } = useStaffStats();

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="mb-1 flex items-center gap-3">
          <span className="rounded-lg bg-[#0f1729] px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-white">ADMIN-10</span>
          <LiveDot label="MANAGING" tone="blue" />
        </div>
        <h1 className="text-3xl font-bold" style={{ color: '#0f1729' }}>Staff Management</h1>
        <p className="mt-1 text-sm" style={{ color: '#5a6b85' }}>Tạo/quản lý tài khoản nhân viên, thiết lập rule chỉ định theo khu vực</p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)
          : [
              { label: 'Total Staff', value: stats?.total ?? 0, color: '#2a7bd9' },
              { label: 'Đang hoạt động', value: stats?.active ?? 0, color: '#16a34a' },
              { label: 'Đang phụ trách', value: stats?.openAssignments ?? 0, color: '#7c3aed' },
              { label: 'Booking chưa gán', value: stats?.unassignedBookings ?? 0, color: '#ca8a04' },
            ].map((stat) => (
              <Reveal key={stat.label}>
                <div className="rounded-2xl border bg-white p-4" style={{ borderColor: '#e2e8f3' }}>
                  <div className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
                  <div className="mt-1 text-xs" style={{ color: '#5a6b85' }}>{stat.label}</div>
                </div>
              </Reveal>
            ))}
      </div>

      <Tabs defaultValue="staff">
        <TabsList className="mb-4">
          <TabsTrigger value="staff">Nhân viên</TabsTrigger>
          <TabsTrigger value="rules">Rule phân công</TabsTrigger>
          <TabsTrigger value="bookings">Booking</TabsTrigger>
        </TabsList>
        <TabsContent value="staff"><StaffTab /></TabsContent>
        <TabsContent value="rules"><RulesTab /></TabsContent>
        <TabsContent value="bookings"><BookingsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
