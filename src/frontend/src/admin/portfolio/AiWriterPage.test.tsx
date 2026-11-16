import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sampleContent } from '@/test/fixtures';
import { generateAiDraft } from '@/services/portfolioApi';
import AiWriterPage from './AiWriterPage';

vi.mock('@/services/portfolioApi', () => ({ generateAiDraft: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const generateMock = vi.mocked(generateAiDraft);

describe('AiWriterPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    generateMock.mockResolvedValue({ draft: 'Un post professionale di esempio.', model: 'gpt-4.1-mini' });
  });

  it('requires a topic before generating', async () => {
    render(<AiWriterPage portfolio={sampleContent} />);
    expect(screen.getByRole('button', { name: /Genera bozza/ })).toBeDisabled();
    expect(generateMock).not.toHaveBeenCalled();
  });

  it('generates a LinkedIn draft using the selected tone and language', async () => {
    render(<AiWriterPage portfolio={sampleContent} />);
    await userEvent.type(screen.getByLabelText(/Argomento e obiettivo/), 'Il mio percorso .NET');
    await userEvent.selectOptions(screen.getByLabelText('Tono'), 'technical');
    await userEvent.selectOptions(screen.getByLabelText('Lingua'), 'English');
    await userEvent.type(screen.getByLabelText(/Call to action/), 'Let us connect');
    await userEvent.click(screen.getByRole('button', { name: /Genera bozza/ }));

    await waitFor(() => expect(generateMock).toHaveBeenCalledWith({
      channel: 'linkedin',
      tone: 'technical',
      language: 'English',
      topic: 'Il mio percorso .NET',
      callToAction: 'Let us connect'
    }, sampleContent));
    expect(await screen.findByRole('textbox', { name: 'Bozza generata' })).toHaveValue('Un post professionale di esempio.');
    expect(screen.getByText(/gpt-4.1-mini/)).toBeInTheDocument();
  });

  it('keeps the editor available for revisions', async () => {
    render(<AiWriterPage portfolio={sampleContent} />);
    const editor = screen.getByRole('textbox', { name: 'Bozza generata' });
    await userEvent.type(editor, 'Testo modificato');
    expect(editor).toHaveValue('Testo modificato');
  });

  it('shows the backend configuration error', async () => {
    generateMock.mockRejectedValue(new Error('AI Writer non configurato.'));
    render(<AiWriterPage portfolio={sampleContent} />);
    await userEvent.type(screen.getByLabelText(/Argomento e obiettivo/), 'Un argomento');
    await userEvent.click(screen.getByRole('button', { name: /Genera bozza/ }));
    await waitFor(() => expect(generateMock).toHaveBeenCalled());
  });
});
