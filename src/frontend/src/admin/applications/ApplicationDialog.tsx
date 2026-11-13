import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  APPLICATION_STATUSES, applicationApi, toInput,
  emptyOffer, type Application, type ApplicationDetail, type ApplicationInput, type ApplicationStatus, type ImportedPosting
} from '@/services/applicationApi';
import PostingImport from './PostingImport';
import { parseAmount } from './offers';
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
  | 'company' | 'role' | 'status' | 'source' | 'url' | 'location' | 'salaryRange' | 'contactName' | 'contactEmail' | 'appliedOn' | 'nextStep' | 'nextStepOn' | 'notes'
  | 'offerGross' | 'offerBonus' | 'offerBenefits' | 'offerRemoteDays' | 'offerDecisionBy',
  string
>;

const empty: FormState = {
  company: '', role: '', status: 'Saved', source: '', url: '', location: '', salaryRange: '',
  contactName: '', contactEmail: '', appliedOn: '', nextStep: '', nextStepOn: '', notes: '',
  offerGross: '', offerBonus: '', offerBenefits: '', offerRemoteDays: '', offerDecisionBy: ''
};

function fromApplication(application: Application): FormState {
  const { offer, ...input } = toInput(application);
  const terms = offer ?? emptyOffer;
  return {
    ...input,
    appliedOn: input.appliedOn ?? '',
    nextStepOn: input.nextStepOn ?? '',
    offerGross: terms.grossAnnual === null ? '' : String(terms.grossAnnual),
    offerBonus: terms.bonus === null ? '' : String(terms.bonus),
    offerBenefits: terms.benefits,
    offerRemoteDays: terms.remoteDaysPerWeek === null ? '' : String(terms.remoteDaysPerWeek),
    offerDecisionBy: terms.decisionBy ?? ''
  };
}

/** Reads an amount field; a value that is not a number stops the save with a clear message. */
function amount(text: string, label: string): number | null {
  const value = parseAmount(text);
  if (Number.isNaN(value)) throw new Error(`${label}: inserisci un importo, ad esempio 55.000.`);
  return value;
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
    notes: form.notes.trim(),
    offer: {
      grossAnnual: amount(form.offerGross, 'RAL'),
      bonus: amount(form.offerBonus, 'Bonus'),
      benefits: form.offerBenefits.trim(),
      remoteDaysPerWeek: form.offerRemoteDays === '' ? null : Number(form.offerRemoteDays),
      decisionBy: form.offerDecisionBy || null
    }
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

  /** Fills what the posting said; fields it did not mention keep what the owner already typed. */
  function applyPosting(posting: ImportedPosting) {
    setForm(current => ({
      ...current,
      company: posting.company || current.company,
      role: posting.role || current.role,
      location: posting.location || current.location,
      salaryRange: posting.salaryRange || current.salaryRange,
      url: posting.url || current.url,
      source: current.source || posting.source,
      notes: current.notes || posting.notes
    }));
  }

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

        {!application && <PostingImport onImported={applyPosting} />}

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

          {(form.status === 'Offer' || form.offerGross || form.offerBonus || form.offerBenefits || form.offerRemoteDays || form.offerDecisionBy) && (
            <fieldset className="grid gap-4 rounded-lg border p-3 sm:grid-cols-2">
              <legend className="px-1 text-sm font-semibold">Dettagli dell’offerta</legend>
              <div className="space-y-2">
                <Label htmlFor="app-offer-gross">RAL (lordo annuo, €)</Label>
                <Input id="app-offer-gross" inputMode="decimal" placeholder="55.000" value={form.offerGross} onChange={e => set({ offerGross: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="app-offer-bonus">Bonus annuo (lordo, €)</Label>
                <Input id="app-offer-bonus" inputMode="decimal" placeholder="4.000" value={form.offerBonus} onChange={e => set({ offerBonus: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="app-offer-remote">Smart working (giorni a settimana)</Label>
                <Input id="app-offer-remote" type="number" min={0} max={5} step={1} value={form.offerRemoteDays} onChange={e => set({ offerRemoteDays: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="app-offer-decision">Decidere entro</Label>
                <Input id="app-offer-decision" type="date" value={form.offerDecisionBy} onChange={e => set({ offerDecisionBy: e.target.value })} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="app-offer-benefits">Benefit</Label>
                <Textarea id="app-offer-benefits" rows={2} maxLength={1000} placeholder="Buoni pasto, assicurazione sanitaria, auto..." value={form.offerBenefits} onChange={e => set({ offerBenefits: e.target.value })} />
              </div>
            </fieldset>
          )}

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
