import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { contactApi, type Contact, type ContactSummary, type PagedContacts } from '@/services/contactApi';
import ContactsPage from './ContactsPage';

vi.mock('@/services/contactApi', async importOriginal => ({
  ...(await importOriginal<typeof import('@/services/contactApi')>()),
  contactApi: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), summary: vi.fn() }
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() }, Toaster: () => null }));

const api = vi.mocked(contactApi);

function contact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: '1', name: 'Giulia Rossi', kind: 'Recruiter', company: 'Acme', role: 'Talent Acquisition', email: 'giulia@example.com',
    phone: '', profileUrl: 'https://linkedin.com/in/giulia', notes: '', lastContactOn: '2026-11-01', nextFollowUpOn: '2000-01-01',
    createdAt: '2026-11-01T00:00:00Z', updatedAt: '2026-11-01T00:00:00Z', ...overrides
  };
}

const page = (items: Contact[], totalCount = items.length): PagedContacts => ({ items, page: 1, pageSize: 10, totalCount });
const summary: ContactSummary = { total: 3, followUpsDue: 2, nextFollowUps: [] };

describe('ContactsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.list.mockResolvedValue(page([contact()]));
    api.summary.mockResolvedValue(summary);
  });

  it('lists contacts with their links and flags a late follow-up', async () => {
    render(<ContactsPage />);

    expect(await screen.findByText('Giulia Rossi')).toBeInTheDocument();
    expect(screen.getByText('Talent Acquisition · Acme')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /giulia@example.com/ })).toHaveAttribute('href', 'mailto:giulia@example.com');
    expect(screen.getByRole('link', { name: /Profilo/ })).toHaveAttribute('href', 'https://linkedin.com/in/giulia');
    expect(screen.getByText('01/11/2026')).toBeInTheDocument();
    expect(screen.getByText(/01\/01\/2000 · in ritardo/)).toBeInTheDocument();
  });

  it('reminds how many contacts are due', async () => {
    render(<ContactsPage />);

    expect(await screen.findByText('Ci sono 2 contatti da ricontattare oggi o in ritardo.')).toBeInTheDocument();
  });

  it('shows an invitation when there are no contacts', async () => {
    api.list.mockResolvedValue(page([]));
    api.summary.mockResolvedValue({ total: 0, followUpsDue: 0, nextFollowUps: [] });
    render(<ContactsPage />);

    expect(await screen.findByText('Non hai ancora nessun contatto')).toBeInTheDocument();
  });

  it('shows an error when the list cannot be loaded', async () => {
    api.list.mockRejectedValue(new Error('API non raggiungibile'));
    render(<ContactsPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('API non raggiungibile');
  });

  it('filters by kind and goes back to the first page', async () => {
    render(<ContactsPage />);
    await screen.findByText('Giulia Rossi');

    await userEvent.click(screen.getByRole('button', { name: 'Segnalatore' }));

    await waitFor(() => expect(api.list).toHaveBeenLastCalledWith(expect.objectContaining({ kind: 'Referral', page: 1 })));
  });

  it('searches after a pause in typing', async () => {
    render(<ContactsPage />);
    await screen.findByText('Giulia Rossi');

    await userEvent.type(screen.getByLabelText('Cerca contatti'), 'acme');

    await waitFor(() => expect(api.list).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'acme', page: 1 })));
  });

  it('creates a contact from the dialog', async () => {
    api.create.mockResolvedValue(contact({ id: '2', name: 'Luca Verdi' }));
    render(<ContactsPage />);
    await screen.findByText('Giulia Rossi');

    await userEvent.click(screen.getByRole('button', { name: /Nuovo contatto/ }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Nome *'), '  Luca Verdi ');
    await userEvent.type(within(dialog).getByLabelText('Da ricontattare il'), '2026-12-01');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Salva' }));

    await waitFor(() => expect(api.create).toHaveBeenCalledTimes(1));
    expect(api.create.mock.calls[0][0]).toMatchObject({ name: 'Luca Verdi', kind: 'Recruiter', lastContactOn: null, nextFollowUpOn: '2026-12-01' });
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Luca Verdi aggiunto'));
  });

  it('edits a contact with the form prefilled', async () => {
    api.update.mockResolvedValue(contact({ name: 'Giulia Bianchi' }));
    render(<ContactsPage />);
    await screen.findByText('Giulia Rossi');

    await userEvent.click(screen.getByRole('button', { name: 'Modifica Giulia Rossi' }));
    const dialog = await screen.findByRole('dialog');
    const name = within(dialog).getByLabelText('Nome *');
    expect(name).toHaveValue('Giulia Rossi');
    await userEvent.clear(name);
    await userEvent.type(name, 'Giulia Bianchi');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Salva' }));

    await waitFor(() => expect(api.update).toHaveBeenCalledWith('1', expect.objectContaining({ name: 'Giulia Bianchi', company: 'Acme' })));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Contatto aggiornato'));
  });

  it('keeps the dialog open and shows the server message when saving fails', async () => {
    api.create.mockRejectedValue(new Error('Inserisci un indirizzo email valido.'));
    render(<ContactsPage />);
    await screen.findByText('Giulia Rossi');

    await userEvent.click(screen.getByRole('button', { name: /Nuovo contatto/ }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Nome *'), 'X');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Salva' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Inserisci un indirizzo email valido.');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('asks for confirmation before deleting', async () => {
    api.remove.mockResolvedValue(undefined);
    render(<ContactsPage />);
    await screen.findByText('Giulia Rossi');

    await userEvent.click(screen.getByRole('button', { name: 'Elimina Giulia Rossi' }));
    const confirm = await screen.findByRole('alertdialog');
    expect(api.remove).not.toHaveBeenCalled();
    await userEvent.click(within(confirm).getByRole('button', { name: 'Elimina' }));

    await waitFor(() => expect(api.remove).toHaveBeenCalledWith('1'));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Giulia Rossi eliminato'));
  });

  it('pages through long lists', async () => {
    api.list.mockResolvedValue(page([contact()], 25));
    render(<ContactsPage />);
    await screen.findByText('Giulia Rossi');

    expect(screen.getByText(/Pagina 1 di 3 · 25 contatti/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Successiva' }));

    await waitFor(() => expect(api.list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));
  });
});
