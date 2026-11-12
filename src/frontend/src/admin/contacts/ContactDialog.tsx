import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CONTACT_KINDS, contactApi, kindLabel, toInput, type Contact, type ContactInput, type ContactKind } from '@/services/contactApi';

type Props = {
  /** `null` creates a new contact; an existing one is edited. */
  contact: Contact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (saved: Contact, created: boolean) => void;
};

type FormState = Record<'name' | 'kind' | 'company' | 'role' | 'email' | 'phone' | 'profileUrl' | 'notes' | 'lastContactOn' | 'nextFollowUpOn', string>;

const empty: FormState = {
  name: '', kind: 'Recruiter', company: '', role: '', email: '', phone: '', profileUrl: '', notes: '', lastContactOn: '', nextFollowUpOn: ''
};

function toForm(contact: Contact): FormState {
  const input = toInput(contact);
  return { ...input, lastContactOn: input.lastContactOn ?? '', nextFollowUpOn: input.nextFollowUpOn ?? '' };
}

function toContactInput(form: FormState): ContactInput {
  return {
    name: form.name.trim(),
    kind: form.kind as ContactKind,
    company: form.company.trim(),
    role: form.role.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    profileUrl: form.profileUrl.trim(),
    notes: form.notes.trim(),
    lastContactOn: form.lastContactOn || null,
    nextFollowUpOn: form.nextFollowUpOn || null
  };
}

/** Create or edit one contact. */
export default function ContactDialog({ contact, open, onOpenChange, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    setForm(contact ? toForm(contact) : empty);
  }, [open, contact]);

  const set = (patch: Partial<FormState>) => setForm(current => ({ ...current, ...patch }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const input = toContactInput(form);
      const saved = contact ? await contactApi.update(contact.id, input) : await contactApi.create(input);
      onSaved(saved, !contact);
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
          <DialogTitle>{contact ? 'Modifica contatto' : 'Nuovo contatto'}</DialogTitle>
          <DialogDescription>Annotazioni private: non compaiono sul sito pubblico.</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contact-name">Nome *</Label>
              <Input id="contact-name" required maxLength={180} value={form.name} onChange={e => set({ name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-kind">Chi è</Label>
              <Select value={form.kind} onValueChange={kind => set({ kind })}>
                <SelectTrigger id="contact-kind" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTACT_KINDS.map(kind => <SelectItem key={kind} value={kind}>{kindLabel[kind]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-company">Azienda</Label>
              <Input id="contact-company" maxLength={180} value={form.company} onChange={e => set({ company: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-role">Ruolo</Label>
              <Input id="contact-role" maxLength={180} value={form.role} onChange={e => set({ role: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-email">Email</Label>
              <Input id="contact-email" type="email" maxLength={254} value={form.email} onChange={e => set({ email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-phone">Telefono</Label>
              <Input id="contact-phone" maxLength={40} value={form.phone} onChange={e => set({ phone: e.target.value })} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="contact-profile">Profilo (LinkedIn o altro)</Label>
              <Input id="contact-profile" type="url" maxLength={500} placeholder="https://..." value={form.profileUrl} onChange={e => set({ profileUrl: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-last">Ultimo contatto</Label>
              <Input id="contact-last" type="date" value={form.lastContactOn} onChange={e => set({ lastContactOn: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-next">Da ricontattare il</Label>
              <Input id="contact-next" type="date" value={form.nextFollowUpOn} onChange={e => set({ nextFollowUpOn: e.target.value })} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="contact-notes">Note</Label>
              <Textarea id="contact-notes" rows={4} maxLength={4000} value={form.notes} onChange={e => set({ notes: e.target.value })} />
            </div>
          </div>

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
