import type { PortfolioContent } from '../portfolio/content';

/** A small, fixed portfolio used by the tests, so they do not depend on the real content. */
export const sampleContent: PortfolioContent = {
  name: 'Zak Naceur',
  role: 'Senior .NET Developer',
  tagline: 'Costruisco applicazioni web affidabili con C#, ASP.NET Core e React.',
  summary:
    'Sviluppatore con oltre 10 anni di esperienza nella progettazione e nella consegna di applicazioni web, API e servizi cloud.',
  location: 'Milano e dintorni',
  workMode: 'Remote / Hybrid',
  email: undefined,
  cvUrl: undefined,
  links: [{ label: 'GitHub', url: 'https://github.com/abderrazak-naceur' }],
  skillGroups: [
    { title: 'Backend', skills: ['C# / .NET', 'ASP.NET Core', 'REST API'] },
    { title: 'Frontend', skills: ['React', 'TypeScript'] },
    { title: 'Dati', skills: ['SQL Server', 'PostgreSQL'] },
    { title: 'Cloud e DevOps', skills: ['Azure', 'Docker'] }
  ],
  experiences: [],
  stats: [{ value: '10+', label: 'Anni di esperienza' }],
  projects: [
    {
      name: 'Portfolio e Job Tracker',
      description: 'Questo sito.',
      technologies: ['ASP.NET Core', 'React', 'TypeScript', 'PostgreSQL'],
      url: 'https://github.com/abderrazak-naceur/JobHunter'
    }
  ]
};
