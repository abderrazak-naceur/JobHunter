import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PortfolioRoute from './PortfolioRoute';
import { portfolio } from './content';
import { fetchPortfolio } from '../services/portfolioApi';

vi.mock('../services/portfolioApi', () => ({ fetchPortfolio: vi.fn(), savePortfolio: vi.fn() }));

const fetchMock = vi.mocked(fetchPortfolio);

describe('PortfolioRoute', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('shows a neutral loading message, not placeholder data, while waiting', () => {
    fetchMock.mockReturnValue(new Promise(() => {}));
    render(<PortfolioRoute />);

    expect(screen.getByRole('status')).toHaveTextContent('Caricamento');
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
