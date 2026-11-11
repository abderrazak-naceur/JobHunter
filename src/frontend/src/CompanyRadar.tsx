import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Building2, ExternalLink, Plus, Search, Star, Trash2, X, Pencil, RefreshCw } from 'lucide-react';
import { companyApi, type Company, type CompanyRequest } from './services/companyApi';

const emptyForm: CompanyRequest = {
  name: '', website: '', careersUrl: '', location: 'Milano', sector: 'Software / IT',
  technologies: '.NET, C#, React', priority: 'Media', notes: '', followed: true
};

export default function CompanyRadar() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CompanyRequest>(emptyForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await companyApi.list(query);
      setCompanies(result.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossibile caricare le aziende.');
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => { void loadCompanies(); }, [loadCompanies]);

  const followedCount = useMemo(() => companies.filter(company => company.followed).length, [companies]);

  function openCreateForm() {
    setEditingId(null);
    setForm(emptyForm);
    setError('');
    setShowForm(true);
  }

  function openEditForm(company: Company) {
    setEditingId(company.id);
    setForm({
      name: company.name, website: company.website, careersUrl: company.careersUrl,
      location: company.location, sector: company.sector, technologies: company.technologies,
      priority: company.priority, notes: company.notes, followed: company.followed
    });
    setError('');
    setShowForm(true);
  }

  async function saveCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (editingId) await companyApi.update(editingId, form);
      else await companyApi.create(form);
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      await loadCompanies();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Salvataggio non riuscito.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleFollow(company: Company) {
    try {
      await companyApi.update(company.id, { ...company, followed: !company.followed });
      await loadCompanies();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Aggiornamento non riuscito.');
    }
  }

  async function removeCompany(company: Company) {
    if (!window.confirm(`Vuoi eliminare ${company.name} dal radar?`)) return;
    try {
      await companyApi.remove(company.id);
      await loadCompanies();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eliminazione non riuscita.');
    }
  }

  return <div className="company-radar">
    <div className="welcome-row">
      <div>
        <div className="eyebrow">SCOUTING AZIENDE</div>
        <h1>Company Radar</h1>
        <p>Costruisci la tua lista di aziende target e tieni sotto controllo le loro pagine Lavora con noi.</p>
      </div>
      <button className="primary" onClick={openCreateForm}><Plus size={17}/> Aggiungi azienda</button>
    </div>

    <div className="company-stats">
      <div className="stat-card"><div className="stat-icon violet"><Building2 size={19}/></div><span>Aziende salvate</span><strong>{companies.length}</strong><small>Registrate su PostgreSQL</small></div>
      <div className="stat-card"><div className="stat-icon blue"><Star size={19}/></div><span>Da monitorare</span><strong>{followedCount}</strong><small>Seguite da te</small></div>
      <div className="stat-card"><div className="stat-icon green"><Search size={19}/></div><span>Offerte rilevate</span><strong>—</strong><small>Connettori ATS in una fase successiva</small></div>
    </div>

    <div className="company-toolbar">
      <label className="company-search"><Search size={17}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Cerca azienda, settore, tecnologia o città..."/></label>
      <div className="company-toolbar-actions"><span className="muted">{companies.length} aziende</span><button className="icon-button" onClick={() => void loadCompanies()} title="Aggiorna elenco"><RefreshCw size={16}/></button></div>
    </div>

    {error && <div className="company-error" role="alert">{error}</div>}

    {showForm && <form className="company-form panel" onSubmit={saveCompany}>
      <div className="panel-head"><div><h3>{editingId ? 'Modifica azienda' : 'Nuova azienda target'}</h3><p>I dati vengono salvati nel database PostgreSQL.</p></div><button type="button" className="icon-button" aria-label="Chiudi" onClick={() => setShowForm(false)}><X size={18}/></button></div>
      <div className="company-form-grid">
        <label>Nome azienda *<input value={form.name} onChange={e => setForm({...form,name:e.target.value})} placeholder="Es. Azienda S.p.A." required maxLength={180}/></label>
        <label>Sito ufficiale<input value={form.website} onChange={e => setForm({...form,website:e.target.value})} placeholder="https://www.azienda.it"/></label>
        <label className="wide">URL Lavora con noi / Careers *<input value={form.careersUrl} onChange={e => setForm({...form,careersUrl:e.target.value})} placeholder="https://www.azienda.it/careers" required/></label>
        <label>Città / area<input value={form.location} onChange={e => setForm({...form,location:e.target.value})} placeholder="Milano" maxLength={180}/></label>
        <label>Settore<input value={form.sector} onChange={e => setForm({...form,sector:e.target.value})} placeholder="Software / IT" maxLength={180}/></label>
        <label>Tecnologie d'interesse<input value={form.technologies} onChange={e => setForm({...form,technologies:e.target.value})} placeholder=".NET, C#, React" maxLength={1000}/></label>
        <label>Priorità<select value={form.priority} onChange={e => setForm({...form,priority:e.target.value as CompanyRequest['priority']})}><option>Alta</option><option>Media</option><option>Bassa</option></select></label>
        <label className="wide">Note<textarea value={form.notes} onChange={e => setForm({...form,notes:e.target.value})} placeholder="Perché vuoi seguire questa azienda?" maxLength={4000}/></label>
      </div>
      <div className="form-actions"><button type="button" className="outline" onClick={() => setShowForm(false)}>Annulla</button><button type="submit" className="primary" disabled={saving}>{saving ? 'Salvataggio...' : editingId ? 'Salva modifiche' : 'Salva azienda'}</button></div>
    </form>}

    {loading ? <div className="panel company-empty"><RefreshCw size={22} className="loading-icon"/><p>Caricamento aziende...</p></div> :
      companies.length === 0 ? <div className="panel company-empty"><div className="empty-icon"><Building2 size={25}/></div><h3>{query ? 'Nessuna azienda trovata' : 'Il tuo radar è ancora vuoto'}</h3><p>{query ? 'Prova a modificare i termini della ricerca.' : 'Aggiungi le aziende che ti interessano, anche se oggi non hanno offerte aperte.'}</p>{!query && <button className="primary" onClick={openCreateForm}><Plus size={16}/> Aggiungi la prima azienda</button>}</div> :
      <div className="company-grid">{companies.map(company => <article className="panel company-card" key={company.id}>
        <div className="company-card-top"><div className="company-logo"><Building2 size={21}/></div><div className="company-priority">{company.priority} priorità</div></div>
        <h3>{company.name}</h3>
        <p className="company-meta">{[company.location,company.sector].filter(Boolean).join(' · ')}</p>
        <div className="company-tags">{company.technologies.split(',').map(tag => tag.trim()).filter(Boolean).slice(0,5).map(tag => <span key={tag}>{tag}</span>)}</div>
        {company.notes && <p className="company-notes">{company.notes}</p>}
        <div className="company-links"><a href={company.careersUrl} target="_blank" rel="noreferrer">Pagina Careers <ExternalLink size={13}/></a>{company.website && <a href={company.website} target="_blank" rel="noreferrer">Sito ufficiale <ExternalLink size={13}/></a>}</div>
        <div className="company-card-actions">
          <button className={company.followed ? 'follow-button followed' : 'follow-button'} onClick={() => void toggleFollow(company)}><Star size={14}/>{company.followed ? 'Seguita' : 'Segui'}</button>
          <div className="company-action-group"><button className="delete-button" aria-label={`Modifica ${company.name}`} onClick={() => openEditForm(company)}><Pencil size={14}/></button><button className="delete-button" aria-label={`Elimina ${company.name}`} onClick={() => void removeCompany(company)}><Trash2 size={15}/></button></div>
        </div>
      </article>)}</div>
    }

    <div className="radar-notice"><Building2 size={17}/><div><strong>Monitoraggio automatico: prossimo step</strong><p>Le aziende ora vengono salvate nel database e sono condivise tra le sessioni del browser. La scansione automatica delle pagine Careers e il rilevamento delle nuove offerte saranno aggiunti con i connettori ATS.</p></div></div>
  </div>;
}
