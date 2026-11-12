import { describe, expect, it, vi } from 'vitest';
import { getAccessToken, saveSession, SESSION_ENDED_EVENT } from '@/auth/session';
import { applicationApi, toInput, type Application } from './applicationApi';
import { apiRequest } from './http';

function signIn() {
  saveSession({ accessToken: 'jwt-9', expiresAt: new Date(Date.now() + 3_600_000).toISOString() });
}

function mockFetch(response: Partial<Response> & { json?: () => Promise<unknown> }) {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, ...response });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('apiRequest', () => {
  it('sends the bearer token, and a JSON content type only when there is a body', async () => {
    signIn();
    const fetchMock = mockFetch({ json: async () => ({ ok: true }) });

    await apiRequest('/x');
    await apiRequest('/x', { method: 'POST', body: '{}' });

    expect(fetchMock.mock.calls[0][1].headers).toEqual({ Authorization: 'Bearer jwt-9' });
    expect(fetchMock.mock.calls[1][1].headers).toEqual({ 'Content-Type': 'application/json', Authorization: 'Bearer jwt-9' });
  });

  it('returns undefined for 204', async () => {
    mockFetch({ status: 204 });

    await expect(apiRequest('/x', { method: 'DELETE' })).resolves.toBeUndefined();
  });

  it('ends the session on 401', async () => {
    signIn();
    mockFetch({ ok: false, status: 401 });
    const listener = vi.fn();
    window.addEventListener(SESSION_ENDED_EVENT, listener);

    await expect(apiRequest('/x')).rejects.toThrow('Sessione scaduta');
    window.removeEventListener(SESSION_ENDED_EVENT, listener);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBeNull();
  });

  it('joins the validation messages on 400', async () => {
    mockFetch({ ok: false, status: 400, json: async () => ({ errors: { Company: ['Manca l’azienda.'], Role: ['Manca il ruolo.'] } }) });

    await expect(apiRequest('/x')).rejects.toThrow('Manca l’azienda. Manca il ruolo.');
  });

  it('has a default message for 400 without details', async () => {
    mockFetch({ ok: false, status: 400, json: async () => { throw new Error('no body'); } });

    await expect(apiRequest('/x')).rejects.toThrow('Controlla i dati inseriti.');
  });

  it('reports 404 as not found', async () => {
    mockFetch({ ok: false, status: 404 });

    await expect(apiRequest('/x')).rejects.toThrow('Elemento non trovato.');
  });

  it('uses the title of a problem response, or the status code', async () => {
    mockFetch({ ok: false, status: 413, json: async () => ({ title: 'Troppo grande.' }) });
    await expect(apiRequest('/x')).rejects.toThrow('Troppo grande.');

    mockFetch({ ok: false, status: 500, json: async () => { throw new Error('no body'); } });
    await expect(apiRequest('/x')).rejects.toThrow('Errore API: HTTP 500');
  });

  it('adds the correlation id of a failed request, so it can be found in the server log', async () => {
    mockFetch({ ok: false, status: 500, json: async () => ({ title: 'An error occurred.', correlationId: 'abc123def456' }) });
    await expect(apiRequest('/x')).rejects.toThrow('An error occurred. (rif. abc123def456)');
  });

  it('reports an unreachable API', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(apiRequest('/x')).rejects.toThrow(/API non raggiungibile/);
  });
});

describe('applicationApi', () => {
  const application: Application = {
    id: '1', company: 'Acme', role: 'Dev', status: 'Applied', source: 'LinkedIn', url: '', location: 'Milano', salaryRange: '',
    contactName: '', contactEmail: '', appliedOn: '2026-11-03', nextStep: 'Chiamare', nextStepOn: '2026-11-10', notes: 'n',
    createdAt: '2026-11-01T00:00:00Z', updatedAt: '2026-11-02T00:00:00Z'
  };

  it('builds the list query, leaving out empty filters', async () => {
    const fetchMock = mockFetch({ json: async () => ({ items: [] }) });

    await applicationApi.list({ search: '  acme ', status: 'Interview', page: 3, pageSize: 5 });
    await applicationApi.list();

    const first = new URL(fetchMock.mock.calls[0][0] as string);
    expect(first.pathname).toBe('/api/v1/applications');
    expect(Object.fromEntries(first.searchParams)).toEqual({ search: 'acme', status: 'Interview', page: '3', pageSize: '5' });
    const second = new URL(fetchMock.mock.calls[1][0] as string);
    expect(Object.fromEntries(second.searchParams)).toEqual({ page: '1', pageSize: '10' });
  });

  it('uses the right method and address for each operation', async () => {
    const fetchMock = mockFetch({ json: async () => ({}) });
    const input = toInput(application);

    await applicationApi.get('abc');
    await applicationApi.create(input);
    await applicationApi.update('abc', input);
    await applicationApi.remove('abc');
    await applicationApi.summary();

    const calls = fetchMock.mock.calls.map(([url, init]) => `${init?.method ?? 'GET'} ${new URL(url as string).pathname}`);
    expect(calls).toEqual([
      'GET /api/v1/applications/abc',
      'POST /api/v1/applications',
      'PUT /api/v1/applications/abc',
      'DELETE /api/v1/applications/abc',
      'GET /api/v1/applications/summary'
    ]);
  });

  it('keeps only the editable fields in toInput', () => {
    const input = toInput(application);

    expect(input).not.toHaveProperty('id');
    expect(input).not.toHaveProperty('createdAt');
    expect(input).not.toHaveProperty('updatedAt');
    expect(input).toMatchObject({ company: 'Acme', status: 'Applied', appliedOn: '2026-11-03', nextStepOn: '2026-11-10' });
  });
});
