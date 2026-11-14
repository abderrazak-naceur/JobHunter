import { describe, expect, it, vi } from 'vitest';
import { login } from './authApi';
import { getAccessToken } from './session';

function mockFetch(response: Partial<Response> & { json?: () => Promise<unknown> }) {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, ...response });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('login', () => {
  it('posts the credentials and stores the returned session', async () => {
    const expiresAt = new Date(Date.now() + 3_600_000).toISOString();
    const fetchMock = mockFetch({ json: async () => ({ accessToken: 'jwt-token', expiresAt }) });

    await login('admin', 'secret');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/api\/v1\/auth\/login$/);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ username: 'admin', password: 'secret' });
    expect(getAccessToken()).toBe('jwt-token');
  });

  it.each([
    [401, 'Username o password non corretti.'],
    [429, 'Troppi tentativi. Riprova tra un minuto.'],
    [400, 'Inserisci username e password.'],
    [500, 'Errore API: HTTP 500']
  ])('maps HTTP %i to a readable message and stores nothing', async (status, message) => {
    mockFetch({ ok: false, status });

    await expect(login('admin', 'x')).rejects.toThrow(message);
    expect(getAccessToken()).toBeNull();
  });

  it('reports an unreachable API', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(login('admin', 'x')).rejects.toThrow(/API non raggiungibile/);
  });
});
