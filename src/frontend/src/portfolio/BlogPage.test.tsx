import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BlogIndexPage } from './BlogPage';

vi.mock('../services/blogApi', () => ({
  blogApi: { list: vi.fn().mockResolvedValue({ items: [], page: 1, pageSize: 9, total: 0 }) }
}));

describe('BlogIndexPage', () => {
  it('shows the public blog introduction and empty state', async () => {
    render(<BlogIndexPage />);
    expect(screen.getByRole('heading', { name: /appunti dal mondo tech/i })).toBeInTheDocument();
    expect(await screen.findByText(/i primi articoli arriveranno presto/i)).toBeInTheDocument();
  });
});
