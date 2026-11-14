import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LoadingScreen from './LoadingScreen';

describe('LoadingScreen', () => {
  it('renders the animated ZAK brand loader for the public portfolio', () => {
    render(<LoadingScreen />);

    expect(screen.getByRole('status', { name: 'Preparazione del portfolio' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status')).toHaveAttribute('data-variant', 'portfolio');
    expect(screen.getByTestId('loading-spinner').textContent).toContain('ZAK');
    expect(screen.getByText('Preparazione in corso…')).toBeInTheDocument();
    expect(screen.getByText('Sto caricando il tuo portfolio')).toBeInTheDocument();
    expect(screen.getByTestId('loading-dots').querySelectorAll('span')).toHaveLength(3);
    expect(screen.queryByTestId('loading-profile-photo')).not.toBeInTheDocument();
  });

  it('renders the branded loader for the admin area with the correct message', () => {
    render(<LoadingScreen variant="admin" />);

    expect(screen.getByRole('status', { name: 'Preparazione dell’area amministrativa' })).toHaveAttribute('data-variant', 'admin');
    expect(screen.getByTestId('loading-spinner').textContent).toContain('ZAK');
    expect(screen.getByText('Sto preparando la tua area riservata')).toBeInTheDocument();
  });
});
