import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CompanyRadar from './CompanyRadar';
import { companyApi, type Company } from './services/companyApi';

vi.mock('./services/companyApi', () => ({
  companyApi: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() }
}));

const api = vi.mocked(companyApi);

function company(overrides: Partial<Company> = {}): Company {
  return {
    id: '1', name: 'Acme', website: 'https://acme.example', careersUrl: 'https://acme.example/careers',
    location: 'Milano', sector: 'Software', technologies: '.NET, C#, React, SQL, Azure, Docker, Extra',
    priority: 'Alta', notes: 'Buon team', followed: true,
    createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', ...overrides
  };
}

function listReturns(items: Company[]) {
  api.list.mockResolvedValue({ items, page: 1, pageSize: 100, totalCount: items.length });
}

describe('CompanyRadar', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('shows the loading state, then the empty state', async () => {
    listReturns([]);
    render(<CompanyRadar />);

    expect(screen.getByText('Caricamento aziende...')).toBeInTheDocument();
    expect(await screen.findByText('Il tuo radar è ancora vuoto')).toBeInTheDocument();
  });

  it('renders companies, caps technology tags at five and shows the followed count', async () => {
    listReturns([company(), company({ id: '2', name: 'Beta', followed: false, technologies: 'Go' })]);
    render(<CompanyRadar />);

    expect(await screen.findByText('Acme')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.queryByText('Extra')).not.toBeInTheDocument();
    expect(screen.getByText('Azure')).toBeInTheDocument();
    expect(screen.queryByText('Docker')).not.toBeInTheDocument();
    expect(screen.getByText('Seguita')).toBeInTheDocument();
    expect(screen.getByText('Segui')).toBeInTheDocument();
  });

  it('shows an alert when loading fails', async () => {
    api.list.mockRejectedValue(new Error('API non raggiungibile'));
    render(<CompanyRadar />);

    expect(await screen.findByRole('alert')).toHaveTextContent('API non raggiungibile');
  });

  it('reloads with the typed search term and shows the no-results state', async () => {
    listReturns([company()]);
    render(<CompanyRadar />);
    await screen.findByText('Acme');

    listReturns([]);
    await userEvent.type(screen.getByPlaceholderText(/Cerca azienda/), 'zzz');

    await waitFor(() => expect(api.list).toHaveBeenLastCalledWith('zzz'));
    expect(await screen.findByText('Nessuna azienda trovata')).toBeInTheDocument();
  });

  it('creates a company from the form and reloads the list', async () => {
    listReturns([]);
    api.create.mockResolvedValue(company());
    render(<CompanyRadar />);
    await screen.findByText('Il tuo radar è ancora vuoto');

    await userEvent.click(screen.getByRole('button', { name: /Aggiungi azienda/ }));
    await userEvent.type(screen.getByLabelText(/Nome azienda/), 'Acme');
    await userEvent.type(screen.getByLabelText(/URL Lavora con noi/), 'https://acme.example/careers');
    await userEvent.click(screen.getByRole('button', { name: 'Salva azienda' }));

    await waitFor(() => expect(api.create).toHaveBeenCalledTimes(1));
    expect(api.create.mock.calls[0][0]).toMatchObject({ name: 'Acme', careersUrl: 'https://acme.example/careers' });
    await waitFor(() => expect(api.list).toHaveBeenCalledTimes(2));
    expect(screen.queryByText('Nuova azienda target')).not.toBeInTheDocument();
  });

  it('keeps the form open and shows the server error when saving fails', async () => {
    listReturns([]);
    api.create.mockRejectedValue(new Error('Questa pagina Careers è già registrata.'));
    render(<CompanyRadar />);
    await screen.findByText('Il tuo radar è ancora vuoto');

    await userEvent.click(screen.getByRole('button', { name: /Aggiungi azienda/ }));
    await userEvent.type(screen.getByLabelText(/Nome azienda/), 'Acme');
    await userEvent.type(screen.getByLabelText(/URL Lavora con noi/), 'https://acme.example/careers');
    await userEvent.click(screen.getByRole('button', { name: 'Salva azienda' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('già registrata');
    expect(screen.getByText('Nuova azienda target')).toBeInTheDocument();
  });

  it('edits an existing company with its values prefilled', async () => {
    listReturns([company()]);
    api.update.mockResolvedValue(company({ name: 'Acme 2' }));
    render(<CompanyRadar />);

    await userEvent.click(await screen.findByRole('button', { name: 'Modifica Acme' }));
    const nameInput = screen.getByLabelText(/Nome azienda/);
    expect(nameInput).toHaveValue('Acme');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Acme 2');
    await userEvent.click(screen.getByRole('button', { name: 'Salva modifiche' }));

    await waitFor(() => expect(api.update).toHaveBeenCalledTimes(1));
    expect(api.update.mock.calls[0][0]).toBe('1');
    expect(api.update.mock.calls[0][1]).toMatchObject({ name: 'Acme 2' });
  });

  it('toggles follow by sending the inverted flag', async () => {
    listReturns([company({ followed: true })]);
    api.update.mockResolvedValue(company({ followed: false }));
    render(<CompanyRadar />);

    await userEvent.click(await screen.findByRole('button', { name: 'Seguita' }));

    await waitFor(() => expect(api.update).toHaveBeenCalledTimes(1));
    expect(api.update.mock.calls[0][1]).toMatchObject({ followed: false });
  });

  it('deletes only after the user confirms', async () => {
    listReturns([company()]);
    api.remove.mockResolvedValue(undefined);
    const confirm = vi.spyOn(window, 'confirm');
    render(<CompanyRadar />);
    const deleteButton = await screen.findByRole('button', { name: 'Elimina Acme' });

    confirm.mockReturnValueOnce(false);
    await userEvent.click(deleteButton);
    expect(api.remove).not.toHaveBeenCalled();

    confirm.mockReturnValueOnce(true);
    await userEvent.click(deleteButton);
    await waitFor(() => expect(api.remove).toHaveBeenCalledWith('1'));
  });
});
