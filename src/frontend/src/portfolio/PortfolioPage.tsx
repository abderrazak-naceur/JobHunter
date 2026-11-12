import { ArrowDown, ArrowUpRight, Check, FileDown, Laptop, Mail, MapPin } from 'lucide-react';
import { portfolio as defaultContent, type PortfolioContent } from './content';
import { cardGradients, iconForGroup, initialsOf, isExternal } from './helpers';
import { useScrollProgress } from './hooks';
import Reveal from './Reveal';
import './portfolio.css';

type Props = { content?: PortfolioContent };

const card =
  'group relative h-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm ' +
  'transition duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-brand-600/10 motion-reduce:transition-none motion-reduce:hover:translate-y-0';

const chip = 'rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700 transition-colors group-hover:bg-brand-100';

const focusRing = 'focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-accent-400';

function SectionHeading({ id, eyebrow, title }: { id: string; eyebrow: string; title: string }) {
  return (
    <Reveal className="mb-12 max-w-2xl">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">{eyebrow}</p>
      <h2 id={id} className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{title}</h2>
      <div aria-hidden="true" className="mt-5 h-1.5 w-16 rounded-full bg-gradient-to-r from-brand-600 to-accent-400" />
    </Reveal>
  );
}

export default function PortfolioPage({ content = defaultContent }: Props) {
  const {
    name, role, tagline, summary, location, workMode, email, cvUrl,
    links, skillGroups, experiences, projects
  } = content;
  const stats = content.stats ?? [];
  const progressRef = useScrollProgress<HTMLDivElement>();

  const allSkills = [...new Set(skillGroups.flatMap(group => group.skills))];
  const floatingSkills = allSkills.slice(0, 3);
  const hasContacts = Boolean(email) || links.length > 0;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-700 antialiased selection:bg-brand-600 selection:text-white">
      <a
        href="#contenuto"
        className={`absolute left-4 top-[-4rem] z-50 rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white focus:top-4 ${focusRing}`}
      >
        Vai al contenuto
      </a>
      <div
        ref={progressRef}
        aria-hidden="true"
        style={{ transform: 'scaleX(0)' }}
        className="fixed inset-x-0 top-0 z-40 h-1 origin-left bg-gradient-to-r from-accent-400 to-brand-500"
      />

      {/* Hero */}
      <header className="relative isolate overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-brand-600 text-white">
        <div aria-hidden="true" className="bg-grid absolute inset-0 -z-10" />
        <div aria-hidden="true" className="absolute -left-24 -top-32 -z-10 h-96 w-96 rounded-full bg-accent-400/30 blur-3xl motion-safe:animate-float" />
        <div aria-hidden="true" className="absolute -bottom-40 right-0 -z-10 h-[28rem] w-[28rem] rounded-full bg-fuchsia-500/25 blur-3xl motion-safe:animate-float-slow" />

        <div className="mx-auto grid min-h-[min(92vh,50rem)] max-w-6xl items-center gap-12 px-6 pb-32 pt-24 lg:grid-cols-[1.35fr_1fr]">
          <div>
            <Reveal>
              <p className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-sm font-semibold backdrop-blur">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-accent-400 motion-safe:animate-pulse" />
                {role}
              </p>
            </Reveal>
            <Reveal delay={100}>
              <h1 className="mt-6 text-5xl font-black leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
                <span className="bg-gradient-to-r from-white via-brand-100 to-accent-300 bg-clip-text text-transparent">{name}</span>
              </h1>
            </Reveal>
            <Reveal delay={200}>
              <p className="mt-6 max-w-xl text-lg text-brand-100 sm:text-xl">{tagline}</p>
            </Reveal>
            <Reveal delay={300}>
              <ul className="mt-8 flex flex-wrap gap-3 text-sm font-medium">
                <li className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 backdrop-blur"><MapPin size={16} aria-hidden="true" /> {location}</li>
                <li className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 backdrop-blur"><Laptop size={16} aria-hidden="true" /> {workMode}</li>
              </ul>
            </Reveal>
            {(email || cvUrl) && (
              <Reveal delay={400}>
                <div className="mt-10 flex flex-wrap gap-4">
                  {email && (
                    <a
                      href={`mailto:${email}`}
                      className={`group inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 font-bold text-brand-800 shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:bg-accent-300 ${focusRing}`}
                    >
                      <Mail size={18} aria-hidden="true" /> Scrivimi
                    </a>
                  )}
                  {cvUrl && (
                    <a
                      href={cvUrl}
                      download
                      className={`inline-flex items-center gap-2 rounded-full border-2 border-white/60 px-7 py-3.5 font-bold text-white transition hover:-translate-y-0.5 hover:border-white hover:bg-white/10 ${focusRing}`}
                    >
                      <FileDown size={18} aria-hidden="true" /> Scarica il CV
                    </a>
                  )}
                </div>
              </Reveal>
            )}
          </div>

          {/* Decorative monogram with orbiting ring and floating skills */}
          <div aria-hidden="true" className="relative mx-auto hidden h-80 w-80 lg:block">
            <div className="absolute inset-0 rounded-full border border-dashed border-white/30 motion-safe:animate-spin-slow" />
            <div className="absolute inset-6 rounded-full bg-gradient-to-br from-white/20 to-white/5 shadow-2xl ring-1 ring-white/30 backdrop-blur-md" />
            <div className="absolute inset-0 flex items-center justify-center text-7xl font-black tracking-tight text-white">
              {initialsOf(name)}
            </div>
            {floatingSkills.map((skill, index) => (
              <span
                key={skill}
                className={`absolute rounded-full bg-white px-4 py-1.5 text-sm font-bold text-brand-700 shadow-xl motion-safe:animate-float ${
                  ['-left-6 top-10', '-right-8 top-1/2', 'bottom-2 left-10'][index]
                }`}
                style={{ animationDelay: `${index * 1.3}s` }}
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        <a
          href="#contenuto"
          aria-label="Scorri ai contenuti"
          className={`absolute bottom-24 left-1/2 hidden -translate-x-1/2 rounded-full border border-white/40 p-2 text-white/80 transition hover:text-white sm:block ${focusRing}`}
        >
          <ArrowDown size={20} aria-hidden="true" className="motion-safe:animate-bob" />
        </a>

        <svg aria-hidden="true" className="absolute bottom-0 left-0 w-full text-slate-50" viewBox="0 0 1440 80" preserveAspectRatio="none" height="80">
          <path fill="currentColor" d="M0,40 C240,90 480,0 720,30 C960,60 1200,90 1440,40 L1440,80 L0,80 Z" />
        </svg>
      </header>

      <main id="contenuto">
        {/* Numbers */}
        {stats.length > 0 && (
          <ul aria-label="In numeri" className="relative z-10 mx-auto -mt-16 flex max-w-6xl flex-wrap justify-center gap-4 px-6">
            {stats.map((stat, index) => (
              <li key={`${stat.label}-${index}`} className="w-full max-w-xs flex-1 sm:min-w-[14rem]">
                <Reveal delay={index * 100} className="h-full">
                  <div className="h-full rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-xl shadow-brand-900/10 transition duration-300 hover:-translate-y-1 hover:shadow-2xl motion-reduce:transition-none">
                    <p className="bg-gradient-to-r from-brand-600 to-accent-400 bg-clip-text text-5xl font-black tracking-tight text-transparent">{stat.value}</p>
                    <p className="mt-2 text-sm font-semibold uppercase tracking-wide text-slate-500">{stat.label}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        )}

        {/* Skills strip (decorative: the same skills are listed below) */}
        {allSkills.length > 0 && (
          <div aria-hidden="true" className="marquee mt-16 overflow-hidden border-y border-slate-200 bg-white py-5">
            <div className="marquee-track flex w-max gap-4 motion-safe:animate-marquee">
              {[...allSkills, ...allSkills].map((skill, index) => (
                <span key={`${skill}-${index}`} className="whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-5 py-2 text-sm font-semibold text-slate-600">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* About */}
        <section aria-labelledby="pf-about" className="mx-auto max-w-6xl px-6 py-24">
          <div className="grid gap-12 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <SectionHeading id="pf-about" eyebrow="Il mio profilo" title="Chi sono" />
              <Reveal delay={100}>
                <p className="text-lg leading-8 text-slate-600">{summary}</p>
              </Reveal>
            </div>
            <Reveal delay={200} className="lg:col-span-2">
              <dl className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg shadow-brand-900/5">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-widest text-slate-400">Ruolo</dt>
                  <dd className="mt-1 text-lg font-bold text-slate-900">{role}</dd>
                </div>
                <div className="mt-5 border-t border-slate-100 pt-5">
                  <dt className="text-xs font-semibold uppercase tracking-widest text-slate-400">Dove</dt>
                  <dd className="mt-1 font-semibold text-slate-800">{location}</dd>
                </div>
                <div className="mt-5 border-t border-slate-100 pt-5">
                  <dt className="text-xs font-semibold uppercase tracking-widest text-slate-400">Modalità</dt>
                  <dd className="mt-1 font-semibold text-slate-800">{workMode}</dd>
                </div>
              </dl>
            </Reveal>
          </div>
        </section>

        {/* Skills */}
        {skillGroups.length > 0 && (
          <section aria-labelledby="pf-skills" className="mx-auto max-w-6xl px-6 pb-24">
            <SectionHeading id="pf-skills" eyebrow="Cosa so fare" title="Competenze" />
            <div className={`grid gap-6 sm:grid-cols-2 ${skillGroups.length === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
              {skillGroups.map((group, index) => {
                const Icon = iconForGroup(group.title);
                return (
                  <Reveal key={group.title} delay={index * 100} className="h-full">
                    <div className={`${card} p-7`}>
                      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-gradient-to-r from-brand-600 to-accent-400 transition duration-500 group-hover:scale-x-100" />
                      <div aria-hidden="true" className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${cardGradients[index % cardGradients.length]} text-white shadow-lg transition duration-300 group-hover:rotate-6 group-hover:scale-110`}>
                        <Icon size={24} />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900">{group.title}</h3>
                      <ul className="mt-4 flex flex-wrap gap-2">
                        {group.skills.map(skill => <li key={skill} className={chip}>{skill}</li>)}
                      </ul>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </section>
        )}

        {/* Experience */}
        {experiences.length > 0 && (
          <section aria-labelledby="pf-experience" className="bg-white py-24">
            <div className="mx-auto max-w-6xl px-6">
              <SectionHeading id="pf-experience" eyebrow="Il mio percorso" title="Esperienza" />
              <ol className="relative space-y-8 border-l-2 border-brand-100 pl-8 sm:pl-10">
                {experiences.map((item, index) => (
                  <li key={`${item.company}-${item.period}-${index}`} className="relative">
                    <span aria-hidden="true" className="absolute -left-[2.55rem] top-7 h-4 w-4 rounded-full border-4 border-white bg-brand-600 shadow ring-4 ring-brand-100 sm:-left-[3.05rem]" />
                    <Reveal delay={index * 80}>
                      <div className={`${card} p-7`}>
                        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
                          <h3 className="text-xl font-bold text-slate-900">{item.role} · {item.company}</h3>
                          <span className="rounded-full bg-brand-50 px-4 py-1 text-sm font-semibold text-brand-700">{item.period}</span>
                        </div>
                        {item.description && <p className="mt-4 leading-7 text-slate-600">{item.description}</p>}
                        {item.highlights && item.highlights.length > 0 && (
                          <ul className="mt-5 space-y-2">
                            {item.highlights.map(highlight => (
                              <li key={highlight} className="flex gap-3 text-slate-600">
                                <Check size={18} aria-hidden="true" className="mt-1 shrink-0 text-emerald-500" />
                                <span>{highlight}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </Reveal>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        )}

        {/* Projects */}
        {projects.length > 0 && (
          <section aria-labelledby="pf-projects" className="mx-auto max-w-6xl px-6 py-24">
            <SectionHeading id="pf-projects" eyebrow="Cosa ho costruito" title="Progetti" />
            <div className="grid gap-6 md:grid-cols-2">
              {projects.map((project, index) => (
                <Reveal key={project.name} delay={index * 100} className="h-full">
                  <article className={`${card} flex flex-col`}>
                    <div className={`relative h-36 overflow-hidden bg-gradient-to-br ${cardGradients[index % cardGradients.length]}`}>
                      <div aria-hidden="true" className="bg-grid absolute inset-0 opacity-70" />
                      <span aria-hidden="true" className="absolute bottom-4 left-6 text-5xl font-black text-white/90 transition duration-500 group-hover:translate-x-2">
                        {initialsOf(project.name)}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col p-7">
                      <h3 className="text-xl font-bold text-slate-900">{project.name}</h3>
                      {project.description && <p className="mt-3 leading-7 text-slate-600">{project.description}</p>}
                      {project.technologies.length > 0 && (
                        <ul className="mt-5 flex flex-wrap gap-2">
                          {project.technologies.map(tech => <li key={tech} className={chip}>{tech}</li>)}
                        </ul>
                      )}
                      {project.url && (
                        <a
                          href={project.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className={`mt-auto inline-flex items-center gap-1.5 pt-6 font-bold text-brand-600 transition hover:text-brand-800 ${focusRing}`}
                        >
                          Vedi il progetto
                          <ArrowUpRight size={18} aria-hidden="true" className="transition duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-1" />
                        </a>
                      )}
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          </section>
        )}

        {/* Contacts */}
        {hasContacts && (
          <section aria-labelledby="pf-contacts" className="mx-auto max-w-6xl px-6 pb-24">
            <Reveal>
              <div className="relative isolate overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 px-8 py-16 text-center text-white shadow-2xl shadow-brand-900/30 sm:px-16">
                <div aria-hidden="true" className="bg-grid absolute inset-0 -z-10" />
                <div aria-hidden="true" className="absolute -right-16 -top-16 -z-10 h-64 w-64 rounded-full bg-accent-400/30 blur-3xl motion-safe:animate-float" />
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-300">Lavoriamo insieme</p>
                <h2 id="pf-contacts" className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Contatti</h2>
                <p className="mx-auto mt-4 max-w-xl text-lg text-brand-100">Hai un progetto o un’opportunità in mente? Parliamone.</p>
                <ul className="mt-10 flex flex-wrap items-center justify-center gap-4">
                  {email && (
                    <li>
                      <a
                        href={`mailto:${email}`}
                        className={`inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 font-bold text-brand-800 shadow-lg transition hover:-translate-y-0.5 hover:bg-accent-300 ${focusRing}`}
                      >
                        <Mail size={18} aria-hidden="true" />
                        {email}
                      </a>
                    </li>
                  )}
                  {links.map(link => (
                    <li key={link.url}>
                      <a
                        href={link.url}
                        {...(isExternal(link.url) ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
                        className={`inline-flex items-center gap-2 rounded-full border-2 border-white/60 px-7 py-3.5 font-bold text-white transition hover:-translate-y-0.5 hover:border-white hover:bg-white/10 ${focusRing}`}
                      >
                        {link.label}
                        <ArrowUpRight size={18} aria-hidden="true" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </section>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-8 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} {name}
      </footer>
    </div>
  );
}
