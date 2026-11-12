import { getAccessToken, signOut } from '../auth/session';
import type { PortfolioContent } from '../portfolio/content';
import { apiBaseUrl, unreachableApiMessage } from './apiConfig';

/** Public: no login needed. */
export async function fetchPortfolio(signal?: AbortSignal): Promise<PortfolioContent> {
  const response = await fetch(`${apiBaseUrl}/api/v1/portfolio`, { signal });
  if (!response.ok) throw new Error(`Errore API: HTTP ${response.status}`);
  return (await response.json()) as PortfolioContent;
}

/** Admin only: replaces the published content. */
export async function savePortfolio(content: PortfolioContent): Promise<PortfolioContent> {
  const token = getAccessToken();
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}/api/v1/portfolio`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(content)
    });
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
  if (!response.ok) throw new Error(`Errore API: HTTP ${response.status}`);
  return (await response.json()) as PortfolioContent;
}
