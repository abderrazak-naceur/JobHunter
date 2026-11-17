import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import BlogMarkdownEditor from './BlogMarkdownEditor';

describe('BlogMarkdownEditor', () => {
  it('shows a live preview with headings, lists, code and tables', () => {
    render(<BlogMarkdownEditor value={'## Introduzione\n\nTesto **importante**.\n\n1. Primo passaggio\n2. Secondo passaggio\n\n```csharp\nvar answer = 42;\n```\n\n| Concetto | Valore |\n| --- | --- |\n| Risposta | 42 |'} onChange={() => undefined} />);

    expect(screen.getByRole('heading', { name: 'Introduzione' })).toBeInTheDocument();
    expect(screen.getByText('importante')).toBeInTheDocument();
    expect(screen.getByText('Primo passaggio')).toBeInTheDocument();
    expect(screen.getByText('var answer = 42;')).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('switches between writing and preview modes', async () => {
    render(<BlogMarkdownEditor value="Contenuto di prova" onChange={() => undefined} />);

    expect(screen.getByRole('textbox')).toBeInTheDocument();
    await (await import('@testing-library/user-event')).default.click(screen.getByRole('button', { name: /Anteprima/ }));
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByText('Contenuto di prova')).toBeInTheDocument();
  });
});
