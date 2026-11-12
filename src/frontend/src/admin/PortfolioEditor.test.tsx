import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PortfolioEditor from './PortfolioEditor';
import { portfolio, type PortfolioContent } from '../portfolio/content';
import { fetchPortfolio, savePortfolio } from '../services/portfolioApi';

vi.mock('../services/portfolioApi', () => ({ fetchPortfolio: vi.fn(), savePortfolio: vi.fn() }));

const fetchMock = vi.mocked(fetchPortfolio);
const saveMock = vi.mocked(savePortfolio);

const stored: PortfolioContent = { ...portfolio, name: 'Mario Rossi', email: null, cvUrl: null, links: [], experiences: [], projects: [] };

describe('PortfolioEditor', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    fetchMock.mockResolvedValue(stored);
    saveMock.mockImplementation(async content => content);
  });

  it('loads the published content into the form', async () => {
    render(<PortfolioEditor />);

    expect(await screen.findByLabelText(/^Nome \*/)).toHaveValue('Mario Rossi');
    expect(screen.getByLabelText(/^Ruolo \*/)).toHaveValue(portfolio.role);
  });

  it('shows an error when the content cannot be loaded', async () => {
    fetchMock.mockRejectedValue(new Error('API non raggiungibile'));
    render(<PortfolioEditor />);

    expect(await screen.findByRole('alert')).toHaveTextContent('API non raggiungibile');
  });

  it('saves the edited content in the API format and confirms', async () => {
    render(<PortfolioEditor />);
    const email = await screen.findByLabelText('Email pubblica');

    await userEvent.type(email, 'mario@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Salva e pubblica' }));

    await waitFor(() => expect(saveMock).toHaveBeenCalledTimes(1));
    const sent = saveMock.mock.calls[0][0];
    expect(sent.email).toBe('mario@example.com');
    expect(sent.cvUrl).toBeNull();
    expect(sent.skillGroups[0]).toEqual({ title: 'Backend', skills: ['C# / .NET', 'ASP.NET Core', 'REST API'] });
    expect(await screen.findByRole('status')).toHaveTextContent('Portfolio salvato');
  });

  it('adds, fills and sends an experience, then removes it again', async () => {
    render(<PortfolioEditor />);
    await screen.findByLabelText(/^Nome \*/);

    await userEvent.click(screen.getByRole('button', { name: /Aggiungi esperienza/ }));
    await userEvent.type(screen.getByLabelText(/Azienda \*/), 'Acme');
    await userEvent.type(screen.getByLabelText(/^Ruolo \* esperienza 1/), 'Developer');
    await userEvent.type(screen.getByLabelText(/Periodo \*/), '2020 – oggi');
    await userEvent.type(screen.getByLabelText(/Risultati/), 'Primo{enter}Secondo');
    await userEvent.click(screen.getByRole('button', { name: 'Salva e pubblica' }));

    await waitFor(() => expect(saveMock).toHaveBeenCalled());
    expect(saveMock.mock.calls[0][0].experiences).toEqual([
      { company: 'Acme', role: 'Developer', period: '2020 – oggi', description: '', highlights: ['Primo', 'Secondo'] }
    ]);

    await userEvent.click(screen.getByRole('button', { name: /Rimuovi esperienza 1/ }));
    expect(screen.queryByLabelText(/Azienda \*/)).not.toBeInTheDocument();
  });

  it('adds highlighted numbers, limits them to four and sends them', async () => {
    fetchMock.mockResolvedValue({ ...stored, stats: [] });
    render(<PortfolioEditor />);
    await screen.findByLabelText(/^Nome \*/);

    await userEvent.click(screen.getByRole('button', { name: /Aggiungi numero/ }));
    await userEvent.type(screen.getByLabelText(/^Valore/), '10+');
    await userEvent.type(screen.getByLabelText(/^Etichetta/), 'Anni di esperienza');
    for (let i = 0; i < 3; i++) await userEvent.click(screen.getByRole('button', { name: /Aggiungi numero/ }));
    expect(screen.queryByRole('button', { name: /Aggiungi numero/ })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Rimuovi numero 4' }));
    expect(screen.getByRole('button', { name: /Aggiungi numero/ })).toBeInTheDocument();
  });

  it('removes a link from the contacts', async () => {
    fetchMock.mockResolvedValue({ ...stored, links: [{ label: 'GitHub', url: 'https://github.com/x' }] });
    render(<PortfolioEditor />);

    await userEvent.click(await screen.findByRole('button', { name: 'Rimuovi link 1' }));

    expect(screen.queryByRole('button', { name: 'Rimuovi link 1' })).not.toBeInTheDocument();
  });

  it('shows the server validation message and keeps the form', async () => {
    saveMock.mockRejectedValue(new Error('Inserisci un indirizzo email valido.'));
    render(<PortfolioEditor />);
    await screen.findByLabelText(/^Nome \*/);

    await userEvent.click(screen.getByRole('button', { name: 'Salva e pubblica' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Inserisci un indirizzo email valido.');
    expect(within(document.body).getByLabelText(/^Nome \*/)).toHaveValue('Mario Rossi');
    expect(screen.queryByText('Portfolio salvato e pubblicato.')).not.toBeInTheDocument();
  });
});
