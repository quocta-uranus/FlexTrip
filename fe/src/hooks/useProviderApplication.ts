import { useQuery } from '@tanstack/react-query';
import { providerApplicationApi } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth.store';

export type ProviderEntryState = 'NONE' | 'PENDING' | 'NEEDS_UPDATE' | 'APPROVED';

export interface ProviderEntry {
  state: ProviderEntryState;
  label: string;
  hint: string;
  href: string;
}

// REJECTED maps to "needs update": the backend lets the same email apply again, and the admin note says what to fix.
const ENTRIES: Record<ProviderEntryState, ProviderEntry> = {
  NONE: { state: 'NONE', label: 'Trở thành Provider', hint: 'Cho thuê thiết bị của bạn', href: '/become-provider' },
  PENDING: {
    state: 'PENDING',
    label: 'Xem trạng thái đăng ký',
    hint: 'Hồ sơ đang được xem xét',
    href: '/become-provider/status',
  },
  NEEDS_UPDATE: {
    state: 'NEEDS_UPDATE',
    label: 'Bổ sung hồ sơ',
    hint: 'Hồ sơ cần cập nhật',
    href: '/become-provider/status',
  },
  APPROVED: { state: 'APPROVED', label: 'Chuyển sang Provider', hint: 'Đã được duyệt', href: '/dashboard' },
};

// Only travelers can apply; providers, staff and admins already have their own area.
export function useProviderEntry() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const roles = user?.roles ?? [];
  const isProvider = roles.includes('PROVIDER');
  const canApply = isAuthenticated && !isProvider && !roles.includes('STAFF') && !roles.includes('ADMIN');

  const query = useQuery({
    queryKey: ['provider-application', 'mine', user?.id],
    queryFn: () => providerApplicationApi.mine(),
    enabled: canApply,
    staleTime: 60_000,
  });

  const application = query.data?.application ?? null;
  const status = application?.status;
  const state: ProviderEntryState = isProvider || status === 'APPROVED'
    ? 'APPROVED'
    : status === 'PENDING'
      ? 'PENDING'
      : status === 'REJECTED'
        ? 'NEEDS_UPDATE'
        : 'NONE';

  return { entry: ENTRIES[state], application, isLoading: query.isLoading, canApply };
}
