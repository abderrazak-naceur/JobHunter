import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AccountPage, { validatePasswordChange } from './AccountPage';
import { getAccessToken, saveSession } from '@/auth/session';

const expiresAt = () => new Date(Date.now() + 3_600_000).toISOString();

function mockApi(changeResponse: { status: number; body: unknown }) {
  const fetchMock = vi.fn((...args: [url: string, init?: RequestInit]) => {
    const url = args[0];
    if (url.endsWith('/auth/me')) {
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ username: 'zaknaceur' }) });
    }
    return Promise.resolve({
      ok: changeResponse.status < 400,
      status: changeResponse.status,
      json: async () => changeResponse.body
    });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

async function fill(current: string, next: string, confirm: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Password attuale'), current);
  await user.type(screen.getByLabelText('Nuova password'), next);
  await user.type(screen.getByLabelText('Conferma nuova password'), confirm);
  await user.click(screen.getByRole('button', { name: 'Aggiorna password' }));
}

afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

describe('validatePasswordChange', () => {
  it.each([
    ['', 'a-long-new-password', 'a-long-new-password', 'Inserisci la password attuale.'],
    ['old', 'short', 'short', 'La nuova password deve avere almeno 12 caratteri.'],
    ['same-password-12', 'same-password-12', 'same-password-12', 'La nuova password deve essere diversa da quella attuale.'],
    ['old', 'a-long-new-password', 'another-long-one', 'La conferma non coincide con la nuova password.'],
    ['old', 'a-long-new-password', 'a-long-new-password', '']
  ])('(%s, %s, %s) -> %s', (current, next, confirm, expected) => {
    expect(validatePasswordChange(current, next, confirm)).toBe(expected);
  });
});

describe('AccountPage', () => {
  it('sends the change and keeps the fresh session token', async () => {
    saveSession({ accessToken: 'old-token', expiresAt: expiresAt() });
    const fetchMock = mockApi({ status: 200, body: { accessToken: 'new-token', expiresAt: expiresAt() } });
    render(<AccountPage />);

    await fill('old-password-1', 'brand-new-password', 'brand-new-password');

    await waitFor(() => expect(getAccessToken()).toBe('new-token'));
    const call = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/auth/change-password'))!;
    expect(JSON.parse((call[1] as RequestInit).body as string)).toEqual({
      currentPassword: 'old-password-1',
      newPassword: 'brand-new-password'
    });
    expect(screen.getByLabelText('Password attuale')).toHaveValue('');
  });

  it('blocks a mismatching confirmation without calling the API', async () => {
    const fetchMock = mockApi({ status: 200, body: {} });
    render(<AccountPage />);

    await fill('old-password-1', 'brand-new-password', 'something-different');

    expect(await screen.findByRole('alert')).toHaveTextContent('La conferma non coincide');
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/auth/change-password'))).toBe(false);
  });

  it('shows the server message when the current password is wrong', async () => {
    saveSession({ accessToken: 'old-token', expiresAt: expiresAt() });
    mockApi({ status: 400, body: { errors: { CurrentPassword: ['La password attuale non è corretta.'] } } });
    render(<AccountPage />);

    await fill('wrong-password-1', 'brand-new-password', 'brand-new-password');

    expect(await screen.findByRole('alert')).toHaveTextContent('La password attuale non è corretta.');
    expect(getAccessToken()).toBe('old-token');
  });
});
