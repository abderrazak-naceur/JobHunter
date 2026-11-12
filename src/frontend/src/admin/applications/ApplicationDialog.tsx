import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  APPLICATION_STATUSES, applicationApi, toInput,
  type Application, type ApplicationDetail, type ApplicationInput, type ApplicationStatus
} from '@/services/applicationApi';
import { formatDate, statusLabel, statusMeta, todayIso } from './statusMeta';

type Props = {
  /** `null` creates a new application; an existing one is edited. */
  application: Application | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after the application was created or updated. */
  onSaved: (saved: ApplicationDetail) => void;
};

type FormState = Record<
  'company' | 'role' | 'status' | 'source' | 'url' | 'location' | 'salaryRange' | 'contactName' | 'contactEmail' | 'appliedOn' | 'nextStep' | 'nextStepOn' | 'notes',
  string
>;

const empty: FormState = {
  company: '', role: '', status: 'Saved', source: '', url: '', location: '', salaryRange: '',
  contactName: '', contactEmail: '', appliedOn: '', nextStep: '', nextStepOn: '', notes: ''
};

function fromApplication(application: Application): FormState {
  const input = toInput(application);
  return { ...input, appliedOn: input.appliedOn ?? '', nextStepOn: input.nextStepOn ?? '' };
}

function toApplicationInput(form: FormState): ApplicationInput {
  return {
    company: form.company.trim(),
    role: form.role.trim(),
    status: form.status as ApplicationStatus,
    source: form.source.trim(),
    url: form.url.trim(),
    location: form.location.trim(),
    salaryRange: form.salaryRange.trim(),
    contactName: form.contactName.trim(),
    contactEmail: form.contactEmail.trim(),
    appliedOn: form.appliedOn || null,
    nextStep: form.nextStep.trim(),
    nextStepOn: form.nextStepOn || null,
    notes: form.notes.trim()
  };
}

/** Create or edit one application, with its status history when editing. */
export default function ApplicationDialog({ application, open, onOpenChange, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(empty);
  const [history, setHistory] = useState<ApplicationDetail['events']>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    setForm(application ? fromApplication(application) : empty);
    setHistory([]);
    if (!application) return;

    let active = true;
    applicationApi.get(application.id).then(detail => { if (active) setHistory(detail.events); }).catch(() => {});
    return () => { active = false; };
  }, [open, application]);

  const set = (patch: Partial<FormState>) => setForm(current => ({ ...current, ...patch }));

  function changeStatus(status: string) {
    // Moving to "Applied" is the natural moment to record the date, unless one was already entered.
    set({ status, ...(status === 'Applied' && !form.appliedOn ? { appliedOn: todayIso() } : {}) });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const input = toApplicationInput(form);
      const saved = application ? await applicationApi.update(application.id, input) : await applicationApi.create(input);
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Salvataggio non riuscito.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={next => { if (!saving) onOpenChange(next); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{application ? 'Modifica candidatura' : 'Nuova candidatura'}</DialogTitle>
          <DialogDescription>Annotazioni private: non compaiono sul sito pubblico.</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="app-company">Azienda *</Label>
              <Input id="app-company" required maxLength={180} value={form.company} onChange={e => set({ company: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="app-role">Ruolo *</Label>
              <Input id="app-role" required maxLength={180} value={form.role} onChange={e => set({ role: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="app-status">Stato</Label>
              <Select value={form.status} onValueChange={changeStatus}>
                <SelectTrigger id="app-status" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {APPLICATION_STATUSES.map(status => <SelectItem key={status} value={status}>{statusMeta[status].label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="app-source">Dove l’hai trovata</Label>
              <Input id="app-source" maxLength={120} placeholder="LinkedIn, sito aziendale, contatto..." value={form.source} onChange={e => set({ source: e.target.value })} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="app-url">Link all’annuncio</Label>
              <Input id="app-url" type="url" maxLength={1000} placeholder="https://..." value={form.url} onChange={e => set({ url: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="app-location">Località</Label>
              <Input id="app-location" maxLength={180} value={form.location} onChange={e => set({ location: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="app-salary">Retribuzione</Label>
              <Input id="app-salary" maxLength={120} placeholder="50-60k RAL" value={form.salaryRange} onChange={e => set({ salaryRange: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="app-contact">Contatto (nome)</Label>
              <Input id="app-contact" maxLength={180} value={form.contactName} onChange={e => set({ contactName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="app-contact-email">Contatto (email)</Label>
              <Input id="app-contact-email" type="email" maxLength={254} value={form.contactEmail} onChange={e => set({ contactEmail: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="app-applied">Data di candidatura</Label>
              <Input id="app-applied" type="date" value={form.appliedOn} onChange={e => set({ appliedOn: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="app-next-on">Data del prossimo passo</Label>
              <Input id="app-next-on" type="date" value={form.nextStepOn} onChange={e => set({ nextStepOn: e.target.value })} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="app-next">Prossimo passo</Label>
              <Input id="app-next" maxLength={250} placeholder="Richiamare HR, preparare il test tecnico..." value={form.nextStep} onChange={e => set({ nextStep: e.target.value })} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="app-notes">Note</Label>
              <Textarea id="app-notes" rows={4} maxLength={4000} value={form.notes} onChange={e => set({ notes: e.target.value })} />
            </div>
          </div>

          {application && history.length > 0 && (
            <section aria-label="Storico degli stati" className="rounded-lg border p-3">
              <h3 className="mb-2 text-sm font-semibold">Storico</h3>
              <ol className="space-y-1 text-sm text-muted-foreground">
                {history.map(entry => (
                  <li key={entry.id}>
                    {formatDate(entry.at)} · {entry.fromStatus ? `${statusLabel(entry.fromStatus)} → ` : 'Creata come '}
                    <strong className="text-foreground">{statusLabel(entry.toStatus)}</strong>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>Annulla</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Salvataggio...' : 'Salva'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
