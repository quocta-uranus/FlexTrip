import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { staffApi, type InspectionItem } from '@/lib/api/staff';
import type { StaffMediationStatus, StaffTaskType } from '@/types/staff';

const KEY = ['staff-operations'] as const;

function useInvalidateStaff() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: KEY });
}

export function useStaffTasks(date: string) {
  return useQuery({ queryKey: [...KEY, 'tasks', date], queryFn: () => staffApi.tasks(date) });
}

export function useMyBookings(params: { status?: string; page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: [...KEY, 'my-bookings', params],
    queryFn: () => staffApi.myBookings(params),
  });
}

export function useStaffBooking(id: string) {
  return useQuery({
    queryKey: [...KEY, 'booking', id],
    queryFn: () => staffApi.booking(id),
    enabled: !!id,
  });
}

export function useStaffMediations(status?: StaffMediationStatus) {
  return useQuery({ queryKey: [...KEY, 'mediations', status], queryFn: () => staffApi.mediations(status) });
}

export function useConfirmStaffTask() {
  const invalidate = useInvalidateStaff();
  return useMutation({
    mutationFn: async ({ bookingId, type, conditionNote, file, checklist }: {
      bookingId: string;
      type: StaffTaskType;
      conditionNote: string;
      file: File;
      checklist?: InspectionItem[];
    }) => {
      const { url } = await staffApi.uploadEvidence(file);
      return type === 'HANDOVER'
        ? staffApi.confirmHandover(bookingId, { photoUrl: url, conditionNote, checklist })
        : staffApi.confirmReturn(bookingId, { photoUrl: url, conditionNote, checklist });
    },
    onSuccess: invalidate,
  });
}

export function useCreateMediation() {
  const invalidate = useInvalidateStaff();
  return useMutation({
    mutationFn: async ({ bookingId, issue, travelerStatement, providerStatement, files }: {
      bookingId: string;
      issue: string;
      travelerStatement?: string;
      providerStatement?: string;
      files: File[];
    }) => {
      const uploads = await Promise.all(files.map((file) => staffApi.uploadEvidence(file)));
      return staffApi.createMediation(bookingId, {
        issue,
        travelerStatement: travelerStatement || undefined,
        providerStatement: providerStatement || undefined,
        evidenceUrls: uploads.map((item) => item.url),
      });
    },
    onSuccess: invalidate,
  });
}

export function useResolveMediation() {
  const invalidate = useInvalidateStaff();
  return useMutation({
    mutationFn: ({ id, resolution }: { id: string; resolution: string }) => staffApi.resolveMediation(id, resolution),
    onSuccess: invalidate,
  });
}

export function useEscalateMediation() {
  const invalidate = useInvalidateStaff();
  return useMutation({
    mutationFn: ({ id, ...body }: {
      id: string;
      type?: string;
      priority?: string;
      requestedAmount?: number;
      additionalNotes?: string;
    }) => staffApi.escalateMediation(id, body),
    onSuccess: invalidate,
  });
}
