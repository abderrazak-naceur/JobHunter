import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LoadingScreen from './LoadingScreen';

describe('LoadingScreen', () => {
  it('renders an accessible public portfolio skeleton', () => {
    render(<LoadingScreen />);

    expect(screen.getByRole('status', { name: 'Preparazione del portfolio' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status')).toHaveAttribute('data-variant', 'portfolio');
  });

  it('renders the dashboard skeleton for the admin area', () => {
    render(<LoadingScreen variant="admin" />);

    expect(screen.getByRole('status', { name: 'Preparazione dell’area amministrativa' })).toHaveAttribute('data-variant', 'admin');
  });
});
