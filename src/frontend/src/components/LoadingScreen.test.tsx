import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LoadingScreen from './LoadingScreen';

describe('LoadingScreen', () => {
  it('renders an animated portfolio loading indicator', () => {
    render(<LoadingScreen />);

    expect(screen.getByRole('status', { name: 'Preparazione del portfolio' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status')).toHaveAttribute('data-variant', 'portfolio');
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    expect(screen.getByTestId('loading-progress')).toBeInTheDocument();
    expect(screen.getByText('Sto preparando il tuo portfolio…')).toBeInTheDocument();
  });

  it('renders the same animated indicator for the admin area', () => {
    render(<LoadingScreen variant="admin" />);

    expect(screen.getByRole('status', { name: 'Preparazione dell’area amministrativa' })).toHaveAttribute('data-variant', 'admin');
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    expect(screen.getByText('Sto aprendo la tua area riservata…')).toBeInTheDocument();
  });
});
