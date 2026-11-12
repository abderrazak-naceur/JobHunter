export const apiBaseUrl: string = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/$/, '');

export const unreachableApiMessage = `API non raggiungibile (${apiBaseUrl}). Avvia il backend .NET e verifica VITE_API_BASE_URL.`;

/**
 * Addresses returned by the API for its own files ("/api/v1/portfolio/photo?v=1") are relative to the API,
 * which may live on another domain than the website. Absolute URLs are left untouched.
 */
export function resolveAssetUrl(url: string): string {
  return url.startsWith('/') && !url.startsWith('//') ? `${apiBaseUrl}${url}` : url;
}
