import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applicationApi, type ImportedPosting } from '@/services/applicationApi';
import ApplicationDialog from './ApplicationDialog';
import { describeResult } from './PostingImport';

vi.mock('@/services/applicationApi', async importOriginal => ({
  ...(await importOriginal<typeof import('@/services/applicationApi')>()),
  applicationApi: { get: vi.fn(), create: vi.fn(), update: vi.fn(), importPosting: vi.fn() }
}));

const api = vi.mocked(applicationApi);

function posting(overrides: Partial<ImportedPosting> = {}): ImportedPosting {
  return {
    company: 'Acme S.p.A.', role: 'Senior .NET Developer', location: 'Milano', salaryRange: '45.000 €–55.000 € / anno',
    source: 'Sito aziendale', url: 'https://careers.acme.it/jobs/42', notes: 'Scadenza annuncio: 31/12/2026',
    found: ['company', 'role', 'location', 'salaryRange'], needsText: false, message: null, ...overrides
  };
}

function openNew() {
  const onSaved = vi.fn();
  render(<ApplicationDialog application={null} open onOpenChange={() => {}} onSaved={onSaved} />);
  return { dialog: screen.getByRole('dialog'), onSaved };
}

describe('describeResult', () => {
  it('names what was filled and what is left', () => {
    expect(describeResult(['company', 'role'])).toBe('Compilati: azienda, ruolo. Da completare: località, retribuzione. Controlla prima di salvare.');
    expect(describeResult(['company', 'role', 'location', 'salaryRange'])).toBe('Compilati: azienda, ruolo, località, retribuzione. Controlla prima di salvare.');
    expect(describeResult([])).toMatch(/Non ho riconosciuto nessun dato/);
  });
});

describe('Filling a new application from a job posting', () => {
  beforeEach(() => vi.resetAllMocks());

  it('reads the link and fills the form, which is saved only when confirmed', async () => {
    api.importPosting.mockResolvedValue(posting());
    api.create.mockResolvedValue({ ...posting(), id: '1', status: 'Saved' } as never);
    const { dialog, onSaved } = openNew();

    await userEvent.type(within(dialog).getByLabelText('Link dell’annuncio'), 'https://careers.acme.it/jobs/42');
    await userEvent.click(within(dialog).getByRole('button', { name: /Leggi annuncio/ }));

    await waitFor(() => expect(within(dialog).getByLabelText('Azienda *')).toHaveValue('Acme S.p.A.'));
    expect(api.importPosting).toHaveBeenCalledWith({ url: 'https://careers.acme.it/jobs/42', text: '' });
    expect(within(dialog).getByLabelText('Ruolo *')).toHaveValue('Senior .NET Developer');
    expect(within(dialog).getByLabelText('Località')).toHaveValue('Milano');
    expect(within(dialog).getByLabelText('Retribuzione')).toHaveValue('45.000 €–55.000 € / anno');
    expect(within(dialog).getByLabelText('Link all’annuncio')).toHaveValue('https://careers.acme.it/jobs/42');
    expect(within(dialog).getByLabelText('Dove l’hai trovata')).toHaveValue('Sito aziendale');
    expect(within(dialog).getByLabelText('Note')).toHaveValue('Scadenza annuncio: 31/12/2026');
    expect(within(dialog).getByRole('status')).toHaveTextContent('Compilati: azienda, ruolo, località, retribuzione.');
    expect(api.create).not.toHaveBeenCalled();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Salva' }));
    await waitFor(() => expect(api.create).toHaveBeenCalledTimes(1));
    expect(api.create.mock.calls[0][0]).toMatchObject({ company: 'Acme S.p.A.', role: 'Senior .NET Developer', url: 'https://careers.acme.it/jobs/42' });
    expect(onSaved).toHaveBeenCalled();
  });

  it('also reads the link when Enter is pressed, without saving the form', async () => {
    api.importPosting.mockResolvedValue(posting());
    const { dialog } = openNew();

    await userEvent.type(within(dialog).getByLabelText('Link dell’annuncio'), 'https://careers.acme.it/jobs/42{Enter}');

    await waitFor(() => expect(api.importPosting).toHaveBeenCalledTimes(1));
    expect(api.create).not.toHaveBeenCalled();
  });

  it('asks for the text for LinkedIn and then reads the pasted text', async () => {
    api.importPosting
      .mockResolvedValueOnce(posting({
        company: '', role: '', location: '', salaryRange: '', notes: '', source: 'LinkedIn', url: 'https://www.linkedin.com/jobs/view/1/',
        found: [], needsText: true, message: 'LinkedIn non permette la lettura automatica degli annunci. Apri l’annuncio, copia il testo e incollalo qui sotto.'
      }))
      .mockResolvedValueOnce(posting({ company: 'Omega Spa', role: 'Cloud Engineer', location: 'Torino (ibrido)', salaryRange: '', source: 'LinkedIn', url: 'https://www.linkedin.com/jobs/view/1/', notes: '', found: ['company', 'role', 'location'] }));
    const { dialog } = openNew();

    await userEvent.type(within(dialog).getByLabelText('Link dell’annuncio'), 'https://www.linkedin.com/jobs/view/1/');
    await userEvent.click(within(dialog).getByRole('button', { name: /Leggi annuncio/ }));

    expect(await within(dialog).findByText(/LinkedIn non permette la lettura automatica/)).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Dove l’hai trovata')).toHaveValue('LinkedIn');
    const textArea = within(dialog).getByLabelText('Testo dell’annuncio');
    await userEvent.click(textArea);
    await userEvent.paste('Cloud Engineer\nOmega Spa · Torino · 2 giorni fa');
    await userEvent.click(within(dialog).getByRole('button', { name: /Estrai dal testo/ }));

    await waitFor(() => expect(within(dialog).getByLabelText('Azienda *')).toHaveValue('Omega Spa'));
    expect(api.importPosting).toHaveBeenLastCalledWith({ url: 'https://www.linkedin.com/jobs/view/1/', text: 'Cloud Engineer\nOmega Spa · Torino · 2 giorni fa' });
    expect(within(dialog).getByRole('status')).toHaveTextContent('Da completare: retribuzione.');
  });

  it('keeps what the owner already typed when the posting does not mention it', async () => {
    api.importPosting.mockResolvedValue(posting({ salaryRange: '', location: '', found: ['company', 'role'] }));
    const { dialog } = openNew();
    await userEvent.type(within(dialog).getByLabelText('Retribuzione'), '50k');
    await userEvent.type(within(dialog).getByLabelText('Dove l’hai trovata'), 'Referral');

    await userEvent.type(within(dialog).getByLabelText('Link dell’annuncio'), 'https://careers.acme.it/jobs/42');
    await userEvent.click(within(dialog).getByRole('button', { name: /Leggi annuncio/ }));

    await waitFor(() => expect(within(dialog).getByLabelText('Azienda *')).toHaveValue('Acme S.p.A.'));
    expect(within(dialog).getByLabelText('Retribuzione')).toHaveValue('50k');
    expect(within(dialog).getByLabelText('Dove l’hai trovata')).toHaveValue('Referral');
  });

  it('shows why a page could not be read and offers to paste the text', async () => {
    api.importPosting.mockRejectedValue(new Error('Il sito non risponde o l’indirizzo non esiste.'));
    const { dialog } = openNew();

    await userEvent.type(within(dialog).getByLabelText('Link dell’annuncio'), 'https://down.example.com/job');
    await userEvent.click(within(dialog).getByRole('button', { name: /Leggi annuncio/ }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Il sito non risponde');
    expect(within(dialog).getByLabelText('Testo dell’annuncio')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Azienda *')).toHaveValue('');
  });

  it('asks for a link before calling the server', async () => {
    const { dialog } = openNew();

    await userEvent.click(within(dialog).getByRole('button', { name: /Leggi annuncio/ }));

    expect(within(dialog).getByRole('alert')).toHaveTextContent('Incolla il link dell’annuncio.');
    expect(api.importPosting).not.toHaveBeenCalled();
  });

  it('is offered only for new applications', () => {
    api.get.mockResolvedValue({ events: [] } as never);
    render(
      <ApplicationDialog
        application={{
          id: '1', company: 'Acme', role: 'Dev', status: 'Applied', source: '', url: '', location: '', salaryRange: '', contactName: '',
          contactEmail: '', appliedOn: null, nextStep: '', nextStepOn: null, notes: '', createdAt: '', updatedAt: ''
        }}
        open
        onOpenChange={() => {}}
        onSaved={() => {}}
      />
    );

    expect(screen.queryByText('Compila da un annuncio')).toBeNull();
  });
});
