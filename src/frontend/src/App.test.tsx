import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { getAccessToken, saveSession } from './auth/session';
import App from './App';

// Each area is tested on its own; here only the shell and the navigation are checked.
vi.mock('./admin/Dashboard', () => ({ default: () => <p>Pagina panoramica</p> }));
vi.mock('./admin/applications/ApplicationsPage', () => ({ default: () => <p>Pagina candidature</p> }));
vi.mock('./admin/portfolio/PortfolioAdmin', () => ({ default: () => <p>Pagina portfolio</p> }));
vi.mock('./CompanyRadar', () => ({ default: () => <p>Pagina company radar</p> }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() }, Toaster: () => null }));

describe('App (private area)', () => {
  it('opens on the overview', () => {
    render(<App />);

    expect(screen.getByText('Pagina panoramica')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Panoramica' })).toHaveAttribute('aria-current', 'page');
  });

  it.each([
    ['Candidature', 'Pagina candidature'],
    ['Portfolio', 'Pagina portfolio'],
    ['Company Radar', 'Pagina company radar'],
    ['Panoramica', 'Pagina panoramica']
  ])('opens %s from the menu', async (label, expected) => {
    render(<App />);

    await userEvent.click(screen.getByRole('button', { name: label }));

    expect(screen.getByText(expected)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: label })).toHaveAttribute('aria-current', 'page');
    expect(document.querySelector('.crumb')).toHaveTextContent(`Gestione / ${label}`);
  });

  it('links to the public site and signs out', async () => {
    saveSession({ accessToken: 'abc', expiresAt: new Date(Date.now() + 3_600_000).toISOString() });
    render(<App />);

    expect(screen.getByRole('link', { name: /Vedi il sito/ })).toHaveAttribute('href', '/');
    await userEvent.click(screen.getByRole('button', { name: /Esci/ }));

    expect(getAccessToken()).toBeNull();
  });

  it('has a skip link to the content and names the main area', () => {
    render(<App />);

    expect(screen.getByRole('link', { name: 'Vai al contenuto' })).toHaveAttribute('href', '#contenuto');
    expect(screen.getByRole('main', { name: 'Panoramica' })).toHaveAttribute('id', 'contenuto');
  });

  it('updates the page title and moves the focus to the content when the area changes', async () => {
    render(<App />);
    expect(document.title).toBe('Panoramica · Portfolio - area privata');
    expect(screen.getByRole('main')).not.toHaveFocus(); // not stolen on first load

    await userEvent.click(screen.getByRole('button', { name: 'Candidature' }));

    expect(document.title).toBe('Candidature · Portfolio - area privata');
    expect(screen.getByRole('main', { name: 'Candidature' })).toHaveFocus();
  });

  it('keeps every menu button named when the labels are hidden on small screens', () => {
    render(<App />);

    const menu = screen.getByRole('navigation', { name: 'Aree di gestione' });
    for (const button of menu.querySelectorAll('button')) {
      expect(button.getAttribute('aria-label')).toBe(button.textContent);
    }
    expect(screen.getByRole('button', { name: 'Esci' })).toHaveAttribute('aria-label', 'Esci');
    expect(screen.getByRole('link', { name: /nuova scheda/ })).toHaveAttribute('href', '/');
  });});
