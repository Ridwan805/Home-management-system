export const API_BASE = import.meta.env.VITE_API_BASE || '';

export function apiUrl(path) {
  if (!path) return API_BASE;
  if (API_BASE) {
    return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
  }
  return path; // same-origin
}

export function assetUrl(path) {
  if (!path) return '';
  if (API_BASE) {
    return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
  }
  return path; // same-origin
}