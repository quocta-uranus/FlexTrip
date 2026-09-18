import type {
  AuthTokens,
  LoginResult,
  RegistrationResult,
  Session,
  TwoFactorSetup,
  TwoFactorEnableResult,
} from '@/types/auth';
import { getAccessToken, setAccessToken, getRefreshToken, setRefreshToken } from '@/lib/api/token';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

let _isRefreshing = false;
// Queued callbacks waiting for the in-flight refresh to resolve
let _refreshWaiters: Array<(token: string | null) => void> = [];

function redirectToLogin() {
  if (typeof window === 'undefined') return;
  if (window.location.pathname === '/login') return;
  const redirect = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.replace(`/login?redirect=${redirect}`);
}

function clearTokens() {
  setAccessToken(null);
  setRefreshToken(null); // clears localStorage + cookie
}

async function tryRefresh(): Promise<string | null> {
  // If a refresh is already in-flight, queue this caller
  if (_isRefreshing) {
    return new Promise((resolve) => { _refreshWaiters.push(resolve); });
  }

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    redirectToLogin();
    return null;
  }

  _isRefreshing = true;
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      credentials: 'include',
    });

    if (!res.ok) {
      // Refresh token is expired / revoked — force re-login
      clearTokens();
      _refreshWaiters.forEach((fn) => fn(null));
      _refreshWaiters = [];
      redirectToLogin();
      return null;
    }

    const data: AuthTokens = await res.json();
    setAccessToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    _refreshWaiters.forEach((fn) => fn(data.accessToken));
    _refreshWaiters = [];
    return data.accessToken;
  } catch {
    clearTokens();
    _refreshWaiters.forEach((fn) => fn(null));
    _refreshWaiters = [];
    redirectToLogin();
    return null;
  } finally {
    _isRefreshing = false;
  }
}

function buildHeaders(extra?: HeadersInit): HeadersInit {
  const token = getAccessToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const doFetch = (headers: HeadersInit) =>
    fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      credentials: 'include',
    });

  let res = await doFetch(buildHeaders(options.headers));

  if (res.status === 401) {
    const newToken = await tryRefresh();
    if (newToken) {
      res = await doFetch(buildHeaders(options.headers));
    }
  }

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
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  phone?: string | null;
  preferredLanguage?: string | null;
  roles: string[];
  status: string;
  twoFactorEnabled?: boolean;
  isKycVerified?: boolean;
  kycStatus?: string | null;
  createdAt?: string;
  dateOfBirth?: string | null;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | null;
  nationality?: string | null;
  address?: string | null;
  bio?: string | null;
  emergencyContact?: string | null;
  languages?: string[];
  providerProfile?: {
    shopName: string;
    ratingAvg: number;
    reviewsCount: number;
    responseHours: string;
    category: string;
  } | null;
  adminProfile?: {
    employeeId: string;
    department: string;
    level: string;
  } | null;
}

export interface UpdateMePayload {
  name?: string;
  phone?: string;
  avatarUrl?: string;
  preferredLanguage?: string;
  dateOfBirth?: string;
  gender?: string;
  nationality?: string;
  address?: string;
  bio?: string;
  emergencyContact?: string;
  languages?: string[];
}

export const userApi = {
  me: () => api.get('/users/me') as Promise<UserProfile>,

  updateMe: (data: UpdateMePayload) => api.patch('/users/me', data) as Promise<UserProfile>,

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

// ─── Auth ────────────────────────────────────────────────────────────────────

export const authApi = {
  register: (data: { name: string; email: string; password: string; phone?: string }) =>
    api.post('/auth/register', data) as Promise<RegistrationResult>,

  verifyOtp: (email: string, code: string) =>
    api.post('/auth/verify-otp', { email, code }) as Promise<{ code: string }>,

  resendOtp: (email: string) =>
    api.post('/auth/resend-otp', { email }) as Promise<{ code: string }>,

  login: (data: { email: string; password: string; deviceName?: string }) =>
    api.post('/auth/login', data) as Promise<LoginResult>,

  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }) as Promise<AuthTokens>,

  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }) as Promise<void>,

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }) as Promise<{ code: string }>,

  resetPassword: (token: string, newPassword: string) =>
    api.post('/auth/reset-password', { token, newPassword }) as Promise<{ code: string }>,

  setup2fa: () =>
    api.post('/auth/2fa/setup', {}) as Promise<TwoFactorSetup>,

  enable2fa: (code: string) =>
    api.post('/auth/2fa/enable', { code }) as Promise<TwoFactorEnableResult>,

  verify2fa: (challengeToken: string, code: string) =>
    api.post('/auth/2fa/verify', { challengeToken, code }) as Promise<AuthTokens>,

  disable2fa: (code: string) =>
    api.post('/auth/2fa/disable', { code }) as Promise<{ ok: boolean }>,

  sessions: () =>
    api.get('/auth/sessions') as Promise<Session[]>,

  revokeSession: (id: string) =>
    api.delete(`/auth/sessions/${id}`) as Promise<void>,

  revokeOtherSessions: () =>
    api.delete('/auth/sessions/others') as Promise<{ revoked: number }>,
};

/** @deprecated Dùng authApi thay thế */
export const twoFactorApi = {
  setup: () => authApi.setup2fa(),
  enable: (code: string) => authApi.enable2fa(code),
  verify: (challengeToken: string, code: string) => authApi.verify2fa(challengeToken, code),
  disable: (code: string) => authApi.disable2fa(code),
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

// ─── Listings ────────────────────────────────────────────────────────────────

import type { Listing, SearchFilters, SearchResult, ListingCategory } from '@/types/listing';
import type { Booking, CreateBookingPayload } from '@/types/booking';
import type { Conversation, Message } from '@/types/message';

export const listingApi = {
  list: (params?: { status?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    const qs = q.toString();
    return api.get(`/listings${qs ? `?${qs}` : ''}`) as Promise<Listing[]>;
  },

  get: (id: string) => api.get(`/listings/${id}`) as Promise<Listing>,

  create: (data: {
    title: string;
    description: string;
    price: number;
    currency?: string;
    location: string;
    category: ListingCategory;
    amenities?: string[];
    imageUrls?: string[];
    latitude?: number;
    longitude?: number;
  }) => api.post('/listings', data) as Promise<Listing>,

  update: (id: string, data: Partial<{
    title: string;
    description: string;
    price: number;
    location: string;
    category: ListingCategory;
    amenities: string[];
    imageUrls: string[];
    status: string;
  }>) => api.patch(`/listings/${id}`, data) as Promise<Listing>,

  delete: (id: string) => api.delete(`/listings/${id}`) as Promise<{ ok: boolean }>,

  myListings: (params?: { page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    const qs = q.toString();
    return api.get(`/listings/me${qs ? `?${qs}` : ''}`) as Promise<Listing[]>;
  },
};

// ─── Search ──────────────────────────────────────────────────────────────────

export const searchApi = {
  search: (filters: SearchFilters) => {
    const q = new URLSearchParams();
    if (filters.keyword) q.set('q', filters.keyword);
    if (filters.category) q.set('category', filters.category);
    if (filters.location) q.set('location', filters.location);
    if (filters.dateFrom) q.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) q.set('dateTo', filters.dateTo);
    if (filters.priceMin != null) q.set('priceMin', String(filters.priceMin));
    if (filters.priceMax != null) q.set('priceMax', String(filters.priceMax));
    if (filters.sortBy) q.set('sortBy', filters.sortBy);
    if (filters.page) q.set('page', String(filters.page));
    if (filters.limit) q.set('limit', String(filters.limit));
    return api.get(`/search?${q.toString()}`) as Promise<SearchResult>;
  },
};

// ─── Bookings ────────────────────────────────────────────────────────────────

export const bookingApi = {
  create: (data: CreateBookingPayload) =>
    api.post('/bookings', data) as Promise<Booking>,

  myBookings: (params?: { status?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    const qs = q.toString();
    return api.get(`/bookings/me${qs ? `?${qs}` : ''}`) as Promise<Booking[]>;
  },

  get: (id: string) => api.get(`/bookings/${id}`) as Promise<Booking>,

  cancel: (id: string) => api.post(`/bookings/${id}/cancel`, {}) as Promise<Booking>,

  confirm: (id: string) => api.post(`/bookings/${id}/confirm`, {}) as Promise<Booking>,

  complete: (id: string) => api.post(`/bookings/${id}/complete`, {}) as Promise<Booking>,

  // Provider: bookings for provider's listings
  providerBookings: (params?: { status?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    const qs = q.toString();
    return api.get(`/bookings/provider${qs ? `?${qs}` : ''}`) as Promise<Booking[]>;
  },
};

// ─── Messages ────────────────────────────────────────────────────────────────

export const messageApi = {
  getConversations: () =>
    api.get('/messages/conversations') as Promise<Conversation[]>,

  getMessages: (conversationId: string) =>
    api.get(`/messages/conversations/${conversationId}`) as Promise<Message[]>,

  sendMessage: (conversationId: string, content: string) =>
    api.post(`/messages/conversations/${conversationId}`, { content }) as Promise<Message>,

  startConversation: (targetUserId: string, content: string) =>
    api.post('/messages/conversations', { targetUserId, content }) as Promise<Conversation>,

  markRead: (conversationId: string) =>
    api.post(`/messages/conversations/${conversationId}/read`, {}) as Promise<{ ok: boolean }>,
};
