import { apiBaseUrl, unreachableApiMessage } from '../services/apiConfig';
import { saveSession, type Session } from './session';

export async function login(username: string, password: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
  } catch {
    throw new Error(unreachableApiMessage);
  }

  if (response.status === 401) throw new Error('Username o password non corretti.');
  if (response.status === 429) throw new Error('Troppi tentativi. Riprova tra un minuto.');
  if (response.status === 400) throw new Error('Inserisci username e password.');
  if (!response.ok) throw new Error(`Errore API: HTTP ${response.status}`);

  const body = (await response.json()) as Session;
  saveSession({ accessToken: body.accessToken, expiresAt: body.expiresAt });
}
