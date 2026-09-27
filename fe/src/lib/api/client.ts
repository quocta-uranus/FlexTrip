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

function buildHeaders(extra?: HeadersInit, body?: BodyInit | null): HeadersInit {
  const token = getAccessToken();
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const headers: HeadersInit = {
    // FormData: browser tự set 'multipart/form-data; boundary=...'
    // KHÔNG set 'application/json' vì sẽ thiếu boundary
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
  return headers;
}

export interface ApiError extends Error {
  status?: number;
  code?: string;
}

async function apiDownload(path: string, filename: string): Promise<void> {
  const doFetch = () => fetch(`${API_URL}${path}`, { headers: buildHeaders(), credentials: 'include' });
  let res = await doFetch();
  if (res.status === 401 && (await tryRefresh())) res = await doFetch();
  if (!res.ok) {
    const err = new Error(`Tải file thất bại (HTTP ${res.status})`) as ApiError;
    err.status = res.status;
    throw err;
  }
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function toQuery(params: Record<string, string | number | boolean | null | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '' || v === 'ALL') continue;
    q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : '';
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

  let res = await doFetch(buildHeaders(options.headers, options.body));

  if (res.status === 401) {
    const newToken = await tryRefresh();
    if (newToken) {
      res = await doFetch(buildHeaders(options.headers, options.body));
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: 'Network error' }));
    const message = Array.isArray(body.message) ? body.message.join('\n') : body.message;
    const err = new Error(message || `HTTP ${res.status}`) as ApiError;
    err.status = res.status;
    err.code = typeof body.code === 'string' ? body.code : undefined;
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

  /** Multipart upload. Body là FormData, KHÔNG set Content-Type (browser tự thêm boundary). */
  upload: <T = any>(path: string, formData: FormData) =>
    apiFetch<T>(path, {
      method: 'POST',
      body: formData,
      headers: undefined, // để apiFetch KHÔNG inject 'application/json'
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

  download: (path: string, filename: string) => apiDownload(path, filename),
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
  me: (accessToken?: string) => api.get('/users/me', accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined) as Promise<UserProfile>,

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

  /**
   * Upload file avatar lên BE (multipart/form-data, field "file").
   * BE lưu vào /uploads và trả về { avatarUrl, avatarPublicUrl }.
   * FE trả URL tuyệt đối cho <img src> (không dùng base64).
   */
  setAvatar: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.upload<{ userId: string; avatarUrl: string; avatarPublicUrl: string }>(
      '/profile/avatar',
      fd,
    );
  },

  // Sessions
  getSessions: () => api.get('/users/me/sessions') as Promise<any[]>,

  revokeSession: (id: string) =>
    api.delete(`/users/me/sessions/${id}`) as Promise<any>,
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

  setupPassword: (token: string, password: string) =>
    api.post('/auth/setup-password', { token, password }) as Promise<{ code: string }>,

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

// ─── Provider Profile ─────────────────────────────────────────────────────────

export interface ProviderProfile {
  id: string;
  userId: string;
  shopName: string;
  ownerName: string;
  category: string;
  pickupAddress: string;
  pickupLat?: number | null;
  pickupLng?: number | null;
  responseHours: string;
  bio?: string | null;
  highlights: string[];
  itemsCount: number;
  rentalsCount: number;
  ratingAvg: number;
  reviewsCount: number;
  responseTimeH: number;
  isLive: boolean;
  payoutMethod?: string | null;
  bankAccount?: string | null;
  // User fields
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  wallet?: { balance: unknown; currency: string } | null;
}

export const providersApi = {
  me: () => api.get('/providers/me') as Promise<ProviderProfile>,
  updateMe: (data: Partial<ProviderProfile>) =>
    api.patch('/providers/me', data) as Promise<ProviderProfile>,
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

export interface ListingPage {
  items: Listing[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const listingApi = {
  list: (params?: { status?: string; page?: number; limit?: number; category?: string; keyword?: string; location?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.category) q.set('category', params.category);
    if (params?.keyword) q.set('keyword', params.keyword);
    if (params?.location) q.set('location', params.location);
    const qs = q.toString();
    return api.get(`/listings${qs ? `?${qs}` : ''}`) as Promise<ListingPage>;
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

  publish: (id: string) => api.patch(`/listings/${id}/publish`, {}) as Promise<Listing>,
  pause: (id: string) => api.patch(`/listings/${id}/pause`, {}) as Promise<Listing>,
  resume: (id: string) => api.patch(`/listings/${id}/resume`, {}) as Promise<Listing>,

  uploadImage: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.upload<{ url: string }>('/listings/upload-image', fd);
  },

  deleteImage: (url: string) =>
    api.delete(`/listings/delete-image?url=${encodeURIComponent(url)}`) as Promise<{ ok: boolean }>,

  bulkUpload: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.upload<{ created: number; ids: string[] }>('/listings/bulk-upload', fd);
  },

  // AI endpoints
  aiSuggest: (title: string, description?: string) =>
    api.post('/listings/ai/suggest-category', { title, description }) as Promise<{
      category: string; tags: string[]; reason: string;
    }>,

  aiGenerateDescription: (data: {
    title: string; category: string; location: string; amenities?: string[]; price?: number;
  }) => api.post('/listings/ai/generate-description', data) as Promise<{ description: string }>,

  aiOptimize: (data: { description: string; title: string; category: string }) =>
    api.post('/listings/ai/optimize-description', data) as Promise<{
      optimized: string; improvements: string[];
    }>,

  aiQualityScore: (data: {
    title: string; description: string; category: string;
    imageUrls: string[]; amenities?: string[]; price?: number;
  }) => api.post('/listings/ai/quality-score', data) as Promise<{
    score: number;
    breakdown: { title: number; description: number; images: number; amenities: number; price: number };
    suggestions: string[];
    grade: string;
  }>,
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

// ─── Provider Applications ───────────────────────────────────────────────────

export interface ProviderApplication {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  categories: string[];
  description?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminNote?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const providerApplicationApi = {
  submit: (data: {
    name: string;
    phone: string;
    email: string;
    city: string;
    categories: string[];
    description?: string;
  }) => api.post('/provider-applications', data) as Promise<ProviderApplication>,

  list: (status?: 'PENDING' | 'APPROVED' | 'REJECTED') => {
    const qs = status ? `?status=${status}` : '';
    return api.get(`/provider-applications${qs}`) as Promise<ProviderApplication[]>;
  },

  approve: (id: string) =>
    api.patch(`/provider-applications/${id}/approve`, {}) as Promise<{ message: string }>,

  reject: (id: string, adminNote?: string) =>
    api.patch(`/provider-applications/${id}/reject`, { adminNote }) as Promise<ProviderApplication>,
};

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
