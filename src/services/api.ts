import { auth } from '../firebase.ts';

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('X-Requested-With', 'SOVRAN-SPA');
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const currentUser = auth.currentUser;
  if (currentUser && !headers.has('Authorization')) {
    const idToken = await currentUser.getIdToken();
    headers.set('Authorization', `Bearer ${idToken}`);
  }

  const res = await fetch(path, {
    ...options,
    headers,
  });

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : await res.text();

  if (!res.ok) {
    const message =
      (typeof data === 'object' && data && 'error' in data && String((data as { error: unknown }).error)) ||
      `Request failed (${res.status})`;
    throw new Error(message);
  }

  return data as T;
}
