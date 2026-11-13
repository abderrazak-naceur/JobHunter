import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchPortfolio } from '../services/portfolioApi';
import LoadingScreen from './LoadingScreen';

vi.mock('../services/portfolioApi', () => ({
  fetchPortfolio: vi.fn()
}));

const fetchPortfolioMock = vi.mocked(fetchPortfolio);

describe('LoadingScreen', () => {
  beforeEach(() => {
    fetchPortfolioMock.mockReset();
    fetchPortfolioMock.mockResolvedValue({ photoUrl: null } as never);
  });

  it('renders a segmented animated loading pictogram', () => {
    render(<LoadingScreen />);

    expect(screen.getByRole('status', { name: 'Preparazione del portfolio' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status')).toHaveAttribute('data-variant', 'portfolio');
    expect(screen.getByTestId('loading-spinner').querySelectorAll('span')).toHaveLength(12);
    expect(screen.getByText('Sto preparando il tuo portfolio…')).toBeInTheDocument();
    expect(screen.queryByText('ZN')).not.toBeInTheDocument();
    expect(screen.queryByTestId('loading-progress')).not.toBeInTheDocument();
  });

  it('uses the published profile photo in the center of the spinner', async () => {
    fetchPortfolioMock.mockResolvedValue({
      photoUrl: '/api/v1/portfolio/photo?v=123'
    } as never);

    render(<LoadingScreen />);

    const photo = await screen.findByTestId('loading-profile-photo');
    expect(photo).toHaveAttribute('src', expect.stringContaining('/api/v1/portfolio/photo?v=123'));
    expect(screen.queryByText('ZN')).not.toBeInTheDocument();
  });

  it('renders the same animated pictogram for the admin area', () => {
    render(<LoadingScreen variant="admin" />);

    expect(screen.getByRole('status', { name: 'Preparazione dell’area amministrativa' })).toHaveAttribute('data-variant', 'admin');
    expect(screen.getByTestId('loading-spinner').querySelectorAll('span')).toHaveLength(12);
    expect(screen.getByText('Sto aprendo la tua area riservata…')).toBeInTheDocument();
  });
});
