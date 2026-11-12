import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { changePassword, getCurrentUsername } from '@/auth/authApi';

export const MIN_PASSWORD_LENGTH = 12;

/** Validates the form on the client; the server repeats every rule. */
export function validatePasswordChange(current: string, next: string, confirm: string): string {
  if (!current) return 'Inserisci la password attuale.';
  if (next.length < MIN_PASSWORD_LENGTH) return `La nuova password deve avere almeno ${MIN_PASSWORD_LENGTH} caratteri.`;
  if (next === current) return 'La nuova password deve essere diversa da quella attuale.';
  if (next !== confirm) return 'La conferma non coincide con la nuova password.';
  return '';
}

/** Security area: change the admin password. */
export default function AccountPage() {
  const [username, setUsername] = useState('');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    getCurrentUsername()
      .then(name => { if (active) setUsername(name); })
      .catch(() => { /* the username is only a hint for password managers */ });
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const problem = validatePasswordChange(current, next, confirm);
    setError(problem);
    if (problem) return;

    setSaving(true);
    try {
      await changePassword(current, next);
      setCurrent('');
      setNext('');
      setConfirm('');
      toast.success('Password aggiornata. Le altre sessioni sono state chiuse.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossibile cambiare la password.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Cambia password</CardTitle>
        <CardDescription>
          Dopo il cambio, tutte le altre sessioni vengono chiuse. Usa almeno {MIN_PASSWORD_LENGTH} caratteri.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-4" aria-label="Cambia password">
          {/* Hidden username lets password managers pair the new password with the right account. */}
          <input type="text" name="username" autoComplete="username" value={username} readOnly hidden />
          {error && <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <div className="grid gap-2">
            <Label htmlFor="current-password">Password attuale</Label>
            <Input id="current-password" type="password" autoComplete="current-password" maxLength={256}
              value={current} onChange={event => setCurrent(event.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new-password">Nuova password</Label>
            <Input id="new-password" type="password" autoComplete="new-password" maxLength={256}
              value={next} onChange={event => setNext(event.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirm-password">Conferma nuova password</Label>
            <Input id="confirm-password" type="password" autoComplete="new-password" maxLength={256}
              value={confirm} onChange={event => setConfirm(event.target.value)} required />
          </div>
          <div>
            <Button type="submit" disabled={saving}>{saving ? 'Salvataggio...' : 'Aggiorna password'}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
