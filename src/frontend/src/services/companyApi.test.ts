import { describe, expect, it, vi } from 'vitest';
import { companyApi, type CompanyRequest } from './companyApi';

const payload: CompanyRequest = {
  name: 'Acme', website: '', careersUrl: 'https://acme.example/careers', location: 'Milano',
  sector: 'IT', technologies: '.NET', priority: 'Alta', notes: '', followed: true
};

function mockFetch(response: Partial<Response> & { json?: () => Promise<unknown> }) {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, ...response });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('companyApi', () => {
  it('list requests the first page and omits an empty search', async () => {
    const fetchMock = mockFetch({ json: async () => ({ items: [] }) });

    await companyApi.list('   ');

    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.pathname).toBe('/api/v1/companies');
    expect(url.searchParams.get('page')).toBe('1');
    expect(url.searchParams.get('pageSize')).toBe('100');
    expect(url.searchParams.has('search')).toBe(false);
  });

  it('list sends the trimmed search term', async () => {
    const fetchMock = mockFetch({ json: async () => ({ items: [] }) });

    await companyApi.list('  dotnet ');

    expect(new URL(fetchMock.mock.calls[0][0] as string).searchParams.get('search')).toBe('dotnet');
  });

  it('create POSTs the JSON body with a JSON content type', async () => {
    const fetchMock = mockFetch({ status: 201, json: async () => ({ id: '1', ...payload }) });

    await companyApi.create(payload);

    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual(payload);
    expect(init.headers['Content-Type']).toBe('application/json');
  });

  it('update PUTs to the company id', async () => {
    const fetchMock = mockFetch({ json: async () => ({ id: 'abc', ...payload }) });

    await companyApi.update('abc', payload);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/api\/v1\/companies\/abc$/);
    expect(init.method).toBe('PUT');
  });

  it('remove resolves to undefined on 204', async () => {
    const fetchMock = mockFetch({ status: 204 });

    await expect(companyApi.remove('abc')).resolves.toBeUndefined();
    expect(fetchMock.mock.calls[0][1].method).toBe('DELETE');
  });

  it('maps 409 to the server message', async () => {
    mockFetch({ ok: false, status: 409, json: async () => ({ message: 'Duplicato' }) });

    await expect(companyApi.create(payload)).rejects.toThrow('Duplicato');
  });

  it('maps 409 without a body to the default message', async () => {
    mockFetch({ ok: false, status: 409, json: async () => { throw new Error('no body'); } });

    await expect(companyApi.create(payload)).rejects.toThrow('Questa pagina Careers è già registrata.');
  });

  it('flattens 400 validation errors into one message', async () => {
    mockFetch({
      ok: false, status: 400,
      json: async () => ({ errors: { Name: ['Nome errato.'], CareersUrl: ['URL errato.'] } })
    });

    await expect(companyApi.create(payload)).rejects.toThrow('Nome errato. URL errato.');
  });

  it('maps 400 without errors to the default message', async () => {
    mockFetch({ ok: false, status: 400, json: async () => ({}) });

    await expect(companyApi.create(payload)).rejects.toThrow('Controlla i dati inseriti.');
  });

  it('maps 404 to a not found message', async () => {
    mockFetch({ ok: false, status: 404 });

    await expect(companyApi.remove('x')).rejects.toThrow('Azienda non trovata.');
  });

  it('reports other HTTP errors with the status code', async () => {
    mockFetch({ ok: false, status: 500 });

    await expect(companyApi.list()).rejects.toThrow('Errore API: HTTP 500');
  });

  it('reports an unreachable API when fetch rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(companyApi.list()).rejects.toThrow(/API non raggiungibile/);
  });
});
