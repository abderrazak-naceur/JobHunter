import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import PortfolioPage from './PortfolioPage';
import type { PortfolioContent } from './content';
import { sampleContent as portfolio } from '../test/fixtures';
// Embla measures real layout and uses IntersectionObserver, which jsdom does not provide.
vi.mock('embla-carousel-react', () => ({ default: () => [vi.fn(), undefined] }));


const full: PortfolioContent = {
  ...portfolio,
  email: 'me@example.com',
  cvUrl: '/cv.pdf',
  experiences: [
    { company: 'Acme', role: 'Senior Developer', period: '2020 – oggi', description: 'API e cloud.', highlights: ['Ridotto i tempi di rilascio'] }
  ]
};

describe('PortfolioPage', () => {
  it('renders the name as the only h1', () => {
    render(<PortfolioPage content={full} />);

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(full.name);
  });

  it('offers navigation only to the sections that exist', () => {
    render(<PortfolioPage content={{ ...full, projects: [], links: [] }} />);

    const nav = screen.getByRole('navigation', { name: 'Sezioni' });
    expect(within(nav).getAllByRole('link').map(link => link.textContent)).toEqual(['Competenze', 'Esperienza', 'Contatti']);
    expect(within(nav).getByRole('link', { name: 'Esperienza' })).toHaveAttribute('href', '#esperienza');
  });

  it('opens and closes the mobile menu', async () => {
    render(<PortfolioPage content={full} />);

    const button = screen.getByRole('button', { name: /Menu/ });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('navigation', { name: 'Sezioni (menu)' })).not.toBeInTheDocument();

    await userEvent.click(button);
    const menu = screen.getByRole('navigation', { name: 'Sezioni (menu)' });
    expect(button).toHaveAttribute('aria-expanded', 'true');

    await userEvent.click(within(menu).getByRole('link', { name: 'Competenze' }));
    expect(screen.queryByRole('navigation', { name: 'Sezioni (menu)' })).not.toBeInTheDocument();
  });

  it('has no navigation or menu button when there is nothing to navigate to', () => {
    render(<PortfolioPage content={{ ...full, skillGroups: [], experiences: [], projects: [], links: [], email: null }} />);

    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Menu/ })).not.toBeInTheDocument();
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

  it('keeps decorative copies of the skills out of the accessibility tree', () => {
    render(<PortfolioPage content={full} />);

    // Floating chips and the teaser repeat skills that are already listed as real text below.
    const decorative = screen.getAllByText('ASP.NET Core').filter(element => element.closest('[aria-hidden="true"]'));
    expect(decorative.length).toBeGreaterThan(0);
    expect(within(screen.getByRole('region', { name: 'Competenze' })).getAllByText('ASP.NET Core')).toHaveLength(1);
  });

  it('shows the profile photo, and falls back to the initials if it cannot be loaded', () => {
    render(<PortfolioPage content={{ ...full, photoUrl: 'https://example.com/me.jpg' }} />);

    const photo = screen.getByRole('img', { name: `Foto di ${full.name}` });
    expect(photo).toHaveAttribute('src', 'https://example.com/me.jpg');

    fireEvent.error(photo);

    expect(screen.queryByRole('img', { name: /Foto di/ })).not.toBeInTheDocument();
  });

  it('loads a photo uploaded to the API from the API address', () => {
    render(<PortfolioPage content={{ ...full, photoUrl: '/api/v1/portfolio/photo?v=1' }} />);

    expect(screen.getByRole('img', { name: `Foto di ${full.name}` }).getAttribute('src')).toMatch(/^https?:\/\/.+\/api\/v1\/portfolio\/photo\?v=1$/);
  });

  it('shows no photo element when none is set', () => {
    render(<PortfolioPage content={{ ...full, photoUrl: null }} />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('features the first project and lists the others as cards with a link', () => {
    render(
      <PortfolioPage
        content={{
          ...full,
          projects: [
            { name: 'Alpha', description: 'First', technologies: ['React'], url: 'https://example.com/alpha' },
            { name: 'Beta', description: 'Second', technologies: ['C#', 'SQL'], url: 'https://example.com/beta' },
            { name: 'Gamma', description: 'Third', technologies: [], url: null }
          ]
        }}
      />
    );

    const projects = screen.getByRole('region', { name: 'Progetti' });
    expect(within(projects).getByRole('heading', { level: 3, name: 'Alpha' })).toBeInTheDocument();
    expect(within(projects).getByRole('link', { name: /Vedi il progetto/ })).toHaveAttribute('href', 'https://example.com/alpha');
    expect(within(projects).getByRole('link', { name: 'Vedi Beta' })).toHaveAttribute('target', '_blank');
    expect(within(projects).queryByRole('link', { name: 'Vedi Gamma' })).not.toBeInTheDocument();
    expect(within(projects).getByText('C# · SQL')).toBeInTheDocument();
  });

  it('links the hero teasers to the matching sections', () => {
    render(<PortfolioPage content={full} />);

    const hero = screen.getByRole('region', { name: 'Presentazione' });
    expect(within(hero).getByRole('link', { name: /^Competenze/ })).toHaveAttribute('href', '#competenze');
    expect(within(hero).getByRole('link', { name: /^Progetti/ })).toHaveAttribute('href', '#progetti');
  });

  it('falls back to experience, then contacts, for the second teaser', () => {
    const { rerender } = render(<PortfolioPage content={{ ...full, projects: [] }} />);
    expect(within(screen.getByRole('region', { name: 'Presentazione' })).getByRole('link', { name: /^Esperienza/ })).toHaveAttribute('href', '#esperienza');

    rerender(<PortfolioPage content={{ ...full, projects: [], experiences: [] }} />);
    expect(within(screen.getByRole('region', { name: 'Presentazione' })).getByRole('link', { name: /^Contatti/ })).toHaveAttribute('href', '#contatti');
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
