import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LoadingScreen from './LoadingScreen';

describe('LoadingScreen', () => {
  it('renders the approved circular ZAK badge for the public portfolio', () => {
    render(<LoadingScreen />);

    expect(screen.getByRole('status', { name: 'Preparazione del portfolio' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status')).toHaveAttribute('data-variant', 'portfolio');
    expect(screen.getByTestId('loading-spinner').textContent).toContain('ZAK');
    expect(screen.getByText('DEVELOPER PORTFOLIO')).toBeInTheDocument();
    expect(screen.getByText('Caricamento…')).toBeInTheDocument();
    expect(screen.getByTestId('loading-dots').querySelectorAll('span')).toHaveLength(1);
    expect(screen.queryByTestId('loading-profile-photo')).not.toBeInTheDocument();
  });

  it('renders the branded circular badge for the admin area', () => {
    render(<LoadingScreen variant="admin" />);

    expect(screen.getByRole('status', { name: 'Preparazione dell’area amministrativa' })).toHaveAttribute('data-variant', 'admin');
    expect(screen.getByTestId('loading-spinner').textContent).toContain('ZAK');
    expect(screen.getByText('DEVELOPER PORTFOLIO')).toBeInTheDocument();
    expect(screen.getByText('Preparazione area riservata…')).toBeInTheDocument();
  });
});
