import { describe, expect, it } from 'vitest';
import { portfolio, type PortfolioContent } from '../portfolio/content';
import { fromDraft, splitComma, splitLines, toDraft } from './portfolioDraft';

const content: PortfolioContent = {
  ...portfolio,
  photoUrl: null,
  email: 'me@example.com',
  cvUrl: 'https://example.com/cv.pdf',
  experiences: [{ company: 'Acme', role: 'Dev', period: '2020', description: 'Work', highlights: ['One', 'Two'] }],
  projects: [{ name: 'Site', description: 'Desc', technologies: ['React', 'C#'], url: null }]
};

describe('portfolioDraft', () => {
  it('splits comma separated and line separated text, dropping blanks', () => {
    expect(splitComma(' a, b ,, ,c ')).toEqual(['a', 'b', 'c']);
    expect(splitLines('one\r\n\n  two  \nthree')).toEqual(['one', 'two', 'three']);
    expect(splitComma('')).toEqual([]);
  });

  it('turns lists into editable text fields', () => {
    const draft = toDraft(content);

    expect(draft.skillGroups[0]).toEqual({ title: 'Backend', skills: 'C# / .NET, ASP.NET Core, REST API' });
    expect(draft.experiences[0].highlights).toBe('One\nTwo');
    expect(draft.projects[0]).toMatchObject({ technologies: 'React, C#', url: '' });
  });

  it('round-trips the content without losing anything', () => {
    expect(fromDraft(toDraft(content))).toEqual(content);
  });

  it('turns blank optional fields into null and trims text', () => {
    const draft = toDraft(content);
    draft.name = '  Mario  ';
    draft.email = '  ';
    draft.cvUrl = '';
    draft.projects[0].url = ' ';
    draft.experiences[0].highlights = '\n';

    const result = fromDraft(draft);

    expect(result.name).toBe('Mario');
    expect(result.email).toBeNull();
    expect(result.cvUrl).toBeNull();
    expect(result.projects[0].url).toBeNull();
    expect(result.experiences[0].highlights).toEqual([]);
  });

  it('handles content whose optional fields are missing', () => {
    const draft = toDraft({ ...portfolio, email: undefined, cvUrl: undefined, experiences: [{ company: 'A', role: 'B', period: 'C', description: '', highlights: null }] });

    expect(draft.email).toBe('');
    expect(draft.experiences[0].highlights).toBe('');
  });
});
