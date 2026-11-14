import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PortfolioRoute from './PortfolioRoute';
import { portfolio } from './content';
import { fetchPortfolio } from '../services/portfolioApi';

vi.mock('../services/portfolioApi', () => ({ fetchPortfolio: vi.fn(), savePortfolio: vi.fn() }));
// Embla measures real layout and uses IntersectionObserver, which jsdom does not provide.
vi.mock('embla-carousel-react', () => ({ default: () => [vi.fn(), undefined] }));

const fetchMock = vi.mocked(fetchPortfolio);

describe('PortfolioRoute', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('shows the portfolio skeleton, not placeholder data, while waiting for the API', () => {
    fetchMock.mockReturnValue(new Promise(() => {}));
    render(<PortfolioRoute />);

    expect(screen.getByRole('status', { name: 'Preparazione del portfolio' })).toBeInTheDocument();
    expect(screen.queryByText('Caricamento...')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
  });

  it('renders the published content and sets the page title', async () => {
    fetchMock.mockResolvedValue({ ...portfolio, name: 'Mario Rossi', role: 'Backend Engineer' });
    render(<PortfolioRoute />);

    expect(await screen.findByRole('heading', { level: 1, name: 'Mario Rossi' })).toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe('Mario Rossi — Backend Engineer'));
  });

  it('falls back to the bundled content when the API fails', async () => {
    fetchMock.mockRejectedValue(new Error('API down'));
    render(<PortfolioRoute />);

    expect(await screen.findByRole('heading', { level: 1, name: portfolio.name })).toBeInTheDocument();
  });
});
