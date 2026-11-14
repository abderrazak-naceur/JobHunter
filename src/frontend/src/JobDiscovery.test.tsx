import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applicationApi } from '@/services/applicationApi';
import { jobDiscoveryApi, type JobListing, type JobSearchRun, type JobSource, type SearchProfile } from '@/services/jobDiscoveryApi';
import JobDiscovery from './JobDiscovery';

vi.mock('@/services/jobDiscoveryApi', () => ({
  jobDiscoveryApi: {
    profiles: vi.fn(),
    createProfile: vi.fn(),
    updateProfile: vi.fn(),
    sources: vi.fn(),
    createSource: vi.fn(),
    updateSource: vi.fn(),
    deleteSource: vi.fn(),
    search: vi.fn(),
    jobs: vi.fn(),
    runs: vi.fn()
  }
}));

vi.mock('@/services/applicationApi', () => ({
  applicationApi: { create: vi.fn() }
}));

const discovery = vi.mocked(jobDiscoveryApi);
const applications = vi.mocked(applicationApi);

const profile: SearchProfile = {
  id: 'profile-1',
  name: 'Ricerca principale',
  roleKeywords: 'Senior .NET Developer, Technical Lead',
  skillKeywords: 'C#, .NET, React',
  location: 'Milano',
  minimumAnnualSalary: 50000,
  workMode: 'RemoteOrHybrid',
  minimumMatchScore: 25,
  isActive: true,
  createdAt: '2026-11-14T07:00:00Z',
  updatedAt: '2026-11-14T07:00:00Z'
};

const source: JobSource = {
  id: 'source-1',
  companyName: 'Example Tech',
  provider: 'lever',
  boardIdentifier: 'example-tech',
  careersUrl: 'https://jobs.lever.co/example-tech',
  isEnabled: true,
  lastCheckedAt: null,
  lastSuccessfulAt: null,
  lastError: '',
  createdAt: '2026-11-14T07:00:00Z',
  updatedAt: '2026-11-14T07:00:00Z'
};

const listing: JobListing = {
  id: 'job-1',
  externalId: 'lever-job-1',
  title: 'Senior .NET Developer',
  companyName: 'Example Tech',
  provider: 'lever',
  location: 'Milano',
  workMode: 'Hybrid',
  salaryText: 'RAL 55.000 €',
  description: 'C#, .NET 10, ASP.NET Core and React.',
  sourceUrl: 'https://jobs.lever.co/example-tech/lever-job-1',
  applyUrl: 'https://jobs.lever.co/example-tech/lever-job-1/apply',
  publishedAt: '2026-11-12T09:00:00Z',
  sourceUpdatedAt: '2026-11-13T09:00:00Z',
  firstSeenAt: '2026-11-14T06:00:00Z',
  lastSeenAt: '2026-11-14T06:30:00Z',
  matchScore: 92,
  matchedKeywords: ['Senior .NET Developer', 'C#', '.NET', 'React']
};

const run: JobSearchRun = {
  id: 'run-1',
  startedAt: '2026-11-14T06:00:00Z',
  completedAt: '2026-11-14T06:01:00Z',
  status: 'Completed',
  foundCount: 1,
  newCount: 1,
  updatedCount: 0,
  errorCount: 0,
  summary: '1 fonte controllata; 1 nuova offerta, 0 aggiornate, 0 errori.'
};

describe('JobDiscovery', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    discovery.profiles.mockResolvedValue([profile]);
    discovery.sources.mockResolvedValue([source]);
    discovery.runs.mockResolvedValue({ items: [run], page: 1, pageSize: 10, totalCount: 1 });
    discovery.jobs.mockResolvedValue({ items: [listing], page: 1, pageSize: 50, totalCount: 1 });
    applications.create.mockResolvedValue({} as never);
  });

  it('shows the source publication date and opens the original application link', async () => {
    render(<JobDiscovery />);

    expect(await screen.findByRole('heading', { name: 'Senior .NET Developer' })).toBeInTheDocument();
    const applyLink = screen.getByRole('link', { name: /Candidati sul sito/ });
    expect(applyLink).toHaveAttribute('href', listing.applyUrl);
    expect(applyLink).toHaveAttribute('target', '_blank');
    expect(screen.getByText(/Pubblicata:/)).toBeInTheDocument();
    expect(screen.getByText(/Aggiornata:/)).toBeInTheDocument();
    expect(screen.getByText(/Rilevata da JobHunter:/)).toBeInTheDocument();
    expect(screen.getByText('92% compatibilità')).toBeInTheDocument();
  });

  it('allows starting an automatic search even when no company board is configured', async () => {
    const user = userEvent.setup();
    discovery.sources.mockResolvedValue([]);
    discovery.search.mockResolvedValue({
      ...run,
      summary: '1 fonte automatica controllata; 3 offerte raccolte.'
    });
    render(<JobDiscovery />);

    const searchButton = await screen.findByRole('button', { name: /Cerca ora/ });
    expect(searchButton).toBeEnabled();

    await user.click(searchButton);

    await waitFor(() => expect(discovery.search).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('status')).toHaveTextContent('1 fonte automatica controllata');
  });

  it('allows selecting Lever EU when configuring a source', async () => {
    const user = userEvent.setup();
    render(<JobDiscovery />);

    await user.click(await screen.findByRole('button', { name: /Aggiungi fonte/ }));

    expect(screen.getByRole('option', { name: 'Lever EU' })).toBeInTheDocument();
  });

  it('saves an offer into the existing application pipeline', async () => {
    const user = userEvent.setup();
    render(<JobDiscovery />);

    await user.click(await screen.findByRole('button', { name: /Salva in Candidature/ }));

    await waitFor(() => expect(applications.create).toHaveBeenCalledWith(expect.objectContaining({
      company: 'Example Tech',
      role: 'Senior .NET Developer',
      status: 'Saved',
      source: 'lever',
      url: listing.sourceUrl,
      location: 'Milano',
      salaryRange: 'RAL 55.000 €'
    })));
    expect(await screen.findByRole('status')).toHaveTextContent('Offerta aggiunta alle Candidature.');
  });

  it('shows clearly when a provider does not report the publication date', async () => {
    discovery.jobs.mockResolvedValue({
      items: [{ ...listing, publishedAt: null }],
      page: 1,
      pageSize: 50,
      totalCount: 1
    });
    render(<JobDiscovery />);

    expect(await screen.findByText('Pubblicata: Data non indicata dalla fonte')).toBeInTheDocument();
  });
});
