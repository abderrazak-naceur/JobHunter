import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applicationApi, type ApplicationAnalytics } from '@/services/applicationApi';
import AnalyticsPanel, { percent } from './AnalyticsPanel';

vi.mock('@/services/applicationApi', async importOriginal => ({
  ...(await importOriginal<typeof import('@/services/applicationApi')>()),
  applicationApi: { analytics: vi.fn() }
}));

const api = vi.mocked(applicationApi);

const data: ApplicationAnalytics = {
  total: 12,
  applied: 8,
  responded: 4,
  responseRatePercent: 50,
  weekly: [
    { weekStart: '2026-11-02', count: 3 },
    { weekStart: '2026-11-09', count: 0 }
  ],
  funnel: [
    { stage: 'Applied', count: 8 },
    { stage: 'Screening', count: 4 },
    { stage: 'Interview', count: 2 },
    { stage: 'Offer', count: 1 }
  ],
  conversions: [
    { from: 'Applied', to: 'Screening', fromCount: 8, toCount: 4 },
    { from: 'Screening', to: 'Interview', fromCount: 4, toCount: 2 },
    { from: 'Interview', to: 'Offer', fromCount: 2, toCount: 1 }
  ],
  timeInStage: [
    { stage: 'Saved', averageDays: null, samples: 0 },
    { stage: 'Applied', averageDays: 6.5, samples: 8 },
    { stage: 'Screening', averageDays: 3, samples: 4 },
    { stage: 'Interview', averageDays: null, samples: 0 }
  ],
  bySource: [
    { source: 'LinkedIn', applications: 5, interviews: 2, offers: 1 },
    { source: 'Non indicata', applications: 3, interviews: 0, offers: 0 }
  ]
};

describe('percent', () => {
  it('rounds to a whole number and avoids dividing by zero', () => {
    expect(percent(1, 3)).toBe(33);
    expect(percent(2, 3)).toBe(67);
    expect(percent(0, 0)).toBeNull();
  });
});

describe('AnalyticsPanel', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.analytics.mockResolvedValue(data);
  });

  it('shows the indicators', async () => {
    render(<AnalyticsPanel />);

    const indicators = await screen.findByRole('list', { name: 'Indicatori' });
    expect(within(indicators).getByText('Candidature inviate').closest('li')).toHaveTextContent('8');
    expect(within(indicators).getByText('Tasso di risposta').closest('li')).toHaveTextContent('50%');
    expect(within(indicators).getByText(/4 su 8 hanno risposto/)).toBeInTheDocument();
    expect(within(indicators).getByText('Ultime 12 settimane').closest('li')).toHaveTextContent('3');
  });

  it('shows the weekly counts in text for screen readers', async () => {
    render(<AnalyticsPanel />);

    const weekly = await screen.findByRole('list', { name: 'Candidature a settimana' });
    expect(within(weekly).getByText('Settimana dal 02/11/2026: 3')).toBeInTheDocument();
    expect(within(weekly).getByText('Settimana dal 09/11/2026: 0')).toBeInTheDocument();
  });

  it('shows how many applications moved on from each stage', async () => {
    render(<AnalyticsPanel />);

    const funnel = await screen.findByRole('list', { name: 'Imbuto' });
    const items = within(funnel).getAllByRole('listitem');
    expect(items).toHaveLength(4);
    expect(items[0]).toHaveTextContent('Candidata');
    expect(items[0]).not.toHaveTextContent('dalla fase precedente');
    expect(items[1]).toHaveTextContent('50% dalla fase precedente');
    expect(items[3]).toHaveTextContent('50% dalla fase precedente');
  });

  it('shows the time in each stage, with a dash when there is no data', async () => {
    render(<AnalyticsPanel />);

    expect((await screen.findByText('6.5')).closest('li')).toHaveTextContent('Candidata');
    expect(screen.getByText('Salvata').closest('li')).toHaveTextContent('—');
  });

  it('ranks the sources', async () => {
    render(<AnalyticsPanel />);

    const row = (await screen.findByRole('rowheader', { name: 'LinkedIn' })).closest('tr')!;
    expect(within(row).getAllByRole('cell').map(cell => cell.textContent)).toEqual(['5', '2', '1']);
  });

  it('invites the owner to start when nothing was sent yet', async () => {
    api.analytics.mockResolvedValue({ ...data, applied: 0, total: 2 });
    render(<AnalyticsPanel />);

    expect(await screen.findByText(/Compaiono appena segni la prima candidatura/)).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Indicatori' })).toBeNull();
  });

  it('shows an error when the numbers cannot be loaded', async () => {
    api.analytics.mockRejectedValue(new Error('API non raggiungibile'));
    render(<AnalyticsPanel />);

    expect(await screen.findByRole('alert')).toHaveTextContent('API non raggiungibile');
  });
});
