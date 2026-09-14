const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Network error' }));
    const err = new Error(error.message || `HTTP ${res.status}`);
    (err as any).status = res.status;
    throw err;
  }

  if (res.status === 204) return undefined as unknown as T;

  return res.json() as Promise<T>;
}

export const api = {
  get: (path: string, headers?: HeadersInit) =>
    apiFetch(path, { method: 'GET', headers }),

  post: (path: string, body: unknown, headers?: HeadersInit) =>
    apiFetch(path, {
      method: 'POST',
      body: JSON.stringify(body),
      headers,
    }),

  patch: (path: string, body: unknown, headers?: HeadersInit) =>
    apiFetch(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers,
    }),

  put: (path: string, body: unknown, headers?: HeadersInit) =>
    apiFetch(path, {
      method: 'PUT',
      body: JSON.stringify(body),
      headers,
    }),

  delete: (path: string, headers?: HeadersInit) =>
    apiFetch(path, { method: 'DELETE', headers }),
};

// ─── User / Profile ─────────────────────────────────────────────────────────

export interface UserProfile {
  userId: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  phone?: string;
  preferredLanguage?: string;
  roles: string[];
  status: string;
  twoFactorEnabled?: boolean;
  kycStatus?: string;
  createdAt?: string;
}

export const userApi = {
  me: () => api.get('/users/me') as Promise<UserProfile>,

  updateMe: (data: {
    fullName?: string;
    phone?: string;
    avatarUrl?: string;
    preferredLanguage?: string;
  }) => api.patch('/users/me', data) as Promise<UserProfile>,

  // Travel preferences
  getPreferences: () =>
    api.get('/profile/preferences') as Promise<any[]>,

  addPreference: (data: { tripType: string; budgetMin?: number; budgetMax?: number }) =>
    api.post('/profile/preferences', data) as Promise<any>,

  updatePreference: (id: string, data: { tripType?: string; budgetMin?: number; budgetMax?: number }) =>
    api.patch(`/profile/preferences/${id}`, data) as Promise<any>,

  deletePreference: (id: string) =>
    api.delete(`/profile/preferences/${id}`) as Promise<{ ok: boolean }>,

  // Password
  changePassword: (oldPassword: string, newPassword: string) =>
    api.post('/profile/password', { oldPassword, newPassword }) as Promise<{ ok: boolean }>,

  // Avatar
  setAvatar: (avatarUrl: string) =>
    api.post('/profile/avatar', { avatarUrl }) as Promise<{ userId: string; avatarUrl: string }>,

  // Sessions
  getSessions: () => api.get('/users/me/sessions') as Promise<any[]>,

  revokeSession: (id: string) =>
    api.delete(`/users/me/sessions/${id}`) as Promise<any>,

  // Roles
  addRole: (role: string) =>
    api.post(`/users/me/roles/${role}`, {}) as Promise<any>,

  removeRole: (role: string) =>
    api.delete(`/users/me/roles/${role}`) as Promise<any>,
};

// ─── Wallet ─────────────────────────────────────────────────────────────────

export const walletApi = {
  getBalance: () =>
    api.get('/wallet') as Promise<{
      walletId: string | null;
      balance: number;
      currency: string;
      hasWallet: boolean;
    }>,

  getTransactions: (limit = 20) =>
    api.get(`/wallet/transactions?limit=${limit}`) as Promise<any[]>,

  deposit: (amount: number, paymentMethodId?: string) =>
    api.post('/wallet/deposit', { amount, paymentMethodId }) as Promise<{
      balance: number;
      currency: string;
    }>,

  withdraw: (amount: number) =>
    api.post('/wallet/withdraw', { amount }) as Promise<{
      balance: number;
      currency: string;
    }>,
};

// ─── 2FA ──────────────────────────────────────────────────────────────────

export const twoFactorApi = {
  getStatus: () => api.get('/2fa') as Promise<{ enabled: boolean; method: string | null }>,
  enable: (method: 'TOTP' | 'SMS' | 'EMAIL') =>
    api.post('/2fa/enable', { method }) as Promise<any>,
  verify: (code: string) =>
    api.post('/2fa/verify', { code }) as Promise<{ ok: boolean; enabled: boolean }>,
  disable: () => api.delete('/2fa') as Promise<{ ok: boolean; enabled: boolean }>,
};

// ─── KYC ──────────────────────────────────────────────────────────────────

export const kycApi = {
  submit: (data: { docType: string; docFrontUrl: string; docBackUrl?: string; docNumber?: string }) =>
    api.post('/kyc/submissions', data) as Promise<any>,

  mySubmissions: () => api.get('/kyc/me') as Promise<any[]>,

  getPending: () => api.get('/kyc/pending') as Promise<any[]>,

  review: (id: string, decision: 'APPROVED' | 'REJECTED', reason?: string) =>
    api.post(`/kyc/submissions/${id}/review`, { decision, reason }) as Promise<any>,
};

// ─── Payment Methods ────────────────────────────────────────────────────────

export const paymentMethodApi = {
  list: () => api.get('/payment-methods') as Promise<any[]>,
  create: (data: { type: 'CARD' | 'E_WALLET'; token: string; provider: string; last4?: string; isDefault?: boolean }) =>
    api.post('/payment-methods', data) as Promise<any>,
  setDefault: (id: string) => api.post(`/payment-methods/${id}/default`, {}) as Promise<any>,
  delete: (id: string) => api.delete(`/payment-methods/${id}`) as Promise<{ ok: boolean }>,
};
