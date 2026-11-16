import { useState, type FormEvent } from 'react';
import { Copy, RefreshCw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { PortfolioContent } from '@/portfolio/content';
import { generateAiDraft, type AiWriterRequest } from '@/services/portfolioApi';

type Props = { portfolio: PortfolioContent };

const initialRequest: AiWriterRequest = {
  channel: 'linkedin',
  tone: 'professional',
  language: 'Italiano',
  topic: '',
  callToAction: ''
};

export default function AiWriterPage({ portfolio }: Props) {
  const [request, setRequest] = useState<AiWriterRequest>(initialRequest);
  const [draft, setDraft] = useState('');
  const [model, setModel] = useState('');
  const [loading, setLoading] = useState(false);

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!request.topic.trim()) {
      toast.error('Descrivi l’argomento del contenuto.');
      return;
    }
    setLoading(true);
    try {
      const result = await generateAiDraft(request, portfolio);
      setDraft(result.draft);
      setModel(result.model);
      toast.success('Bozza generata. Rileggila prima di pubblicarla.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Generazione non riuscita.');
    } finally {
      setLoading(false);
    }
  }

  async function copyDraft() {
    try {
      await navigator.clipboard.writeText(draft);
      toast.success('Bozza copiata negli appunti.');
    } catch {
      toast.error('Impossibile copiare automaticamente: seleziona il testo e copialo.');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-primary">Personal branding</p>
        <h2 className="text-2xl font-extrabold tracking-tight">AI Writer</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Crea bozze per LinkedIn e per il tuo sito usando le informazioni del portfolio. Il testo non viene pubblicato automaticamente.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Sparkles className="size-5 text-primary" /> Nuovo contenuto</CardTitle>
            <CardDescription>Definisci obiettivo, stile e lingua della bozza.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={generate}>
              <div className="grid gap-2">
                <label htmlFor="ai-channel" className="text-sm font-medium">Dove userai il testo?</label>
                <select id="ai-channel" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={request.channel}
                  onChange={event => setRequest(current => ({ ...current, channel: event.target.value as AiWriterRequest['channel'] }))}>
                  <option value="linkedin">Post LinkedIn</option>
                  <option value="portfolio">Testo per il portfolio</option>
                  <option value="bio">Bio professionale breve</option>
                </select>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-2">
                  <label htmlFor="ai-tone" className="text-sm font-medium">Tono</label>
                  <select id="ai-tone" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={request.tone}
                    onChange={event => setRequest(current => ({ ...current, tone: event.target.value as AiWriterRequest['tone'] }))}>
                    <option value="professional">Professionale</option>
                    <option value="confident">Sicuro e autorevole</option>
                    <option value="friendly">Amichevole</option>
                    <option value="technical">Tecnico</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <label htmlFor="ai-language" className="text-sm font-medium">Lingua</label>
                  <select id="ai-language" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={request.language}
                    onChange={event => setRequest(current => ({ ...current, language: event.target.value as AiWriterRequest['language'] }))}>
                    <option value="Italiano">Italiano</option>
                    <option value="English">English</option>
                    <option value="Français">Français</option>
                  </select>
                </div>
              </div>
              <div className="grid gap-2">
                <label htmlFor="ai-topic" className="text-sm font-medium">Argomento e obiettivo *</label>
                <Textarea id="ai-topic" required maxLength={1200} rows={5} value={request.topic}
                  placeholder="Es. Scrivi un post LinkedIn sul mio percorso da sviluppatore .NET e sull'importanza di modernizzare applicazioni enterprise con React e cloud."
                  onChange={event => setRequest(current => ({ ...current, topic: event.target.value }))} />
                <p className="text-xs text-muted-foreground text-right">{request.topic.length}/1200</p>
              </div>
              <div className="grid gap-2">
                <label htmlFor="ai-cta" className="text-sm font-medium">Call to action (facoltativa)</label>
                <Input id="ai-cta" maxLength={300} value={request.callToAction}
                  placeholder="Es. Parliamone nei commenti."
                  onChange={event => setRequest(current => ({ ...current, callToAction: event.target.value }))} />
              </div>
              <Button type="submit" disabled={loading || !request.topic.trim()} className="w-full">
                {loading ? <><RefreshCw className="mr-2 size-4 animate-spin" /> Generazione in corso...</> : <><Sparkles className="mr-2 size-4" /> Genera bozza</>}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>La tua bozza</CardTitle>
                <CardDescription>Modifica liberamente il risultato prima di copiarlo.</CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" disabled={!draft.trim()} onClick={copyDraft}>
                <Copy className="mr-2 size-4" /> Copia testo
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea aria-label="Bozza generata" rows={18} value={draft}
              onChange={event => setDraft(event.target.value)}
              placeholder="La bozza generata apparirà qui. Puoi modificarla prima di copiarla." />
            {model && <p className="text-xs text-muted-foreground">Modello: {model} · Bozza non pubblicata</p>}
            <p className="text-xs text-muted-foreground">
              Controlla sempre nomi, date e affermazioni. L’AI usa i dati del portfolio come contesto, ma il testo finale resta sotto il tuo controllo.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
