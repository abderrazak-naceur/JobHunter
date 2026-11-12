import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applicationApi, type Application, type ApplicationDetail, type ApplicationSummary, type PagedApplications } from '@/services/applicationApi';
import ApplicationsPage from './ApplicationsPage';
import { todayIso } from './statusMeta';

vi.mock('@/services/applicationApi', async importOriginal => ({
  ...(await importOriginal<typeof import('@/services/applicationApi')>()),
  applicationApi: { list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), summary: vi.fn() }
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() }, Toaster: () => null }));

const api = vi.mocked(applicationApi);

function app(overrides: Partial<Application> = {}): Application {
  return {
    id: '1', company: 'Acme', role: 'Senior .NET Developer', status: 'Applied', source: 'LinkedIn', url: 'https://example.com/job',
    location: 'Milano', salaryRange: '', contactName: '', contactEmail: '', appliedOn: '2026-11-03', nextStep: 'Chiamare HR',
    nextStepOn: '2000-01-01', notes: '', createdAt: '2026-11-01T00:00:00Z', updatedAt: '2026-11-02T00:00:00Z', ...overrides
  };
}

function detail(application: Application, events: ApplicationDetail['events'] = []): ApplicationDetail {
  return { ...application, events };
}

function page(items: Application[], totalCount = items.length): PagedApplications {
  return { items, page: 1, pageSize: 10, totalCount };
}

const summary: ApplicationSummary = {
  total: 3,
  byStatus: { Saved: 1, Applied: 1, Screening: 0, Interview: 1, Offer: 0, Rejected: 0, Withdrawn: 0 },
  upcoming: []
};

describe('ApplicationsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.list.mockResolvedValue(page([app()]));
    api.summary.mockResolvedValue(summary);
    api.get.mockResolvedValue(detail(app()));
  });

  it('lists the applications with stage, date and next step, flagging a late one', async () => {
    render(<ApplicationsPage />);

    expect(await screen.findByText('Acme')).toBeInTheDocument();
    expect(screen.getByText(/Senior \.NET Developer · Milano/)).toBeInTheDocument();
    expect(screen.getByText('03/11/2026')).toBeInTheDocument();
    expect(screen.getByText('Chiamare HR')).toBeInTheDocument();
    expect(screen.getByText(/01\/01\/2000 · in ritardo/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Annuncio/ })).toHaveAttribute('href', 'https://example.com/job');
  });

  it('shows how many applications are in each stage', async () => {
    render(<ApplicationsPage />);

    expect(await screen.findByRole('button', { name: 'Tutte (3)' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Colloquio (1)' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows an invitation to add the first application when there are none', async () => {
    api.list.mockResolvedValue(page([]));
    render(<ApplicationsPage />);

    expect(await screen.findByText('Non hai ancora nessuna candidatura')).toBeInTheDocument();
  });

  it('shows an error when the list cannot be loaded', async () => {
    api.list.mockRejectedValue(new Error('API non raggiungibile'));
    render(<ApplicationsPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('API non raggiungibile');
  });

  it('filters by stage and goes back to the first page', async () => {
    render(<ApplicationsPage />);
    await screen.findByText('Acme');

    await userEvent.click(screen.getByRole('button', { name: 'Colloquio (1)' }));

    await waitFor(() => expect(api.list).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'Interview', page: 1 })));
    expect(screen.getByRole('button', { name: 'Colloquio (1)' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('searches after a pause in typing', async () => {
    render(<ApplicationsPage />);
    await screen.findByText('Acme');

    await userEvent.type(screen.getByLabelText('Cerca candidature'), 'bmw');

    await waitFor(() => expect(api.list).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'bmw', page: 1 })));
  });

  it('shows a "nothing found" message for a search without results', async () => {
    render(<ApplicationsPage />);
    await screen.findByText('Acme');
    api.list.mockResolvedValue(page([]));

    await userEvent.type(screen.getByLabelText('Cerca candidature'), 'zzz');

    expect(await screen.findByText('Nessuna candidatura trovata')).toBeInTheDocument();
  });

  it('paginates', async () => {
    api.list.mockResolvedValue(page([app()], 25));
    render(<ApplicationsPage />);

    expect(await screen.findByText(/Pagina 1 di 3 · 25 candidature/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Precedente' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Successiva' }));

    await waitFor(() => expect(api.list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));
    expect(await screen.findByText(/Pagina 2 di 3/)).toBeInTheDocument();
  });

  it('creates an application and reloads the list', async () => {
    api.create.mockResolvedValue(detail(app({ id: '2', company: 'Gamma' })));
    render(<ApplicationsPage />);
    await screen.findByText('Acme');
    const callsBefore = api.list.mock.calls.length;

    await userEvent.click(screen.getByRole('button', { name: /Nuova candidatura/ }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText(/^Azienda/), 'Gamma');
    await userEvent.type(within(dialog).getByLabelText(/^Ruolo/), 'Lead');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Salva' }));

    await waitFor(() => expect(api.create).toHaveBeenCalledTimes(1));
    expect(api.create.mock.calls[0][0]).toMatchObject({ company: 'Gamma', role: 'Lead', status: 'Saved', appliedOn: null, nextStepOn: null });
    await waitFor(() => expect(api.list.mock.calls.length).toBeGreaterThan(callsBefore));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('fills in today as the application date when the stage becomes "Candidata"', async () => {
    render(<ApplicationsPage />);
    await screen.findByText('Acme');

    await userEvent.click(screen.getByRole('button', { name: /Nuova candidatura/ }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText('Data di candidatura')).toHaveValue('');
    await userEvent.click(within(dialog).getByRole('combobox', { name: 'Stato' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Candidata' }));

    expect(within(dialog).getByLabelText('Data di candidatura')).toHaveValue(todayIso());
  });

  it('edits an application with its values prefilled and shows its history', async () => {
    api.get.mockResolvedValue(detail(app(), [
      { id: 'e2', at: '2026-11-03T10:00:00Z', fromStatus: 'Saved', toStatus: 'Applied' },
      { id: 'e1', at: '2026-11-01T10:00:00Z', fromStatus: null, toStatus: 'Saved' }
    ]));
    api.update.mockResolvedValue(detail(app({ role: 'Architect' })));
    render(<ApplicationsPage />);

    await userEvent.click(await screen.findByRole('button', { name: 'Modifica Acme' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText(/^Azienda/)).toHaveValue('Acme');
    expect(within(dialog).getByLabelText('Data di candidatura')).toHaveValue('2026-11-03');
    const history = await within(dialog).findByRole('region', { name: 'Storico degli stati' });
    expect(history).toHaveTextContent('Salvata → Candidata');
    expect(history).toHaveTextContent('Creata come Salvata');
    await userEvent.clear(within(dialog).getByLabelText(/^Ruolo/));
    await userEvent.type(within(dialog).getByLabelText(/^Ruolo/), 'Architect');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Salva' }));

    await waitFor(() => expect(api.update).toHaveBeenCalledTimes(1));
    expect(api.update.mock.calls[0][0]).toBe('1');
    expect(api.update.mock.calls[0][1]).toMatchObject({ company: 'Acme', role: 'Architect', status: 'Applied' });
  });

  it('keeps the dialog open and shows the server message when saving fails', async () => {
    api.create.mockRejectedValue(new Error('Lo stato non è valido.'));
    render(<ApplicationsPage />);
    await screen.findByText('Acme');

    await userEvent.click(screen.getByRole('button', { name: /Nuova candidatura/ }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText(/^Azienda/), 'Gamma');
    await userEvent.type(within(dialog).getByLabelText(/^Ruolo/), 'Lead');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Salva' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Lo stato non è valido.');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('changes the stage straight from the list', async () => {
    api.update.mockResolvedValue(detail(app({ status: 'Interview' })));
    render(<ApplicationsPage />);

    await userEvent.click(await screen.findByRole('combobox', { name: 'Stato di Acme' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Colloquio' }));

    await waitFor(() => expect(api.update).toHaveBeenCalledTimes(1));
    expect(api.update.mock.calls[0][1]).toMatchObject({ company: 'Acme', status: 'Interview', nextStep: 'Chiamare HR' });
  });

  it('deletes only after the user confirms', async () => {
    api.remove.mockResolvedValue(undefined);
    render(<ApplicationsPage />);

    await userEvent.click(await screen.findByRole('button', { name: 'Elimina Acme' }));
    const confirm = await screen.findByRole('alertdialog');
    expect(confirm).toHaveTextContent('Acme');
    await userEvent.click(within(confirm).getByRole('button', { name: 'Annulla' }));
    expect(api.remove).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Elimina Acme' }));
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Elimina' }));

    await waitFor(() => expect(api.remove).toHaveBeenCalledWith('1'));
  });

  describe('board view', () => {
    it('switches to a board that loads everything, ignoring the stage filter and paging', async () => {
      render(<ApplicationsPage />);
      await screen.findByText('Acme');

      await userEvent.click(screen.getByRole('button', { name: 'Bacheca' }));

      expect(await screen.findByRole('group', { name: 'Bacheca delle candidature' })).toBeInTheDocument();
      expect(api.list).toHaveBeenLastCalledWith(expect.objectContaining({ status: '', page: 1, pageSize: 100 }));
      expect(screen.queryByRole('group', { name: 'Filtra per stato' })).toBeNull();
      expect(screen.getByRole('button', { name: 'Bacheca' })).toHaveAttribute('aria-pressed', 'true');
    });

    it('changes the stage of an application moved on the board', async () => {
      api.update.mockResolvedValue(detail(app({ status: 'Offer' })));
      render(<ApplicationsPage />);
      await screen.findByText('Acme');
      await userEvent.click(screen.getByRole('button', { name: 'Bacheca' }));

      await userEvent.selectOptions(await screen.findByLabelText('Sposta Acme'), 'Offer');

      await waitFor(() => expect(api.update).toHaveBeenCalledWith('1', expect.objectContaining({ status: 'Offer', company: 'Acme' })));
    });

    it('goes back to the list', async () => {
      render(<ApplicationsPage />);
      await screen.findByText('Acme');
      await userEvent.click(screen.getByRole('button', { name: 'Bacheca' }));
      await screen.findByRole('group', { name: 'Bacheca delle candidature' });

      await userEvent.click(screen.getByRole('button', { name: 'Elenco' }));

      expect(await screen.findByRole('group', { name: 'Filtra per stato' })).toBeInTheDocument();
      expect(api.list).toHaveBeenLastCalledWith(expect.objectContaining({ pageSize: 10 }));
    });
  });
  describe('offers', () => {
    it('compares the applications in the Offer stage', async () => {
      api.list.mockResolvedValue(page([app({ status: 'Offer', offer: { grossAnnual: 55000, bonus: null, benefits: '', remoteDaysPerWeek: 3, decisionBy: null } })]));
      render(<ApplicationsPage />);
      await screen.findByText('Acme');

      await userEvent.click(screen.getByRole('button', { name: 'Offerte' }));

      expect(await screen.findByRole('table', { name: 'Confronto delle offerte ricevute' })).toBeInTheDocument();
      expect(api.list).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'Offer', page: 1, pageSize: 100 }));
      expect(screen.getByText('3 giorni a settimana')).toBeInTheDocument();
    });

    it('records the offer terms from the dialog, reading Italian amounts', async () => {
      api.update.mockResolvedValue(detail(app({ status: 'Offer' })));
      api.list.mockResolvedValue(page([app({ status: 'Offer' })]));
      render(<ApplicationsPage />);
      await screen.findByText('Acme');

      await userEvent.click(screen.getByRole('button', { name: 'Modifica Acme' }));
      const dialog = await screen.findByRole('dialog');
      await userEvent.type(within(dialog).getByLabelText('RAL (lordo annuo, €)'), '55.000');
      await userEvent.type(within(dialog).getByLabelText('Bonus annuo (lordo, €)'), '4k');
      await userEvent.type(within(dialog).getByLabelText('Smart working (giorni a settimana)'), '3');
      await userEvent.type(within(dialog).getByLabelText('Benefit'), 'Buoni pasto');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Salva' }));

      await waitFor(() => expect(api.update).toHaveBeenCalledTimes(1));
      expect(api.update.mock.calls[0][1].offer).toEqual({
        grossAnnual: 55000, bonus: 4000, benefits: 'Buoni pasto', remoteDaysPerWeek: 3, decisionBy: null
      });
    });

    it('refuses an amount that is not a number, without calling the API', async () => {
      api.list.mockResolvedValue(page([app({ status: 'Offer' })]));
      render(<ApplicationsPage />);
      await screen.findByText('Acme');

      await userEvent.click(screen.getByRole('button', { name: 'Modifica Acme' }));
      const dialog = await screen.findByRole('dialog');
      await userEvent.type(within(dialog).getByLabelText('RAL (lordo annuo, €)'), 'tanti');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Salva' }));

      expect(await within(dialog).findByRole('alert')).toHaveTextContent('RAL: inserisci un importo');
      expect(api.update).not.toHaveBeenCalled();
    });

    it('hides the offer fields for an application that is not an offer', async () => {
      render(<ApplicationsPage />);
      await screen.findByText('Acme');

      await userEvent.click(screen.getByRole('button', { name: 'Modifica Acme' }));
      const dialog = await screen.findByRole('dialog');

      expect(within(dialog).queryByLabelText('RAL (lordo annuo, €)')).toBeNull();
    });
  });});
