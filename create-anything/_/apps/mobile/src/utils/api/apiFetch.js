const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL;

if (!BASE_URL) {
  console.error('[apiFetch] EXPO_PUBLIC_BASE_URL is not set!');
}

console.log('[apiFetch] API helper loaded - Base URL:', BASE_URL ? 'configured' : 'NOT SET');

export async function apiFetch(path, options = {}) {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
  
  console.log('[apiFetch] Making request to:', url);
  
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    ...options.headers,
  };
  
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers,
    cache: 'no-store',
  });
  
  console.log('[apiFetch] Response status:', response.status, 'for', path);
  
  return response;
}

export function getAbsoluteUrl(relativePath) {
  if (!relativePath) return null;
  if (relativePath.startsWith('http')) return relativePath;
  return `${BASE_URL}${relativePath}`;
}
