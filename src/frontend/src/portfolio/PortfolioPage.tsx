import { ExternalLink, FileDown, Mail, MapPin, Laptop } from 'lucide-react';
import { portfolio as defaultContent, type PortfolioContent } from './content';
import './portfolio.css';

type Props = { content?: PortfolioContent };

function isExternal(url: string) {
  return /^https?:\/\//i.test(url);
}

export default function PortfolioPage({ content = defaultContent }: Props) {
  const { name, role, tagline, summary, location, workMode, email, cvUrl, links, skillGroups, experiences, projects } = content;
  const hasContacts = Boolean(email || cvUrl || links.length > 0);

  return (
    <div className="pf">
      <a className="pf-skip" href="#contenuto">Vai al contenuto</a>

      <header className="pf-hero">
        <div className="pf-container">
          <p className="pf-eyebrow">{role}</p>
          <h1>{name}</h1>
          <p className="pf-tagline">{tagline}</p>
          <ul className="pf-meta">
            <li><MapPin size={16} aria-hidden="true" /> {location}</li>
            <li><Laptop size={16} aria-hidden="true" /> {workMode}</li>
          </ul>
          {(email || cvUrl) && (
            <div className="pf-actions">
              {email && <a className="pf-button primary" href={`mailto:${email}`}><Mail size={16} aria-hidden="true" /> Scrivimi</a>}
              {cvUrl && <a className="pf-button" href={cvUrl} download><FileDown size={16} aria-hidden="true" /> Scarica il CV</a>}
            </div>
          )}
        </div>
      </header>

      <main id="contenuto" className="pf-container">
        <section aria-labelledby="pf-about">
          <h2 id="pf-about">Chi sono</h2>
          <p className="pf-lead">{summary}</p>
        </section>

        {skillGroups.length > 0 && (
          <section aria-labelledby="pf-skills">
            <h2 id="pf-skills">Competenze</h2>
            <div className="pf-grid">
              {skillGroups.map(group => (
                <div className="pf-card" key={group.title}>
                  <h3>{group.title}</h3>
                  <ul className="pf-tags">
                    {group.skills.map(skill => <li key={skill}>{skill}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {experiences.length > 0 && (
          <section aria-labelledby="pf-experience">
            <h2 id="pf-experience">Esperienza</h2>
            <ol className="pf-timeline">
              {experiences.map(item => (
                <li key={`${item.company}-${item.period}`}>
                  <div className="pf-timeline-head">
                    <h3>{item.role} · {item.company}</h3>
                    <span>{item.period}</span>
                  </div>
                  <p>{item.description}</p>
                  {item.highlights && item.highlights.length > 0 && (
                    <ul>{item.highlights.map(highlight => <li key={highlight}>{highlight}</li>)}</ul>
                  )}
                </li>
              ))}
            </ol>
          </section>
        )}

        {projects.length > 0 && (
          <section aria-labelledby="pf-projects">
            <h2 id="pf-projects">Progetti</h2>
            <div className="pf-grid">
              {projects.map(project => (
                <article className="pf-card" key={project.name}>
                  <h3>{project.name}</h3>
                  <p>{project.description}</p>
                  <ul className="pf-tags">
                    {project.technologies.map(tech => <li key={tech}>{tech}</li>)}
                  </ul>
                  {project.url && (
                    <a className="pf-link" href={project.url} target="_blank" rel="noreferrer noopener">
                      Vedi il progetto <ExternalLink size={14} aria-hidden="true" />
                    </a>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {hasContacts && (
          <section aria-labelledby="pf-contacts">
            <h2 id="pf-contacts">Contatti</h2>
            <ul className="pf-contacts">
              {email && <li><a href={`mailto:${email}`}>{email}</a></li>}
              {links.map(link => (
                <li key={link.url}>
                  <a href={link.url} {...(isExternal(link.url) ? { target: '_blank', rel: 'noreferrer noopener' } : {})}>{link.label}</a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      <footer className="pf-footer">
        <div className="pf-container">© {new Date().getFullYear()} {name}</div>
      </footer>
    </div>
  );
}
