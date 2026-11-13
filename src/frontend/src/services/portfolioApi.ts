import { getAccessToken, signOut } from '../auth/session';
import type { PortfolioContent } from '../portfolio/content';
import { apiBaseUrl, unreachableApiMessage } from './apiConfig';

export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_CV_BYTES = 10 * 1024 * 1024;

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Sends an admin request and turns every failure into a readable Error. */
async function adminFetch(path: string, init: RequestInit): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers: { ...authHeaders(), ...init.headers } });
  } catch {
    throw new Error(unreachableApiMessage);
  }

  if (response.status === 401) {
    signOut();
    throw new Error('Sessione scaduta. Accedi di nuovo.');
  }
  if (response.status === 400) {
    const body = (await response.json().catch(() => null)) as { errors?: Record<string, string[]> } | null;
    const messages = body?.errors ? Object.values(body.errors).flat() : [];
    throw new Error(messages.join(' ') || 'Controlla i dati inseriti.');
  }
  if (!response.ok) {
    const problem = (await response.json().catch(() => null)) as { title?: string } | null;
    throw new Error(problem?.title || `Errore API: HTTP ${response.status}`);
  }
  return response;
}

/** Public: no login needed. */
export async function fetchPortfolio(signal?: AbortSignal): Promise<PortfolioContent> {
  const response = await fetch(`${apiBaseUrl}/api/v1/portfolio`, { signal });
  if (!response.ok) throw new Error(`Errore API: HTTP ${response.status}`);
  return (await response.json()) as PortfolioContent;
}

/** Admin only: replaces the published content. */
export async function savePortfolio(content: PortfolioContent): Promise<PortfolioContent> {
  const response = await adminFetch('/api/v1/portfolio', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(content)
  });
  return (await response.json()) as PortfolioContent;
}

/** Admin only: uploads the profile photo and returns its (API relative) address. It is published immediately. */
export async function uploadPhoto(file: File): Promise<string> {
  if (!PHOTO_TYPES.includes(file.type)) throw new Error('Usa un file JPEG, PNG o WebP.');
  if (file.size > MAX_PHOTO_BYTES) throw new Error('La foto supera i 2 MB.');

  const response = await adminFetch('/api/v1/portfolio/photo', {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file
  });
  return ((await response.json()) as { photoUrl: string }).photoUrl;
}

/** Admin only: removes the uploaded photo. */
export async function deletePhoto(): Promise<void> {
  await adminFetch('/api/v1/portfolio/photo', { method: 'DELETE' });
}

/** Admin only: uploads or replaces the CV PDF and publishes it immediately. */
export async function uploadCv(file: File): Promise<string> {
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    throw new Error('Usa un documento PDF.');
  }
  if (file.size > MAX_CV_BYTES) throw new Error('Il CV supera i 10 MB.');

  const response = await adminFetch('/api/v1/portfolio/cv', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/pdf' },
    body: file
  });
  return ((await response.json()) as { cvDownloadUrl: string }).cvDownloadUrl;
}

/** Admin only: removes the uploaded CV. A manual CV link, if set, remains available. */
export async function deleteCv(): Promise<void> {
  await adminFetch('/api/v1/portfolio/cv', { method: 'DELETE' });
}
