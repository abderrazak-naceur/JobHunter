import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ArrowLeft, ArrowRight, CalendarDays, Clock3, Code2, FolderOpen,
  Menu, Search, Tag, X, BookOpen, Sparkles
} from 'lucide-react';
import { blogApi, defaultBlogSettings, type BlogPost, type BlogSettings } from '../services/blogApi';
import './portfolio.css';

const wrap = 'blog-content-wrap mx-auto w-full max-w-[112rem] px-5 sm:px-8 lg:px-12 2xl:px-16';
type BlogLink = { label: string; url: string };
function parseLinks(value: string): BlogLink[] { try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed.filter((item): item is BlogLink => typeof item?.label === 'string' && typeof item?.url === 'string') : []; } catch { return []; } }
const focusRing = 'focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-cyan-300';
const categoriesFallback = ['.NET', 'Architettura', 'AI', 'Frontend', 'DevOps', 'Tutorial'];

function safeCss(value: string) { return value.replace(/<\/style/gi, '<\\/style'); }

function formatDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
}

function readingTime(markdown: string) {
  return Math.max(1, Math.ceil(markdown.trim().split(/\s+/).length / 200));
}

function BrandMark({ settings }: { settings: BlogSettings }) {
  if (settings.logoUrl) return <img src={settings.logoUrl} alt="" className="h-11 w-11 shrink-0 rounded-full border border-white/30 object-cover" />;
  const initials = settings.siteName.split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase() || 'BLOG';
  return <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/40 text-xs font-black tracking-tight text-white shadow-lg" style={{ background: `linear-gradient(135deg,${settings.primaryColor},${settings.accentColor})` }}>{initials}</span>;
}

function BlogHeader({ settings }: { settings: BlogSettings }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header data-blog-region="header" data-header-style={settings.headerStyle} className="sticky top-0 z-50 border-b border-cyan-300/15 bg-[#050d22]/95 text-white shadow-[0_8px_30px_rgba(2,8,23,.25)] backdrop-blur-xl">
      <div className={`${wrap} flex min-h-[4.6rem] items-center justify-between gap-4 py-3`}>
        <a href="/" aria-label={`${settings.siteName}, homepage`} className={`flex items-center gap-3 ${focusRing}`}>
          <BrandMark settings={settings} />
          <span className="leading-tight"><span className="block text-sm font-extrabold tracking-wide sm:text-base">{settings.siteName}</span><span className="mt-0.5 block text-[11px] text-slate-300 sm:text-xs">{settings.tagline}</span></span>
        </a>
        <nav aria-label="Navigazione principale" className="hidden items-center gap-1 lg:flex">
          {parseLinks(settings.navigationJson).map((link, index) => <a key={link.url + index} href={link.url} aria-current={link.url === '/blog' ? 'page' : undefined} className={`rounded-full px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white ${focusRing}`}>{link.label}</a>)}
        </nav>
        <div className="flex items-center gap-2">
          <a href="/#contatti" className={`hidden rounded-full border border-cyan-300/40 bg-white/5 px-4 py-2 text-xs font-bold text-white transition hover:border-cyan-200 hover:bg-cyan-300/10 sm:inline-flex ${focusRing}`}>Contattami <ArrowRight size={14} /></a>
          <button type="button" aria-expanded={menuOpen} aria-controls="blog-mobile-menu" onClick={() => setMenuOpen(open => !open)} className={`inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-2 text-sm font-bold text-white lg:hidden ${focusRing}`}>
            {menuOpen ? <X size={17} /> : <Menu size={17} />}<span className="sr-only">Menu</span>
          </button>
        </div>
      </div>
      {menuOpen && <nav id="blog-mobile-menu" aria-label="Navigazione mobile" className="border-t border-white/10 bg-[#07142e] px-5 py-3 lg:hidden"><div className="mx-auto grid max-w-6xl gap-1">{parseLinks(settings.navigationJson).map((link, index) => <a key={link.url + index} href={link.url} className="rounded-xl px-4 py-3 font-semibold text-white hover:bg-white/10">{link.label}</a>)}</div></nav>}
    </header>
  );
}

function TechVisual({ label = 'TECH' }: { label?: string }) {
  return (
    <div aria-hidden="true" className="relative flex min-h-48 items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_70%_55%,rgba(124,58,237,.35),transparent_45%),radial-gradient(ellipse_at_25%_80%,rgba(6,182,212,.3),transparent_45%),linear-gradient(135deg,#06132d,#0b1742_55%,#160d3d)]">
      <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(rgba(96,165,250,.2) 1px,transparent 1px),linear-gradient(90deg,rgba(96,165,250,.2) 1px,transparent 1px)', backgroundSize: '34px 34px', maskImage: 'linear-gradient(to top,black,transparent 85%)' }} />
      <div className="absolute -left-10 bottom-2 h-32 w-64 rotate-[-18deg] rounded-full border border-cyan-300/40 blur-[1px]" />
      <div className="absolute -right-10 top-2 h-32 w-64 rotate-[-18deg] rounded-full border border-violet-400/50 blur-[1px]" />
      <div className="relative rounded-2xl border border-cyan-300/40 bg-[#071633]/75 px-8 py-5 text-center shadow-[0_0_45px_rgba(37,99,235,.35)] backdrop-blur-sm">
        <Code2 className="mx-auto mb-2 text-cyan-300" size={27} />
        <span className="text-3xl font-black tracking-tight text-white drop-shadow-[0_0_16px_rgba(34,211,238,.55)]">{label}</span>
      </div>
    </div>
  );
}

function BlogHero({ search, onSearch, categories, selected, onSelect, settings }: {
  search: string; onSearch: (value: string) => void; categories: string[]; selected: string; onSelect: (value: string) => void; settings: BlogSettings;
}) {
  return (
    <section data-blog-region="hero" data-hero-style={settings.heroStyle} className="relative isolate overflow-hidden border-b border-cyan-300/15 bg-[#050d22] text-white" style={settings.heroImageUrl ? { backgroundImage: `linear-gradient(90deg,rgba(3,10,30,.88),rgba(3,10,30,.45)),url(${settings.heroImageUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>
      <div aria-hidden="true" className="pointer-events-none absolute -left-36 top-8 h-80 w-80 rounded-full bg-blue-600/30 blur-[100px]" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-20 h-96 w-96 rounded-full bg-violet-600/30 blur-[110px]" />
      <div className={`${wrap} relative grid items-center gap-8 py-12 sm:py-16 lg:grid-cols-[1.1fr_.9fr] lg:py-20`}>
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-300/40 bg-violet-400/10 px-4 py-2 text-xs font-bold tracking-wide text-cyan-100"><BookOpen size={14} /> {settings.heroEyebrow}</span>
          <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[1.04] tracking-tight text-white sm:text-5xl lg:text-6xl">{settings.heroTitle}</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">{settings.heroDescription}</p>
          {settings.showSearch && <label className="mt-7 flex max-w-2xl items-center gap-3 rounded-2xl border border-blue-300/40 bg-white/[0.07] p-2 pl-4 shadow-[0_0_28px_rgba(37,99,235,.16)] backdrop-blur-xl">
            <Search size={19} className="shrink-0 text-cyan-300" />
            <input value={search} onChange={event => onSearch(event.target.value)} placeholder="Cerca un articolo, tecnologia o argomento..." className="min-w-0 flex-1 bg-transparent py-2 text-sm text-white outline-none placeholder:text-slate-400" aria-label="Cerca articoli" />
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 to-violet-600 text-white shadow-[0_0_18px_rgba(59,130,246,.45)]"><Search size={18} /></span>
          </label>}
          {settings.showCategoryFilters && <div className="mt-5 flex flex-wrap gap-2" aria-label="Filtra per categoria">
            {['Tutti', ...categories].map(category => <button key={category} type="button" aria-pressed={selected === category} onClick={() => onSelect(category)} className={`rounded-full border px-4 py-2 text-xs font-bold transition ${selected === category ? 'border-cyan-300 bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-[0_0_16px_rgba(59,130,246,.35)]' : 'border-white/15 bg-white/[0.04] text-slate-300 hover:border-cyan-300/50 hover:text-white'}`}>{category}</button>)}
          </div>}
        </div>
        {settings.heroStyle !== "text-only" && <div className="relative hidden lg:block">
          <div className="absolute inset-8 rounded-full bg-gradient-to-br from-blue-500/25 to-violet-600/30 blur-3xl" />
          <div className="relative rounded-[2rem] border border-cyan-300/20 bg-gradient-to-br from-white/10 to-white/[0.02] p-3 shadow-[0_25px_80px_rgba(2,8,23,.5)] backdrop-blur-xl">
            <div className="overflow-hidden rounded-[1.5rem] border border-white/10">{settings.heroImageUrl ? <img src={settings.heroImageUrl} alt="" className="h-full min-h-64 w-full object-cover" /> : <TechVisual label=".NET · AI" />}</div>
            <div className="absolute -left-5 top-10 rounded-xl border border-cyan-300/30 bg-[#071633]/90 px-4 py-3 text-sm font-extrabold text-cyan-200 shadow-[0_0_24px_rgba(34,211,238,.18)]">.NET 10</div>
            <div className="absolute -right-4 bottom-10 rounded-xl border border-violet-300/30 bg-[#101039]/90 px-4 py-3 text-sm font-extrabold text-violet-200 shadow-[0_0_24px_rgba(139,92,246,.2)]">AI · Cloud</div>
          </div>
        </div>}
      </div>
    </section>
  );
}

function PostMeta({ post, minutes, showReadingTime = true }: { post: BlogPost; minutes?: number; showReadingTime?: boolean }) {
  return <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400"><span className="inline-flex items-center gap-1.5"><CalendarDays size={14} />{formatDate(post.publishedAt)}</span>{showReadingTime && <span className="inline-flex items-center gap-1.5"><Clock3 size={14} />{minutes ?? 5} min di lettura</span>}</div>;
}

function ArticleCard({ post, settings }: { post: BlogPost; settings: BlogSettings }) {
  return (
    <article data-blog-region="card" className="group overflow-hidden rounded-[1.4rem] border border-slate-200/80 bg-white shadow-[0_8px_24px_rgba(15,23,42,.07)] transition duration-300 hover:-translate-y-1.5 hover:border-blue-300 hover:shadow-[0_18px_40px_rgba(37,99,235,.16)]">
      <a href={`/blog/${post.slug}`} className={`block ${focusRing}`}>
        {settings.showArticleCover && <div className="relative h-44 overflow-hidden">{post.coverImageUrl ? <img src={post.coverImageUrl} alt="" loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /> : <TechVisual label={post.category || 'TECH'} />}</div>}
        <div className="p-5">
          <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-blue-700">{post.category}</span>
          <h3 className="mt-3 line-clamp-2 text-lg font-extrabold leading-snug tracking-tight text-[#101b46] transition group-hover:text-blue-700">{post.title}</h3>
          <p className="mt-2 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-slate-600">{post.excerpt}</p>
          <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <PostMeta post={post} showReadingTime={settings.showReadingTime} />
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-violet-200 bg-violet-50 text-violet-700 transition group-hover:border-violet-500 group-hover:bg-gradient-to-br group-hover:from-blue-600 group-hover:to-violet-600 group-hover:text-white"><ArrowRight size={17} /></span>
          </div>
        </div>
      </a>
    </article>
  );
}

function BlogFooter({ settings }: { settings: BlogSettings }) {
  return <footer data-blog-region="footer" className="border-t border-cyan-300/15 bg-[#050d22] text-white"><div className={`${wrap} grid gap-9 py-10 sm:grid-cols-2 lg:grid-cols-4`}><div className="sm:col-span-2 lg:col-span-1"><div className="flex items-center gap-3"><BrandMark settings={settings} /><div><p className="font-extrabold tracking-wide">{settings.siteName}</p><p className="text-xs text-slate-400">{settings.tagline}</p></div></div><p className="mt-4 max-w-xs text-sm leading-6 text-slate-400">{settings.footerDescription}</p></div><div><h2 className="text-sm font-extrabold">Navigazione</h2><ul className="mt-4 space-y-2 text-sm text-slate-400"><li><a className="hover:text-cyan-300" href="/">Home</a></li><li><a className="hover:text-cyan-300" href="/#progetti">Progetti</a></li><li><a className="text-cyan-300" href="/blog">Blog</a></li><li><a className="hover:text-cyan-300" href="/#contatti">Contatti</a></li></ul></div><div><h2 className="text-sm font-extrabold">Argomenti</h2><ul className="mt-4 space-y-2 text-sm text-slate-400">{['.NET', 'Architettura', 'AI', 'Frontend', 'DevOps'].map(item => <li key={item}>{item}</li>)}</ul></div><div><h2 className="text-sm font-extrabold">Seguimi</h2><p className="mt-4 text-sm leading-6 text-slate-400">Per collaborazioni, progetti e confronti tecnici, visita la homepage e usa la sezione contatti.</p><a href="/#contatti" className="mt-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/30 px-4 py-2 text-sm font-bold text-cyan-200 transition hover:bg-cyan-300/10">Contattami <ArrowRight size={15} /></a></div></div><div className="border-t border-white/10"><div className={`${wrap} flex flex-col gap-2 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between`}><span>© {new Date().getFullYear()} {settings.authorName}. {settings.copyrightText}</span><a href="/" className="hover:text-cyan-300">Portfolio personale</a></div></div></footer>;
}

export function BlogIndexPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [settings, setSettings] = useState<BlogSettings>(defaultBlogSettings);
  useEffect(() => { blogApi.settings().then(value => setSettings(value)).catch(() => undefined); }, []);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tutti');

  useEffect(() => {
    let active = true;
    blogApi.list().then(result => { if (active) setPosts(result.items); })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Non è stato possibile caricare gli articoli.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  useEffect(() => { document.title = `Blog — ${settings.siteName}`; }, [settings.siteName]);

  const categories = useMemo(() => [...new Set(posts.map(post => post.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'it')), [posts]);
  const filteredPosts = useMemo(() => posts.filter(post => {
    const matchesCategory = selectedCategory === 'Tutti' || post.category === selectedCategory;
    const term = search.trim().toLocaleLowerCase('it');
    const matchesSearch = !term || [post.title, post.excerpt, post.category, post.contentMarkdown].some(value => value?.toLocaleLowerCase('it').includes(term));
    return matchesCategory && matchesSearch;
  }), [posts, search, selectedCategory]);
  const featured = filteredPosts[0];
  const otherPosts = filteredPosts.slice(1);

  return (
    <div data-blog-template={settings.template} data-card-style={settings.cardStyle} data-button-style={settings.buttonStyle} data-radius={settings.borderRadius} data-shadow={settings.shadowStyle} data-article-layout={settings.articleLayout} className="min-h-screen font-sans text-slate-800 antialiased selection:text-white" style={{ backgroundColor: settings.backgroundColor, fontFamily: settings.fontFamily === 'system' ? 'system-ui' : settings.fontFamily, fontSize: settings.baseFontSize, "--blog-heading-font": settings.headingFontFamily === 'inherit' ? 'inherit' : settings.headingFontFamily, "--blog-primary": settings.primaryColor, "--blog-accent": settings.accentColor, "--blog-text": settings.textColor, "--blog-muted": settings.mutedTextColor, "--blog-surface": settings.surfaceColor, "--blog-header": settings.headerBackgroundColor, "--blog-hero": settings.heroBackgroundColor, "--blog-card": settings.cardBackgroundColor, "--blog-footer": settings.footerBackgroundColor, "--blog-border": settings.borderColor, "--blog-button-text": settings.buttonTextColor, "--blog-content-width": settings.contentWidth === 'narrow' ? '58rem' : settings.contentWidth === 'standard' ? '72rem' : settings.contentWidth === 'full' ? '100%' : '112rem', "--blog-grid-columns": settings.gridColumns } as React.CSSProperties}>
      <style>{safeCss(settings.customCss)}</style>
      {settings.showHeader && <BlogHeader settings={settings} />}
      {settings.showHero && <BlogHero settings={settings} search={search} onSearch={setSearch} categories={categories.length ? categories : categoriesFallback} selected={selectedCategory} onSelect={setSelectedCategory} />}
      <main className={`${wrap} py-8 sm:py-12`}>
        {loading && <div role="status" className="rounded-3xl border border-blue-100 bg-white p-10 text-center font-semibold text-blue-800 shadow-sm">Caricamento degli articoli…</div>}
        {error && <div role="alert" className="rounded-3xl border border-red-200 bg-white p-8 text-center text-red-700 shadow-sm">{error}</div>}
        {!loading && !error && filteredPosts.length === 0 && <div className="rounded-3xl border border-dashed border-blue-200 bg-white p-12 text-center shadow-sm"><Sparkles className="mx-auto text-violet-500" size={28} /><h2 className="mt-4 text-2xl font-extrabold text-[#101b46]">{posts.length ? 'Nessun articolo trovato' : 'I primi articoli stanno arrivando'}</h2><p className="mt-2 text-sm text-slate-600">{posts.length ? 'Prova a cambiare la ricerca o la categoria selezionata.' : 'Qui troverai approfondimenti su sviluppo software, architetture e tecnologia.'}</p>{(search || selectedCategory !== 'Tutti') && <button type="button" onClick={() => { setSearch(''); setSelectedCategory('Tutti'); }} className="mt-5 rounded-full bg-blue-700 px-5 py-2 text-sm font-bold text-white">Azzera filtri</button>}</div>}
        {!loading && !error && featured && (
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <div>
              {settings.showFeaturedArticle && <a href={`/blog/${featured.slug}`} className={`group grid overflow-hidden rounded-[1.8rem] border border-violet-200 bg-white shadow-[0_14px_38px_rgba(30,41,91,.12)] transition hover:-translate-y-1 hover:shadow-[0_22px_50px_rgba(79,70,229,.18)] md:grid-cols-[.95fr_1.05fr] ${focusRing}`}>
                <div className="relative min-h-64 overflow-hidden bg-[#071633]">{featured.coverImageUrl ? <img src={featured.coverImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" /> : <div className="absolute inset-0"><TechVisual label=".NET 10" /></div>}<span className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-full border border-violet-200/70 bg-white/95 px-4 py-2 text-xs font-extrabold text-violet-700 shadow-lg"><Sparkles size={14} /> In evidenza</span></div>
                <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10"><span className="w-fit rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-blue-700">{featured.category}</span><h2 className="mt-4 text-2xl font-black leading-tight tracking-tight text-[#101b46] sm:text-3xl">{featured.title}</h2><p className="mt-4 line-clamp-3 text-sm leading-7 text-slate-600 sm:text-base">{featured.excerpt}</p><div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-5"><PostMeta post={featured} minutes={readingTime(featured.contentMarkdown || '')} showReadingTime={settings.showReadingTime} /><span className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-3 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(79,70,229,.25)]">Leggi <ArrowRight size={16} /></span></div></div>
              </a>}
              <div className="mb-5 mt-10 flex items-end justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-[.2em] text-violet-700">Dal blog</p><h2 className="mt-2 text-2xl font-black tracking-tight text-[#101b46] sm:text-3xl">Ultimi articoli</h2></div><span className="rounded-full border border-blue-100 bg-white px-4 py-2 text-xs font-bold text-blue-800">{filteredPosts.length} {filteredPosts.length === 1 ? 'articolo' : 'articoli'}</span></div>
              {otherPosts.length > 0 && <div className="blog-post-grid grid gap-5">{otherPosts.map(post => <ArticleCard key={post.id} post={post} settings={settings} />)}</div>}
            </div>
            {settings.showSidebar && <aside className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1">
              {settings.showAuthorCard && <section className="rounded-[1.6rem] border border-violet-200 bg-white p-6 shadow-[0_10px_30px_rgba(30,41,91,.09)]"><div className="flex items-center gap-4"><div className="grid h-16 w-16 place-items-center rounded-full border-2 border-cyan-300 bg-gradient-to-br from-[#071633] to-violet-900 text-lg font-black text-white shadow-[0_0_20px_rgba(34,211,238,.3)]">ZAK</div><div><h2 className="font-extrabold text-[#101b46]">Zak Naceur</h2><p className="mt-1 text-xs font-semibold text-blue-700">Software Developer</p><p className="text-xs text-slate-500">.NET · AI · Architecture</p></div></div><p className="mt-5 text-sm leading-6 text-slate-600">Condivido idee, esperienze e soluzioni dal mondo dello sviluppo software e dei prodotti digitali.</p><a href="/#chi-sono" className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-blue-700 hover:text-violet-700">Scopri il mio profilo <ArrowRight size={15} /></a></section>}
              <section className="overflow-hidden rounded-[1.6rem] border border-violet-500/30 bg-gradient-to-br from-[#10134b] via-[#151d66] to-[#34105c] p-6 text-white shadow-[0_12px_35px_rgba(49,46,129,.22)]"><div className="flex items-center gap-2 text-cyan-200"><FolderOpen size={18} /><span className="text-xs font-extrabold uppercase tracking-[.18em]">Esplora</span></div><h2 className="mt-3 text-xl font-extrabold">Categorie</h2><div className="mt-4 flex flex-wrap gap-2">{(categories.length ? categories : categoriesFallback).map(category => <button key={category} type="button" onClick={() => { setSelectedCategory(category); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold text-white transition hover:border-cyan-200 hover:bg-cyan-300/15">{category}</button>)}</div></section>
            </aside>}
          </div>
        )}
      </main>
      {settings.showFooter && <BlogFooter settings={settings} />}
    </div>
  );
}

function slugifyHeading(value: string) {
  return value.toLocaleLowerCase('it').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function renderInline(value: string): ReactNode[] {
  const pattern = /(!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\))|(\[([^\]]+)\]\((https?:\/\/[^)\s]+)\))|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)/g;
  const nodes: ReactNode[] = [];
  let cursor = 0;
  for (const match of value.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > cursor) nodes.push(value.slice(cursor, index));
    if (match[1]) nodes.push(<img key={index} src={match[3]} alt={match[2]} loading="lazy" className="my-6 max-h-[34rem] w-full rounded-2xl object-contain" />);
    else if (match[4]) nodes.push(<a key={index} href={match[6]} target="_blank" rel="noreferrer" className="font-semibold text-blue-700 underline underline-offset-4">{match[5]}</a>);
    else if (match[7]) nodes.push(<strong key={index}>{match[8]}</strong>);
    else if (match[9]) nodes.push(<em key={index}>{match[10]}</em>);
    else if (match[11]) nodes.push(<code key={index} className="rounded bg-slate-100 px-1.5 py-0.5 text-[.9em] text-violet-800">{match[12]}</code>);
    cursor = index + match[0].length;
  }
  if (cursor < value.length) nodes.push(value.slice(cursor));
  return nodes;
}

function MarkdownBody({ markdown }: { markdown: string }) {
  const blocks: ReactNode[] = [];
  const lines = markdown.split(/\r?\n/);
  let codeLines: string[] = [];
  let inCode = false;
  let listItems: string[] = [];
  const flushList = (key: string) => {
    if (listItems.length) { blocks.push(<ul key={key} className="my-5 list-disc space-y-2 pl-6 text-base leading-8 text-slate-700">{listItems.map((item, index) => <li key={index}>{renderInline(item)}</li>)}</ul>); listItems = []; }
  };
  lines.forEach((line, index) => {
    if (line.trim().startsWith('```')) {
      flushList('list-' + index);
      if (inCode) blocks.push(<pre key={'code-' + index} className="my-8 overflow-x-auto rounded-2xl border border-cyan-300/20 bg-[#071329] p-5 text-sm leading-7 text-cyan-50 shadow-[0_14px_35px_rgba(2,8,23,.2)]"><code>{codeLines.join('\n')}</code></pre>);
      codeLines = []; inCode = !inCode; return;
    }
    if (inCode) { codeLines.push(line); return; }
    if (/^[-*]\s+/.test(line)) { listItems.push(line.replace(/^[-*]\s+/, '')); return; }
    flushList('list-' + index);
    if (!line.trim()) return;
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const id = slugifyHeading(heading[2]);
      const cls = level === 1 ? 'mt-12 text-3xl font-black tracking-tight text-[#101b46] sm:text-4xl' : level === 2 ? 'mt-10 text-2xl font-extrabold tracking-tight text-[#101b46]' : 'mt-8 text-xl font-extrabold text-[#101b46]';
      blocks.push(level === 1 ? <h2 id={id} key={index} className={cls}>{renderInline(heading[2])}</h2> : level === 2 ? <h2 id={id} key={index} className={cls}>{renderInline(heading[2])}</h2> : <h3 id={id} key={index} className={cls}>{renderInline(heading[2])}</h3>);
    } else if (/^>\s?/.test(line)) blocks.push(<blockquote key={index} className="my-7 rounded-r-2xl border-l-4 border-violet-500 bg-violet-50 px-6 py-4 text-lg italic leading-8 text-[#25235d]">{renderInline(line.replace(/^>\s?/, ''))}</blockquote>);
    else blocks.push(<p key={index} className="my-5 text-base leading-8 text-slate-700 sm:text-lg">{renderInline(line)}</p>);
  });
  flushList('list-final');
  if (inCode && codeLines.length) blocks.push(<pre key="code-final" className="my-8 overflow-x-auto rounded-2xl border border-cyan-300/20 bg-[#071329] p-5 text-sm leading-7 text-cyan-50"><code>{codeLines.join('\n')}</code></pre>);
  return <div className="mt-8">{blocks}</div>;
}

function ArticleContents({ markdown }: { markdown: string }) {
  const headings = markdown.split(/\r?\n/).map(line => line.match(/^##\s+(.+)$/)).filter((match): match is RegExpMatchArray => Boolean(match)).map(match => match[1]);
  if (!headings.length) return null;
  return <nav aria-label="Indice dell'articolo" className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm"><h2 className="font-extrabold text-[#101b46]">In questo articolo</h2><ol className="mt-4 space-y-3">{headings.map(heading => <li key={heading}><a href={`#${slugifyHeading(heading)}`} className="text-sm font-medium text-slate-600 transition hover:text-blue-700">{heading}</a></li>)}</ol></nav>;
}

export function BlogArticlePage({ slug }: { slug: string }) {
  const [post, setPost] = useState<BlogPost | null>(null);
  const [error, setError] = useState('');
  const [settings, setSettings] = useState<BlogSettings>(defaultBlogSettings);
  useEffect(() => { blogApi.settings().then(value => setSettings(value)).catch(() => undefined); }, []);
  useEffect(() => {
    let active = true;
    blogApi.get(slug).then(result => { if (active) setPost(result); })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Articolo non trovato.'); });
    return () => { active = false; };
  }, [slug]);
  useEffect(() => {
    if (!post) return;
    document.title = (post.seoTitle || post.title) + ' — ' + settings.siteName;
    const description = post.seoDescription || post.excerpt;
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) { meta = document.createElement('meta'); meta.name = 'description'; document.head.appendChild(meta); }
    meta.content = description;
    for (const [property, value] of [['og:title', post.seoTitle || post.title], ['og:description', description], ['og:type', 'article'], ['og:url', window.location.href]] as const) {
      let tag = document.querySelector('meta[property="' + property + '"]') as HTMLMetaElement | null;
      if (!tag) { tag = document.createElement('meta'); tag.setAttribute('property', property); document.head.appendChild(tag); }
      tag.content = value;
    }
  }, [post]);

  return (
    <div data-blog-template={settings.template} data-card-style={settings.cardStyle} data-button-style={settings.buttonStyle} data-radius={settings.borderRadius} data-shadow={settings.shadowStyle} data-article-layout={settings.articleLayout} className="min-h-screen font-sans text-slate-800 antialiased" style={{ backgroundColor: settings.backgroundColor, fontFamily: settings.fontFamily === 'system' ? 'system-ui' : settings.fontFamily, fontSize: settings.baseFontSize, "--blog-heading-font": settings.headingFontFamily === 'inherit' ? 'inherit' : settings.headingFontFamily, "--blog-primary": settings.primaryColor, "--blog-accent": settings.accentColor, "--blog-text": settings.textColor, "--blog-muted": settings.mutedTextColor, "--blog-surface": settings.surfaceColor, "--blog-header": settings.headerBackgroundColor, "--blog-hero": settings.heroBackgroundColor, "--blog-card": settings.cardBackgroundColor, "--blog-footer": settings.footerBackgroundColor, "--blog-border": settings.borderColor, "--blog-button-text": settings.buttonTextColor, "--blog-content-width": settings.contentWidth === 'narrow' ? '58rem' : settings.contentWidth === 'standard' ? '72rem' : settings.contentWidth === 'full' ? '100%' : '112rem' } as React.CSSProperties}>
      <style>{safeCss(settings.customCss)}</style>
      {settings.showHeader && <BlogHeader settings={settings} />}
      <main>
        {error ? <section className={`${wrap} py-20`}><div className="rounded-3xl border border-red-200 bg-white p-10 text-center"><h1 className="text-3xl font-black text-[#101b46]">Articolo non disponibile</h1><a className="mt-6 inline-flex items-center gap-2 font-bold text-blue-700" href="/blog"><ArrowLeft size={17} /> Torna al blog</a></div></section>
        : !post ? <section className={`${wrap} py-20`}><div role="status" className="rounded-3xl border border-blue-100 bg-white p-10 text-center font-semibold text-blue-800">Caricamento articolo…</div></section>
        : <>
          <div className="border-b border-cyan-300/15 bg-[#050d22] text-white"><div className={`${wrap} py-4 text-xs text-slate-400`}><a href="/blog" className="hover:text-cyan-300">Blog</a><span className="mx-2">/</span><span>{post.category}</span><span className="mx-2">/</span><span className="text-slate-200">{post.title}</span></div></div>
          {settings.showArticleCover && <section className="bg-[#050d22] pb-10 text-white"><div className={wrap}><div className="overflow-hidden rounded-[1.8rem] border border-cyan-300/30 shadow-[0_0_45px_rgba(37,99,235,.2)]">{post.coverImageUrl ? <img src={post.coverImageUrl} alt="" className="max-h-[24rem] w-full object-cover" /> : <TechVisual label={post.category || 'TECH'} />}</div></div></section>}
          <div className={`${wrap} grid items-start gap-7 pb-16 ${settings.showSidebar ? "lg:grid-cols-[minmax(0,1fr)_20rem]" : ""}`}>
            <article data-blog-region="article" className="-mt-14 relative z-10 rounded-[1.8rem] border border-violet-200 bg-white p-6 shadow-[0_18px_50px_rgba(30,41,91,.14)] sm:p-9 lg:p-12">
              <a href="/blog" className={`mb-7 inline-flex items-center gap-2 text-sm font-bold text-blue-700 hover:text-violet-700 ${focusRing}`}><ArrowLeft size={16} /> Tutti gli articoli</a>
              <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-blue-700">{post.category}</span>
              <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight text-[#101b46] sm:text-4xl lg:text-5xl">{post.title}</h1>
              <p className="mt-5 text-lg leading-8 text-slate-600">{post.excerpt}</p>
              <div className="mt-7 flex flex-wrap items-center gap-5 border-b border-slate-100 pb-6"><PostMeta post={post} minutes={readingTime(post.contentMarkdown || '')} />{post.tags.length > 0 && <span className="inline-flex items-center gap-2 text-xs text-slate-500"><Tag size={14} />{post.tags.join(' · ')}</span>}</div>
              <MarkdownBody markdown={post.contentMarkdown} />
              <div className="mt-12 border-t border-slate-100 pt-7"><p className="text-sm font-bold text-slate-500">Hai trovato utile questo articolo?</p><a href="/#contatti" className="mt-3 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-3 text-sm font-extrabold text-white shadow-lg">Parliamone <ArrowRight size={16} /></a></div>
            </article>
            {settings.showSidebar && <aside className="grid gap-5 lg:sticky lg:top-24"><ArticleContents markdown={post.contentMarkdown} />{settings.showAuthorCard && <section className="rounded-2xl border border-violet-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><BrandMark settings={settings} /><div><h2 className="font-extrabold text-[#101b46]">{settings.authorName}</h2><p className="text-xs text-slate-500">{settings.tagline}</p></div></div><p className="mt-4 text-sm leading-6 text-slate-600">.NET, architetture software, AI e prodotti digitali.</p><a href="/#chi-sono" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-blue-700">Profilo completo <ArrowRight size={14} /></a></section></aside>}
          </div>
        </>}
      </main>
      {settings.showFooter && <BlogFooter settings={settings} />}
    </div>
  );
}

export default function BlogRoute() {
  const path = window.location.pathname;
  if (path === '/blog' || path === '/blog/') return <BlogIndexPage />;
  return <BlogArticlePage slug={decodeURIComponent(path.slice('/blog/'.length))} />;
}
