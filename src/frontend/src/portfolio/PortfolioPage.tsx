import { useState, type ReactNode } from 'react';
import { ArrowUpRight, Check, ChevronRight, FileDown, Laptop, Link2, Mail, MapPin, Menu, Sparkles, X } from 'lucide-react';
import AnimatedNumber from './AnimatedNumber';
import Avatar from './Avatar';
import Carousel from './Carousel';
import { portfolio as defaultContent, type PortfolioContent } from './content';
import InteractiveCard from './InteractiveCard';
import { cardGradients, iconForGroup, initialsOf, isExternal, pluralize, tagStyles } from './helpers';
import { useScrollProgress } from './hooks';
import Reveal from './Reveal';
import './portfolio.css';

type Props = { content?: PortfolioContent };

/** Content width: fluid, edge to edge on every screen, with a generous cap only on ultra-wide monitors. */
const wrap = 'mx-auto w-full max-w-[112rem] px-5 sm:px-8 lg:px-12 2xl:px-16';

const focusRing = 'focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-brand-600';
const tag = 'inline-block rounded px-2.5 py-1 text-[0.7rem] font-extrabold uppercase tracking-wider';
const lift = 'transition duration-300 hover:-translate-y-1.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0';

function SectionHeading({ id, eyebrow, title, dark = false, align = 'center' }: {
  id: string; eyebrow: string; title: string; dark?: boolean; align?: 'center' | 'left';
}) {
  const center = align === 'center';
  return (
    <Reveal className={`mb-10 max-w-2xl lg:mb-14 ${center ? 'mx-auto text-center' : ''}`}>
      <p className={`text-sm font-bold uppercase tracking-[0.2em] ${dark ? 'text-accent-300' : 'text-brand-600'}`}>{eyebrow}</p>
      <h2 id={id} className={`mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl ${dark ? 'text-white' : 'text-brand-900'}`}>{title}</h2>
      <div aria-hidden="true" className={`mt-5 h-1.5 w-16 rounded-full bg-gradient-to-r from-brand-600 to-accent-400 ${center ? 'mx-auto' : ''}`} />
    </Reveal>
  );
}

/** Round arrow button, decorative: the whole card is the link. */
function ArrowCircle({ light = false }: { light?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`grid h-12 w-12 shrink-0 place-items-center rounded-full shadow-lg transition duration-300 group-hover:translate-x-1 group-hover:scale-110 ${
        light ? 'bg-white text-brand-700' : 'bg-brand-600 text-white'
      }`}
    >
      <ChevronRight size={22} />
    </span>
  );
}

function Teaser({ href, className, title, subtitle, children, light = false }: {
  href: string; className: string; title: string; subtitle: string; children?: ReactNode; light?: boolean;
}) {
  return (
    <a href={href} className={`block h-full rounded-[2rem] ${focusRing}`}>
      <InteractiveCard
        className={`group relative flex h-full min-h-[13rem] flex-col justify-between gap-5 overflow-hidden rounded-[2rem] p-7 hover:shadow-2xl lg:p-9 ${lift} ${className}`}
      >
        <span className="block">
          <span className="block text-2xl font-extrabold sm:text-3xl">{title}</span>
          <span className={`mt-2 block max-w-sm text-base ${light ? 'text-brand-100' : 'text-brand-900/80'}`}>{subtitle}</span>
        </span>
        {children}
        <span className="flex justify-end"><ArrowCircle light={light} /></span>
      </InteractiveCard>
    </a>
  );
}

export default function PortfolioPage({ content = defaultContent }: Props) {
  const {
    name, role, tagline, summary, location, workMode, email, cvUrl, photoUrl,
    links, skillGroups, experiences, projects
  } = content;
  const stats = content.stats ?? [];
  const education = content.education ?? [];
  const certifications = content.certifications ?? [];
  const languages = content.languages ?? [];
  const hasBackground = education.length > 0 || certifications.length > 0 || languages.length > 0;
  const progressRef = useScrollProgress<HTMLDivElement>();
  const [menuOpen, setMenuOpen] = useState(false);

  const allSkills = [...new Set(skillGroups.flatMap(group => group.skills))];
  const hasContacts = Boolean(email) || links.length > 0;
  const [featured, ...otherProjects] = projects;

  const sections = [
    ...(skillGroups.length > 0 ? [{ id: 'competenze', label: 'Competenze' }] : []),
    ...(experiences.length > 0 ? [{ id: 'esperienza', label: 'Esperienza' }] : []),
    ...(hasBackground ? [{ id: 'formazione', label: 'Formazione' }] : []),
    ...(projects.length > 0 ? [{ id: 'progetti', label: 'Progetti' }] : []),
    ...(hasContacts ? [{ id: 'contatti', label: 'Contatti' }] : [])
  ];

  const hasSkillsTeaser = skillGroups.length > 0;
  const hasSecondTeaser = projects.length > 0 || experiences.length > 0 || hasContacts;
  const hasTeasers = hasSkillsTeaser || hasSecondTeaser;

  return (
    <div id="top" className="relative min-h-screen overflow-x-clip bg-lav-100 font-sans text-slate-700 antialiased selection:bg-brand-600 selection:text-white">
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
        className="fixed inset-x-0 top-0 z-50 h-1 origin-left bg-gradient-to-r from-accent-400 to-brand-500"
      />

      {/* Top strip */}
      <div className="bg-brand-700 text-xs text-white">
        <div className={`${wrap} flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2`}>
          <span className="font-bold uppercase tracking-widest">Portfolio</span>
          <span className="flex items-center gap-1.5 text-white/90"><MapPin size={12} aria-hidden="true" /> {location} · {workMode}</span>
        </div>
      </div>

      {/* Site header */}
      <header className="sticky top-0 z-40 border-b border-lav-300 bg-white/90 backdrop-blur">
        <div className={`${wrap} flex items-center justify-between gap-4 py-3`}>
          <a href="#top" className={`flex items-center gap-3 font-extrabold text-brand-900 ${focusRing}`}>
            <span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-sm text-white">{initialsOf(name)}</span>
            <span className="hidden sm:inline">{name}</span>
            <span className="sm:hidden">Home</span>
          </a>

          {sections.length > 0 && (
            <nav aria-label="Sezioni" className="hidden items-center gap-1 md:flex">
              {sections.map(section => (
                <a key={section.id} href={`#${section.id}`} className={`rounded-full px-4 py-2 text-sm font-semibold text-brand-900 transition hover:bg-lav-100 ${focusRing}`}>
                  {section.label}
                </a>
              ))}
            </nav>
          )}

          <div className="flex items-center gap-2">
            {email && (
              <a href={`mailto:${email}`} className={`hidden rounded-full bg-rose-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-rose-700 sm:inline-block ${focusRing}`}>
                Contattami
              </a>
            )}
            {sections.length > 0 && (
              <button
                type="button"
                aria-expanded={menuOpen}
                aria-controls="pf-mobile-menu"
                onClick={() => setMenuOpen(open => !open)}
                className={`inline-flex items-center gap-2 rounded-full bg-rose-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-rose-700 md:hidden ${focusRing}`}
              >
                {menuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />} Menu
              </button>
            )}
          </div>
        </div>

        {menuOpen && sections.length > 0 && (
          <nav id="pf-mobile-menu" aria-label="Sezioni (menu)" className="border-t border-lav-300 bg-white px-5 py-3 sm:px-8 md:hidden">
            <ul className="grid gap-1">
              {sections.map(section => (
                <li key={section.id}>
                  <a href={`#${section.id}`} onClick={() => setMenuOpen(false)} className={`block rounded-xl px-4 py-3 font-semibold text-brand-900 hover:bg-lav-100 ${focusRing}`}>
                    {section.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </header>

      <main id="contenuto">
        {/* Hero: fills the first screen. One large card and up to two teasers. */}
        <section aria-label="Presentazione" className="relative isolate">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div className="bg-dots absolute inset-0" />
            <div className="absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-brand-500/20 blur-3xl motion-safe:animate-float" />
            <div className="absolute -right-32 top-1/3 h-[30rem] w-[30rem] rounded-full bg-accent-400/25 blur-3xl motion-safe:animate-float-slow" />
            <div className="absolute -bottom-40 left-1/3 h-[28rem] w-[28rem] rounded-full bg-fuchsia-400/15 blur-3xl motion-safe:animate-float" />
          </div>

          <div className={`${wrap} flex flex-col justify-center py-8 lg:min-h-[min(calc(100svh-6.5rem),62rem)] lg:py-10`}>
            <p className="mb-4 text-xs font-extrabold uppercase tracking-[0.2em] text-brand-900">Il mio profilo</p>
            <div className="grid flex-1 gap-5 md:grid-cols-2 lg:grid-cols-12 lg:grid-rows-2 lg:gap-6">
              <Reveal className={`h-full md:col-span-2 ${hasTeasers ? 'lg:col-span-8 lg:row-span-2' : 'lg:col-span-12 lg:row-span-2'}`}>
                <InteractiveCard
                  tilt={1.5}
                  className="card-lavender relative grid h-full min-h-[28rem] overflow-hidden rounded-[2rem] border border-lav-300 p-6 sm:p-10 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-10 xl:p-14"
                >
                  <div>
                    <p className={`${tag} w-fit bg-brand-900 text-white`}>{role}</p>
                    <h1 className="mt-5 text-[clamp(2.4rem,4.4vw,5.25rem)] font-black leading-[1.02] tracking-tight text-brand-900">{name}</h1>
                    <p className="mt-5 max-w-xl text-lg text-slate-700 xl:text-xl">{tagline}</p>
                    <ul className="mt-6 flex flex-wrap gap-2 text-sm font-semibold text-brand-900">
                      <li className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2"><MapPin size={15} aria-hidden="true" /> {location}</li>
                      <li className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2"><Laptop size={15} aria-hidden="true" /> {workMode}</li>
                    </ul>
                    {(email || cvUrl) && (
                      <div className="mt-8 flex flex-wrap gap-3">
                        {email && (
                          <a href={`mailto:${email}`} className={`inline-flex items-center gap-2 rounded-md bg-brand-600 px-6 py-3 text-sm font-extrabold uppercase tracking-wide text-white shadow-lg shadow-brand-600/30 transition hover:-translate-y-0.5 hover:bg-brand-700 ${focusRing}`}>
                            <Mail size={16} aria-hidden="true" /> Scrivimi
                          </a>
                        )}
                        {cvUrl && (
                          <a href={cvUrl} download className={`inline-flex items-center gap-2 rounded-md border-2 border-brand-600 px-6 py-3 text-sm font-extrabold uppercase tracking-wide text-brand-700 transition hover:-translate-y-0.5 hover:bg-white ${focusRing}`}>
                            <FileDown size={16} aria-hidden="true" /> Scarica il CV
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="relative mx-auto mt-10 w-full max-w-md pt-6 lg:mt-0 lg:max-w-none">
                    <div aria-hidden="true" className="absolute inset-x-[12%] bottom-0 top-10 rotate-3 rounded-[2.5rem] bg-gradient-to-br from-brand-600 to-brand-500 shadow-2xl motion-safe:animate-float-slow" />
                    <div className="relative mx-auto h-[clamp(14rem,24vw,27rem)] w-[clamp(14rem,24vw,27rem)]">
                      <Avatar name={name} photoUrl={photoUrl} className="h-full w-full rounded-[2.5rem] shadow-2xl ring-8 ring-white" />
                    </div>
                    <div aria-hidden="true">
                      {allSkills.slice(0, 3).map((skill, index) => (
                        <span
                          key={skill}
                          className={`absolute rounded-full bg-white px-4 py-1.5 text-sm font-bold text-brand-700 shadow-xl motion-safe:animate-float ${['left-0 top-1/4', 'right-0 top-1/2', 'bottom-2 left-[8%]'][index]}`}
                          style={{ animationDelay: `${index * 1.3}s` }}
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </InteractiveCard>
              </Reveal>

              {hasSkillsTeaser && (
                <Reveal delay={100} className="h-full lg:col-span-4">
                  <Teaser
                    href="#competenze"
                    className="card-mint text-brand-900"
                    title="Competenze"
                    subtitle={`${pluralize(allSkills.length, 'competenza', 'competenze')} in ${pluralize(skillGroups.length, 'area', 'aree')}`}
                  >
                    <span aria-hidden="true" className="flex flex-wrap gap-2">
                      {allSkills.slice(0, 6).map(skill => (
                        <span key={skill} className="rounded-full bg-white/70 px-3 py-1 text-sm font-semibold text-brand-800">{skill}</span>
                      ))}
                    </span>
                  </Teaser>
                </Reveal>
              )}

              {hasSecondTeaser && (
                <Reveal delay={200} className="h-full lg:col-span-4">
                  {projects.length > 0 ? (
                    <Teaser href="#progetti" className="card-blue text-white" light title="Progetti" subtitle={`${pluralize(projects.length, 'progetto', 'progetti')}: ${projects[0].name}`}>
                      <span aria-hidden="true" className="pointer-events-none absolute -right-2 top-2 select-none text-[9rem] font-black leading-none text-white/10">{initialsOf(projects[0].name)}</span>
                    </Teaser>
                  ) : experiences.length > 0 ? (
                    <Teaser href="#esperienza" className="card-blue text-white" light title="Esperienza" subtitle={`${experiences[0].role} · ${experiences[0].company}`} />
                  ) : (
                    <Teaser href="#contatti" className="card-blue text-white" light title="Contatti" subtitle="Parliamo del tuo prossimo progetto" />
                  )}
                </Reveal>
              )}
            </div>
          </div>
        </section>

        {/* Skills strip, edge to edge (decorative: the same skills are listed in the Skills section) */}
        {allSkills.length > 0 && (
          <div aria-hidden="true" className="marquee overflow-hidden bg-brand-800 py-4 text-white">
            <div className="marquee-track flex w-max gap-4 motion-safe:animate-marquee">
              {[...allSkills, ...allSkills].map((skill, index) => (
                <span key={`${skill}-${index}`} className="whitespace-nowrap rounded-full border border-white/25 bg-white/10 px-5 py-2 text-sm font-semibold">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Numbers */}
        {stats.length > 0 && (
          <ul aria-label="In numeri" className={`${wrap} grid grid-cols-2 gap-4 py-10 lg:grid-cols-4 lg:gap-6 lg:py-14`}>
            {stats.map((stat, index) => (
              <li key={`${stat.label}-${index}`}>
                <Reveal delay={index * 100} className="h-full">
                  <InteractiveCard spotlight="rgb(28 51 200 / 9%)" className={`h-full overflow-hidden rounded-[2rem] border border-lav-300 bg-white px-4 py-7 text-center shadow-lg shadow-brand-900/5 hover:shadow-2xl lg:py-10 ${lift}`}>
                    <p className="bg-gradient-to-r from-brand-600 to-accent-400 bg-clip-text text-[clamp(2.4rem,4.4vw,4.75rem)] font-black leading-none tracking-tight text-transparent"><AnimatedNumber value={stat.value} /></p>
                    <p className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-500 sm:text-sm">{stat.label}</p>
                  </InteractiveCard>
                </Reveal>
              </li>
            ))}
          </ul>
        )}

        {/* About */}
        <section aria-labelledby="pf-about" className={`${wrap} py-16 lg:py-24`}>
          <SectionHeading id="pf-about" eyebrow="Il mio profilo" title="Chi sono" />
          <div className="grid items-start gap-8 lg:grid-cols-12 lg:gap-14">
            <Reveal delay={100} className="lg:col-span-7 xl:col-span-8">
              <p className="text-lg leading-8 text-slate-700 lg:text-xl lg:leading-9 2xl:text-2xl 2xl:leading-10">{summary}</p>
            </Reveal>
            <Reveal delay={200} className="lg:col-span-5 xl:col-span-4">
              <dl className="rounded-[2rem] border border-lav-300 bg-white p-8 shadow-lg shadow-brand-900/5 lg:p-10">
                <div>
                  <dt className="text-xs font-bold uppercase tracking-widest text-slate-400">Ruolo</dt>
                  <dd className="mt-1 text-lg font-extrabold text-brand-900">{role}</dd>
                </div>
                <div className="mt-5 border-t border-lav-200 pt-5">
                  <dt className="text-xs font-bold uppercase tracking-widest text-slate-400">Dove</dt>
                  <dd className="mt-1 font-semibold text-slate-800">{location}</dd>
                </div>
                <div className="mt-5 border-t border-lav-200 pt-5">
                  <dt className="text-xs font-bold uppercase tracking-widest text-slate-400">Modalità</dt>
                  <dd className="mt-1 font-semibold text-slate-800">{workMode}</dd>
                </div>
              </dl>
            </Reveal>
          </div>
        </section>

        {/* Skills carousel */}
        {skillGroups.length > 0 && (
          <section id="competenze" aria-labelledby="pf-skills" className={`${wrap} pb-16 lg:pb-24`}>
            <SectionHeading id="pf-skills" eyebrow="Cosa so fare" title="Competenze" />
            <Reveal>
              <Carousel label="Gruppi di competenze">
                {skillGroups.map((group, index) => {
                  const Icon = iconForGroup(group.title);
                  return (
                    <InteractiveCard as="article" key={group.title} className={`card-lavender group relative flex h-full min-h-[22rem] flex-col overflow-hidden rounded-[2rem] border border-lav-300 p-7 hover:shadow-2xl hover:shadow-brand-600/15 lg:p-8 ${lift}`}>
                      <span className={`${tag} w-fit ${tagStyles[index % tagStyles.length]}`}>{pluralize(group.skills.length, 'competenza', 'competenze')}</span>
                      <h3 className="mt-5 text-2xl font-extrabold text-brand-900">{group.title}</h3>
                      <ul className="mt-5 flex flex-wrap gap-2">
                        {group.skills.map(skill => (
                          <li key={skill} className="rounded-full bg-white/80 px-3 py-1 text-sm font-semibold text-brand-800 transition-colors group-hover:bg-white">{skill}</li>
                        ))}
                      </ul>
                      <div className="mt-auto flex items-end justify-between pt-8">
                        <span className="text-sm font-semibold text-slate-500">Area {index + 1} di {skillGroups.length}</span>
                        <span aria-hidden="true" className="grid h-12 w-12 place-items-center rounded-full bg-brand-600 text-white shadow-lg transition duration-300 group-hover:rotate-6 group-hover:scale-110">
                          <Icon size={22} />
                        </span>
                      </div>
                    </InteractiveCard>
                  );
                })}
              </Carousel>
            </Reveal>
          </section>
        )}

        {/* Experience: heading stays in view on wide screens while the timeline scrolls */}
        {experiences.length > 0 && (
          <section id="esperienza" aria-labelledby="pf-experience" className={`${wrap} pb-16 lg:pb-28`}>
            <div className="grid gap-4 lg:grid-cols-[minmax(15rem,22rem)_1fr] lg:gap-16 xl:gap-24">
              <div className="lg:sticky lg:top-28 lg:self-start">
                <SectionHeading id="pf-experience" eyebrow="Il mio percorso" title="Esperienza" align="left" />
                <Reveal delay={100}>
                  <p className="-mt-4 hidden text-lg text-slate-600 lg:block">
                    {pluralize(experiences.length, 'esperienza professionale', 'esperienze professionali')}, dalla più recente alla prima.
                  </p>
                </Reveal>
              </div>

              <ol className="relative space-y-6 border-l-2 border-brand-200 pl-6 sm:pl-10">
                {experiences.map((item, index) => (
                  <li key={`${item.company}-${item.period}-${index}`} className="relative">
                    <span aria-hidden="true" className="absolute -left-[1.95rem] top-9 h-4 w-4 rounded-full border-4 border-lav-100 bg-brand-600 shadow ring-4 ring-brand-200 sm:-left-[3.05rem]" />
                    <Reveal delay={index * 60}>
                      <div className={`group rounded-[2rem] border border-lav-300 bg-white p-6 shadow-lg shadow-brand-900/5 hover:shadow-2xl sm:p-8 ${lift}`}>
                        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
                          <h3 className="text-xl font-extrabold text-brand-900">{item.role} · {item.company}</h3>
                          <span className={`${tag} bg-brand-50 text-brand-700`}>{item.period}</span>
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

        {/* Education, certifications and languages */}
        {hasBackground && (
          <section id="formazione" aria-labelledby="pf-background" className={`${wrap} pb-16 lg:pb-28`}>
            <SectionHeading id="pf-background" eyebrow="Le basi" title="Formazione e lingue" />
            <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,20rem),1fr))] lg:gap-8">
              {education.length > 0 && (
                <Reveal className="h-full">
                  <div className="h-full rounded-[2rem] border border-lav-300 bg-white p-6 shadow-lg shadow-brand-900/5 sm:p-8">
                    <h3 className="text-xl font-extrabold text-brand-900">Formazione</h3>
                    <ul className="mt-5 space-y-5">
                      {education.map((item, index) => (
                        <li key={`${item.institution}-${item.degree}-${index}`}>
                          <p className="font-bold text-brand-900">{item.degree}</p>
                          <p className="text-slate-600">{item.institution}</p>
                          <span className={`${tag} mt-2 bg-brand-50 text-brand-700`}>{item.period}</span>
                          {item.description && <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              )}
              {certifications.length > 0 && (
                <Reveal delay={80} className="h-full">
                  <div className="h-full rounded-[2rem] border border-lav-300 bg-white p-6 shadow-lg shadow-brand-900/5 sm:p-8">
                    <h3 className="text-xl font-extrabold text-brand-900">Certificazioni</h3>
                    <ul className="mt-5 space-y-5">
                      {certifications.map((item, index) => (
                        <li key={`${item.name}-${index}`} className="flex gap-3">
                          <Check size={18} aria-hidden="true" className="mt-1 shrink-0 text-emerald-500" />
                          <div>
                            <p className="font-bold text-brand-900">
                              {item.url ? (
                                <a href={item.url} target="_blank" rel="noreferrer noopener" className={`underline decoration-brand-300 underline-offset-4 hover:text-brand-600 ${focusRing}`}>{item.name}</a>
                              ) : item.name}
                            </p>
                            <p className="text-sm text-slate-600">{[item.issuer, item.year].filter(Boolean).join(' · ')}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              )}
              {languages.length > 0 && (
                <Reveal delay={160} className="h-full">
                  <div className="h-full rounded-[2rem] border border-lav-300 bg-white p-6 shadow-lg shadow-brand-900/5 sm:p-8">
                    <h3 className="text-xl font-extrabold text-brand-900">Lingue</h3>
                    <ul className="mt-5 space-y-3">
                      {languages.map((item, index) => (
                        <li key={`${item.name}-${index}`} className="flex items-baseline justify-between gap-4 border-b border-lav-300 pb-3 last:border-0 last:pb-0">
                          <span className="font-bold text-brand-900">{item.name}</span>
                          <span className="text-slate-600">{item.level}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              )}
            </div>
          </section>
        )}
        {/* Projects: deep navy section with rounded top edge */}
        {featured && (
          <section id="progetti" aria-labelledby="pf-projects" className="rounded-t-[2.5rem] bg-navy-950 py-16 text-white lg:rounded-t-[4.5rem] lg:py-28">
            <div className={wrap}>
              <SectionHeading id="pf-projects" eyebrow="Cosa ho costruito" title="Progetti" dark />

              <Reveal>
                <InteractiveCard as="article" tilt={1.5} className="card-blue group relative min-h-[22rem] overflow-hidden rounded-[2rem] p-7 ring-1 ring-white/10 sm:p-12 lg:p-16">
                  <span aria-hidden="true" className="pointer-events-none absolute -bottom-10 right-4 select-none text-[11rem] font-black leading-none text-white/10 transition duration-700 group-hover:translate-x-3 sm:text-[17rem] 2xl:text-[24rem]">
                    {initialsOf(featured.name)}
                  </span>
                  <p className={`${tag} w-fit bg-rose-600 text-white`}>In evidenza</p>
                  <h3 className="mt-5 max-w-3xl text-3xl font-extrabold sm:text-4xl lg:text-5xl">{featured.name}</h3>
                  {featured.description && <p className="mt-4 max-w-2xl text-lg leading-8 text-brand-100 xl:text-xl">{featured.description}</p>}
                  {featured.technologies.length > 0 && (
                    <ul className="mt-6 flex max-w-2xl flex-wrap gap-2">
                      {featured.technologies.map(tech => <li key={tech} className="rounded-full bg-white/15 px-3 py-1 text-sm font-semibold backdrop-blur">{tech}</li>)}
                    </ul>
                  )}
                  {featured.url && (
                    <a href={featured.url} target="_blank" rel="noreferrer noopener" className={`relative mt-8 inline-flex items-center gap-2 rounded-md bg-white px-6 py-3 text-sm font-extrabold uppercase tracking-wide text-brand-800 shadow-lg transition hover:-translate-y-0.5 hover:bg-accent-300 ${focusRing}`}>
                      Vedi il progetto <ArrowUpRight size={16} aria-hidden="true" />
                    </a>
                  )}
                </InteractiveCard>
              </Reveal>

              {otherProjects.length > 0 && (
                <div className="mt-6 grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(16rem,1fr))] lg:gap-6">
                  {otherProjects.map((project, index) => (
                    <Reveal key={project.name} delay={index * 100} className="h-full">
                      <InteractiveCard as="article" spotlight="rgb(28 51 200 / 10%)" className={`group flex h-full flex-col overflow-hidden rounded-[1.5rem] bg-white ring-1 ring-white/10 hover:shadow-2xl hover:shadow-black/40 ${lift}`}>
                        <div className={`relative grid h-32 place-items-center bg-gradient-to-br ${cardGradients[(index + 1) % cardGradients.length]}`}>
                          <div aria-hidden="true" className="bg-grid absolute inset-0 opacity-70" />
                          <span aria-hidden="true" className="relative text-5xl font-black text-white/95 transition duration-500 group-hover:scale-110">{initialsOf(project.name)}</span>
                        </div>
                        <div className="flex flex-1 items-end gap-3 p-5">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-extrabold text-brand-900">{project.name}</h3>
                            {project.description && <p className="mt-1 line-clamp-3 text-sm text-slate-600">{project.description}</p>}
                            {project.technologies.length > 0 && <p className="mt-2 text-xs font-semibold text-brand-600">{project.technologies.join(' · ')}</p>}
                          </div>
                          {project.url && (
                            <a
                              href={project.url}
                              target="_blank"
                              rel="noreferrer noopener"
                              aria-label={`Vedi ${project.name}`}
                              className={`grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-600 text-white shadow-lg transition hover:scale-110 hover:bg-brand-700 ${focusRing}`}
                            >
                              <ChevronRight size={20} aria-hidden="true" />
                            </a>
                          )}
                        </div>
                      </InteractiveCard>
                    </Reveal>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Contacts: royal blue cards across the width */}
        {hasContacts && (
          <section id="contatti" aria-labelledby="pf-contacts" className={`${wrap} py-16 lg:py-28`}>
            <SectionHeading id="pf-contacts" eyebrow="Lavoriamo insieme" title="Contatti" />
            <ul className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,17rem),1fr))] lg:gap-6">
              {email && (
                <li>
                  <Reveal className="h-full">
                    <a href={`mailto:${email}`} className={`block h-full rounded-[2rem] ${focusRing}`}>
                      <InteractiveCard className={`card-blue group flex h-full min-h-[14rem] flex-col overflow-hidden rounded-[2rem] p-7 text-white hover:shadow-2xl hover:shadow-brand-800/40 lg:p-9 ${lift}`}>
                        <Mail size={28} aria-hidden="true" className="text-accent-300" />
                        <span className="mt-6 break-words text-xl font-extrabold [overflow-wrap:anywhere]">{email}</span>
                        <span className="mt-auto flex justify-end pt-6"><ArrowCircle light /></span>
                      </InteractiveCard>
                    </a>
                  </Reveal>
                </li>
              )}
              {links.map((link, index) => (
                <li key={link.url}>
                  <Reveal delay={(index + 1) * 100} className="h-full">
                    <a
                      href={link.url}
                      {...(isExternal(link.url) ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
                      className={`block h-full rounded-[2rem] ${focusRing}`}
                    >
                      <InteractiveCard className={`card-blue group flex h-full min-h-[14rem] flex-col overflow-hidden rounded-[2rem] p-7 text-white hover:shadow-2xl hover:shadow-brand-800/40 lg:p-9 ${lift}`}>
                        <Link2 size={28} aria-hidden="true" className="text-accent-300" />
                        <span className="mt-6 break-words text-xl font-extrabold [overflow-wrap:anywhere]">{link.label}</span>
                        <span className="mt-auto flex justify-end pt-6"><ArrowCircle light /></span>
                      </InteractiveCard>
                    </a>
                  </Reveal>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Call to action strip */}
        {email && (
          <div className="bg-brand-700 text-white">
            <div className={`${wrap} flex flex-wrap items-center justify-between gap-4 py-6 lg:py-8`}>
              <p className="flex items-center gap-3 font-semibold lg:text-lg">
                <Sparkles size={22} aria-hidden="true" className="text-accent-300" />
                Hai un progetto o un’opportunità in mente? Parliamone.
              </p>
              <a href={`mailto:${email}`} className={`rounded-md bg-white px-6 py-3 text-sm font-extrabold uppercase tracking-wide text-brand-800 transition hover:bg-accent-300 ${focusRing}`}>
                Scrivi un’email
              </a>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-navy-950 text-white/70">
        <div className={`${wrap} grid gap-10 py-12 md:grid-cols-3 lg:py-16`}>
          <div>
            <p className="flex items-center gap-3 text-lg font-extrabold text-white">
              <span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-sm">{initialsOf(name)}</span>
              {name}
            </p>
            <p className="mt-3 text-sm">{role}</p>
            {tagline && <p className="mt-2 max-w-xs text-sm text-white/60">{tagline}</p>}
          </div>

          {sections.length > 0 && (
            <nav aria-label="Sezioni del sito">
              <p className="text-xs font-bold uppercase tracking-widest text-white/50">Esplora</p>
              <ul className="mt-4 space-y-2 text-sm">
                {sections.map(section => (
                  <li key={section.id}><a href={`#${section.id}`} className={`transition hover:text-white ${focusRing}`}>{section.label}</a></li>
                ))}
              </ul>
            </nav>
          )}

          {hasContacts && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-white/50">Contatti</p>
              <ul className="mt-4 space-y-2 text-sm">
                {email && <li><a href={`mailto:${email}`} className={`break-all transition hover:text-white ${focusRing}`}>{email}</a></li>}
                {links.map(link => (
                  <li key={link.url}>
                    <a href={link.url} {...(isExternal(link.url) ? { target: '_blank', rel: 'noreferrer noopener' } : {})} className={`transition hover:text-white ${focusRing}`}>{link.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="border-t border-white/10 py-5 text-center text-sm text-white/50">© {new Date().getFullYear()} {name}</div>
      </footer>
    </div>
  );
}
