import { getAccessToken, signOut } from '@/auth/session';
import { apiBaseUrl, unreachableApiMessage } from './apiConfig';

/**
 * Calls an admin endpoint with the signed-in token and turns every failure into a readable Error:
 * an unreachable server, an expired session (back to the login screen), validation messages and problem titles.
 */
export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers
      }
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
  if (response.status === 404) throw new Error('Elemento non trovato.');
  if (!response.ok) {
    const problem = (await response.json().catch(() => null)) as { title?: string; correlationId?: string } | null;
    // The reference lets the owner find the failure in the server log.
    const reference = problem?.correlationId ? ` (rif. ${problem.correlationId})` : '';
    throw new Error((problem?.title || `Errore API: HTTP ${response.status}`) + reference);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
