const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL;
const QA_BYPASS = process.env.QA_BYPASS_AUTH || process.env.EXPO_PUBLIC_QA_BYPASS_AUTH;

if (!BASE_URL) {
  console.error('[apiFetch] EXPO_PUBLIC_BASE_URL is not set!');
}

console.log('[apiFetch] ✅ NEW CODE LOADED - apiFetch helper is active!');
console.log('[apiFetch] QA_BYPASS mode:', QA_BYPASS === 'true' ? 'ENABLED' : 'disabled');

export async function apiFetch(path, options = {}) {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
  
  console.log('[apiFetch] Making request to:', url);
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (QA_BYPASS === 'true') {
    headers['X-QA-Bypass'] = 'true';
    console.log('[apiFetch] Adding QA bypass header');
  }
  
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers,
  });
  
  console.log('[apiFetch] Response status:', response.status, 'for', path);
  
  return response;
}

export function getAbsoluteUrl(relativePath) {
  if (!relativePath) return null;
  if (relativePath.startsWith('http')) return relativePath;
  return `${BASE_URL}${relativePath}`;
}
