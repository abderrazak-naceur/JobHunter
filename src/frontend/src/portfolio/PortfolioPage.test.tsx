import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PortfolioPage from './PortfolioPage';
import { portfolio, type PortfolioContent } from './content';

const full: PortfolioContent = {
  ...portfolio,
  email: 'me@example.com',
  cvUrl: '/cv.pdf',
  experiences: [
    { company: 'Acme', role: 'Senior Developer', period: '2020 – oggi', description: 'API e cloud.', highlights: ['Ridotto i tempi di rilascio'] }
  ]
};

describe('PortfolioPage', () => {
  it('renders the name as the only h1 and has no navigation menu', () => {
    render(<PortfolioPage content={full} />);

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(full.name);
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('exposes landmarks and a skip link', () => {
    render(<PortfolioPage content={full} />);

    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Vai al contenuto' })).toHaveAttribute('href', '#contenuto');
  });

  it('shows skills grouped by area', () => {
    render(<PortfolioPage content={full} />);

    const skills = screen.getByRole('region', { name: 'Competenze' });
    expect(within(skills).getByRole('heading', { name: 'Backend' })).toBeInTheDocument();
    expect(within(skills).getByText('ASP.NET Core')).toBeInTheDocument();
  });

  it('shows experience, mailto and CV download when provided', () => {
    render(<PortfolioPage content={full} />);

    expect(screen.getByRole('region', { name: 'Esperienza' })).toHaveTextContent('Senior Developer · Acme');
    expect(screen.getByRole('link', { name: /Scrivimi/ })).toHaveAttribute('href', 'mailto:me@example.com');
    expect(screen.getByRole('link', { name: /Scarica il CV/ })).toHaveAttribute('href', '/cv.pdf');
  });

  it('hides empty sections and missing contact actions', () => {
    render(<PortfolioPage content={{ ...full, email: undefined, cvUrl: undefined, experiences: [], projects: [], links: [] }} />);

    expect(screen.queryByRole('region', { name: 'Esperienza' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Progetti' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Contatti' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Scrivimi/ })).not.toBeInTheDocument();
  });

  it('shows the highlighted numbers as a list', () => {
    render(<PortfolioPage content={{ ...full, stats: [{ value: '10+', label: 'Anni di esperienza' }, { value: '25', label: 'Progetti' }] }} />);

    const list = screen.getByRole('list', { name: 'In numeri' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    expect(within(list).getByText('10+')).toBeInTheDocument();
    expect(within(list).getByText('Progetti')).toBeInTheDocument();
  });

  it('works with content that has no numbers at all', () => {
    render(<PortfolioPage content={{ ...full, stats: undefined }} />);

    expect(screen.queryByRole('list', { name: 'In numeri' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('keeps decorative effects out of the accessibility tree', () => {
    const { container } = render(<PortfolioPage content={full} />);

    // The skills strip and the monogram repeat information that is already available as text.
    expect(container.querySelector('.marquee')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getAllByText('ASP.NET Core').length).toBeGreaterThan(1);
    expect(within(screen.getByRole('region', { name: 'Competenze' })).getAllByText('ASP.NET Core')).toHaveLength(1);
  });

  it('shows the same text for every visitor even when scroll animations are unavailable', () => {
    render(<PortfolioPage content={full} />);

    document.querySelectorAll('.reveal').forEach(element => expect(element).toHaveClass('is-visible'));
  });

  it('opens external links safely in a new tab', () => {
    render(<PortfolioPage content={full} />);

    const github = within(screen.getByRole('region', { name: 'Contatti' })).getByRole('link', { name: 'GitHub' });
    expect(github).toHaveAttribute('target', '_blank');
    expect(github.getAttribute('rel')).toContain('noopener');
  });
});
