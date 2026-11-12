import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getAccessToken, saveSession } from '@/auth/session';
import { exportApi, fileNameFrom } from './exportApi';

describe('fileNameFrom', () => {
  it.each([
    ['attachment; filename=portfolio-backup-20261112.json; filename*=UTF-8\'\'portfolio-backup-20261112.json', 'portfolio-backup-20261112.json'],
    ['attachment; filename="candidature.csv"', 'candidature.csv'],
    [null, 'fallback.txt'],
    ['inline', 'fallback.txt']
  ])('%s -> %s', (header, expected) => {
    expect(fileNameFrom(header, 'fallback.txt')).toBe(expected);
  });
});

describe('exportApi', () => {
  let clickSpy: ReturnType<typeof vi.spyOn>;
  const clicked = () => (clickSpy.mock.contexts[0] as HTMLAnchorElement | undefined) ?? null;

  beforeEach(() => {
    saveSession({ accessToken: 'jwt', expiresAt: new Date(Date.now() + 3_600_000).toISOString() });
    URL.createObjectURL = vi.fn(() => 'blob:fake');
    URL.revokeObjectURL = vi.fn();
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  function mockFetch(response: Partial<Response>) {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, headers: new Headers(), blob: async () => new Blob(['x']), ...response
    });
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  }

  it('sends the token and saves the file under the name chosen by the server', async () => {
    const fetchMock = mockFetch({ headers: new Headers({ 'Content-Disposition': 'attachment; filename=portfolio-backup-20261112.json' }) });

    const name = await exportApi.backup();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/api\/v1\/export$/);
    expect(init.headers.Authorization).toBe('Bearer jwt');
    expect(name).toBe('portfolio-backup-20261112.json');
    expect(clicked()?.download).toBe('portfolio-backup-20261112.json');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake');
  });

  it('downloads the applications as CSV', async () => {
    const fetchMock = mockFetch({});

    const name = await exportApi.applicationsCsv();

    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/v1\/export\/applications\.csv$/);
    expect(name).toBe('candidature.csv');
  });

  it('ends the session when the token is no longer valid', async () => {
    mockFetch({ ok: false, status: 401 });

    await expect(exportApi.backup()).rejects.toThrow('Sessione scaduta');
    expect(getAccessToken()).toBeNull();
  });

  it('reports a failed download', async () => {
    mockFetch({ ok: false, status: 500 });

    await expect(exportApi.backup()).rejects.toThrow('HTTP 500');
    expect(clicked()).toBeNull();
  });

  it('explains when the server cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(exportApi.backup()).rejects.toThrow(/API non raggiungibile/);
  });
});
