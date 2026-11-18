import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { FilePlus2, Pencil, Sparkles, Trash2, ExternalLink, X, Palette, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { blogApi, defaultBlogSettings, type BlogPost, type BlogPostInput, type BlogStatus, type BlogSettings } from '@/services/blogApi';
import { generateAiDraft, getAiWriterStatus } from '@/services/portfolioApi';
import BlogVisualBuilder from './BlogVisualBuilder';
import BlogMarkdownEditor from './BlogMarkdownEditor';

const emptyPost: BlogPostInput = {
  title: '', slug: '', excerpt: '', contentMarkdown: '', category: 'Sviluppo software',
  tags: [], coverImageUrl: null, seoTitle: null, seoDescription: null, status: 'Draft'
};
const field = 'grid gap-1.5 text-sm font-medium';
const inputClass = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm';
const colorFields: { key: keyof BlogSettings; label: string }[] = [
  { key: 'primaryColor', label: 'Colore principale / brand' }, { key: 'accentColor', label: 'Colore secondario / accento' },
  { key: 'backgroundColor', label: 'Sfondo generale' }, { key: 'textColor', label: 'Testo principale' },
  { key: 'mutedTextColor', label: 'Testo secondario' }, { key: 'surfaceColor', label: 'Superfici e pannelli' },
  { key: 'headerBackgroundColor', label: 'Sfondo intestazione' }, { key: 'heroBackgroundColor', label: 'Sfondo copertina / hero' },
  { key: 'cardBackgroundColor', label: 'Sfondo schede articolo' }, { key: 'footerBackgroundColor', label: 'Sfondo footer' },
  { key: 'borderColor', label: 'Bordi e divisori' }, { key: 'buttonTextColor', label: 'Testo pulsanti' }
];
function slugify(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function BlogAdmin() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [draft, setDraft] = useState<BlogPostInput>(emptyPost);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiOperation, setAiOperation] = useState<'generate' | 'rewrite' | 'proofread' | 'improve' | 'expand' | 'introduction' | 'conclusion'>('generate');
  const [tagsText, setTagsText] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [tab, setTab] = useState<'articles' | 'design' | 'ai'>('articles');
  const [aiStatus, setAiStatus] = useState<{ configured: boolean; provider: string; model: string; endpointHost: string } | null>(null);
  const [settings, setSettings] = useState<BlogSettings>(defaultBlogSettings);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [articleUrl, setArticleUrl] = useState('');
  const [importingArticle, setImportingArticle] = useState(false);

  async function refresh() {
    setLoading(true);
    try { setPosts(await blogApi.adminList()); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Impossibile caricare gli articoli.'); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    void refresh();
    blogApi.settings().then(setSettings).catch(error => toast.error(error instanceof Error ? error.message : 'Impossibile caricare le impostazioni.')).finally(() => setSettingsLoading(false));
    getAiWriterStatus().then(setAiStatus).catch(() => setAiStatus(null));
  }, []);

  const counts = useMemo(() => ({
    all: posts.length, published: posts.filter(x => x.status === 'Published').length,
    drafts: posts.filter(x => x.status === 'Draft').length
  }), [posts]);

  function startNew() { setEditingId(null); setDraft(emptyPost); setTagsText(''); setEditorOpen(true); }
  function edit(post: BlogPost) {
    setEditingId(post.id);
    setDraft({ title: post.title, slug: post.slug, excerpt: post.excerpt, contentMarkdown: post.contentMarkdown,
      category: post.category, tags: post.tags, coverImageUrl: post.coverImageUrl,
      seoTitle: post.seoTitle, seoDescription: post.seoDescription, status: post.status });
    setTagsText(post.tags.join(', ')); setEditorOpen(true);
  }
  function update<K extends keyof BlogPostInput>(key: K, value: BlogPostInput[K]) {
    setDraft(current => ({ ...current, [key]: value }));
  }
  function changeTitle(value: string) {
    setDraft(current => ({ ...current, title: value, slug: editingId ? current.slug : slugify(value) }));
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true);
    const payload = { ...draft, tags: tagsText.split(',').map(x => x.trim()).filter(Boolean) };
    try {
      if (editingId) await blogApi.update(editingId, payload); else await blogApi.create(payload);
      toast.success(payload.status === 'Published' ? 'Articolo pubblicato.' : 'Bozza salvata.');
      setEditorOpen(false); setEditingId(null); setDraft(emptyPost); await refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Salvataggio non riuscito.'); }
    finally { setSaving(false); }
  }
  async function generateArticle() {
    if (!draft.title.trim()) { toast.error('Inserisci prima il titolo o l’argomento.'); return; }
    const hasContent = Boolean(draft.contentMarkdown.trim());
    if (aiOperation === 'generate' && hasContent && !window.confirm('La generazione sostituirà il contenuto attuale. Vuoi continuare?')) return;
    if (aiOperation !== 'generate' && !hasContent) { toast.error('Scrivi prima il contenuto da elaborare con AI.'); return; }
    setGenerating(true);
    try {
      const result = await generateAiDraft({
        channel: 'blog', tone: 'technical', language: 'Italiano',
        operation: aiOperation,
        content: draft.contentMarkdown,
        topic: `Titolo: ${draft.title}. Categoria: ${draft.category}. Indicazioni: ${draft.excerpt}. Produci un testo tecnico concreto, ben strutturato, con esempi verificabili e Markdown pulito.`
      }, { name: '', role: '', tagline: '', summary: '', location: '', workMode: '', links: [], skillGroups: [], experiences: [], projects: [] });
      setDraft(current => ({
        ...current,
        contentMarkdown: aiOperation === 'introduction'
          ? (result.draft.trim() + '\n\n' + current.contentMarkdown).trim()
          : aiOperation === 'conclusion'
            ? (current.contentMarkdown.trim() + '\n\n' + result.draft.trim()).trim()
            : result.draft
      }));
      toast.success(`Contenuto elaborato con ${result.model}. Controlla il risultato prima di pubblicare.`);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Generazione AI non riuscita.'); }
    finally { setGenerating(false); }
  }
  async function importArticleFromUrl() {
    if (!articleUrl.trim()) { toast.error('Inserisci il link HTTPS dell’articolo.'); return; }
    setImportingArticle(true);
    try {
      const source = await blogApi.importArticleUrl(articleUrl.trim());
      let content = source.extractedMarkdown;
      try {
        const result = await generateAiDraft({
          channel: 'blog', tone: 'technical', language: 'Italiano', operation: 'style-transfer',
          topic: `Crea una bozza originale in italiano ispirata esclusivamente alla struttura editoriale dell'articolo di riferimento. Titolo: ${source.sourceTitle}. Descrizione: ${source.sourceDescription}. Dominio: ${source.sourceHost}. Mantieni una gerarchia simile di titoli, paragrafi, elenchi e blocchi di codice, ma non copiare il testo. Usa esempi originali e non inventare dettagli tecnici.`,
          content: source.extractedMarkdown
        }, { name: '', role: '', tagline: '', summary: '', location: '', workMode: '', links: [], skillGroups: [], experiences: [], projects: [] });
        content = result.draft;
        toast.success(`Bozza originale creata con ${result.model}. Verificala prima della pubblicazione.`);
      } catch { toast.warning('Articolo estratto. La trasformazione AI non è disponibile: puoi modificare il contenuto importato manualmente.'); }
      setEditingId(null);
      setDraft({ ...emptyPost, title: source.sourceTitle.slice(0, 180), slug: slugify(source.sourceTitle).slice(0, 180), excerpt: (source.sourceDescription || `Bozza ispirata alla struttura editoriale di ${source.sourceHost}.`).slice(0, 500), contentMarkdown: content, category: 'Sviluppo software', seoTitle: source.sourceTitle.slice(0, 180), seoDescription: (source.sourceDescription || '').slice(0, 320) });
      setTagsText(''); setEditorOpen(true); setArticleUrl('');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Importazione articolo non riuscita.'); }
    finally { setImportingArticle(false); }
  }
  async function remove(post: BlogPost) {
    if (!window.confirm(`Eliminare definitivamente “${post.title}”?`)) return;
    try { await blogApi.remove(post.id); toast.success('Articolo eliminato.'); await refresh(); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Eliminazione non riuscita.'); }
  }
  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSettingsSaving(true);
    try { setSettings(await blogApi.saveSettings(settings)); toast.success('Personalizzazione del blog salvata.'); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Impossibile salvare le impostazioni.'); }
    finally { setSettingsSaving(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-widest text-primary">Contenuti</p><h1 className="text-3xl font-extrabold tracking-tight">Blog CMS</h1><p className="mt-1 text-muted-foreground">Gestisci gli articoli e personalizza l’identità del blog senza modificare il codice.</p></div>
        <Button variant="outline" asChild><a href="/blog" target="_blank" rel="noreferrer">Apri blog <ExternalLink /></a></Button>
      </div>
      <div className="flex flex-wrap gap-2 border-b pb-3">
        <Button variant={tab === 'articles' ? 'default' : 'outline'} onClick={() => setTab('articles')}><FileText className="mr-2 size-4" /> Articoli</Button>
        <Button variant={tab === 'design' ? 'default' : 'outline'} onClick={() => setTab('design')}><Palette className="mr-2 size-4" /> Personalizzazione</Button>
        <Button variant={tab === 'ai' ? 'default' : 'outline'} onClick={() => setTab('ai')}><Sparkles className="mr-2 size-4" /> Configurazione AI</Button>
      </div>
      {tab === 'articles' ? <>
        <Card><CardHeader><CardTitle>Importa stile da un articolo</CardTitle><CardDescription>Incolla un URL pubblico HTTPS. Il CMS estrae la struttura editoriale e, se l’AI è configurata, genera una bozza originale senza copiare il testo sorgente.</CardDescription></CardHeader><CardContent className="flex flex-col gap-3 sm:flex-row">
          <Input type="url" value={articleUrl} onChange={event => setArticleUrl(event.target.value)} placeholder="https://esempio.com/articolo" aria-label="URL articolo di riferimento" />
          <Button type="button" onClick={() => void importArticleFromUrl()} disabled={importingArticle || !articleUrl.trim()} className="shrink-0">{importingArticle ? 'Analisi in corso…' : 'Analizza e crea bozza'}</Button>
        </CardContent></Card>
        <div className="grid gap-3 sm:grid-cols-3">
          <Card><CardHeader className="pb-2"><CardDescription>Articoli totali</CardDescription><CardTitle className="text-3xl">{counts.all}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Pubblicati</CardDescription><CardTitle className="text-3xl">{counts.published}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Bozze</CardDescription><CardTitle className="text-3xl">{counts.drafts}</CardTitle></CardHeader></Card>
        </div>
        <Card><CardHeader><div className="flex flex-wrap items-center justify-between gap-2"><div><CardTitle>Articoli</CardTitle><CardDescription>Apri l’editor dedicato per creare o modificare un articolo.</CardDescription></div><Button onClick={startNew}><FilePlus2 className="mr-2 size-4" /> Nuovo articolo</Button></div></CardHeader>
          <CardContent>{loading ? <p role="status" className="text-sm text-muted-foreground">Caricamento articoli…</p> : posts.length === 0 ? <p className="text-sm text-muted-foreground">Ancora nessun articolo. Crea il primo.</p> :
            <div className="divide-y">{posts.map(post => <div key={post.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate font-semibold">{post.title}</p><p className="text-xs text-muted-foreground">{post.category} · {post.status} · {new Date(post.updatedAt).toLocaleDateString('it-IT')}</p></div><div className="flex shrink-0 gap-1"><Button size="icon" variant="ghost" aria-label={`Modifica ${post.title}`} onClick={() => edit(post)}><Pencil className="size-4" /></Button>{post.status === 'Published' && <Button size="icon" variant="ghost" aria-label={`Apri ${post.title}`} asChild><a href={`/blog/${post.slug}`} target="_blank" rel="noreferrer"><ExternalLink className="size-4" /></a></Button>}<Button size="icon" variant="ghost" aria-label={`Elimina ${post.title}`} onClick={() => void remove(post)}><Trash2 className="size-4 text-destructive" /></Button></div></div>)}</div>}
          </CardContent>
        </Card>
      </> : tab === 'design' ? <Card><CardHeader><CardTitle>Identità e aspetto</CardTitle><CardDescription>Modifica nome, autore, testi, logo, colori e template. Le modifiche vengono salvate nel database.</CardDescription></CardHeader><CardContent>
        {settingsLoading ? <p role="status">Caricamento impostazioni…</p> : <form onSubmit={saveSettings} className="grid gap-5 md:grid-cols-2">
          <BlogVisualBuilder settings={settings} onChange={setSettings} />
          <label className={field}>Nome del blog<Input required maxLength={120} value={settings.siteName} onChange={e => setSettings(s => ({ ...s, siteName: e.target.value }))} /></label>
          <label className={field}>Nome autore<Input required maxLength={120} value={settings.authorName} onChange={e => setSettings(s => ({ ...s, authorName: e.target.value }))} /></label>
          <label className={field}>Sottotitolo / ruolo<Input required maxLength={180} value={settings.tagline} onChange={e => setSettings(s => ({ ...s, tagline: e.target.value }))} /></label>
          <label className={field}>Logo (URL immagine)<Input type="url" placeholder="https://..." value={settings.logoUrl} onChange={e => setSettings(s => ({ ...s, logoUrl: e.target.value }))} /></label>
          <label className={field}>Titolo principale<Input required maxLength={180} value={settings.heroTitle} onChange={e => setSettings(s => ({ ...s, heroTitle: e.target.value }))} /></label>
          <label className={field}>Descrizione principale<Input required maxLength={600} value={settings.heroDescription} onChange={e => setSettings(s => ({ ...s, heroDescription: e.target.value }))} /></label>
          {colorFields.map(({ key, label }) => <label key={key} className={field}>{label}<div className="flex items-center gap-3"><Input type="color" className="h-10 w-16 shrink-0 p-1" value={settings[key] as string} onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))} /><Input value={settings[key] as string} maxLength={7} onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))} aria-label={label + ' codice HEX'} /></div></label>)}
          <label className={field}>Template grafico<select className={inputClass} value={settings.template} onChange={e => setSettings(s => ({ ...s, template: e.target.value as BlogSettings['template'] }))}><option value="premium-tech">Premium Tech</option><option value="editorial-light">Editorial Light</option><option value="developer-dark">Developer Dark</option><option value="personal-journal">Personal Journal</option><option value="minimal">Minimal</option><option value="magazine">Digital Magazine</option><option value="terminal">Code / Terminal</option><option value="creative">Creative Studio</option></select></label>
          <div className="md:col-span-2 overflow-hidden rounded-2xl border" style={{ borderColor: settings.borderColor, background: settings.backgroundColor, color: settings.textColor }}>
            <div className="flex items-center gap-3 p-4" style={{ background: settings.headerBackgroundColor, color: settings.buttonTextColor }}><div className="grid size-10 place-items-center rounded-full font-black" style={{ background: `linear-gradient(135deg,${settings.primaryColor},${settings.accentColor})` }}>{settings.siteName.slice(0,2).toUpperCase()}</div><div><p className="font-bold">{settings.siteName || 'Nome del blog'}</p><p className="text-xs opacity-75">{settings.tagline}</p></div></div>
            <div className="p-5" style={{ background: settings.heroBackgroundColor, color: settings.buttonTextColor }}><p className="text-xs font-bold uppercase tracking-widest" style={{ color: settings.accentColor }}>ANTEPRIMA LIVE</p><h3 className="mt-2 text-2xl font-black">{settings.heroTitle}</h3><p className="mt-2 max-w-2xl text-sm opacity-80">{settings.heroDescription}</p></div>
            <div className="grid gap-3 p-4 sm:grid-cols-2" style={{ background: settings.backgroundColor }}><div className="rounded-xl border p-4" style={{ background: settings.cardBackgroundColor, borderColor: settings.borderColor }}><p className="text-xs font-bold" style={{ color: settings.primaryColor }}>ARTICOLO IN EVIDENZA</p><h4 className="mt-2 font-bold" style={{ color: settings.textColor }}>Il tuo prossimo articolo</h4><p className="mt-1 text-xs" style={{ color: settings.mutedTextColor }}>Anteprima di titoli, descrizioni e schede.</p></div><div className="rounded-xl border p-4" style={{ background: settings.surfaceColor, borderColor: settings.borderColor }}><p className="text-xs" style={{ color: settings.mutedTextColor }}>Pulsanti e link</p><button type="button" className="mt-2 rounded-lg px-4 py-2 text-sm font-bold" style={{ background: settings.primaryColor, color: settings.buttonTextColor }}>Leggi articolo</button></div></div>
            <div className="flex flex-wrap items-center justify-between gap-3 p-4" style={{ background: settings.footerBackgroundColor, color: settings.buttonTextColor }}><div><p className="font-semibold">{settings.authorName}</p><p className="text-xs opacity-75">{settings.template}</p></div><Button type="submit" disabled={settingsSaving}>{settingsSaving ? 'Salvataggio…' : 'Salva personalizzazione'}</Button></div>
          </div>
        </form>}
      </CardContent></Card> : <Card><CardHeader><CardTitle>Configurazione AI</CardTitle><CardDescription>Puoi usare il provider API configurato sul backend oppure, in futuro, un runtime locale autorizzato per il tuo piano ChatGPT. Il piano Go non è una API key e non può essere usato direttamente da Render.</CardDescription></CardHeader><CardContent className="space-y-5">
        <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-4">
          <div className="flex items-center gap-2 font-semibold"><Sparkles className="size-4" /> ChatGPT Go — collegamento locale</div>
          <p className="mt-2 text-sm text-muted-foreground">Il sito è ospitato su Render: non deve ricevere né conservare il token personale ChatGPT. L'integrazione prevista passa da un piccolo runtime sul tuo PC Windows, che manterrà localmente l'autorizzazione e invierà le richieste solo per tua iniziativa.</p>
          <p className="mt-2 text-sm text-muted-foreground">Stato: <strong>non ancora collegato</strong>. Prima di attivare le richieste serve un client OAuth autorizzato da OpenAI per l'uso del piano. Per le applicazioni private/ospitate l'accesso non è automatico: non basta avere ChatGPT Go.</p>
          <p className="mt-2 text-xs text-muted-foreground">Nessun token viene richiesto qui e nessuna chiamata viene inviata a ChatGPT Go da questa schermata. L'attuale provider API rimane disponibile come alternativa.</p>
        </div>
        <div className="flex items-center gap-3 rounded-xl border p-4">
          <div className={"grid size-11 place-items-center rounded-full " + (aiStatus?.configured ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600")}><Sparkles className="size-5" /></div>
          <div className="min-w-0 flex-1"><p className="font-semibold">{aiStatus?.configured ? 'Chiave API configurata' : 'Configurazione API non verificata'}</p><p className="text-sm text-muted-foreground">{aiStatus ? aiStatus.provider + ' · ' + aiStatus.model + ' · ' + aiStatus.endpointHost : 'Impossibile leggere lo stato dal backend.'}</p></div>
          <Button type="button" variant="outline" onClick={() => getAiWriterStatus().then(setAiStatus).catch(error => toast.error(error instanceof Error ? error.message : 'Verifica non riuscita.'))}>Aggiorna stato</Button>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border p-4"><p className="text-xs font-bold uppercase text-muted-foreground">API Key</p><p className="mt-2 font-mono text-sm">AI__ApiKey</p><p className="mt-1 text-xs text-muted-foreground">Chiave privata del provider</p></div>
          <div className="rounded-xl border p-4"><p className="text-xs font-bold uppercase text-muted-foreground">Modello</p><p className="mt-2 font-mono text-sm">AI__Model</p><p className="mt-1 text-xs text-muted-foreground">Ad esempio gpt-4.1-mini</p></div>
          <div className="rounded-xl border p-4"><p className="text-xs font-bold uppercase text-muted-foreground">Endpoint</p><p className="mt-2 font-mono text-sm">AI__Endpoint</p><p className="mt-1 text-xs text-muted-foreground">URL HTTPS del provider</p></div>
        </div>
        <div className="rounded-xl bg-muted/40 p-4 text-sm">
          <p className="font-semibold">Dove inserire la chiave API</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
            <li>Apri Render e seleziona il servizio backend API di JobHunter.</li>
            <li>Vai in Environment e aggiungi AI__ApiKey con la tua chiave privata.</li>
            <li>Aggiungi AI__Model e AI__Endpoint secondo il provider scelto.</li>
            <li>Salva e riavvia il servizio API per applicare le modifiche.</li>
          </ol>
          <p className="mt-3 text-xs text-muted-foreground">Lo stato qui sopra conferma soltanto che una chiave è presente nella configurazione. Per verificare credito, modello e raggiungibilità serve una chiamata di test al provider.</p>
        </div>
      </CardContent></Card>}

      {editorOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-2 backdrop-blur-sm sm:p-5" role="dialog" aria-modal="true" aria-labelledby="blog-editor-title">
        <div className="flex max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl">
          <div className="flex items-center justify-between border-b px-5 py-4"><div><p className="text-xs font-bold uppercase tracking-widest text-primary">Editor articoli</p><h2 id="blog-editor-title" className="text-xl font-extrabold">{editingId ? 'Modifica articolo' : 'Nuovo articolo'}</h2></div><Button size="icon" variant="ghost" onClick={() => setEditorOpen(false)} aria-label="Chiudi editor"><X /></Button></div>
          <form onSubmit={save} className="min-h-0 flex-1 overflow-y-auto">
            <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
              <div className="space-y-4">
                <Input required maxLength={180} value={draft.title} onChange={e => changeTitle(e.target.value)} placeholder="Titolo dell’articolo" className="h-14 border-0 px-0 text-2xl font-bold shadow-none focus-visible:ring-0" />
                <Input required maxLength={180} value={draft.slug} onChange={e => update('slug', slugify(e.target.value))} placeholder="slug-url" />
                <Textarea required rows={2} maxLength={500} value={draft.excerpt} onChange={e => update('excerpt', e.target.value)} placeholder="Scrivi un breve sommario…" />
                <BlogMarkdownEditor value={draft.contentMarkdown} onChange={value => update('contentMarkdown', value)} />
                <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/20 p-3">
                  <label className="text-sm font-semibold" htmlFor="blog-ai-operation">Assistente AI</label>
                  <select id="blog-ai-operation" className="h-9 min-w-0 flex-1 rounded-md border bg-background px-2 text-sm" value={aiOperation} onChange={e => setAiOperation(e.target.value as typeof aiOperation)}>
                    <option value="generate">Genera articolo completo</option>
                    <option value="rewrite">Riscrivi tutto l’articolo</option>
                    <option value="proofread">Correggi grammatica e refusi</option>
                    <option value="improve">Rendi più professionale</option>
                    <option value="expand">Espandi con spiegazioni ed esempi</option>
                    <option value="introduction">Genera introduzione</option>
                    <option value="conclusion">Genera conclusione</option>
                  </select>
                  <Button type="button" disabled={generating} onClick={() => void generateArticle()}><Sparkles className="mr-2 size-4" />{generating ? 'Elaborazione…' : 'Esegui AI'}</Button>
                </div>
              </div>
              <aside className="space-y-4">
                <div className="rounded-xl border p-4"><h3 className="mb-3 font-bold">Pubblicazione</h3><label className={field}>Stato<select className={inputClass} value={draft.status} onChange={e => update('status', e.target.value as BlogStatus)}><option value="Draft">Bozza privata</option><option value="Published">Pubblicato</option><option value="Archived">Archiviato</option></select></label><label className={`${field} mt-3`}>Categoria<Input required maxLength={80} value={draft.category} onChange={e => update('category', e.target.value)} /></label><label className={`${field} mt-3`}>Tag separati da virgola<Input value={tagsText} onChange={e => setTagsText(e.target.value)} placeholder=".NET, React, AI" /></label></div>
                <div className="rounded-xl border p-4"><h3 className="mb-3 font-bold">Immagini e SEO</h3><label className={field}>Copertina URL<Input type="url" value={draft.coverImageUrl ?? ''} onChange={e => update('coverImageUrl', e.target.value || null)} placeholder="https://…" /></label><label className={`${field} mt-3`}>SEO title<Input maxLength={180} value={draft.seoTitle ?? ''} onChange={e => update('seoTitle', e.target.value || null)} /></label><label className={`${field} mt-3`}>SEO description<Textarea rows={4} maxLength={320} value={draft.seoDescription ?? ''} onChange={e => update('seoDescription', e.target.value || null)} /></label></div>
              </aside>
            </div>
            <div className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t bg-background/95 px-5 py-4 backdrop-blur"><Button type="button" variant="ghost" onClick={() => setEditorOpen(false)}>Annulla</Button><Button type="submit" disabled={saving || generating}>{saving ? 'Salvataggio…' : draft.status === 'Published' ? 'Salva e pubblica' : 'Salva bozza'}</Button></div>
          </form>
        </div>
      </div>}
    </div>
  );
}
