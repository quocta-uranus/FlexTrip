import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import type { BookingStatus } from '@/types/admin';

const KEY = ['admin', 'staff'] as const;
function useInvalidateStaff() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: KEY });
}

export function useStaffList(f: { search: string; isActive: 'ALL' | 'true' | 'false'; page: number }) {
  return useQuery({ queryKey: [...KEY, 'list', f], queryFn: () => adminApi.staff.list({ ...f, limit: 24 }), placeholderData: keepPreviousData });
}
export function useActiveStaffOptions() {
  return useQuery({ queryKey: [...KEY, 'options'], queryFn: () => adminApi.staff.list({ isActive: true, limit: 100 }) });
}
export function useStaffStats() {
  return useQuery({ queryKey: [...KEY, 'stats'], queryFn: adminApi.staff.stats });
}
export function useCreateStaff() {
  const invalidate = useInvalidateStaff();
  return useMutation({ mutationFn: adminApi.staff.create, onSuccess: invalidate });
}
export function useUpdateStaff() {
  const invalidate = useInvalidateStaff();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Parameters<typeof adminApi.staff.update>[1]) => adminApi.staff.update(id, body),
    onSuccess: invalidate,
  });
}
export function useResendInvite() {
  return useMutation({ mutationFn: adminApi.staff.resendInvite });
}
export function useStaffRules() {
  return useQuery({ queryKey: [...KEY, 'rules'], queryFn: adminApi.staff.rules });
}
export function useSaveRule() {
  const invalidate = useInvalidateStaff();
  return useMutation({
    mutationFn: ({ id, ...body }: { id?: string; name: string; region: string; staffId: string; priority: number; isActive: boolean }) =>
      id ? adminApi.staff.updateRule(id, body) : adminApi.staff.createRule(body),
    onSuccess: invalidate,
  });
}
export function useDeleteRule() {
  const invalidate = useInvalidateStaff();
  return useMutation({ mutationFn: adminApi.staff.deleteRule, onSuccess: invalidate });
}
export function useAssignableBookings(f: { assigned: 'ALL' | 'true' | 'false'; status: BookingStatus | 'ALL'; search: string; page: number }) {
  return useQuery({ queryKey: [...KEY, 'bookings', f], queryFn: () => adminApi.staff.bookings({ ...f, limit: 20 }), placeholderData: keepPreviousData });
}
export function useAssignBooking() {
  const invalidate = useInvalidateStaff();
  return useMutation({
    mutationFn: ({ bookingId, staffId }: { bookingId: string; staffId: string | null }) =>
      staffId ? adminApi.staff.assign(bookingId, staffId) : adminApi.staff.unassign(bookingId),
    onSuccess: invalidate,
  });
}
export function useAutoAssign() {
  const invalidate = useInvalidateStaff();
  return useMutation({ mutationFn: adminApi.staff.autoAssign, onSuccess: invalidate });
}
