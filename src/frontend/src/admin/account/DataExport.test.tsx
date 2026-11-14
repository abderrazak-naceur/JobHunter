import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { exportApi } from '@/services/exportApi';
import DataExport from './DataExport';

vi.mock('@/services/exportApi', () => ({ exportApi: { backup: vi.fn(), applicationsCsv: vi.fn() } }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() }, Toaster: () => null }));

const api = vi.mocked(exportApi);

describe('DataExport', () => {
  beforeEach(() => vi.resetAllMocks());

  it('downloads the JSON backup and confirms with the file name', async () => {
    api.backup.mockResolvedValue('portfolio-backup-20261112.json');
    render(<DataExport />);

    await userEvent.click(screen.getByRole('button', { name: /Scarica il backup/ }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Scaricato portfolio-backup-20261112.json'));
    expect(api.applicationsCsv).not.toHaveBeenCalled();
  });

  it('downloads the applications as CSV', async () => {
    api.applicationsCsv.mockResolvedValue('candidature.csv');
    render(<DataExport />);

    await userEvent.click(screen.getByRole('button', { name: /Candidature in CSV/ }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Scaricato candidature.csv'));
  });

  it('shows the reason when the download fails, and enables the buttons again', async () => {
    api.backup.mockRejectedValue(new Error('Download non riuscito: HTTP 500'));
    render(<DataExport />);

    await userEvent.click(screen.getByRole('button', { name: /Scarica il backup/ }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Download non riuscito: HTTP 500'));
    expect(screen.getByRole('button', { name: /Scarica il backup/ })).toBeEnabled();
  });

  it('says that no secrets are included', () => {
    render(<DataExport />);

    expect(screen.getByText(/Non contiene password né chiavi/)).toBeInTheDocument();
  });
});
