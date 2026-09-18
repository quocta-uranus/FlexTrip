import { useMutation } from '@tanstack/react-query';
import { userApi } from '@/lib/api/client';

/**
 * Upload avatar: gửi file thật (multipart/form-data) lên BE.
 * BE host ảnh nội bộ trong /uploads và trả về URL tuyệt đối.
 * Hook này trả về URL public (FE dùng cho <img src>) — KHÔNG dùng base64.
 */
export function useSetAvatar() {
  return useMutation({
    mutationFn: async (file: File) => {
      const res = await userApi.setAvatar(file);
      return res.avatarPublicUrl ?? res.avatarUrl;
    },
  });
}
