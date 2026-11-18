import { useState, type FormEvent } from 'react';
import { FileDown, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { PortfolioContent } from '@/portfolio/content';
import './cv-builder.css';

type Props = {
  content: PortfolioContent;
  onSave: (patch: Partial<PortfolioContent>) => Promise<void>;
};

export default function CvBuilder({ content, onSave }: Props) {
  const [phone, setPhone] = useState(content.phone ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(content.dateOfBirth ?? '');
  const [email, setEmail] = useState(content.email ?? '');
  const [name, setName] = useState(content.name);
  const [role, setRole] = useState(content.role);
  const [summary, setSummary] = useState(content.summary);
  const [saving, setSaving] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave({ name, role, summary, email: email || null, phone: phone || null, dateOfBirth: dateOfBirth || null });
      toast.success('Dati del CV salvati');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Salvataggio non riuscito');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="cv-builder space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Curriculum editor</p>
          <h2 className="text-2xl font-extrabold tracking-tight">CV Builder</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Modifica i dati principali e controlla l’anteprima con la struttura del tuo CV attuale. Esperienze, formazione, competenze, certificazioni e lingue si aggiornano dalle rispettive sezioni Portfolio.</p>
        </div>
        <Button type="button" onClick={() => window.print()}><FileDown className="mr-2 size-4" /> Stampa / Salva PDF</Button>
      </div>

      <form onSubmit={save} className="grid gap-4 rounded-xl border bg-card p-5 md:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="cv-name">Nome e cognome</Label><Input id="cv-name" value={name} onChange={e => setName(e.target.value)} maxLength={120} required /></div>
        <div className="space-y-2"><Label htmlFor="cv-role">Titolo professionale</Label><Input id="cv-role" value={role} onChange={e => setRole(e.target.value)} maxLength={120} required /></div>
        <div className="space-y-2"><Label htmlFor="cv-phone">Telefono</Label><Input id="cv-phone" value={phone} onChange={e => setPhone(e.target.value)} maxLength={40} placeholder="+39 ..." /></div>
        <div className="space-y-2"><Label htmlFor="cv-email">Email</Label><Input id="cv-email" type="email" value={email} onChange={e => setEmail(e.target.value)} maxLength={254} /></div>
        <div className="space-y-2"><Label htmlFor="cv-birth">Data di nascita</Label><Input id="cv-birth" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} maxLength={30} placeholder="08/03/1987" /></div>
        <div className="space-y-2 md:col-span-2"><Label htmlFor="cv-summary">Sommario professionale</Label><Textarea id="cv-summary" rows={4} value={summary} onChange={e => setSummary(e.target.value)} maxLength={2000} required /></div>
        <div className="md:col-span-2"><Button type="submit" disabled={saving}>{saving ? 'Salvataggio…' : <><Save className="mr-2 size-4" /> Salva dati del CV</>}</Button></div>
      </form>

      <div className="rounded-xl border bg-muted/30 p-3 sm:p-6">
        <div className="mb-3 flex items-center justify-between gap-3 text-sm text-muted-foreground"><span>Anteprima A4 · modello classico blu</span><span>Le modifiche salvate vengono mostrate qui</span></div>
        <article className="cv-print-root mx-auto max-w-[794px] bg-white p-7 text-slate-900 shadow-xl sm:p-10">
          <header className="cv-header">
            <div><h1>{content.name}</h1><h2>{content.role}</h2><p className="cv-tagline">{content.tagline || 'Professionista IT'}</p><p className="cv-contact">{[content.phone, content.email, content.location].filter(Boolean).join(' | ')}</p></div>
            {content.photoUrl && <img className="cv-photo" src={content.photoUrl} alt="" />}
          </header>

          <section className="cv-section"><h3>Sommario</h3><div className="cv-summary"><p>{content.summary}</p>{content.dateOfBirth && <p>Data di nascita: {content.dateOfBirth}</p>}</div></section>

          <section className="cv-section"><h3>Istruzione - Formazione</h3><table><tbody>{(content.education ?? []).map((item, i) => <tr key={i}><th>{i === 0 ? 'ISTRUZIONE' : ''}</th><td><strong>{item.institution} – {item.degree}</strong><span className="cv-period">{item.period}</span>{item.description && <p>{item.description}</p>}</td></tr>)}
            {(content.certifications ?? []).length > 0 && <tr><th>CERTIFICATI UFFICIALI</th><td>{(content.certifications ?? []).map(x => <p key={x.name}><strong>{x.name}</strong>{x.issuer ? ` – ${x.issuer}` : ''}{x.year ? ` · ${x.year}` : ''}</p>)}</td></tr>}</tbody></table></section>

          {(content.languages ?? []).length > 0 && <section className="cv-section"><h3>Lingue</h3><table><tbody>{content.languages!.map(x => <tr key={x.name}><th>{x.name}</th><td>{x.level}</td></tr>)}</tbody></table></section>}

          {(content.skillGroups ?? []).length > 0 && <section className="cv-section"><h3>Sintesi Competenze</h3><table><tbody>{content.skillGroups.map(x => <tr key={x.title}><th>{x.title}</th><td>{x.skills.join(', ')}</td></tr>)}</tbody></table></section>}

          {(content.experiences ?? []).length > 0 && <section className="cv-section"><h3>Esperienza Professionale</h3>{content.experiences.map((x, i) => <div className="cv-experience" key={i}><div className="cv-exp-heading"><strong>{x.role}</strong><strong>{x.period}</strong></div><p className="cv-company">{x.company}</p>{x.description && <p>{x.description}</p>}{(x.highlights ?? []).map((h, j) => <p className="cv-bullet" key={j}>• {h}</p>)}</div>)}</section>}

          {(content.projects ?? []).length > 0 && <section className="cv-section"><h3>Progetti</h3>{content.projects.map(x => <div className="cv-project" key={x.name}><strong>{x.name}</strong><p>{x.description}</p>{x.technologies.length > 0 && <small>{x.technologies.join(' | ')}</small>}</div>)}</section>}
          <footer className="cv-footer">{content.links.map(x => <span key={x.label}>{x.label}: {x.url}</span>)}</footer>
        </article>
      </div>
      <p className="text-sm text-muted-foreground">Per pubblicare il PDF generato: scegli “Stampa / Salva PDF”, salva il file e caricalo in Portfolio → Profilo → Curriculum Vitae. Il PDF pubblico attuale resta invariato finché non carichi il nuovo file.</p>
    </div>
  );
}
