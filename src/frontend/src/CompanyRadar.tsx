import { useEffect, useMemo, useState } from 'react';
import { Building2, ExternalLink, Plus, Search, Star, Trash2, X } from 'lucide-react';

type Company = {
  id: string;
  name: string;
  website: string;
  careersUrl: string;
  location: string;
  sector: string;
  technologies: string;
  priority: 'Alta' | 'Media' | 'Bassa';
  notes: string;
  followed: boolean;
  createdAt: string;
};

const STORAGE_KEY = 'jobhunter.target-companies.v1';
const emptyForm = { name: '', website: '', careersUrl: '', location: 'Milano', sector: 'Software / IT', technologies: '.NET, C#, React', priority: 'Media' as Company['priority'], notes: '' };

function readCompanies(): Company[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as Company[] : [];
  } catch {
    return [];
  }
}

function validUrl(value: string) {
  try { const url = new URL(value); return url.protocol === 'http:' || url.protocol === 'https:'; }
  catch { return false; }
}

export default function CompanyRadar() {
  const [companies, setCompanies] = useState<Company[]>(readCompanies);
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(companies));
  }, [companies]);

  const filtered = useMemo(() => companies.filter(company =>
    [company.name, company.location, company.sector, company.technologies]
      .join(' ').toLowerCase().includes(query.toLowerCase())
  ), [companies, query]);

  const followedCount = companies.filter(company => company.followed).length;

  function addCompany(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!form.name.trim() || !form.careersUrl.trim() || !validUrl(form.careersUrl)) {
      setError('Inserisci il nome dell’azienda e un URL Careers valido (https://...).');
      return;
    }
    if (form.website.trim() && !validUrl(form.website)) {
      setError('Il sito aziendale deve essere un URL valido (https://...).');
      return;
    }
    const next: Company = {
      ...form,
      id: crypto.randomUUID(),
      name: form.name.trim(),
      website: form.website.trim(),
      careersUrl: form.careersUrl.trim(),
      followed: true,
      createdAt: new Date().toISOString()
    };
    setCompanies(current => [next, ...current]);
    setForm(emptyForm);
    setShowForm(false);
  }

  function toggleFollow(id: string) {
    setCompanies(current => current.map(company => company.id === id ? { ...company, followed: !company.followed } : company));
  }

  function removeCompany(id: string) {
    setCompanies(current => current.filter(company => company.id !== id));
  }

  return <div className="company-radar">
    <div className="welcome-row">
      <div>
        <div className="eyebrow">SCOUTING AZIENDE</div>
        <h1>Company Radar</h1>
        <p>Costruisci la tua lista di aziende target e tieni a portata di mano le loro pagine Lavora con noi.</p>
      </div>
      <button className="primary" onClick={() => { setShowForm(true); setError(''); }}><Plus size={17}/> Aggiungi azienda</button>
    </div>

    <div className="company-stats">
      <div className="stat-card"><div className="stat-icon violet"><Building2 size={19}/></div><span>Aziende salvate</span><strong>{companies.length}</strong><small>Nel tuo radar personale</small></div>
      <div className="stat-card"><div className="stat-icon blue"><Star size={19}/></div><span>Da monitorare</span><strong>{followedCount}</strong><small>Seguite da te</small></div>
      <div className="stat-card"><div className="stat-icon green"><Search size={19}/></div><span>Offerte rilevate</span><strong>—</strong><small>Connettore da implementare</small></div>
    </div>

    <div className="company-toolbar">
      <label className="company-search"><Search size={17}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Cerca azienda, settore, tecnologia o città..."/></label>
      <span className="muted">{filtered.length} aziende</span>
    </div>

    {showForm && <form className="company-form panel" onSubmit={addCompany}>
      <div className="panel-head"><div><h3>Nuova azienda target</h3><p>Inserisci il sito ufficiale e la pagina Careers.</p></div><button type="button" className="icon-button" aria-label="Chiudi" onClick={() => setShowForm(false)}><X size={18}/></button></div>
      <div className="company-form-grid">
        <label>Nome azienda *<input value={form.name} onChange={e => setForm({...form,name:e.target.value})} placeholder="Es. Azienda S.p.A." required/></label>
        <label>Sito ufficiale<input value={form.website} onChange={e => setForm({...form,website:e.target.value})} placeholder="https://www.azienda.it"/></label>
        <label className="wide">URL Lavora con noi / Careers *<input value={form.careersUrl} onChange={e => setForm({...form,careersUrl:e.target.value})} placeholder="https://www.azienda.it/careers" required/></label>
        <label>Città / area<input value={form.location} onChange={e => setForm({...form,location:e.target.value})} placeholder="Milano"/></label>
        <label>Settore<input value={form.sector} onChange={e => setForm({...form,sector:e.target.value})} placeholder="Software / IT"/></label>
        <label>Tecnologie d'interesse<input value={form.technologies} onChange={e => setForm({...form,technologies:e.target.value})} placeholder=".NET, C#, React"/></label>
        <label>Priorità<select value={form.priority} onChange={e => setForm({...form,priority:e.target.value as Company['priority']})}><option>Alta</option><option>Media</option><option>Bassa</option></select></label>
        <label className="wide">Note<textarea value={form.notes} onChange={e => setForm({...form,notes:e.target.value})} placeholder="Perché vuoi seguire questa azienda?"/></label>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions"><button type="button" className="outline" onClick={() => setShowForm(false)}>Annulla</button><button type="submit" className="primary">Salva azienda</button></div>
    </form>}

    {filtered.length === 0 ? <div className="panel company-empty"><div className="empty-icon"><Building2 size={25}/></div><h3>{companies.length === 0 ? 'Il tuo radar è ancora vuoto' : 'Nessuna azienda trovata'}</h3><p>{companies.length === 0 ? 'Aggiungi le aziende che ti interessano, anche se oggi non hanno offerte aperte.' : 'Prova a modificare i termini della ricerca.'}</p>{companies.length === 0 && <button className="primary" onClick={() => setShowForm(true)}><Plus size={16}/> Aggiungi la prima azienda</button>}</div> :
      <div className="company-grid">{filtered.map(company => <article className="panel company-card" key={company.id}>
        <div className="company-card-top"><div className="company-logo"><Building2 size={21}/></div><div className="company-priority">{company.priority} priorità</div></div>
        <h3>{company.name}</h3>
        <p className="company-meta">{[company.location,company.sector].filter(Boolean).join(' · ')}</p>
        <div className="company-tags">{company.technologies.split(',').map(tag => tag.trim()).filter(Boolean).slice(0,5).map(tag => <span key={tag}>{tag}</span>)}</div>
        {company.notes && <p className="company-notes">{company.notes}</p>}
        <div className="company-links">
          <a href={company.careersUrl} target="_blank" rel="noreferrer">Pagina Careers <ExternalLink size={13}/></a>
          {company.website && <a href={company.website} target="_blank" rel="noreferrer">Sito ufficiale <ExternalLink size={13}/></a>}
        </div>
        <div className="company-card-actions">
          <button className={company.followed ? 'follow-button followed' : 'follow-button'} onClick={() => toggleFollow(company.id)}><Star size={14}/>{company.followed ? 'Seguita' : 'Segui'}</button>
          <button className="delete-button" aria-label={`Elimina ${company.name}`} onClick={() => removeCompany(company.id)}><Trash2 size={15}/></button>
        </div>
      </article>)}</div>
    }

    <div className="radar-notice"><Building2 size={17}/><div><strong>Monitoraggio automatico: prossimo step</strong><p>In questa prima versione puoi creare la tua lista e aprire i siti ufficiali. La scansione automatica delle pagine Careers, il rilevamento delle nuove offerte e le notifiche saranno collegati al backend e ai connettori ATS in una milestone successiva.</p></div></div>
  </div>;
}
