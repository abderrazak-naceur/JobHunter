import { useEffect, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, Menu, Tag, X } from 'lucide-react';
import { blogApi, type BlogPost } from '../services/blogApi';
import './portfolio.css';

const wrap = 'mx-auto w-full max-w-[112rem] px-5 sm:px-8 lg:px-12 2xl:px-16';
const focusRing = 'focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-brand-600';

function BlogHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <>
      <div className="bg-brand-700 text-xs text-white">
        <div className={`${wrap} flex items-center justify-between gap-3 py-2`}>
          <span className="font-bold uppercase tracking-widest">Idee · Tecnologia · Esperienza</span>
          <span className="hidden text-white/85 sm:inline">Articoli e approfondimenti</span>
        </div>
      </div>
      <header className="sticky top-0 z-40 border-b border-lav-300 bg-white/90 backdrop-blur">
        <div className={`${wrap} flex items-center justify-between gap-4 py-3`}>
          <a href="/" className={`flex items-center gap-3 font-extrabold text-brand-900 ${focusRing}`}>
            <span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-sm text-white">ZN</span>
            <span>Zak Naceur</span>
          </a>
          <nav aria-label="Navigazione principale" className="hidden items-center gap-2 sm:flex">
            <a href="/" className={`rounded-full px-4 py-2 text-sm font-semibold text-brand-900 transition hover:bg-lav-100 ${focusRing}`}>Home</a>
            <a href="/blog" aria-current="page" className={`rounded-full bg-lav-100 px-4 py-2 text-sm font-bold text-brand-700 ${focusRing}`}>Blog</a>
          </nav>
          <div className="flex items-center gap-2 sm:hidden">
            <button type="button" aria-expanded={menuOpen} aria-controls="blog-mobile-menu" onClick={() => setMenuOpen(open => !open)} className={`inline-flex items-center gap-2 rounded-full bg-rose-600 px-4 py-2 text-sm font-bold text-white ${focusRing}`}>
              {menuOpen ? <X size={17} /> : <Menu size={17} />} Menu
            </button>
          </div>
        </div>
        {menuOpen && <nav id="blog-mobile-menu" aria-label="Navigazione mobile" className="border-t border-lav-300 bg-white px-5 py-3 sm:hidden"><a href="/" className="block rounded-xl px-4 py-3 font-semibold text-brand-900 hover:bg-lav-100">Home portfolio</a><a href="/blog" className="block rounded-xl px-4 py-3 font-semibold text-brand-700 hover:bg-lav-100">Blog</a></nav>}
      </header>
    </>
  );
}

function BlogBackdrop() {
  return <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"><div className="bg-dots absolute inset-0" /><div className="absolute -left-40 -top-36 h-[30rem] w-[30rem] rounded-full bg-brand-500/20 blur-3xl motion-safe:animate-float" /><div className="absolute -right-36 top-1/4 h-[28rem] w-[28rem] rounded-full bg-accent-400/25 blur-3xl motion-safe:animate-float-slow" /><div className="absolute bottom-0 left-1/3 h-[24rem] w-[24rem] rounded-full bg-fuchsia-400/15 blur-3xl motion-safe:animate-float" /></div>;
}

function BlogFooter() {
  return <footer className="mt-20 bg-brand-900 text-white"><div className={`${wrap} flex flex-col gap-3 py-9 sm:flex-row sm:items-center sm:justify-between`}><div><p className="font-extrabold tracking-wide">ZAK NACEUR</p><p className="mt-1 text-sm text-brand-100">Sviluppo software · Tecnologia · Innovazione</p></div><a href="/" className="inline-flex items-center gap-2 text-sm font-bold text-white transition hover:text-accent-300">Torna al portfolio <ArrowRight size={16} /></a></div></footer>;
}

export function BlogIndexPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => { blogApi.list().then(result => setPosts(result.items)).catch(e => setError(e instanceof Error ? e.message : 'Errore di caricamento')).finally(() => setLoading(false)); }, []);
  useEffect(() => { document.title = 'Blog — Zak Naceur'; }, []);
  const [featured, ...otherPosts] = posts;
  return (
    <div className="relative min-h-screen overflow-x-clip bg-lav-100 font-sans text-slate-700 antialiased selection:bg-brand-600 selection:text-white">
      <BlogHeader />
      <main className="relative isolate">
        <BlogBackdrop />
        <section className={`${wrap} pb-12 pt-12 sm:pb-16 sm:pt-16 lg:pt-20`}>
          <p className="mb-4 text-xs font-extrabold uppercase tracking-[0.2em] text-brand-700">Idee · Tecnologia · Esperienza</p>
          <h1 className="max-w-4xl text-4xl font-black leading-[1.04] tracking-tight text-brand-900 sm:text-6xl lg:text-7xl">Appunti dal mondo tech<span className="text-brand-600">.</span></h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-700 sm:text-xl">Approfondimenti su .NET, architetture software, intelligenza artificiale e sviluppo di prodotti digitali.</p>
          <div className="mt-8 flex flex-wrap gap-2 text-sm font-semibold text-brand-900"><span className="rounded-full border border-lav-300 bg-white/80 px-4 py-2">Software engineering</span><span className="rounded-full border border-lav-300 bg-white/80 px-4 py-2">.NET & architetture</span><span className="rounded-full border border-lav-300 bg-white/80 px-4 py-2">AI & prodotti digitali</span></div>
        </section>
        <section className={`${wrap} pb-8`} aria-label="Articoli">
          {loading && <div role="status" className="rounded-[2rem] border border-lav-300 bg-white/80 p-10 text-center font-semibold text-brand-700 shadow-sm">Caricamento articoli…</div>}
          {error && <div role="alert" className="rounded-[2rem] border border-red-200 bg-white p-8 text-center text-red-700 shadow-sm">{error}</div>}
          {!loading && !error && posts.length === 0 && <div className="rounded-[2rem] border border-dashed border-lav-300 bg-white/80 p-12 text-center"><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-brand-600">Prossimamente</p><h2 className="mt-3 text-2xl font-extrabold text-brand-900">I primi articoli stanno arrivando.</h2><p className="mt-3 text-slate-600">Nuovi approfondimenti su sviluppo software, architetture e tecnologia.</p></div>}
          {!loading && !error && featured && <a href={`/blog/${featured.slug}`} className={`group mb-7 grid overflow-hidden rounded-[2rem] border border-lav-300 bg-white shadow-lg transition duration-300 hover:-translate-y-1 hover:shadow-2xl md:grid-cols-2 ${focusRing}`}>
            <div className="relative min-h-64 overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 md:min-h-[23rem]">{featured.coverImageUrl ? <img src={featured.coverImageUrl} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" /> : <div aria-hidden="true" className="bg-grid absolute inset-0 opacity-70" />}<div className="absolute inset-0 bg-gradient-to-t from-brand-950/65 via-transparent to-transparent" /><span className="absolute bottom-6 left-6 rounded-full bg-white/15 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-white backdrop-blur">In evidenza</span></div>
            <div className="flex flex-col justify-center p-7 sm:p-10 lg:p-12"><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand-600">{featured.category}</p><h2 className="mt-4 text-3xl font-black leading-tight tracking-tight text-brand-900 sm:text-4xl">{featured.title}</h2><p className="mt-4 line-clamp-3 text-base leading-7 text-slate-600">{featured.excerpt}</p><div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-lav-200 pt-5 text-sm text-slate-500"><span className="inline-flex items-center gap-2"><CalendarDays size={16} />{featured.publishedAt ? new Date(featured.publishedAt).toLocaleDateString('it-IT') : ''}</span><span className="inline-flex items-center gap-2 font-extrabold text-brand-700 transition group-hover:gap-3">Leggi l’articolo <ArrowRight size={17} /></span></div></div>
          </a>}
          {!loading && !error && otherPosts.length > 0 && <><div className="mb-6 flex items-end justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-brand-600">Da leggere</p><h2 className="mt-2 text-2xl font-black tracking-tight text-brand-900 sm:text-3xl">Ultimi articoli</h2></div><span className="rounded-full bg-white px-4 py-2 text-xs font-bold text-brand-700 shadow-sm">{posts.length} {posts.length === 1 ? 'articolo' : 'articoli'}</span></div><div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{otherPosts.map(post => <article key={post.id} className="group overflow-hidden rounded-[2rem] border border-lav-300 bg-white shadow-sm transition duration-300 hover:-translate-y-1.5 hover:shadow-xl"><a href={`/blog/${post.slug}`} className={`block ${focusRing}`}><div className="relative h-52 overflow-hidden bg-gradient-to-br from-brand-600 to-brand-900">{post.coverImageUrl ? <img src={post.coverImageUrl} alt="" loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /> : <div className="bg-grid h-full w-full opacity-70" />}</div><div className="p-6"><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand-600">{post.category}</p><h3 className="mt-3 text-xl font-extrabold leading-snug text-brand-900 transition group-hover:text-brand-600">{post.title}</h3><p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{post.excerpt}</p><div className="mt-6 flex items-center justify-between gap-3 border-t border-lav-200 pt-4 text-xs text-slate-500"><span className="inline-flex items-center gap-2"><CalendarDays size={14} />{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('it-IT') : ''}</span><span className="inline-flex items-center gap-1 font-extrabold text-brand-700">Leggi <ArrowRight size={14} /></span></div></div></a></article>)}</div></>}
        </section>
      </main>
      <BlogFooter />
    </div>
  );
}

function MarkdownBody({ markdown }: { markdown: string }) {
  const lines = markdown.split(/\r?\n/);
  const blocks: ReactNode[] = [];
  let codeLines: string[] = [];
  let inCode = false;
  lines.forEach((line, index) => {
    if (line.trim().startsWith('```')) {
      if (inCode) {
        blocks.push(<pre key={'code-' + index} className="my-7 overflow-x-auto rounded-2xl border border-slate-800 bg-brand-900 p-6 text-sm leading-7 text-slate-100 shadow-lg"><code>{codeLines.join('\n')}</code></pre>);
        codeLines = [];
      }
      inCode = !inCode;
      return;
    }
    if (inCode) { codeLines.push(line); return; }
    if (!line.trim()) return;
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const className = level === 1 ? 'mt-12 text-3xl font-black tracking-tight text-brand-900 sm:text-4xl' : level === 2 ? 'mt-10 text-2xl font-extrabold tracking-tight text-brand-900' : 'mt-8 text-xl font-extrabold text-brand-900';
      blocks.push(level === 3 ? <h3 key={index} className={className}>{heading[2]}</h3> : <h2 key={index} className={className}>{heading[2]}</h2>);
    } else if (/^[-*]\s+/.test(line)) {
      blocks.push(<ul key={index} className="my-3 list-disc space-y-2 pl-6 leading-8 text-slate-700"><li>{line.replace(/^[-*]\s+/, '')}</li></ul>);
    } else if (/^>\s?/.test(line)) {
      blocks.push(<blockquote key={index} className="my-7 rounded-r-2xl border-l-4 border-brand-600 bg-lav-50 px-6 py-4 text-lg italic leading-8 text-brand-900">{line.replace(/^>\s?/, '')}</blockquote>);
    } else {
      blocks.push(<p key={index} className="my-5 text-base leading-8 text-slate-700 sm:text-lg">{line}</p>);
    }
  });
  if (inCode && codeLines.length) blocks.push(<pre key="code-final" className="my-7 overflow-x-auto rounded-2xl border border-slate-800 bg-brand-900 p-6 text-sm leading-7 text-slate-100 shadow-lg"><code>{codeLines.join('\n')}</code></pre>);
  return <div className="mt-10">{blocks}</div>;
}

export function BlogArticlePage({ slug }: { slug: string }) {
  const [post, setPost] = useState<BlogPost | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { blogApi.get(slug).then(setPost).catch(e => setError(e instanceof Error ? e.message : 'Articolo non trovato.')); }, [slug]);
  useEffect(() => {
    if (!post) return;
    document.title = (post.seoTitle || post.title) + ' — Zak Naceur';
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
    <div className="relative min-h-screen overflow-x-clip bg-lav-100 font-sans text-slate-700 antialiased">
      <BlogHeader />
      <main className="relative isolate"><BlogBackdrop />
        {error ? <section className={`${wrap} py-20`}><div className="rounded-[2rem] border border-lav-300 bg-white p-10 text-center shadow-sm"><h1 className="text-3xl font-black text-brand-900">Articolo non disponibile</h1><a className="mt-6 inline-flex items-center gap-2 font-bold text-brand-700" href="/blog"><ArrowLeft size={17} /> Torna al blog</a></div></section>
        : !post ? <section className={`${wrap} py-20`}><div role="status" className="rounded-[2rem] border border-lav-300 bg-white/80 p-10 text-center font-semibold text-brand-700">Caricamento articolo…</div></section>
        : <article className={`${wrap} py-10 sm:py-16`}>
          <a href="/blog" className={`inline-flex items-center gap-2 rounded-full border border-lav-300 bg-white px-5 py-2.5 text-sm font-bold text-brand-700 shadow-sm transition hover:-translate-x-1 ${focusRing}`}><ArrowLeft size={16} /> Tutti gli articoli</a>
          <div className="mx-auto mt-8 max-w-5xl overflow-hidden rounded-[2rem] border border-lav-300 bg-white shadow-xl">
            {post.coverImageUrl && <div className="max-h-[32rem] overflow-hidden bg-gradient-to-br from-brand-600 to-brand-900"><img src={post.coverImageUrl} alt="" className="max-h-[32rem] w-full object-cover" /></div>}
            <div className="px-6 py-9 sm:px-10 sm:py-12 lg:px-16"><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-brand-600">{post.category}</p><h1 className="mt-4 text-3xl font-black leading-tight tracking-tight text-brand-900 sm:text-5xl">{post.title}</h1><p className="mt-6 text-lg leading-8 text-slate-600 sm:text-xl">{post.excerpt}</p><div className="mt-7 flex flex-wrap items-center gap-4 border-b border-lav-200 pb-6 text-sm text-slate-500"><span className="inline-flex items-center gap-2"><CalendarDays size={16} />{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('it-IT') : ''}</span>{post.tags.length > 0 && <span className="inline-flex items-center gap-2"><Tag size={15} />{post.tags.join(' · ')}</span>}</div><MarkdownBody markdown={post.contentMarkdown} /></div>
          </div>
        </article>}
      </main>
      <BlogFooter />
    </div>
  );
}

/** Route entry for the lazy-loaded public blog bundle. */
export default function BlogRoute() {
  const path = window.location.pathname;
  if (path === '/blog' || path === '/blog/') return <BlogIndexPage />;
  return <BlogArticlePage slug={decodeURIComponent(path.slice('/blog/'.length))} />;
}
