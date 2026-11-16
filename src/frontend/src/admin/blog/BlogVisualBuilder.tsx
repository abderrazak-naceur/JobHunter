import type { BlogSettings } from '@/services/blogApi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type Props = { settings: BlogSettings; onChange: (update: (current: BlogSettings) => BlogSettings) => void };
const labelClass = 'grid gap-1.5 text-sm font-medium';
const selectClass = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm';
const templates = [
  ['premium-tech', 'Premium Tech', 'Blu notte, gradienti e dettagli luminosi'],
  ['editorial-light', 'Editorial Light', 'Rivista pulita, fondo chiaro e tipografia elegante'],
  ['developer-dark', 'Developer Dark', 'Esperienza scura, contrasto elevato e look tecnico'],
  ['personal-journal', 'Personal Journal', 'Carta calda, stile blog personale e serif'],
  ['minimal', 'Minimal', 'Essenziale, geometrico e senza decorazioni'],
  ['magazine', 'Digital Magazine', 'Editoriale, copertina ampia e griglia magazine'],
  ['terminal', 'Code / Terminal', 'Monospace, pannelli tecnici e stile developer'],
  ['creative', 'Creative Studio', 'Colori vivaci, forme morbide e gradienti']
] as const;
function Field({ title, children }: { title: string; children: React.ReactNode }) {
  return <label className={labelClass}>{title}{children}</label>;
}
export default function BlogVisualBuilder({ settings, onChange }: Props) {
  const set = <K extends keyof BlogSettings>(key: K, value: BlogSettings[K]) => onChange(current => ({ ...current, [key]: value }));
  return <div className="space-y-5 md:col-span-2">
    <Card><CardHeader><CardTitle>Template del blog</CardTitle><CardDescription>Scegli una struttura grafica completa. Colori e contenuti restano modificabili dopo la selezione.</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {templates.map(([id, name, description]) => <button key={id} type="button" onClick={() => set('template', id)} className={`rounded-xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md ${settings.template === id ? 'border-primary bg-primary/5 ring-2 ring-primary/30' : 'border-border'}`}>
        <div className={`mb-3 h-20 overflow-hidden rounded-lg border ${id === 'developer-dark' || id === 'terminal' ? 'bg-slate-950' : id === 'personal-journal' ? 'bg-amber-50' : id === 'creative' ? 'bg-gradient-to-br from-fuchsia-500 via-violet-500 to-cyan-400' : id === 'editorial-light' || id === 'minimal' ? 'bg-stone-100' : 'bg-gradient-to-br from-blue-950 via-blue-800 to-violet-700'}`}>
          <div className="flex h-full flex-col justify-between p-2"><div className="h-2 w-1/3 rounded bg-white/70"/><div className="grid grid-cols-3 gap-1"><span className="h-7 rounded bg-white/30"/><span className="h-7 rounded bg-white/50"/><span className="h-7 rounded bg-white/20"/></div><div className="h-1.5 w-2/3 rounded bg-white/50"/></div>
        </div><span className="block font-bold">{name}</span><span className="mt-1 block text-xs text-muted-foreground">{description}</span>
        {settings.template === id && <span className="mt-2 inline-block rounded-full bg-primary px-2 py-1 text-[10px] font-bold text-primary-foreground">ATTIVO</span>}
      </button>)}
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Header e navigazione</CardTitle><CardDescription>Gestisci il marchio e i collegamenti del menu. Inserisci i link in formato JSON.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">
      <Field title="Testo del logo"><Input value={settings.siteName} maxLength={120} onChange={e => set('siteName', e.target.value)} /></Field>
      <Field title="Sottotitolo brand"><Input value={settings.tagline} maxLength={180} onChange={e => set('tagline', e.target.value)} /></Field>
      <Field title="URL logo"><Input value={settings.logoUrl} placeholder="https://..." onChange={e => set('logoUrl', e.target.value)} /></Field>
      <Field title="Stile intestazione"><select className={selectClass} value={settings.headerStyle} onChange={e => set('headerStyle', e.target.value as BlogSettings['headerStyle'])}><option value="sticky">Sticky / trasparente</option><option value="solid">Compatta / solida</option><option value="centered">Logo centrato</option><option value="minimal">Minimal</option></select></Field>
      <div className="md:col-span-2"><Field title="Menu personalizzato (JSON: [{\"label\":\"Home\",\"url\":\"/\"}])"><Textarea rows={4} value={settings.navigationJson} onChange={e => set('navigationJson', e.target.value)} className="font-mono text-xs" /></Field></div>
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Hero e copertina</CardTitle><CardDescription>Personalizza titolo, testo, immagine e composizione della prima schermata.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">
      <Field title="Etichetta sopra il titolo"><Input value={settings.heroEyebrow} onChange={e => set('heroEyebrow', e.target.value)} /></Field>
      <Field title="Titolo principale"><Input value={settings.heroTitle} maxLength={180} onChange={e => set('heroTitle', e.target.value)} /></Field>
      <div className="md:col-span-2"><Field title="Descrizione hero"><Textarea rows={3} value={settings.heroDescription} maxLength={600} onChange={e => set('heroDescription', e.target.value)} /></Field></div>
      <Field title="Immagine / sfondo hero URL"><Input value={settings.heroImageUrl} placeholder="https://..." onChange={e => set('heroImageUrl', e.target.value)} /></Field>
      <Field title="Composizione hero"><select className={selectClass} value={settings.heroStyle} onChange={e => set('heroStyle', e.target.value as BlogSettings['heroStyle'])}><option value="split">Testo + visual</option><option value="centered">Centrato</option><option value="cover">Immagine copertina</option><option value="compact">Compatto</option><option value="text-only">Solo testo</option></select></Field>
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Struttura della homepage</CardTitle><CardDescription>Attiva o disattiva le parti del blog e regola la griglia.</CardDescription></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {([
        ['showHeader','Mostra header'],['showHero','Mostra hero'],['showSearch','Mostra ricerca'],['showCategoryFilters','Mostra filtri categorie'],['showFeaturedArticle','Mostra articolo in evidenza'],['showSidebar','Mostra sidebar'],['showAuthorCard','Mostra scheda autore'],['showFooter','Mostra footer'],['showReadingTime','Mostra tempo di lettura'],['showArticleCover','Mostra copertina negli articoli']
      ] as const).map(([key, title]) => <label key={key} className="flex items-center gap-2 rounded-lg border p-3 text-sm"><input type="checkbox" checked={settings[key]} onChange={e => set(key, e.target.checked)} className="size-4 accent-primary"/>{title}</label>)}
      <Field title="Colonne articoli"><select className={selectClass} value={settings.gridColumns} onChange={e => set('gridColumns', e.target.value as BlogSettings['gridColumns'])}><option value="2">2 colonne</option><option value="3">3 colonne</option><option value="4">4 colonne</option></select></Field>
      <Field title="Larghezza contenuto"><select className={selectClass} value={settings.contentWidth} onChange={e => set('contentWidth', e.target.value as BlogSettings['contentWidth'])}><option value="narrow">Stretta</option><option value="standard">Standard</option><option value="wide">Ampia</option><option value="full">Full width</option></select></Field>
      <Field title="Layout articolo"><select className={selectClass} value={settings.articleLayout} onChange={e => set('articleLayout', e.target.value as BlogSettings['articleLayout'])}><option value="sidebar">Articolo + sidebar</option><option value="centered">Articolo centrato</option><option value="wide">Lettura ampia</option><option value="magazine">Magazine</option></select></Field>
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Tipografia e componenti</CardTitle><CardDescription>Modifica font, dimensioni, forme, ombre e stile delle schede e dei pulsanti.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-3">
      <Field title="Font testo"><select className={selectClass} value={settings.fontFamily} onChange={e => set('fontFamily', e.target.value as BlogSettings['fontFamily'])}><option value="Inter">Inter</option><option value="system">System UI</option><option value="Arial">Arial</option><option value="Georgia">Georgia</option><option value="Roboto">Roboto</option><option value="monospace">Monospace</option></select></Field>
      <Field title="Font titoli"><select className={selectClass} value={settings.headingFontFamily} onChange={e => set('headingFontFamily', e.target.value as BlogSettings['headingFontFamily'])}><option value="inherit">Come testo</option><option value="Georgia">Georgia</option><option value="Inter">Inter</option><option value="Arial">Arial</option><option value="monospace">Monospace</option></select></Field>
      <Field title="Dimensione base (px)"><Input type="number" min={14} max={22} value={settings.baseFontSize} onChange={e => set('baseFontSize', Math.min(22, Math.max(14, Number(e.target.value) || 16)))} /></Field>
      <Field title="Stile card"><select className={selectClass} value={settings.cardStyle} onChange={e => set('cardStyle', e.target.value as BlogSettings['cardStyle'])}><option value="rounded">Arrotondate</option><option value="square">Squadrate</option><option value="bordered">Con bordo</option><option value="flat">Flat</option><option value="glass">Glass</option></select></Field>
      <Field title="Stile pulsanti"><select className={selectClass} value={settings.buttonStyle} onChange={e => set('buttonStyle', e.target.value as BlogSettings['buttonStyle'])}><option value="pill">Pill</option><option value="rounded">Arrotondati</option><option value="square">Squadrati</option></select></Field>
      <Field title="Raggio bordi"><select className={selectClass} value={settings.borderRadius} onChange={e => set('borderRadius', e.target.value as BlogSettings['borderRadius'])}><option value="none">Nessuno</option><option value="small">Piccolo</option><option value="medium">Medio</option><option value="large">Grande</option><option value="pill">Massimo</option></select></Field>
      <Field title="Ombre"><select className={selectClass} value={settings.shadowStyle} onChange={e => set('shadowStyle', e.target.value as BlogSettings['shadowStyle'])}><option value="none">Nessuna</option><option value="soft">Morbide</option><option value="strong">Evidenti</option></select></Field>
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Footer e social</CardTitle><CardDescription>Gestisci i testi finali, copyright e i tuoi collegamenti social.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">
      <Field title="Descrizione footer"><Textarea rows={3} value={settings.footerDescription} onChange={e => set('footerDescription', e.target.value)} /></Field>
      <Field title="Testo copyright"><Input value={settings.copyrightText} onChange={e => set('copyrightText', e.target.value)} /></Field>
      <div className="md:col-span-2"><Field title="Social links (JSON: [{\"label\":\"LinkedIn\",\"url\":\"https://...\"}])"><Textarea rows={3} value={settings.socialLinksJson} onChange={e => set('socialLinksJson', e.target.value)} className="font-mono text-xs" /></Field></div>
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Avanzate</CardTitle><CardDescription>CSS personalizzato per rifinire dettagli non coperti dalle opzioni grafiche.</CardDescription></CardHeader><CardContent><Field title="CSS personalizzato (solo CSS, senza tag style)"><Textarea rows={8} value={settings.customCss} onChange={e => set('customCss', e.target.value)} className="font-mono text-xs" /></Field></CardContent></Card>
  </div>;
}
