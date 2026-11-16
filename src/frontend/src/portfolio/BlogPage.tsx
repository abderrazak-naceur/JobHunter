import './portfolio.css';
import { useEffect, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, Tag } from 'lucide-react';
import { blogApi, type BlogPost } from '../services/blogApi';

function BlogHeader() {
  return <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5"><a href="/" className="font-bold tracking-tight text-slate-950">Zak Naceur <span className="text-blue-600">/ Blog</span></a><a href="/" className="text-sm font-semibold text-slate-600 hover:text-blue-600">Portfolio ↗</a></div></header>;
}

export function BlogIndexPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => { blogApi.list().then(result => setPosts(result.items)).catch(e => setError(e instanceof Error ? e.message : 'Errore di caricamento')).finally(() => setLoading(false)); }, []);
  useEffect(() => { document.title = 'Blog — Zak Naceur'; }, []);
  return <div className="min-h-screen bg-slate-50 text-slate-900"><BlogHeader /><main className="mx-auto max-w-6xl px-5 py-16">
    <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Idee · Tecnologia · Esperienza</p><h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">Appunti dal mondo tech.</h1><p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">Approfondimenti su .NET, architetture software, AI e sviluppo di prodotti digitali.</p>
    {loading && <p role="status" className="mt-12 text-slate-500">Caricamento articoli…</p>}
    {error && <p role="alert" className="mt-12 text-red-600">{error}</p>}
    {!loading && !error && posts.length === 0 && <div className="mt-14 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">I primi articoli arriveranno presto.</div>}
    <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{posts.map(post => <article key={post.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      {post.coverImageUrl && <img src={post.coverImageUrl} alt="" loading="lazy" className="h-48 w-full object-cover" />}
      <div className="p-6"><p className="text-xs font-bold uppercase tracking-wide text-blue-600">{post.category}</p><h2 className="mt-3 text-xl font-bold leading-snug"><a href={`/blog/${post.slug}`} className="hover:text-blue-600">{post.title}</a></h2><p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{post.excerpt}</p><div className="mt-6 flex items-center justify-between text-xs text-slate-500"><span className="inline-flex items-center gap-1"><CalendarDays size={14} />{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('it-IT') : ''}</span><a href={`/blog/${post.slug}`} className="inline-flex items-center gap-1 font-semibold text-blue-600">Leggi <ArrowRight size={14} /></a></div></div>
    </article>)}</div>
  </main></div>;
}

function MarkdownBody({ markdown }: { markdown: string }) {
  const lines = markdown.split(/\r?\n/);
  const blocks: ReactNode[] = [];
  let codeLines: string[] = [];
  let inCode = false;
  lines.forEach((line, index) => {
    if (line.trim().startsWith('```')) {
      if (inCode) {
        blocks.push(<pre key={'code-' + index} className="my-5 overflow-x-auto rounded-xl bg-slate-950 p-5 text-sm leading-6 text-slate-100"><code>{codeLines.join('\n')}</code></pre>);
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
      const className = level === 1 ? 'mt-10 text-3xl font-bold tracking-tight' : level === 2 ? 'mt-8 text-2xl font-bold tracking-tight' : 'mt-6 text-xl font-bold';
      blocks.push(level === 3
        ? <h3 key={index} className={className}>{heading[2]}</h3>
        : <h2 key={index} className={className}>{heading[2]}</h2>);
    } else if (/^[-*]\s+/.test(line)) {
      blocks.push(<ul key={index} className="my-2 list-disc pl-6"><li>{line.replace(/^[-*]\s+/, '')}</li></ul>);
    } else if (/^>\s?/.test(line)) {
      blocks.push(<blockquote key={index} className="my-5 border-l-4 border-blue-500 pl-5 italic text-slate-600">{line.replace(/^>\s?/, '')}</blockquote>);
    } else {
      blocks.push(<p key={index} className="my-4 leading-8 text-slate-700">{line}</p>);
    }
  });
  if (inCode && codeLines.length) blocks.push(<pre key="code-final" className="my-5 overflow-x-auto rounded-xl bg-slate-950 p-5 text-sm leading-6 text-slate-100"><code>{codeLines.join('\n')}</code></pre>);
  return <div className="mt-12">{blocks}</div>;
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
  if (error) return <div className="min-h-screen bg-slate-50"><BlogHeader /><main className="mx-auto max-w-3xl px-5 py-20"><h1 className="text-3xl font-bold">Articolo non disponibile</h1><a className="mt-6 inline-flex items-center gap-2 text-blue-600" href="/blog"><ArrowLeft size={16}/> Torna al blog</a></main></div>;
  if (!post) return <div className="min-h-screen bg-slate-50"><BlogHeader /><main className="mx-auto max-w-3xl px-5 py-20 text-slate-500">Caricamento articolo…</main></div>;
  return <div className="min-h-screen bg-white text-slate-900"><BlogHeader /><main className="mx-auto max-w-3xl px-5 py-14">
    <a href="/blog" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600"><ArrowLeft size={16}/> Tutti gli articoli</a>
    <p className="mt-10 text-xs font-bold uppercase tracking-[0.18em] text-blue-600">{post.category}</p><h1 className="mt-4 text-4xl font-black leading-tight tracking-tight sm:text-5xl">{post.title}</h1><p className="mt-6 text-xl leading-8 text-slate-600">{post.excerpt}</p>
    <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-slate-500"><span>{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('it-IT') : ''}</span>{post.tags.length > 0 && <span className="inline-flex items-center gap-2"><Tag size={14}/>{post.tags.join(' · ')}</span>}</div>
    {post.coverImageUrl && <img src={post.coverImageUrl} alt="" className="mt-10 max-h-[420px] w-full rounded-2xl object-cover" />}
    <article><MarkdownBody markdown={post.contentMarkdown} /></article>
    <div className="mt-16 border-t border-slate-200 pt-8"><a href="/blog" className="inline-flex items-center gap-2 font-semibold text-blue-600"><ArrowLeft size={16}/> Torna agli articoli</a></div>
  </main></div>;
}

/** Route entry for the lazy-loaded public blog bundle. */
export default function BlogRoute() {
  const path = window.location.pathname;
  if (path === '/blog' || path === '/blog/') return <BlogIndexPage />;
  return <BlogArticlePage slug={decodeURIComponent(path.slice('/blog/'.length))} />;
}
