const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL;

if (!BASE_URL) {
  console.error('[apiFetch] EXPO_PUBLIC_BASE_URL is not set!');
}

console.log('[apiFetch] ✅ NEW CODE LOADED - apiFetch helper is active!');

export async function apiFetch(path, options = {}) {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
  
  console.log('[apiFetch] Making request to:', url);
  
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  console.log('[apiFetch] Response status:', response.status, 'for', path);
  
  return response;
}

export function getAbsoluteUrl(relativePath) {
  if (!relativePath) return null;
  if (relativePath.startsWith('http')) return relativePath;
  return `${BASE_URL}${relativePath}`;
}
