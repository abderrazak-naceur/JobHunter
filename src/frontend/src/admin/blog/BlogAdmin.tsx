import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { FilePlus2, Pencil, Sparkles, Trash2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { blogApi, type BlogPost, type BlogPostInput, type BlogStatus } from '@/services/blogApi';
import { generateAiDraft } from '@/services/portfolioApi';

const emptyPost: BlogPostInput = {
  title: '', slug: '', excerpt: '', contentMarkdown: '', category: 'Sviluppo software',
  tags: [], coverImageUrl: null, seoTitle: null, seoDescription: null, status: 'Draft'
};

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
  const [tagsText, setTagsText] = useState('');

  async function refresh() {
    setLoading(true);
    try { setPosts(await blogApi.adminList()); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Impossibile caricare gli articoli.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, []);

  const counts = useMemo(() => ({
    all: posts.length,
    published: posts.filter(x => x.status === 'Published').length,
    drafts: posts.filter(x => x.status === 'Draft').length
  }), [posts]);

  function startNew() {
    setEditingId(null); setDraft(emptyPost); setTagsText('');
  }
  function edit(post: BlogPost) {
    setEditingId(post.id);
    setDraft({
      title: post.title, slug: post.slug, excerpt: post.excerpt, contentMarkdown: post.contentMarkdown,
      category: post.category, tags: post.tags, coverImageUrl: post.coverImageUrl,
      seoTitle: post.seoTitle, seoDescription: post.seoDescription, status: post.status
    });
    setTagsText(post.tags.join(', '));
  }
  function update<K extends keyof BlogPostInput>(key: K, value: BlogPostInput[K]) {
    setDraft(current => ({ ...current, [key]: value }));
  }
  function changeTitle(value: string) {
    setDraft(current => ({ ...current, title: value, slug: editingId ? current.slug : slugify(value) }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const payload = { ...draft, tags: tagsText.split(',').map(x => x.trim()).filter(Boolean) };
    try {
      if (editingId) await blogApi.update(editingId, payload);
      else await blogApi.create(payload);
      toast.success(payload.status === 'Published' ? 'Articolo pubblicato.' : 'Bozza salvata.');
      startNew();
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Salvataggio non riuscito.');
    } finally { setSaving(false); }
  }

  async function generateArticle() {
    if (!draft.title.trim()) { toast.error('Inserisci prima il titolo o l’argomento.'); return; }
    setGenerating(true);
    try {
      const result = await generateAiDraft({
        channel: 'blog', tone: 'technical', language: 'Italiano',
        topic: `Scrivi un articolo completo per il blog tecnico. Titolo/argomento: ${draft.title}. Categoria: ${draft.category}. Indicazioni: ${draft.excerpt}. Struttura con titolo, introduzione, sottotitoli, esempi pratici e conclusione. Formato Markdown.`
      }, {
        name: '', role: '', tagline: '', summary: '', location: '', workMode: '',
        links: [], skillGroups: [], experiences: [], projects: []
      });
      const firstHeading = result.draft.match(/^#\s+(.+)$/m)?.[1];
      setDraft(current => ({ ...current, title: current.title || firstHeading || '', contentMarkdown: result.draft }));
      toast.success(`Bozza generata con ${result.model}. Verificala prima di pubblicare.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Generazione AI non riuscita.');
    } finally { setGenerating(false); }
  }

  async function remove(post: BlogPost) {
    if (!window.confirm(`Eliminare definitivamente “${post.title}”?`)) return;
    try { await blogApi.remove(post.id); toast.success('Articolo eliminato.'); await refresh(); if (editingId === post.id) startNew(); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Eliminazione non riuscita.'); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Contenuti</p>
          <h1 className="text-3xl font-extrabold tracking-tight">Blog CMS</h1>
          <p className="mt-1 text-muted-foreground">Scrivi, modifica e pubblica articoli. Le bozze restano private.</p>
        </div>
        <Button variant="outline" asChild><a href="/blog" target="_blank" rel="noreferrer">Apri blog <ExternalLink /></a></Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardDescription>Articoli totali</CardDescription><CardTitle className="text-3xl">{counts.all}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Pubblicati</CardDescription><CardTitle className="text-3xl">{counts.published}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Bozze</CardDescription><CardTitle className="text-3xl">{counts.drafts}</CardTitle></CardHeader></Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><CardTitle>Articoli</CardTitle><CardDescription>Modifica un articolo o creane uno nuovo.</CardDescription></div>
              <Button size="sm" onClick={startNew}><FilePlus2 className="mr-2 size-4" /> Nuovo</Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? <p role="status" className="text-sm text-muted-foreground">Caricamento articoli…</p> :
              posts.length === 0 ? <p className="text-sm text-muted-foreground">Ancora nessun articolo. Crea il primo.</p> :
              <div className="divide-y">
                {posts.map(post => (
                  <div key={post.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{post.title}</p>
                      <p className="text-xs text-muted-foreground">{post.category} · {post.status} · {new Date(post.updatedAt).toLocaleDateString('it-IT')}</p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button size="icon" variant="ghost" aria-label={`Modifica ${post.title}`} onClick={() => edit(post)}><Pencil className="size-4" /></Button>
                      {post.status === 'Published' && <Button size="icon" variant="ghost" aria-label={`Apri ${post.title}`} asChild><a href={`/blog/${post.slug}`} target="_blank" rel="noreferrer"><ExternalLink className="size-4" /></a></Button>}
                      <Button size="icon" variant="ghost" aria-label={`Elimina ${post.title}`} onClick={() => void remove(post)}><Trash2 className="size-4 text-destructive" /></Button>
                    </div>
                  </div>
                ))}
              </div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{editingId ? 'Modifica articolo' : 'Nuovo articolo'}</CardTitle><CardDescription>Editor Markdown con anteprima testuale e salvataggio indipendente.</CardDescription></CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={save}>
              <label className="grid gap-1 text-sm font-medium">Titolo<Input required maxLength={180} value={draft.title} onChange={e => changeTitle(e.target.value)} /></label>
              <label className="grid gap-1 text-sm font-medium">Slug URL<Input required maxLength={180} value={draft.slug} onChange={e => update('slug', slugify(e.target.value))} /></label>
              <label className="grid gap-1 text-sm font-medium">Sommario<Textarea required rows={2} maxLength={500} value={draft.excerpt} onChange={e => update('excerpt', e.target.value)} /></label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-sm font-medium">Categoria<Input required maxLength={80} value={draft.category} onChange={e => update('category', e.target.value)} /></label>
                <label className="grid gap-1 text-sm font-medium">Tag, separati da virgola<Input value={tagsText} onChange={e => setTagsText(e.target.value)} placeholder=".NET, React, AI" /></label>
              </div>
              <label className="grid gap-1 text-sm font-medium">Immagine copertina URL (opzionale)<Input type="url" value={draft.coverImageUrl ?? ''} onChange={e => update('coverImageUrl', e.target.value || null)} /></label>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" disabled={generating} onClick={() => void generateArticle()}><Sparkles className="mr-2 size-4" />{generating ? 'Generazione…' : 'Genera con AI'}</Button>
              </div>
              <label className="grid gap-1 text-sm font-medium">Contenuto Markdown
                <Textarea required rows={14} maxLength={100000} value={draft.contentMarkdown} onChange={e => update('contentMarkdown', e.target.value)} placeholder="# Titolo\n\nIntroduzione…\n\n## Sezione" />
              </label>
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Anteprima testo</p>
                <div className="max-h-48 overflow-auto whitespace-pre-wrap text-sm">{draft.contentMarkdown || 'L’anteprima apparirà qui mentre scrivi.'}</div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-sm font-medium">SEO title<Input maxLength={180} value={draft.seoTitle ?? ''} onChange={e => update('seoTitle', e.target.value || null)} /></label>
                <label className="grid gap-1 text-sm font-medium">SEO description<Input maxLength={320} value={draft.seoDescription ?? ''} onChange={e => update('seoDescription', e.target.value || null)} /></label>
              </div>
              <label className="grid gap-1 text-sm font-medium">Stato
                <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={draft.status} onChange={e => update('status', e.target.value as BlogStatus)}>
                  <option value="Draft">Bozza (privata)</option><option value="Published">Pubblica</option><option value="Archived">Archiviata</option>
                </select>
              </label>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={saving || generating}>{saving ? 'Salvataggio…' : draft.status === 'Published' ? 'Salva e pubblica' : 'Salva articolo'}</Button>
                <Button type="button" variant="ghost" onClick={startNew}>Annulla</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
