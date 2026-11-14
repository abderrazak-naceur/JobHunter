import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import AdminGate from './AdminGate';
import { saveSession, signOut } from './session';

function signedIn() {
  saveSession({ accessToken: 'abc', expiresAt: new Date(Date.now() + 3_600_000).toISOString() });
}

function renderGate() {
  return render(<AdminGate><p>Contenuto riservato</p></AdminGate>);
}

async function fillAndSubmit(password = 'secret') {
  await userEvent.type(screen.getByLabelText('Username'), 'admin');
  await userEvent.type(screen.getByLabelText('Password'), password);
  await userEvent.click(screen.getByRole('button', { name: 'Accedi' }));
}

describe('AdminGate', () => {
  it('shows the login form instead of the protected content when signed out', () => {
    renderGate();

    expect(screen.getByRole('heading', { name: 'Area privata' })).toBeInTheDocument();
    expect(screen.queryByText('Contenuto riservato')).not.toBeInTheDocument();
  });

  it('shows the protected content when a valid session exists', () => {
    signedIn();
    renderGate();

    expect(screen.getByText('Contenuto riservato')).toBeInTheDocument();
  });

  it('asks the browser not to index the private area', () => {
    renderGate();

    expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  });

  it('reveals the content after a successful login', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({ accessToken: 'jwt', expiresAt: new Date(Date.now() + 3_600_000).toISOString() })
    }));
    renderGate();

    await fillAndSubmit();

    expect(await screen.findByText('Contenuto riservato')).toBeInTheDocument();
  });

  it('shows an error and stays on the login form when credentials are wrong', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    renderGate();

    await fillAndSubmit('wrong');

    expect(await screen.findByRole('alert')).toHaveTextContent('Username o password non corretti.');
    expect(screen.queryByText('Contenuto riservato')).not.toBeInTheDocument();
  });

  it('goes back to the login form when the session ends', async () => {
    signedIn();
    renderGate();
    expect(screen.getByText('Contenuto riservato')).toBeInTheDocument();

    act(() => signOut());

    await waitFor(() => expect(screen.queryByText('Contenuto riservato')).not.toBeInTheDocument());
    expect(screen.getByRole('heading', { name: 'Area privata' })).toBeInTheDocument();
  });
});
