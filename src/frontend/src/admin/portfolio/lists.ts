import type { Experience, PortfolioLink, Project, SkillGroup, Stat } from '@/portfolio/content';

/** One input of a create/edit dialog. Every value is edited as text. */
export type FieldDef = {
  name: string;
  label: string;
  kind?: 'text' | 'textarea' | 'url';
  required?: boolean;
  maxLength?: number;
  placeholder?: string;
  help?: string;
};

export type FormValues = Record<string, string>;

/** Describes one repeatable list of the portfolio (experiences, projects, ...) so one component can manage all of them. */
export type EntityConfig<T> = {
  singular: string;
  plural: string;
  description: string;
  /** Maximum number of items accepted by the API, when there is a small one. */
  max?: number;
  fields: FieldDef[];
  title: (item: T) => string;
  subtitle: (item: T) => string;
  toForm: (item: T) => FormValues;
  fromForm: (values: FormValues) => T;
};

const splitOn = (text: string, separator: RegExp) => text.split(separator).map(item => item.trim()).filter(Boolean);

export const splitComma = (text: string) => splitOn(text, /,/);
export const splitLines = (text: string) => splitOn(text, /\r?\n/);

export const statsConfig: EntityConfig<Stat> = {
  singular: 'numero',
  plural: 'Numeri in evidenza',
  description: 'Le card con un numero grande sotto la presentazione, ad esempio “10+ Anni di esperienza”.',
  max: 4,
  fields: [
    { name: 'value', label: 'Valore', required: true, maxLength: 20, placeholder: '10+' },
    { name: 'label', label: 'Etichetta', required: true, maxLength: 60, placeholder: 'Anni di esperienza' }
  ],
  title: stat => stat.value,
  subtitle: stat => stat.label,
  toForm: stat => ({ value: stat.value, label: stat.label }),
  fromForm: values => ({ value: values.value.trim(), label: values.label.trim() })
};

export const skillGroupsConfig: EntityConfig<SkillGroup> = {
  singular: 'gruppo di competenze',
  plural: 'Competenze',
  description: 'Le competenze sono raggruppate per area: ogni gruppo è una card del carosello.',
  max: 20,
  fields: [
    { name: 'title', label: 'Nome del gruppo', required: true, maxLength: 60, placeholder: 'Backend' },
    { name: 'skills', label: 'Competenze', kind: 'textarea', help: 'Separate da virgola, ad esempio: C#, .NET Core, Entity Framework' }
  ],
  title: group => group.title,
  subtitle: group => group.skills.join(', '),
  toForm: group => ({ title: group.title, skills: group.skills.join(', ') }),
  fromForm: values => ({ title: values.title.trim(), skills: splitComma(values.skills) })
};

export const experiencesConfig: EntityConfig<Experience> = {
  singular: 'esperienza',
  plural: 'Esperienza',
  description: 'In ordine cronologico inverso: la prima è la più recente. Usa le frecce per riordinare.',
  max: 30,
  fields: [
    { name: 'company', label: 'Azienda (e cliente)', required: true, maxLength: 120, placeholder: 'SEFIN SPA (BMW Financial Services)' },
    { name: 'role', label: 'Ruolo', required: true, maxLength: 120, placeholder: 'Consultant Full-Stack Developer' },
    { name: 'period', label: 'Periodo', required: true, maxLength: 60, placeholder: '08/2025 – oggi' },
    { name: 'description', label: 'Descrizione', kind: 'textarea', maxLength: 2000 },
    { name: 'highlights', label: 'Risultati', kind: 'textarea', help: 'Uno per riga' }
  ],
  title: item => `${item.role} · ${item.company}`,
  subtitle: item => item.period,
  toForm: item => ({
    company: item.company,
    role: item.role,
    period: item.period,
    description: item.description,
    highlights: (item.highlights ?? []).join('\n')
  }),
  fromForm: values => ({
    company: values.company.trim(),
    role: values.role.trim(),
    period: values.period.trim(),
    description: values.description.trim(),
    highlights: splitLines(values.highlights)
  })
};

export const projectsConfig: EntityConfig<Project> = {
  singular: 'progetto',
  plural: 'Progetti',
  description: 'Il primo progetto compare in grande, gli altri come riquadri.',
  max: 30,
  fields: [
    { name: 'name', label: 'Nome del progetto', required: true, maxLength: 120 },
    { name: 'description', label: 'Descrizione', kind: 'textarea', maxLength: 1000 },
    { name: 'technologies', label: 'Tecnologie', help: 'Separate da virgola, ad esempio: React, PostgreSQL' },
    { name: 'url', label: 'Link', kind: 'url', maxLength: 500, placeholder: 'https://...' }
  ],
  title: project => project.name,
  subtitle: project => project.technologies.join(' · '),
  toForm: project => ({
    name: project.name,
    description: project.description,
    technologies: project.technologies.join(', '),
    url: project.url ?? ''
  }),
  fromForm: values => ({
    name: values.name.trim(),
    description: values.description.trim(),
    technologies: splitComma(values.technologies),
    url: values.url.trim() || null
  })
};

export const linksConfig: EntityConfig<PortfolioLink> = {
  singular: 'link',
  plural: 'Link',
  description: 'GitHub, LinkedIn o altri indirizzi mostrati nella sezione Contatti.',
  max: 10,
  fields: [
    { name: 'label', label: 'Nome', required: true, maxLength: 60, placeholder: 'LinkedIn' },
    { name: 'url', label: 'Indirizzo', kind: 'url', required: true, maxLength: 500, placeholder: 'https://...' }
  ],
  title: link => link.label,
  subtitle: link => link.url,
  toForm: link => ({ label: link.label, url: link.url }),
  fromForm: values => ({ label: values.label.trim(), url: values.url.trim() })
};
