import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applicationApi, type ApplicationSummary } from '@/services/applicationApi';
import Dashboard from './Dashboard';

vi.mock('@/services/applicationApi', async importOriginal => ({
  ...(await importOriginal<typeof import('@/services/applicationApi')>()),
  applicationApi: { summary: vi.fn(), analytics: vi.fn() }
}));

const api = vi.mocked(applicationApi);

const summary: ApplicationSummary = {
  total: 9,
  byStatus: { Saved: 2, Applied: 3, Screening: 1, Interview: 2, Offer: 1, Rejected: 0, Withdrawn: 0 },
  upcoming: [
    { id: 'a', company: 'Acme', role: 'Dev', nextStep: 'Chiamare HR', nextStepOn: '2000-01-01' },
    { id: 'b', company: 'Beta', role: 'Lead', nextStep: 'Test tecnico', nextStepOn: '2999-12-31' }
  ]
};

describe('Dashboard', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.summary.mockResolvedValue(summary);
    api.analytics.mockResolvedValue({ total: 0, applied: 0, responded: 0, responseRatePercent: null, weekly: [], funnel: [], conversions: [], timeInStage: [], bySource: [] });
  });

  it('shows the totals, counting applied, screening and interview as "in progress"', async () => {
    render(<Dashboard onNavigate={() => {}} />);

    const numbers = await screen.findByRole('list', { name: 'Numeri' });
    expect(within(numbers).getByText('9')).toBeInTheDocument(); // total
    expect(within(numbers).getByText('6')).toBeInTheDocument(); // 3 + 1 + 2
    expect(within(numbers).getByText('Colloqui').closest('li')).toHaveTextContent('2');
    expect(within(numbers).getByText('Offerte').closest('li')).toHaveTextContent('1');
  });

  it('lists the next steps and flags the late ones', async () => {
    render(<Dashboard onNavigate={() => {}} />);

    expect(await screen.findByText('Chiamare HR')).toBeInTheDocument();
    expect(screen.getByText(/01\/01\/2000 · in ritardo/)).toBeInTheDocument();
    expect(screen.getByText('31/12/2999')).toBeInTheDocument();
    expect(screen.queryByText(/31\/12\/2999 · in ritardo/)).not.toBeInTheDocument();
  });

  it('explains what to do when there are no next steps', async () => {
    api.summary.mockResolvedValue({ ...summary, upcoming: [] });
    render(<Dashboard onNavigate={() => {}} />);

    expect(await screen.findByText(/Nessun passo in programma/)).toBeInTheDocument();
  });

  it('shows an error when the data cannot be loaded', async () => {
    api.summary.mockRejectedValue(new Error('API non raggiungibile'));
    render(<Dashboard onNavigate={() => {}} />);

    expect(await screen.findByRole('alert')).toHaveTextContent('API non raggiungibile');
  });

  it('offers shortcuts to the other areas', async () => {
    const navigate = vi.fn();
    render(<Dashboard onNavigate={navigate} />);
    await screen.findByRole('list', { name: 'Numeri' });

    await userEvent.click(screen.getByRole('button', { name: /Candidature/ }));
    await userEvent.click(screen.getByRole('button', { name: /Modifica il portfolio/ }));
    await userEvent.click(screen.getByRole('button', { name: /Company Radar/ }));

    expect(navigate.mock.calls.map(call => call[0])).toEqual(['applications', 'portfolio', 'companies']);
  });
});
