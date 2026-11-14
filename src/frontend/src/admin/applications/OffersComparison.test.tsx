import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Application } from '@/services/applicationApi';
import OffersComparison from './OffersComparison';

function app(overrides: Partial<Application> = {}): Application {
  return {
    id: '1', company: 'Acme', role: 'Senior Dev', status: 'Offer', source: '', url: '', location: 'Milano', salaryRange: '',
    contactName: '', contactEmail: '', appliedOn: null, nextStep: '', nextStepOn: null, notes: '',
    createdAt: '2026-11-01T00:00:00Z', updatedAt: '2026-11-01T00:00:00Z',
    offer: { grossAnnual: 52000, bonus: 3000, benefits: 'Buoni pasto', remoteDaysPerWeek: 2, decisionBy: '2000-01-01' },
    ...overrides
  };
}

const normalise = (text: string | null) => (text ?? '').replace(/\s/g, ' ');

describe('OffersComparison', () => {
  it('puts the offers side by side and highlights the highest total gross', () => {
    const offers = [
      app(),
      app({ id: '2', company: 'Beta', location: 'Remoto', offer: { grossAnnual: 60000, bonus: null, benefits: '', remoteDaysPerWeek: 5, decisionBy: '2999-12-31' } })
    ];
    render(<OffersComparison applications={offers} onEdit={vi.fn()} />);

    const table = screen.getByRole('table', { name: 'Confronto delle offerte ricevute' });
    const totalRow = within(table).getByRole('rowheader', { name: 'Totale lordo annuo' }).closest('tr')!;
    expect(within(totalRow).getAllByRole('cell').map(cell => normalise(cell.textContent))).toEqual(['55.000 €', '60.000 €']);

    const monthly13 = within(table).getByRole('rowheader', { name: 'Lordo per mensilità (13)' }).closest('tr')!;
    expect(normalise(within(monthly13).getAllByRole('cell')[0].textContent)).toBe('4000 €'); // Italian groups thousands only from 5 digits

    const header = within(table).getByRole('columnheader', { name: /Beta/ });
    expect(header).toHaveTextContent('Lordo più alto');
    expect(within(table).getByRole('columnheader', { name: /Acme/ })).not.toHaveTextContent('Lordo più alto');
    expect(within(table).getByText('5 giorni a settimana')).toBeInTheDocument();
  });

  it('flags a decision date that has passed', () => {
    render(<OffersComparison applications={[app()]} onEdit={vi.fn()} />);

    expect(screen.getByText(/01\/01\/2000 · scaduta/)).toBeInTheDocument();
  });

  it('says which offers have no salary yet, and does not crown a single offer', () => {
    render(<OffersComparison applications={[app(), app({ id: '2', company: 'Senza RAL', offer: null })]} onEdit={vi.fn()} />);

    expect(screen.getByText(/Manca la RAL per: Senza RAL/)).toBeInTheDocument();
    expect(screen.queryByText('Lordo più alto')).toBeNull();
  });

  it('explains that net pay is not estimated', () => {
    render(<OffersComparison applications={[app()]} onEdit={vi.fn()} />);

    expect(screen.getByText(/il netto .* non viene stimato/i)).toBeInTheDocument();
  });

  it('opens the editor of an offer', async () => {
    const onEdit = vi.fn();
    const offers = [app()];
    render(<OffersComparison applications={offers} onEdit={onEdit} />);

    await userEvent.click(screen.getByRole('button', { name: 'Modifica l’offerta di Acme' }));

    expect(onEdit).toHaveBeenCalledWith(offers[0]);
  });

  it('explains how to get offers to compare when there are none', () => {
    render(<OffersComparison applications={[]} onEdit={vi.fn()} />);

    expect(screen.getByText('Nessuna offerta da confrontare')).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
  });
});
