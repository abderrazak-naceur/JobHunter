import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PortfolioContent } from '@/portfolio/content';
import { deleteCv, deletePhoto, fetchPortfolio, savePortfolio, uploadCv, uploadPhoto } from '@/services/portfolioApi';
import { sampleContent } from '@/test/fixtures';
import PortfolioAdmin from './PortfolioAdmin';

vi.mock('@/services/portfolioApi', () => ({ fetchPortfolio: vi.fn(), savePortfolio: vi.fn(), uploadPhoto: vi.fn(), deletePhoto: vi.fn(), uploadCv: vi.fn(), deleteCv: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() }, Toaster: () => null }));

const fetchMock = vi.mocked(fetchPortfolio);
const saveMock = vi.mocked(savePortfolio);
const uploadMock = vi.mocked(uploadPhoto);
const deleteMock = vi.mocked(deletePhoto);
const uploadCvMock = vi.mocked(uploadCv);
const deleteCvMock = vi.mocked(deleteCv);

const stored: PortfolioContent = {
  ...sampleContent,
  name: 'Mario Rossi',
  email: null,
  cvUrl: null,
  photoUrl: null,
  links: [{ label: 'GitHub', url: 'https://github.com/x' }],
  stats: [{ value: '10+', label: 'Anni' }],
  experiences: [
    { company: 'Acme', role: 'Developer', period: '2020 – oggi', description: 'API.', highlights: ['Uno', 'Due'] },
    { company: 'Beta', role: 'Analyst', period: '2018 – 2020', description: '', highlights: [] }
  ]
};

async function openTab(name: string) {
  await userEvent.click(await screen.findByRole('tab', { name }));
}

async function renderOnTab(tab: string) {
  render(<PortfolioAdmin />);
  await openTab(tab);
}

describe('PortfolioAdmin', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    fetchMock.mockResolvedValue(stored);
    saveMock.mockImplementation(async content => content);
  });

  describe('loading', () => {
    it('shows the profile first, filled with the published values', async () => {
      render(<PortfolioAdmin />);

      expect(await screen.findByLabelText(/^Nome \*/)).toHaveValue('Mario Rossi');
      expect(screen.getByLabelText(/^Ruolo \*/)).toHaveValue(sampleContent.role);
    });

    it('shows an error when the content cannot be loaded', async () => {
      fetchMock.mockRejectedValue(new Error('API non raggiungibile'));
      render(<PortfolioAdmin />);

      expect(await screen.findByRole('alert')).toHaveTextContent('API non raggiungibile');
    });

    it('links to the public site', async () => {
      render(<PortfolioAdmin />);

      expect(await screen.findByRole('link', { name: /Vedi il sito/ })).toHaveAttribute('href', '/');
    });
  });

  describe('profile', () => {
    it('saves the edited profile and keeps the rest of the content', async () => {
      render(<PortfolioAdmin />);
      const email = await screen.findByLabelText('Email pubblica');

      await userEvent.type(email, 'mario@example.com');
      await userEvent.click(screen.getByRole('button', { name: 'Salva e pubblica' }));

      await waitFor(() => expect(saveMock).toHaveBeenCalledTimes(1));
      const sent = saveMock.mock.calls[0][0];
      expect(sent.email).toBe('mario@example.com');
      expect(sent.cvUrl).toBeNull();
      expect(sent.experiences).toEqual(stored.experiences);
      expect(sent.skillGroups).toEqual(stored.skillGroups);
    });


    it('uploads a CV PDF and shows the public download link', async () => {
      uploadCvMock.mockResolvedValue('/api/v1/portfolio/cv?v=4');
      render(<PortfolioAdmin />);
      const file = new File(['%PDF-1.7\\nbody'], 'curriculum.pdf', { type: 'application/pdf' });

      await userEvent.upload(await screen.findByLabelText(/Carica CV/), file);

      await waitFor(() => expect(uploadCvMock).toHaveBeenCalledWith(file));
      expect(await screen.findByRole('link', { name: /Scarica PDF attuale/ })).toHaveAttribute('href', expect.stringContaining('/api/v1/portfolio/cv?v=4'));
      expect(screen.getByRole('button', { name: 'Rimuovi CV' })).toBeInTheDocument();
    });

    it('removes an uploaded CV and keeps the manual fallback URL', async () => {
      fetchMock.mockResolvedValue({ ...stored, cvUrl: 'https://example.com/cv.pdf', cvDownloadUrl: '/api/v1/portfolio/cv?v=4' });
      deleteCvMock.mockResolvedValue(undefined);
      render(<PortfolioAdmin />);

      await userEvent.click(await screen.findByRole('button', { name: 'Rimuovi CV' }));

      await waitFor(() => expect(deleteCvMock).toHaveBeenCalledTimes(1));
      expect(screen.queryByRole('link', { name: /Scarica PDF attuale/ })).not.toBeInTheDocument();
      expect(screen.getByLabelText(/Link alternativo al CV/)).toHaveValue('https://example.com/cv.pdf');
    });

    it('shows the validation message of the server', async () => {
      saveMock.mockRejectedValue(new Error('Inserisci un indirizzo email valido.'));
      render(<PortfolioAdmin />);
      await screen.findByLabelText(/^Nome \*/);

      await userEvent.click(screen.getByRole('button', { name: 'Salva e pubblica' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('Inserisci un indirizzo email valido.');
      expect(screen.getByLabelText(/^Nome \*/)).toHaveValue('Mario Rossi');
    });

    it('uploads a photo straight away and shows its preview', async () => {
      uploadMock.mockResolvedValue('/api/v1/portfolio/photo?v=1');
      render(<PortfolioAdmin />);
      const file = new File([new Uint8Array([0x89, 0x50])], 'me.png', { type: 'image/png' });

      await userEvent.upload(await screen.findByLabelText(/Carica foto/), file);

      await waitFor(() => expect(uploadMock).toHaveBeenCalledWith(file));
      const preview = await screen.findByAltText('Anteprima della foto profilo');
      expect(preview.getAttribute('src')).toMatch(/\/api\/v1\/portfolio\/photo\?v=1$/);
      // The address is chosen by the server, so the manual URL field disappears.
      expect(screen.queryByLabelText(/Oppure indica l’URL/)).not.toBeInTheDocument();
    });

    it('sends the uploaded photo address back unchanged when the profile is saved', async () => {
      uploadMock.mockResolvedValue('/api/v1/portfolio/photo?v=2');
      render(<PortfolioAdmin />);
      await userEvent.upload(await screen.findByLabelText(/Carica foto/), new File([new Uint8Array([1])], 'me.jpg', { type: 'image/jpeg' }));
      await screen.findByAltText('Anteprima della foto profilo');

      await userEvent.click(screen.getByRole('button', { name: 'Salva e pubblica' }));

      await waitFor(() => expect(saveMock).toHaveBeenCalled());
      expect(saveMock.mock.calls[0][0].photoUrl).toBe('/api/v1/portfolio/photo?v=2');
    });

    it('shows why a photo could not be uploaded', async () => {
      uploadMock.mockRejectedValue(new Error('La foto supera i 2 MB.'));
      render(<PortfolioAdmin />);

      await userEvent.upload(await screen.findByLabelText(/Carica foto/), new File([new Uint8Array([1])], 'big.png', { type: 'image/png' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('La foto supera i 2 MB.');
      expect(screen.queryByAltText('Anteprima della foto profilo')).not.toBeInTheDocument();
    });

    it('removes an uploaded photo through the API', async () => {
      fetchMock.mockResolvedValue({ ...stored, photoUrl: '/api/v1/portfolio/photo?v=3' });
      deleteMock.mockResolvedValue(undefined);
      render(<PortfolioAdmin />);

      await userEvent.click(await screen.findByRole('button', { name: 'Rimuovi foto' }));

      await waitFor(() => expect(deleteMock).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(screen.queryByAltText('Anteprima della foto profilo')).not.toBeInTheDocument());
    });

    it('clears a manually entered photo URL without calling the API', async () => {
      fetchMock.mockResolvedValue({ ...stored, photoUrl: 'https://example.com/me.jpg' });
      render(<PortfolioAdmin />);
      expect(await screen.findByLabelText(/Oppure indica l’URL/)).toHaveValue('https://example.com/me.jpg');

      await userEvent.click(screen.getByRole('button', { name: 'Rimuovi foto' }));

      expect(deleteMock).not.toHaveBeenCalled();
      expect(screen.getByLabelText(/Oppure indica l’URL/)).toHaveValue('');
    });
  });

  describe('experience (create, read, update, delete, reorder)', () => {
    it('lists the existing experiences', async () => {
      await renderOnTab('Esperienza');

      expect(await screen.findByText('Developer · Acme')).toBeInTheDocument();
      expect(screen.getByText('Analyst · Beta')).toBeInTheDocument();
    });

    it('adds a new experience at the end and publishes it', async () => {
      await renderOnTab('Esperienza');

      await userEvent.click(await screen.findByRole('button', { name: /Aggiungi esperienza/ }));
      const dialog = await screen.findByRole('dialog');
      await userEvent.type(within(dialog).getByLabelText(/Azienda/), 'Gamma');
      await userEvent.type(within(dialog).getByLabelText(/^Ruolo/), 'Lead');
      await userEvent.type(within(dialog).getByLabelText(/^Periodo/), '2024 – oggi');
      await userEvent.type(within(dialog).getByLabelText(/^Risultati/), 'Primo{enter}Secondo');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Salva' }));

      await waitFor(() => expect(saveMock).toHaveBeenCalledTimes(1));
      const experiences = saveMock.mock.calls[0][0].experiences;
      expect(experiences).toHaveLength(3);
      expect(experiences[2]).toEqual({ company: 'Gamma', role: 'Lead', period: '2024 – oggi', description: '', highlights: ['Primo', 'Secondo'] });
      expect(await screen.findByText('Lead · Gamma')).toBeInTheDocument();
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    it('edits an experience in place, with the form prefilled', async () => {
      await renderOnTab('Esperienza');

      await userEvent.click(await screen.findByRole('button', { name: 'Modifica Developer · Acme' }));
      const dialog = await screen.findByRole('dialog');
      expect(within(dialog).getByLabelText(/Azienda/)).toHaveValue('Acme');
      expect(within(dialog).getByLabelText(/^Risultati/)).toHaveValue('Uno\nDue');
      await userEvent.clear(within(dialog).getByLabelText(/^Ruolo/));
      await userEvent.type(within(dialog).getByLabelText(/^Ruolo/), 'Senior Developer');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Salva' }));

      await waitFor(() => expect(saveMock).toHaveBeenCalledTimes(1));
      const experiences = saveMock.mock.calls[0][0].experiences;
      expect(experiences).toHaveLength(2);
      expect(experiences[0].role).toBe('Senior Developer');
      expect(experiences[1].company).toBe('Beta');
    });

    it('asks for confirmation before deleting, and deletes only when confirmed', async () => {
      await renderOnTab('Esperienza');

      await userEvent.click(await screen.findByRole('button', { name: 'Elimina Analyst · Beta' }));
      const confirm = await screen.findByRole('alertdialog');
      expect(confirm).toHaveTextContent('Analyst · Beta');
      await userEvent.click(within(confirm).getByRole('button', { name: 'Annulla' }));
      expect(saveMock).not.toHaveBeenCalled();

      await userEvent.click(screen.getByRole('button', { name: 'Elimina Analyst · Beta' }));
      await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Elimina' }));

      await waitFor(() => expect(saveMock).toHaveBeenCalledTimes(1));
      expect(saveMock.mock.calls[0][0].experiences.map(item => item.company)).toEqual(['Acme']);
      await waitFor(() => expect(screen.queryByText('Analyst · Beta')).not.toBeInTheDocument());
    });

    it('moves an experience down and up', async () => {
      await renderOnTab('Esperienza');
      expect(await screen.findByRole('button', { name: 'Sposta su Developer · Acme' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Sposta giù Analyst · Beta' })).toBeDisabled();

      await userEvent.click(screen.getByRole('button', { name: 'Sposta giù Developer · Acme' }));

      await waitFor(() => expect(saveMock).toHaveBeenCalledTimes(1));
      expect(saveMock.mock.calls[0][0].experiences.map(item => item.company)).toEqual(['Beta', 'Acme']);
      const rows = await screen.findAllByRole('listitem');
      expect(rows[0]).toHaveTextContent('Analyst · Beta');
    });

    it('keeps the dialog open and shows the server message when saving fails', async () => {
      saveMock.mockRejectedValue(new Error('Il periodo è obbligatorio.'));
      await renderOnTab('Esperienza');

      await userEvent.click(await screen.findByRole('button', { name: /Aggiungi esperienza/ }));
      const dialog = await screen.findByRole('dialog');
      await userEvent.type(within(dialog).getByLabelText(/Azienda/), 'Gamma');
      await userEvent.type(within(dialog).getByLabelText(/^Ruolo/), 'Lead');
      await userEvent.type(within(dialog).getByLabelText(/^Periodo/), 'x');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Salva' }));

      expect(await within(dialog).findByRole('alert')).toHaveTextContent('Il periodo è obbligatorio.');
      expect(screen.queryByText('Lead · Gamma')).not.toBeInTheDocument();
    });

    it('explains that an empty list hides the section', async () => {
      fetchMock.mockResolvedValue({ ...stored, experiences: [] });
      await renderOnTab('Esperienza');

      expect(await screen.findByText(/non compare nel sito/)).toBeInTheDocument();
    });
  });

  describe('other lists', () => {
    it('limits the highlighted numbers to four', async () => {
      fetchMock.mockResolvedValue({ ...stored, stats: [1, 2, 3, 4].map(n => ({ value: `${n}`, label: `Voce ${n}` })) });
      await renderOnTab('Numeri');

      expect(await screen.findByText(/massimo di 4/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Aggiungi numero/ })).toBeDisabled();
    });

    it('turns comma separated skills into a list when adding a group', async () => {
      await renderOnTab('Competenze');

      await userEvent.click(await screen.findByRole('button', { name: /Aggiungi gruppo di competenze/ }));
      const dialog = await screen.findByRole('dialog');
      await userEvent.type(within(dialog).getByLabelText(/Nome del gruppo/), 'Metodo');
      await userEvent.type(within(dialog).getByLabelText(/^Competenze/), 'Scrum, TDD , ,Code review');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Salva' }));

      await waitFor(() => expect(saveMock).toHaveBeenCalledTimes(1));
      const groups = saveMock.mock.calls[0][0].skillGroups;
      expect(groups[groups.length - 1]).toEqual({ title: 'Metodo', skills: ['Scrum', 'TDD', 'Code review'] });
    });

    it('stores an empty project link as none', async () => {
      await renderOnTab('Progetti');

      await userEvent.click(await screen.findByRole('button', { name: /Aggiungi progetto/ }));
      const dialog = await screen.findByRole('dialog');
      await userEvent.type(within(dialog).getByLabelText(/Nome del progetto/), 'Nuovo');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Salva' }));

      await waitFor(() => expect(saveMock).toHaveBeenCalledTimes(1));
      const projects = saveMock.mock.calls[0][0].projects;
      expect(projects[projects.length - 1]).toEqual({ name: 'Nuovo', description: '', technologies: [], url: null });
    });

    it('manages the contact links', async () => {
      await renderOnTab('Link');

      await userEvent.click(await screen.findByRole('button', { name: /Aggiungi link/ }));
      const dialog = await screen.findByRole('dialog');
      await userEvent.type(within(dialog).getByLabelText(/^Nome/), 'LinkedIn');
      await userEvent.type(within(dialog).getByLabelText(/^Indirizzo/), 'https://linkedin.com/in/x');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Salva' }));

      await waitFor(() => expect(saveMock).toHaveBeenCalledTimes(1));
      expect(saveMock.mock.calls[0][0].links).toEqual([
        { label: 'GitHub', url: 'https://github.com/x' },
        { label: 'LinkedIn', url: 'https://linkedin.com/in/x' }
      ]);
    });

    it('manages education', async () => {
      await renderOnTab('Formazione');

      await userEvent.click(await screen.findByRole('button', { name: /Aggiungi percorso di studio/ }));
      const dialog = await screen.findByRole('dialog');
      await userEvent.type(within(dialog).getByLabelText(/^Istituto/), ' Ateneo ');
      await userEvent.type(within(dialog).getByLabelText(/^Titolo/), 'Laurea');
      await userEvent.type(within(dialog).getByLabelText(/^Periodo/), '2015');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Salva' }));

      await waitFor(() => expect(saveMock).toHaveBeenCalledTimes(1));
      expect(saveMock.mock.calls[0][0].education).toEqual([
        { institution: 'Ateneo', degree: 'Laurea', period: '2015', description: '' }
      ]);
    });

    it('manages certifications and stores an empty link as none', async () => {
      await renderOnTab('Certificazioni');

      await userEvent.click(await screen.findByRole('button', { name: /Aggiungi certificazione/ }));
      const dialog = await screen.findByRole('dialog');
      await userEvent.type(within(dialog).getByLabelText(/^Nome/), 'AZ-900');
      await userEvent.type(within(dialog).getByLabelText(/^Ente/), 'Microsoft');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Salva' }));

      await waitFor(() => expect(saveMock).toHaveBeenCalledTimes(1));
      expect(saveMock.mock.calls[0][0].certifications).toEqual([
        { name: 'AZ-900', issuer: 'Microsoft', year: '', url: null }
      ]);
    });

    it('manages languages', async () => {
      await renderOnTab('Lingue');

      await userEvent.click(await screen.findByRole('button', { name: /Aggiungi lingua/ }));
      const dialog = await screen.findByRole('dialog');
      await userEvent.type(within(dialog).getByLabelText(/^Lingua/), 'Inglese');
      await userEvent.type(within(dialog).getByLabelText(/^Livello/), 'C1');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Salva' }));

      await waitFor(() => expect(saveMock).toHaveBeenCalledTimes(1));
      expect(saveMock.mock.calls[0][0].languages).toEqual([{ name: 'Inglese', level: 'C1' }]);
    });  });
});
