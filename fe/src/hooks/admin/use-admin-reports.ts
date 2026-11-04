import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import type { ReportFrequency, ReportType } from '@/types/support';

export function useExportReport() {
  return useMutation({ mutationFn: adminApi.reports.export });
}

export function useReportSchedules() {
  return useQuery({ queryKey: ['admin', 'report-schedules'], queryFn: adminApi.reports.schedules });
}

function useInvalidateSchedules() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['admin', 'report-schedules'] });
}

export function useSaveSchedule() {
  const invalidate = useInvalidateSchedules();
  return useMutation({
    mutationFn: ({ id, ...body }: { id?: string; name: string; type: ReportType; frequency: ReportFrequency; recipients: string[] }) =>
      id ? adminApi.reports.updateSchedule(id, body) : adminApi.reports.createSchedule(body),
    onSuccess: invalidate,
  });
}
export function useToggleSchedule() {
  const invalidate = useInvalidateSchedules();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => adminApi.reports.updateSchedule(id, { isActive }),
    onSuccess: invalidate,
  });
}
export function useDeleteSchedule() {
  const invalidate = useInvalidateSchedules();
  return useMutation({ mutationFn: adminApi.reports.removeSchedule, onSuccess: invalidate });
}
export function useRunSchedule() {
  const invalidate = useInvalidateSchedules();
  return useMutation({ mutationFn: adminApi.reports.runSchedule, onSuccess: invalidate });
}
