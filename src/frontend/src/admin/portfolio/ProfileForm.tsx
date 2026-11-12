import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { PortfolioContent } from '@/portfolio/content';
import { resolveAssetUrl } from '@/services/apiConfig';
import { deletePhoto, uploadPhoto } from '@/services/portfolioApi';

type Props = {
  content: PortfolioContent;
  /** Saves a change of the profile fields; rejects with a readable Error. */
  onSave: (patch: Partial<PortfolioContent>) => Promise<void>;
  /** Called after the photo was uploaded or removed (these are published immediately). */
  onPhotoChange: (photoUrl: string | null) => void;
};

type FormState = { name: string; role: string; tagline: string; summary: string; location: string; workMode: string; email: string; cvUrl: string; photoUrl: string };

function toForm(content: PortfolioContent): FormState {
  return {
    name: content.name,
    role: content.role,
    tagline: content.tagline,
    summary: content.summary,
    location: content.location,
    workMode: content.workMode,
    email: content.email ?? '',
    cvUrl: content.cvUrl ?? '',
    photoUrl: content.photoUrl ?? ''
  };
}

export default function ProfileForm({ content, onSave, onPhotoChange }: Props) {
  const [form, setForm] = useState<FormState>(() => toForm(content));
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState('');

  // The photo is stored by the API and its address comes from the parent, not from the text fields.
  const photoUrl = content.photoUrl ?? '';
  const photoUploaded = photoUrl.startsWith('/api/');
  const set = (patch: Partial<FormState>) => setForm(current => ({ ...current, ...patch }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave({
        name: form.name.trim(),
        role: form.role.trim(),
        tagline: form.tagline.trim(),
        summary: form.summary.trim(),
        location: form.location.trim(),
        workMode: form.workMode.trim(),
        email: form.email.trim() || null,
        cvUrl: form.cvUrl.trim() || null,
        // An uploaded photo keeps the address the API gave us; otherwise use the manual URL field.
        photoUrl: photoUploaded ? photoUrl : form.photoUrl.trim() || null
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Salvataggio non riuscito.');
    } finally {
      setSaving(false);
    }
  }

  async function onPhotoSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ''; // lets the same file be chosen again
    if (!file) return;

    setError('');
    setPhotoBusy(true);
    try {
      onPhotoChange(await uploadPhoto(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Caricamento della foto non riuscito.');
    } finally {
      setPhotoBusy(false);
    }
  }

  async function onPhotoRemoved() {
    setError('');
    setPhotoBusy(true);
    try {
      if (photoUploaded) await deletePhoto();
      set({ photoUrl: '' });
      onPhotoChange(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rimozione della foto non riuscita.');
    } finally {
      setPhotoBusy(false);
    }
  }

  const shownPhoto = photoUploaded ? photoUrl : form.photoUrl;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profilo</CardTitle>
        <CardDescription>Nome, presentazione, contatti e foto che compaiono in cima al sito.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Nome *</Label>
              <Input id="profile-name" required maxLength={120} value={form.name} onChange={e => set({ name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-role">Ruolo *</Label>
              <Input id="profile-role" required maxLength={120} value={form.role} onChange={e => set({ role: e.target.value })} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="profile-tagline">Slogan</Label>
              <Input id="profile-tagline" maxLength={250} value={form.tagline} onChange={e => set({ tagline: e.target.value })} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="profile-summary">Chi sono *</Label>
              <Textarea id="profile-summary" required rows={6} maxLength={2000} value={form.summary} onChange={e => set({ summary: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-location">Località</Label>
              <Input id="profile-location" maxLength={120} value={form.location} onChange={e => set({ location: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-workmode">Modalità di lavoro</Label>
              <Input id="profile-workmode" maxLength={120} value={form.workMode} onChange={e => set({ workMode: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-email">Email pubblica</Label>
              <Input id="profile-email" type="email" maxLength={254} value={form.email} onChange={e => set({ email: e.target.value })} placeholder="nome@esempio.it" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-cv">Link al CV (URL)</Label>
              <Input id="profile-cv" type="url" maxLength={500} value={form.cvUrl} onChange={e => set({ cvUrl: e.target.value })} placeholder="https://..." />
            </div>
          </div>

          <div className="space-y-3 rounded-lg border p-4">
            <p className="text-sm font-medium">Foto profilo</p>
            <div className="flex flex-wrap items-center gap-4">
              {shownPhoto ? (
                <img src={resolveAssetUrl(shownPhoto)} alt="Anteprima della foto profilo" className="size-28 rounded-xl border object-cover" />
              ) : (
                <div aria-hidden="true" className="grid size-28 place-items-center rounded-xl border bg-muted text-xs text-muted-foreground">Nessuna foto</div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <Label className="inline-flex h-9 cursor-pointer items-center rounded-md border bg-background px-4 text-sm font-medium shadow-xs hover:bg-accent focus-within:ring-[3px] focus-within:ring-ring/50">
                  {photoBusy ? 'Attendi...' : shownPhoto ? 'Cambia foto' : 'Carica foto'}
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={photoBusy} onChange={onPhotoSelected} />
                </Label>
                {shownPhoto && <Button type="button" variant="outline" disabled={photoBusy} onClick={onPhotoRemoved}>Rimuovi foto</Button>}
                <p className="basis-full text-xs text-muted-foreground">JPEG, PNG o WebP, massimo 2 MB. Una foto caricata viene pubblicata subito.</p>
              </div>
            </div>
            {!photoUploaded && (
              <div className="space-y-2">
                <Label htmlFor="profile-photo-url">Oppure indica l’URL di una foto</Label>
                <Input id="profile-photo-url" type="url" maxLength={500} value={form.photoUrl} onChange={e => set({ photoUrl: e.target.value })} placeholder="https://..." />
              </div>
            )}
          </div>

          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={saving}>{saving ? 'Salvataggio...' : 'Salva e pubblica'}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
