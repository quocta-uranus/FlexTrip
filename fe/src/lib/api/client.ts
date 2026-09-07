const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

async function fetchWithAuth(path: string, options: RequestInit = {}): Promise<Response> {
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
    throw new Error(error.message || `HTTP ${res.status}`);
  }

  return res;
}

export const api = {
  get: (path: string, headers?: HeadersInit) =>
    fetchWithAuth(path, { method: 'GET', headers }),

  post: (path: string, body: unknown, headers?: HeadersInit) =>
    fetchWithAuth(path, { method: 'POST', body: JSON.stringify(body), headers }),

  patch: (path: string, body: unknown, headers?: HeadersInit) =>
    fetchWithAuth(path, { method: 'PATCH', body: JSON.stringify(body), headers }),

  put: (path: string, body: unknown, headers?: HeadersInit) =>
    fetchWithAuth(path, { method: 'PUT', body: JSON.stringify(body), headers }),

  delete: (path: string, headers?: HeadersInit) =>
    fetchWithAuth(path, { method: 'DELETE', headers }),
};
