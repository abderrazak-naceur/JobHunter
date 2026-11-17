import { useRef, useState, type ReactNode } from 'react';
import { Bold, Code2, Heading2, Heading3, ImagePlus, Italic, Link2, List, ListOrdered, Minus, Quote, Table2, Eye, PencilLine, Columns2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

type Props = { value: string; onChange: (value: string) => void };

type Block = { type: 'paragraph' | 'heading' | 'quote' | 'ul' | 'ol' | 'code' | 'table' | 'hr'; level?: number; text?: string; items?: string[]; language?: string; rows?: string[][] };

function parseBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r/g, '').split('\n');
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (/^\s*```/.test(line)) {
      const language = line.replace(/^\s*```/, '').trim();
      const code: string[] = []; i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) code.push(lines[i++]);
      if (i < lines.length) i++;
      blocks.push({ type: 'code', language, text: code.join('\n') }); continue;
    }
    if (/^\s*([-*_])\1\1+\s*$/.test(line)) { blocks.push({ type: 'hr' }); i++; continue; }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) { blocks.push({ type: 'heading', level: heading[1].length, text: heading[2] }); i++; continue; }
    if (/^>\s?/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) quote.push(lines[i++].replace(/^>\s?/, ''));
      blocks.push({ type: 'quote', text: quote.join(' ') }); continue;
    }
    if (/^\s*\|/.test(line) && i + 1 < lines.length && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1])) {
      const cells = (value: string) => value.trim().replace(/^\||\|$/g, '').split('|').map(x => x.trim());
      const rows = [cells(line)]; i += 2;
      while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(cells(lines[i++]));
      blocks.push({ type: 'table', rows }); continue;
    }
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*[-*+]\s+/, ''));
      blocks.push({ type: 'ul', items }); continue;
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*\d+[.)]\s+/, ''));
      blocks.push({ type: 'ol', items }); continue;
    }
    const paragraph = [line]; i++;
    while (i < lines.length && lines[i].trim() && !/^(#{1,3})\s|^>|^\s*[-*+]\s+|^\s*\d+[.)]\s+|^\s*```|^\s*\|/.test(lines[i])) paragraph.push(lines[i++]);
    blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
  }
  return blocks;
}

function Inline({ value }: { value: string }) {
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|!?\[[^\]]+\]\(https?:\/\/[^)]+\))/g;
  const parts = value.split(pattern).filter(Boolean);
  return <>{parts.map((part, index): ReactNode => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*')) return <em key={index}>{part.slice(1, -1)}</em>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={index} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[.9em] text-primary">{part.slice(1, -1)}</code>;
    const image = part.match(/^!\[([^\]]*)\]\((https?:\/\/[^)]+)\)$/);
    if (image) return <span key={index} className="my-2 block text-xs text-muted-foreground">[Immagine: {image[1]}]</span>;
    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);
    if (link) return <a key={index} href={link[2]} className="text-primary underline underline-offset-2">{link[1]}</a>;
    return part;
  })}</>;
}

function Preview({ value }: { value: string }) {
  const blocks = parseBlocks(value);
  return <article className="prose prose-slate max-w-none dark:prose-invert">
    {blocks.length === 0 ? <p className="text-sm text-muted-foreground">L'anteprima apparirà qui mentre scrivi…</p> : blocks.map((block, index) => {
      if (block.type === 'heading') return block.level === 1 ? <h1 key={index}><Inline value={block.text || ''} /></h1> : block.level === 2 ? <h2 key={index}><Inline value={block.text || ''} /></h2> : <h3 key={index}><Inline value={block.text || ''} /></h3>;
      if (block.type === 'quote') return <blockquote key={index}><Inline value={block.text || ''} /></blockquote>;
      if (block.type === 'ul') return <ul key={index}>{block.items?.map((item, n) => <li key={n}><Inline value={item} /></li>)}</ul>;
      if (block.type === 'ol') return <ol key={index}>{block.items?.map((item, n) => <li key={n}><Inline value={item} /></li>)}</ol>;
      if (block.type === 'code') return <div key={index} className="my-5 overflow-hidden rounded-xl border bg-slate-950 text-slate-100"><div className="border-b border-white/10 px-4 py-2 text-xs text-cyan-300">{block.language || 'code'}</div><pre className="overflow-x-auto p-4 text-sm leading-6"><code>{block.text}</code></pre></div>;
      if (block.type === 'table') return <div key={index} className="my-5 overflow-x-auto"><table className="w-full border-collapse text-sm"><tbody>{block.rows?.map((row, n) => <tr key={n} className={n === 0 ? 'bg-muted font-semibold' : ''}>{row.map((cell, c) => n === 0 ? <th key={c} className="border px-3 py-2 text-left"><Inline value={cell} /></th> : <td key={c} className="border px-3 py-2"><Inline value={cell} /></td>)}</tr>)}</tbody></table></div>;
      if (block.type === 'hr') return <hr key={index} />;
      return <p key={index}><Inline value={block.text || ''} /></p>;
    })}
  </article>;
}

export default function BlogMarkdownEditor({ value, onChange }: Props) {
  const [mode, setMode] = useState<'write' | 'preview' | 'split'>('split');
  const [codeLanguage, setCodeLanguage] = useState('csharp');
  const editorRef = useRef<HTMLTextAreaElement>(null);

  function insert(before: string, after = '', placeholder = 'testo') {
    const area = editorRef.current;
    const start = area?.selectionStart ?? value.length;
    const end = area?.selectionEnd ?? start;
    const selected = value.slice(start, end) || placeholder;
    const next = value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => { area?.focus(); area?.setSelectionRange(start + before.length, start + before.length + selected.length); });
  }

  return <section className="overflow-hidden rounded-xl border bg-background">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 p-2">
      <div className="flex flex-wrap items-center gap-1">
        <Button type="button" size="sm" variant="ghost" onClick={() => insert('**', '**')} aria-label="Grassetto"><Bold size={16} /></Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => insert('*', '*')} aria-label="Corsivo"><Italic size={16} /></Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => insert('\n## ', '\n', 'Titolo sezione')} aria-label="Titolo 2"><Heading2 size={16} /></Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => insert('\n### ', '\n', 'Sottotitolo')} aria-label="Titolo 3"><Heading3 size={16} /></Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => insert('\n- ', '', 'Elemento elenco')} aria-label="Elenco puntato"><List size={16} /></Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => insert('\n1. ', '', 'Elemento numerato')} aria-label="Elenco numerato"><ListOrdered size={16} /></Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => insert('\n> ', '', 'Citazione')} aria-label="Citazione"><Quote size={16} /></Button>
        <select aria-label="Linguaggio codice" value={codeLanguage} onChange={e => setCodeLanguage(e.target.value)} className="h-8 rounded-md border bg-background px-2 text-xs">
          {['csharp','sql','javascript','typescript','json','bash','python','xml','yaml'].map(lang => <option key={lang}>{lang}</option>)}
        </select>
        <Button type="button" size="sm" variant="ghost" onClick={() => insert('\n```' + codeLanguage + '\n', '\n```', 'Console.WriteLine("Hello world");')} aria-label="Blocco codice"><Code2 size={16} /></Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => insert('\n| Colonna 1 | Colonna 2 |\n| --- | --- |\n| Valore | Valore |\n', '', '')} aria-label="Tabella"><Table2 size={16} /></Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => { const url = window.prompt('URL immagine (https://...)'); if (url) insert('\n![Descrizione](' + url + ')\n', '', ''); }} aria-label="Immagine"><ImagePlus size={16} /></Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => { const url = window.prompt('URL link (https://...)'); if (url) insert('[', '](' + url + ')', 'testo link'); }} aria-label="Link"><Link2 size={16} /></Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => insert('\n---\n', '', '')} aria-label="Separatore"><Minus size={16} /></Button>
      </div>
      <div className="flex items-center gap-1">
        <Button type="button" size="sm" variant={mode === 'write' ? 'default' : 'ghost'} onClick={() => setMode('write')}><PencilLine size={15} className="mr-1" />Scrivi</Button>
        <Button type="button" size="sm" variant={mode === 'split' ? 'default' : 'ghost'} onClick={() => setMode('split')}><Columns2 size={15} className="mr-1" />Affiancati</Button>
        <Button type="button" size="sm" variant={mode === 'preview' ? 'default' : 'ghost'} onClick={() => setMode('preview')}><Eye size={15} className="mr-1" />Anteprima</Button>
      </div>
    </div>
    <div className={mode === 'split' ? 'grid min-h-[520px] lg:grid-cols-2' : 'min-h-[520px]'}>
      {mode !== 'preview' && <div className="min-w-0"><div className="border-b px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contenuto Markdown</div><Textarea ref={editorRef} required rows={22} maxLength={100000} value={value} onChange={e => onChange(e.target.value)} placeholder={'Inizia a scrivere il tuo articolo…\n\n## Introduzione\n\nSpiega il problema che vuoi risolvere.'} className="min-h-[520px] resize-y rounded-none border-0 font-mono text-sm leading-7 focus-visible:ring-0" /></div>}
      {mode !== 'write' && <div className="min-w-0 border-l"><div className="border-b px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Anteprima articolo</div><div className="max-h-[680px] min-h-[520px] overflow-y-auto p-6"><Preview value={value} /></div></div>}
    </div>
    <div className="flex flex-wrap justify-between gap-2 border-t bg-muted/20 px-4 py-2 text-xs text-muted-foreground"><span>Supporta titoli, elenchi, citazioni, tabelle, immagini e codice.</span><span>{value.trim() ? value.trim().split(/\s+/).length : 0} parole · {value.length}/100.000 caratteri</span></div>
  </section>;
}
