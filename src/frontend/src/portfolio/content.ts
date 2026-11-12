import defaultContent from '../../../../content/portfolio.default.json';

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

export type Stat = { value: string; label: string };

export type PortfolioContent = {
  name: string;
  role: string;
  tagline: string;
  summary: string;
  location: string;
  workMode: string;
  email?: string | null;
  cvUrl?: string | null;
  photoUrl?: string | null;
  links: PortfolioLink[];
  skillGroups: SkillGroup[];
  experiences: Experience[];
  projects: Project[];
  stats?: Stat[] | null;
};

/**
 * Content shown when the API cannot be reached. It is the same file the API uses as its default
 * (`content/portfolio.default.json` at the repository root), so there is a single source of truth.
 * The published content lives in PostgreSQL and is edited from /admin → "Modifica portfolio".
 *
 * Sections with no entries are hidden automatically.
 */
export const portfolio: PortfolioContent = defaultContent;