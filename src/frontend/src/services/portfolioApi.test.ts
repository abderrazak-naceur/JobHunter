import { describe, expect, it, vi } from 'vitest';
import { saveSession, getAccessToken, SESSION_ENDED_EVENT } from '../auth/session';
import { resolveAssetUrl } from './apiConfig';
import { deletePhoto, MAX_PHOTO_BYTES, uploadPhoto } from './portfolioApi';

function signIn() {
  saveSession({ accessToken: 'jwt-1', expiresAt: new Date(Date.now() + 3_600_000).toISOString() });
}

function mockFetch(response: Partial<Response> & { json?: () => Promise<unknown> }) {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, ...response });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const png = () => new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'me.png', { type: 'image/png' });

describe('uploadPhoto', () => {
  it('sends the file as the raw body with its type and the bearer token', async () => {
    signIn();
    const fetchMock = mockFetch({ json: async () => ({ photoUrl: '/api/v1/portfolio/photo?v=9' }) });
    const file = png();

    const address = await uploadPhoto(file);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/api\/v1\/portfolio\/photo$/);
    expect(init.method).toBe('PUT');
    expect(init.body).toBe(file);
    expect(init.headers['Content-Type']).toBe('image/png');
    expect(init.headers.Authorization).toBe('Bearer jwt-1');
    expect(address).toBe('/api/v1/portfolio/photo?v=9');
  });

  it.each(['image/gif', 'image/svg+xml', 'application/pdf', ''])('refuses %j without calling the API', async type => {
    const fetchMock = mockFetch({});

    await expect(uploadPhoto(new File(['x'], 'f', { type }))).rejects.toThrow('JPEG, PNG o WebP');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses files over 2 MB without calling the API', async () => {
    const fetchMock = mockFetch({});
    const big = new File([new Uint8Array(MAX_PHOTO_BYTES + 1)], 'big.jpg', { type: 'image/jpeg' });

    await expect(uploadPhoto(big)).rejects.toThrow('2 MB');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows the message sent by the server', async () => {
    signIn();
    mockFetch({ ok: false, status: 415, json: async () => ({ title: 'Formato non supportato. Usa un file JPEG, PNG o WebP.' }) });

    await expect(uploadPhoto(png())).rejects.toThrow('Formato non supportato');
  });

  it('falls back to the status code when the server sends no message', async () => {
    signIn();
    mockFetch({ ok: false, status: 500, json: async () => { throw new Error('no body'); } });

    await expect(uploadPhoto(png())).rejects.toThrow('Errore API: HTTP 500');
  });

  it('ends the session on 401', async () => {
    signIn();
    mockFetch({ ok: false, status: 401 });
    const listener = vi.fn();
    window.addEventListener(SESSION_ENDED_EVENT, listener);

    await expect(uploadPhoto(png())).rejects.toThrow('Sessione scaduta');
    window.removeEventListener(SESSION_ENDED_EVENT, listener);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBeNull();
  });

  it('reports an unreachable API', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(uploadPhoto(png())).rejects.toThrow(/API non raggiungibile/);
  });
});

describe('deletePhoto', () => {
  it('sends DELETE with the bearer token', async () => {
    signIn();
    const fetchMock = mockFetch({ status: 204 });

    await deletePhoto();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/api\/v1\/portfolio\/photo$/);
    expect(init.method).toBe('DELETE');
    expect(init.headers.Authorization).toBe('Bearer jwt-1');
  });
});

describe('resolveAssetUrl', () => {
  it('prefixes addresses that belong to the API', () => {
    expect(resolveAssetUrl('/api/v1/portfolio/photo?v=1')).toMatch(/^https?:\/\/.+\/api\/v1\/portfolio\/photo\?v=1$/);
  });

  it('leaves absolute and protocol-relative URLs alone', () => {
    expect(resolveAssetUrl('https://example.com/me.jpg')).toBe('https://example.com/me.jpg');
    expect(resolveAssetUrl('//cdn.example.com/me.jpg')).toBe('//cdn.example.com/me.jpg');
    expect(resolveAssetUrl('data:image/png;base64,AAAA')).toBe('data:image/png;base64,AAAA');
  });
});
