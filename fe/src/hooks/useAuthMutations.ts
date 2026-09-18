import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { authApi, userApi } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth.store';
import { isTwoFactorChallenge } from '@/types/auth';
import { getRefreshToken, setAccessToken } from '@/lib/api/token';

export function useRegister() {
  return useMutation({
    mutationFn: (data: { name: string; email: string; password: string; phone?: string }) =>
      authApi.register(data),
  });
}

export function useVerifyOtp() {
  const router = useRouter();
  return useMutation({
    mutationFn: ({ email, code }: { email: string; code: string }) =>
      authApi.verifyOtp(email, code),
    onSuccess: () => {
      router.push('/login?verified=1');
    },
  });
}

export function useResendOtp() {
  return useMutation({
    mutationFn: (email: string) => authApi.resendOtp(email),
  });
}

export function useLogin() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: { email: string; password: string; deviceName?: string }) =>
      authApi.login(data),
    onSuccess: async (result, _vars, _ctx) => {
      if (isTwoFactorChallenge(result)) {
        router.push(`/2fa-challenge?token=${encodeURIComponent(result.challengeToken)}`);
        return;
      }
      // Set token vào memory trước để userApi.me() gửi được Authorization header
      setAccessToken(result.accessToken);
      const user = await userApi.me();
      setAuth(user, result.accessToken, result.refreshToken);
      qc.setQueryData(['me'], user);

      const params = new URLSearchParams(window.location.search);
      router.push(params.get('redirect') ?? '/');
    },
  });
}

export function useVerify2faLogin() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ challengeToken, code }: { challengeToken: string; code: string }) =>
      authApi.verify2fa(challengeToken, code),
    onSuccess: async (tokens) => {
      const user = await userApi.me();
      setAuth(user, tokens.accessToken, tokens.refreshToken);
      qc.setQueryData(['me'], user);
      router.push('/');
    },
  });
}

export function useLogout() {
  const router = useRouter();
  const { clearAuth } = useAuthStore();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => {
      const rt = getRefreshToken();
      return rt ? authApi.logout(rt) : Promise.resolve();
    },
    onSettled: () => {
      clearAuth();
      qc.clear();
      router.push('/login');
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => authApi.forgotPassword(email),
  });
}

export function useResetPassword() {
  const router = useRouter();
  return useMutation({
    mutationFn: ({ token, newPassword }: { token: string; newPassword: string }) =>
      authApi.resetPassword(token, newPassword),
    onSuccess: () => {
      router.push('/login?reset=1');
    },
  });
}
