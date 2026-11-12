import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { ExternalLink, Plus, Trash2 } from 'lucide-react';
import { resolveAssetUrl } from '../services/apiConfig';
import { deletePhoto, fetchPortfolio, savePortfolio, uploadPhoto } from '../services/portfolioApi';
import {
  emptyExperience, emptyLink, emptyProject, emptySkillGroup, emptyStat, fromDraft, toDraft, type PortfolioDraft
} from './portfolioDraft';
import './editor.css';

type ListKey = 'links' | 'skillGroups' | 'experiences' | 'projects' | 'stats';

const MAX_STATS = 4;

export default function PortfolioEditor() {
  const [draft, setDraft] = useState<PortfolioDraft | null>(null);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetchPortfolio(controller.signal)
      .then(content => setDraft(toDraft(content)))
      .catch(err => {
        if (!controller.signal.aborted) setLoadError(err instanceof Error ? err.message : 'Impossibile caricare il portfolio.');
      });
    return () => controller.abort();
  }, []);

  if (loadError) return <div className="company-error" role="alert">{loadError}</div>;
  if (!draft) return <p role="status">Caricamento portfolio...</p>;

  function change(patch: Partial<PortfolioDraft>) {
    setDraft(current => (current ? { ...current, ...patch } : current));
    setSaved(false);
  }

  function updateItem<K extends ListKey>(key: K, index: number, patch: Partial<PortfolioDraft[K][number]>) {
    setDraft(current => {
      if (!current) return current;
      const list = (current[key] as object[]).map((item, i) => (i === index ? { ...item, ...patch } : item));
      return { ...current, [key]: list } as PortfolioDraft;
    });
    setSaved(false);
  }

  function addItem<K extends ListKey>(key: K, item: PortfolioDraft[K][number]) {
    setDraft(current => (current ? ({ ...current, [key]: [...(current[key] as object[]), item] } as PortfolioDraft) : current));
    setSaved(false);
  }

  function removeItem(key: ListKey, index: number) {
    setDraft(current =>
      current ? ({ ...current, [key]: (current[key] as object[]).filter((_, i) => i !== index) } as PortfolioDraft) : current);
    setSaved(false);
  }

  /** A photo uploaded to the API has an address like "/api/v1/portfolio/photo?v=..."; anything else is a manual URL. */
  const photoUploaded = draft.photoUrl.startsWith('/api/');

  async function onPhotoSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ''; // lets the same file be chosen again
    if (!file) return;

    setError('');
    setPhotoBusy(true);
    try {
      change({ photoUrl: await uploadPhoto(file) });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Caricamento della foto non riuscito.');
    } finally {
      setPhotoBusy(false);
    }
  }

  async function onPhotoRemoved() {
    setError('');
    setPhotoBusy(true);
    try {
      if (photoUploaded) await deletePhoto();
      change({ photoUrl: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rimozione della foto non riuscita.');
    } finally {
      setPhotoBusy(false);
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const stored = await savePortfolio(fromDraft(draft));
      setDraft(toDraft(stored));
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Salvataggio non riuscito.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="portfolio-editor" onSubmit={submit}>
      <div className="welcome-row">
        <div>
          <div className="eyebrow">SITO PUBBLICO</div>
          <h1>Modifica portfolio</h1>
          <p>Quello che salvi qui è visibile a chiunque sulla pagina pubblica. Le sezioni vuote non vengono mostrate.</p>
        </div>
        <a className="outline editor-view-link" href="/" target="_blank" rel="noreferrer">Vedi il sito <ExternalLink size={14} /></a>
      </div>

      {error && <div className="company-error" role="alert">{error}</div>}
      {saved && <div className="editor-success" role="status">Portfolio salvato e pubblicato.</div>}

      <fieldset className="panel editor-section">
        <legend>Presentazione</legend>
        <div className="company-form-grid">
          <label>Nome *<input value={draft.name} onChange={e => change({ name: e.target.value })} required maxLength={120} /></label>
          <label>Ruolo *<input value={draft.role} onChange={e => change({ role: e.target.value })} required maxLength={120} /></label>
          <label className="wide">Slogan<input value={draft.tagline} onChange={e => change({ tagline: e.target.value })} maxLength={250} /></label>
          <label className="wide">Chi sono *<textarea value={draft.summary} onChange={e => change({ summary: e.target.value })} required maxLength={2000} rows={5} /></label>
          <div className="wide editor-photo">
            <span className="editor-photo-title">Foto profilo</span>
            <div className="editor-photo-row">
              {draft.photoUrl
                ? <img src={resolveAssetUrl(draft.photoUrl)} alt="Anteprima della foto profilo" className="editor-photo-preview" />
                : <div aria-hidden="true" className="editor-photo-empty">Nessuna foto</div>}
              <div className="editor-photo-actions">
                <label className="outline editor-upload">
                  {photoBusy ? 'Attendi...' : draft.photoUrl ? 'Cambia foto' : 'Carica foto'}
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={photoBusy} onChange={onPhotoSelected} />
                </label>
                {draft.photoUrl && <button type="button" className="outline" disabled={photoBusy} onClick={onPhotoRemoved}>Rimuovi foto</button>}
                <p className="muted">JPEG, PNG o WebP, massimo 2 MB. Una foto caricata viene pubblicata subito.</p>
              </div>
            </div>
            {!photoUploaded && (
              <label>Oppure indica l’URL di una foto<input type="url" value={draft.photoUrl} onChange={e => change({ photoUrl: e.target.value })} maxLength={500} placeholder="https://..." /></label>
            )}
          </div>
          <label>Località<input value={draft.location} onChange={e => change({ location: e.target.value })} maxLength={120} /></label>
          <label>Modalità di lavoro<input value={draft.workMode} onChange={e => change({ workMode: e.target.value })} maxLength={120} /></label>
        </div>
      </fieldset>

      <fieldset className="panel editor-section">
        <legend>Numeri in evidenza</legend>
        <p className="muted">Fino a {MAX_STATS} card con un numero grande, ad esempio “10+” e “Anni di esperienza”.</p>
        {draft.stats.map((stat, i) => (
          <div className="editor-row" key={i}>
            <label>Valore<span className="sr-only"> {i + 1}</span><input value={stat.value} onChange={e => updateItem('stats', i, { value: e.target.value })} maxLength={20} placeholder="10+" /></label>
            <label>Etichetta<span className="sr-only"> numero {i + 1}</span><input value={stat.label} onChange={e => updateItem('stats', i, { label: e.target.value })} maxLength={60} placeholder="Anni di esperienza" /></label>
            <button type="button" className="icon-button" aria-label={`Rimuovi numero ${i + 1}`} onClick={() => removeItem('stats', i)}><Trash2 size={16} /></button>
          </div>
        ))}
        {draft.stats.length < MAX_STATS && (
          <button type="button" className="outline" onClick={() => addItem('stats', emptyStat())}><Plus size={15} /> Aggiungi numero</button>
        )}
      </fieldset>

      <fieldset className="panel editor-section">
        <legend>Contatti</legend>
        <div className="company-form-grid">
          <label>Email pubblica<input type="email" value={draft.email} onChange={e => change({ email: e.target.value })} maxLength={254} placeholder="nome@esempio.it" /></label>
          <label>Link al CV (URL)<input type="url" value={draft.cvUrl} onChange={e => change({ cvUrl: e.target.value })} maxLength={500} placeholder="https://..." /></label>
        </div>
        {draft.links.map((link, i) => (
          <div className="editor-row" key={i}>
            <label>Nome link<span className="sr-only"> {i + 1}</span><input value={link.label} onChange={e => updateItem('links', i, { label: e.target.value })} maxLength={60} placeholder="GitHub" /></label>
            <label>URL<span className="sr-only"> link {i + 1}</span><input type="url" value={link.url} onChange={e => updateItem('links', i, { url: e.target.value })} maxLength={500} placeholder="https://github.com/..." /></label>
            <button type="button" className="icon-button" aria-label={`Rimuovi link ${i + 1}`} onClick={() => removeItem('links', i)}><Trash2 size={16} /></button>
          </div>
        ))}
        <button type="button" className="outline" onClick={() => addItem('links', emptyLink())}><Plus size={15} /> Aggiungi link</button>
      </fieldset>

      <fieldset className="panel editor-section">
        <legend>Competenze</legend>
        {draft.skillGroups.map((group, i) => (
          <div className="editor-row" key={i}>
            <label>Gruppo<span className="sr-only"> {i + 1}</span><input value={group.title} onChange={e => updateItem('skillGroups', i, { title: e.target.value })} maxLength={60} placeholder="Backend" /></label>
            <label>Competenze (separate da virgola)<span className="sr-only"> gruppo {i + 1}</span><input value={group.skills} onChange={e => updateItem('skillGroups', i, { skills: e.target.value })} placeholder="C#, ASP.NET Core" /></label>
            <button type="button" className="icon-button" aria-label={`Rimuovi gruppo ${i + 1}`} onClick={() => removeItem('skillGroups', i)}><Trash2 size={16} /></button>
          </div>
        ))}
        <button type="button" className="outline" onClick={() => addItem('skillGroups', emptySkillGroup())}><Plus size={15} /> Aggiungi gruppo</button>
      </fieldset>

      <fieldset className="panel editor-section">
        <legend>Esperienza</legend>
        {draft.experiences.map((item, i) => (
          <div className="editor-block" key={i}>
            <div className="company-form-grid">
              <label>Azienda *<span className="sr-only"> esperienza {i + 1}</span><input value={item.company} onChange={e => updateItem('experiences', i, { company: e.target.value })} required maxLength={120} /></label>
              <label>Ruolo *<span className="sr-only"> esperienza {i + 1}</span><input value={item.role} onChange={e => updateItem('experiences', i, { role: e.target.value })} required maxLength={120} /></label>
              <label>Periodo *<span className="sr-only"> esperienza {i + 1}</span><input value={item.period} onChange={e => updateItem('experiences', i, { period: e.target.value })} required maxLength={60} placeholder="2020 – oggi" /></label>
              <label className="wide">Descrizione<span className="sr-only"> esperienza {i + 1}</span><textarea value={item.description} onChange={e => updateItem('experiences', i, { description: e.target.value })} maxLength={2000} rows={3} /></label>
              <label className="wide">Risultati (uno per riga)<span className="sr-only"> esperienza {i + 1}</span><textarea value={item.highlights} onChange={e => updateItem('experiences', i, { highlights: e.target.value })} rows={3} /></label>
            </div>
            <button type="button" className="outline" onClick={() => removeItem('experiences', i)}><Trash2 size={15} /> Rimuovi esperienza {i + 1}</button>
          </div>
        ))}
        <button type="button" className="outline" onClick={() => addItem('experiences', emptyExperience())}><Plus size={15} /> Aggiungi esperienza</button>
      </fieldset>

      <fieldset className="panel editor-section">
        <legend>Progetti</legend>
        {draft.projects.map((project, i) => (
          <div className="editor-block" key={i}>
            <div className="company-form-grid">
              <label>Nome progetto *<span className="sr-only"> {i + 1}</span><input value={project.name} onChange={e => updateItem('projects', i, { name: e.target.value })} required maxLength={120} /></label>
              <label>Link<span className="sr-only"> progetto {i + 1}</span><input type="url" value={project.url} onChange={e => updateItem('projects', i, { url: e.target.value })} maxLength={500} placeholder="https://..." /></label>
              <label className="wide">Descrizione<span className="sr-only"> progetto {i + 1}</span><textarea value={project.description} onChange={e => updateItem('projects', i, { description: e.target.value })} maxLength={1000} rows={3} /></label>
              <label className="wide">Tecnologie (separate da virgola)<span className="sr-only"> progetto {i + 1}</span><input value={project.technologies} onChange={e => updateItem('projects', i, { technologies: e.target.value })} placeholder="React, PostgreSQL" /></label>
            </div>
            <button type="button" className="outline" onClick={() => removeItem('projects', i)}><Trash2 size={15} /> Rimuovi progetto {i + 1}</button>
          </div>
        ))}
        <button type="button" className="outline" onClick={() => addItem('projects', emptyProject())}><Plus size={15} /> Aggiungi progetto</button>
      </fieldset>

      <div className="form-actions">
        <button type="submit" className="primary" disabled={saving}>{saving ? 'Salvataggio...' : 'Salva e pubblica'}</button>
      </div>
    </form>
  );
}
