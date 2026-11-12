export type PortfolioLink = { label: string; url: string };

export type SkillGroup = { title: string; skills: string[] };

export type Experience = {
  company: string;
  role: string;
  period: string;
  description: string;
  highlights?: string[] | null;
};

export type Project = {
  name: string;
  description: string;
  technologies: string[];
  url?: string | null;
};

export type PortfolioContent = {
  name: string;
  role: string;
  tagline: string;
  summary: string;
  location: string;
  workMode: string;
  email?: string | null;
  cvUrl?: string | null;
  links: PortfolioLink[];
  skillGroups: SkillGroup[];
  experiences: Experience[];
  projects: Project[];
};

/**
 * Fallback shown only when the API cannot be reached. The real content lives in PostgreSQL and
 * is edited from the admin area (/admin → "Modifica portfolio").
 *
 * Sections with no entries are hidden automatically.
 */
export const portfolio: PortfolioContent = {
  name: 'Zak Naceur',
  role: 'Senior .NET Developer',
  tagline: 'Costruisco applicazioni web affidabili con C#, ASP.NET Core e React.',
  summary:
    'Sviluppatore con oltre 10 anni di esperienza nella progettazione e nella consegna di applicazioni web, API e servizi cloud. Mi piace trasformare requisiti complessi in software semplice da usare e da mantenere.',
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
  projects: [
    {
      name: 'Portfolio e Job Tracker',
      description:
        'Questo sito: una pagina pubblica per presentarmi e un’area privata per cercare lavoro e tenere traccia delle candidature.',
      technologies: ['ASP.NET Core', 'React', 'TypeScript', 'PostgreSQL'],
      url: 'https://github.com/abderrazak-naceur/JobHunter'
    }
  ]
};
