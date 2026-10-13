/**
 * PROF-02 — Travel Preferences hooks
 *
 * - queryKey ['preferences', userId] → cache riêng theo từng tài khoản,
 *   đổi tài khoản sẽ không hiển thị dữ liệu tài khoản cũ.
 * - refetchOnWindowFocus: true → làm mới khi tab được focus,
 *   nhưng KHÔNG ghi đè dữ liệu đang sửa trong component (phụ trách bởi component state).
 * - Chỉ invalidate/refetch sau mutation thành công; chưa dùng optimistic update.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { userApi } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth.store';
import type {
  CreatePreferencePayload,
  TravelPreference,
  UpdatePreferencePayload,
} from '@/types/preference';

/** Query key factory — bao gồm userId để cache riêng từng tài khoản */
export function prefQueryKey(userId: string | undefined) {
  return ['preferences', userId ?? ''] as const;
}

/** Lấy danh sách tất cả travel preferences của tài khoản hiện tại */
export function useTravelPreferences() {
  const userId = useAuthStore((s) => s.user?.id);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery<TravelPreference[]>({
    queryKey: prefQueryKey(userId),
    queryFn: () => userApi.getPreferences(),
    enabled: isAuthenticated && Boolean(userId),
    staleTime: 2 * 60 * 1000,   // 2 phút
    refetchOnWindowFocus: true,
  });
}

/** Thêm mới một travel preference */
export function useCreatePreference() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation<TravelPreference, Error, CreatePreferencePayload>({
    mutationFn: (data) => userApi.addPreference(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: prefQueryKey(userId) });
    },
  });
}

/** Cập nhật một travel preference theo id */
export function useUpdatePreference() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation<
    TravelPreference,
    Error,
    { id: string; data: UpdatePreferencePayload }
  >({
    mutationFn: ({ id, data }) => userApi.updatePreference(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: prefQueryKey(userId) });
    },
  });
}

/** Xoá một travel preference theo id */
export function useDeletePreference() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation<{ ok: boolean }, Error, string>({
    mutationFn: (id) => userApi.deletePreference(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: prefQueryKey(userId) });
    },
  });
}
