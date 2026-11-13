import { useState, type KeyboardEvent } from 'react';
import { ClipboardPaste, Link2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { applicationApi, type ImportedPosting } from '@/services/applicationApi';

const fieldNames: Record<string, string> = {
  company: 'azienda',
  role: 'ruolo',
  location: 'località',
  salaryRange: 'retribuzione'
};

/** Words for the fields that were found and the ones still to fill in. */
export function describeResult(found: string[]): string {
  const keys = Object.keys(fieldNames);
  const got = keys.filter(key => found.includes(key)).map(key => fieldNames[key]);
  const missing = keys.filter(key => !found.includes(key)).map(key => fieldNames[key]);
  if (got.length === 0) return 'Non ho riconosciuto nessun dato: compila i campi a mano.';
  return `Compilati: ${got.join(', ')}.` + (missing.length ? ` Da completare: ${missing.join(', ')}.` : '') + ' Controlla prima di salvare.';
}

type Props = { onImported: (posting: ImportedPosting) => void };

/**
 * Fills a new application from a job posting: the link is read by the server, or - for sites such as LinkedIn
 * that do not allow automated reading - the text of the posting is pasted and read without contacting the site.
 */
export default function PostingImport({ onImported }: Props) {
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [showText, setShowText] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  async function read() {
    const useText = showText && text.trim().length > 0;
    if (!url.trim() && !useText) {
      setError(showText ? 'Incolla il link o il testo dell’annuncio.' : 'Incolla il link dell’annuncio.');
      return;
    }

    setBusy(true);
    setError('');
    setNotice('');
    try {
      const posting = await applicationApi.importPosting({ url: url.trim(), text: useText ? text : '' });
      onImported(posting);
      if (posting.needsText) {
        setShowText(true);
        setNotice(posting.message ?? 'Copia il testo dell’annuncio e incollalo qui sotto.');
      } else {
        setNotice(describeResult(posting.found));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Non sono riuscito a leggere l’annuncio.');
      setShowText(true);
    } finally {
      setBusy(false);
    }
  }

  function onUrlKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      void read();
    }
  }

  return (
    <section aria-labelledby="posting-import-title" className="space-y-3 rounded-lg border border-dashed bg-muted/30 p-3">
      <div>
        <h3 id="posting-import-title" className="text-sm font-semibold">Compila da un annuncio</h3>
        <p className="text-xs text-muted-foreground">
          Incolla il link dell’offerta: azienda, ruolo, località e retribuzione vengono compilati da soli. Per LinkedIn, Indeed e Glassdoor incolla il testo dell’annuncio.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="posting-url">Link dell’annuncio</Label>
        <div className="flex gap-2">
          <Input
            id="posting-url"
            type="url"
            inputMode="url"
            placeholder="https://..."
            maxLength={1000}
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={onUrlKeyDown}
          />
          <Button type="button" variant="secondary" disabled={busy} onClick={() => void read()}>
            {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Link2 aria-hidden="true" />}
            {busy ? 'Lettura...' : 'Leggi annuncio'}
          </Button>
        </div>
      </div>

      {showText ? (
        <div className="space-y-2">
          <Label htmlFor="posting-text">Testo dell’annuncio</Label>
          <Textarea
            id="posting-text"
            rows={5}
            maxLength={20000}
            placeholder="Apri l’annuncio, seleziona tutto il testo (Ctrl+A), copialo e incollalo qui."
            value={text}
            onChange={e => setText(e.target.value)}
          />
          <Button type="button" variant="secondary" disabled={busy} onClick={() => void read()}>
            <ClipboardPaste aria-hidden="true" /> Estrai dal testo
          </Button>
        </div>
      ) : (
        <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => setShowText(true)}>
          Oppure incolla il testo dell’annuncio
        </button>
      )}

      {notice && <p role="status" className="text-sm text-foreground">{notice}</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </section>
  );
}
