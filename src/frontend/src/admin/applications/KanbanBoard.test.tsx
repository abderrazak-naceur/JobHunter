import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Application } from '@/services/applicationApi';
import KanbanBoard from './KanbanBoard';

function app(overrides: Partial<Application> = {}): Application {
  return {
    id: '1', company: 'Acme', role: 'Developer', status: 'Applied', source: '', url: '', location: 'Milano', salaryRange: '',
    contactName: '', contactEmail: '', appliedOn: null, nextStep: 'Chiamare HR', nextStepOn: '2000-01-01', notes: '',
    createdAt: '2026-11-01T00:00:00Z', updatedAt: '2026-11-01T00:00:00Z', ...overrides
  };
}

const items = [
  app(),
  app({ id: '2', company: 'Beta', status: 'Interview', nextStep: '', nextStepOn: null, location: '' }),
  app({ id: '3', company: 'Gamma', status: 'Applied', url: 'https://example.com/job' })
];

function dataTransfer() {
  const store: Record<string, string> = {};
  return {
    setData: (type: string, value: string) => { store[type] = value; },
    getData: (type: string) => store[type] ?? '',
    effectAllowed: 'all'
  };
}

describe('KanbanBoard', () => {
  it('shows one column per stage with the matching cards and counts', () => {
    render(<KanbanBoard applications={items} onMove={vi.fn()} onEdit={vi.fn()} />);

    expect(screen.getAllByRole('region')).toHaveLength(7);
    const applied = screen.getByRole('region', { name: 'Colonna Candidata' });
    expect(within(applied).getByText('Acme')).toBeInTheDocument();
    expect(within(applied).getByText('Gamma')).toBeInTheDocument();
    expect(within(applied).getByLabelText('2 candidature')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Colonna Colloquio' })).getByText('Beta')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Colonna Offerta' })).getByText('Nessuna candidatura')).toBeInTheDocument();
  });

  it('flags a late next step and links the job posting', () => {
    render(<KanbanBoard applications={items} onMove={vi.fn()} onEdit={vi.fn()} />);

    expect(screen.getAllByText(/in ritardo/)).toHaveLength(2);
    expect(screen.getByRole('link', { name: /Annuncio/ })).toHaveAttribute('href', 'https://example.com/job');
  });

  it('moves a card with the menu on the card (keyboard and touch)', async () => {
    const onMove = vi.fn();
    render(<KanbanBoard applications={items} onMove={onMove} onEdit={vi.fn()} />);

    await userEvent.selectOptions(screen.getByLabelText('Sposta Acme'), 'Offer');

    expect(onMove).toHaveBeenCalledWith(items[0], 'Offer');
  });

  it('moves a card when it is dropped on another column', () => {
    const onMove = vi.fn();
    render(<KanbanBoard applications={items} onMove={onMove} onEdit={vi.fn()} />);
    const transfer = dataTransfer();

    const card = screen.getByText('Beta').closest('li')!;
    fireEvent.dragStart(card, { dataTransfer: transfer });
    fireEvent.dragOver(screen.getByRole('region', { name: 'Colonna Offerta' }), { dataTransfer: transfer });
    fireEvent.drop(screen.getByRole('region', { name: 'Colonna Offerta' }), { dataTransfer: transfer });

    expect(onMove).toHaveBeenCalledTimes(1);
    expect(onMove).toHaveBeenCalledWith(items[1], 'Offer');
  });

  it('does nothing when a card is dropped on its own column', () => {
    const onMove = vi.fn();
    render(<KanbanBoard applications={items} onMove={onMove} onEdit={vi.fn()} />);
    const transfer = dataTransfer();

    fireEvent.dragStart(screen.getByText('Beta').closest('li')!, { dataTransfer: transfer });
    fireEvent.drop(screen.getByRole('region', { name: 'Colonna Colloquio' }), { dataTransfer: transfer });

    expect(onMove).not.toHaveBeenCalled();
  });

  it('opens the editor from a card', async () => {
    const onEdit = vi.fn();
    render(<KanbanBoard applications={items} onMove={vi.fn()} onEdit={onEdit} />);

    await userEvent.click(screen.getByRole('button', { name: 'Modifica Beta' }));

    expect(onEdit).toHaveBeenCalledWith(items[1]);
  });
});
