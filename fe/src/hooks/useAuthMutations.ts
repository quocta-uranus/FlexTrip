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
      // Truyền token trực tiếp vào userApi.me() để tránh race condition với React Query
      const user = await userApi.me(result.accessToken);
      setAuth(user, result.accessToken, result.refreshToken);
      qc.setQueryData(['me'], user);

      const roles = user.roles as string[];
      const redirectParam = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('redirect')
        : null;

      if (redirectParam) {
        router.push(redirectParam);
      } else if (roles.includes('ADMIN')) {
        router.push('/admin');
      } else if (roles.includes('STAFF')) {
        router.push('/staff');
      } else if (roles.includes('PROVIDER')) {
        router.push('/dashboard');
      } else {
        router.push('/');
      }
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
      // Truyền token trực tiếp để tránh race condition
      const user = await userApi.me(tokens.accessToken);
      setAuth(user, tokens.accessToken, tokens.refreshToken);
      qc.setQueryData(['me'], user);
      const roles = user.roles as string[];
      if (roles.includes('ADMIN')) {
        router.push('/admin');
      } else if (roles.includes('STAFF')) {
        router.push('/staff');
      } else if (roles.includes('PROVIDER')) {
        router.push('/dashboard');
      } else {
        router.push('/');
      }
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

export function useSetupPassword() {
  return useMutation({
    mutationFn: ({ token, password }: { token: string; password: string }) => authApi.setupPassword(token, password),
  });
}
