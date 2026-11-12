import type { PortfolioContent, PortfolioLink } from '../portfolio/content';

/** Form-friendly shape: lists of words are edited as one text field. */
export type PortfolioDraft = {
  name: string;
  role: string;
  tagline: string;
  summary: string;
  location: string;
  workMode: string;
  email: string;
  cvUrl: string;
  links: PortfolioLink[];
  skillGroups: { title: string; skills: string }[]; // comma separated
  experiences: { company: string; role: string; period: string; description: string; highlights: string }[]; // one per line
  projects: { name: string; description: string; technologies: string; url: string }[]; // technologies comma separated
  stats: { value: string; label: string }[];
};

const splitOn = (text: string, separator: RegExp) =>
  text.split(separator).map(item => item.trim()).filter(Boolean);

export const splitComma = (text: string) => splitOn(text, /,/);
export const splitLines = (text: string) => splitOn(text, /\r?\n/);

export const emptyLink = (): PortfolioLink => ({ label: '', url: '' });
export const emptySkillGroup = () => ({ title: '', skills: '' });
export const emptyExperience = () => ({ company: '', role: '', period: '', description: '', highlights: '' });
export const emptyProject = () => ({ name: '', description: '', technologies: '', url: '' });
export const emptyStat = () => ({ value: '', label: '' });

export function toDraft(content: PortfolioContent): PortfolioDraft {
  return {
    name: content.name,
    role: content.role,
    tagline: content.tagline,
    summary: content.summary,
    location: content.location,
    workMode: content.workMode,
    email: content.email ?? '',
    cvUrl: content.cvUrl ?? '',
    links: content.links.map(link => ({ ...link })),
    skillGroups: content.skillGroups.map(group => ({ title: group.title, skills: group.skills.join(', ') })),
    experiences: content.experiences.map(item => ({
      company: item.company,
      role: item.role,
      period: item.period,
      description: item.description,
      highlights: (item.highlights ?? []).join('\n')
    })),
    projects: content.projects.map(project => ({
      name: project.name,
      description: project.description,
      technologies: project.technologies.join(', '),
      url: project.url ?? ''
    })),
    stats: (content.stats ?? []).map(stat => ({ ...stat }))
  };
}

export function fromDraft(draft: PortfolioDraft): PortfolioContent {
  return {
    name: draft.name.trim(),
    role: draft.role.trim(),
    tagline: draft.tagline.trim(),
    summary: draft.summary.trim(),
    location: draft.location.trim(),
    workMode: draft.workMode.trim(),
    email: draft.email.trim() || null,
    cvUrl: draft.cvUrl.trim() || null,
    links: draft.links.map(link => ({ label: link.label.trim(), url: link.url.trim() })),
    skillGroups: draft.skillGroups.map(group => ({ title: group.title.trim(), skills: splitComma(group.skills) })),
    experiences: draft.experiences.map(item => ({
      company: item.company.trim(),
      role: item.role.trim(),
      period: item.period.trim(),
      description: item.description.trim(),
      highlights: splitLines(item.highlights)
    })),
    projects: draft.projects.map(project => ({
      name: project.name.trim(),
      description: project.description.trim(),
      technologies: splitComma(project.technologies),
      url: project.url.trim() || null
    })),
    stats: draft.stats.map(stat => ({ value: stat.value.trim(), label: stat.label.trim() }))
  };
}
