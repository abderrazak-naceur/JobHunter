import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BlogIndexPage } from './BlogPage';

vi.mock('../services/blogApi', () => ({
  blogApi: { list: vi.fn().mockResolvedValue({ items: [], page: 1, pageSize: 9, total: 0 }) }
}));

describe('BlogIndexPage', () => {
  it('renders the Premium Tech blog shell and empty state', async () => {
    render(<BlogIndexPage />);

    expect(screen.getByRole('heading', { name: /appunti dal mondo tech/i })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /navigazione principale/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /cerca articoli/i })).toBeInTheDocument();
    expect(await screen.findByText(/i primi articoli stanno arrivando/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /portfolio personale/i })).toBeInTheDocument();
  });
});
