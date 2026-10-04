import { api, toQuery } from '@/lib/api/client';
import type { StaffMediation, StaffMediationStatus, StaffTaskSchedule } from '@/types/staff';

export const staffApi = {
  tasks: (date: string) => api.get(`/staff/tasks${toQuery({ date })}`) as Promise<StaffTaskSchedule>,
  booking: (id: string) => api.get(`/staff/bookings/${id}`),
  confirmHandover: (id: string, body: { photoUrl: string; conditionNote: string }) =>
    api.post(`/staff/bookings/${id}/handover`, body),
  confirmReturn: (id: string, body: { photoUrl: string; conditionNote: string }) =>
    api.post(`/staff/bookings/${id}/return`, body),
  mediations: (status?: StaffMediationStatus) =>
    api.get(`/staff/mediations${toQuery({ status })}`) as Promise<StaffMediation[]>,
  createMediation: (bookingId: string, body: {
    issue: string;
    travelerStatement?: string;
    providerStatement?: string;
    evidenceUrls?: string[];
  }) => api.post(`/staff/bookings/${bookingId}/mediations`, body) as Promise<StaffMediation>,
  resolveMediation: (id: string, resolution: string) =>
    api.patch(`/staff/mediations/${id}/resolve`, { resolution }) as Promise<StaffMediation>,
  escalateMediation: (id: string, body: {
    type?: string;
    priority?: string;
    requestedAmount?: number;
    additionalNotes?: string;
  }) => api.post(`/staff/mediations/${id}/escalate`, body),
  uploadEvidence: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.upload<{ url: string }>('/staff/upload-evidence', form);
  },
};
