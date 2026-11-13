import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { changePassword, changeUsername, getCurrentUsername } from '@/auth/authApi';

export const MIN_PASSWORD_LENGTH = 12;
export const MIN_USERNAME_LENGTH = 3;

/** Validates the form on the client; the server repeats every rule. */
export function validatePasswordChange(current: string, next: string, confirm: string): string {
  if (!current) return 'Inserisci la password attuale.';
  if (next.length < MIN_PASSWORD_LENGTH) return `La nuova password deve avere almeno ${MIN_PASSWORD_LENGTH} caratteri.`;
  if (next === current) return 'La nuova password deve essere diversa da quella attuale.';
  if (next !== confirm) return 'La conferma non coincide con la nuova password.';
  return '';
}

/** Same rules as the server: 3-100 characters, letters, digits and . _ - @, different from the current one. */
export function validateUsernameChange(currentUsername: string, next: string, password: string): string {
  const value = next.trim();
  if (value.length < MIN_USERNAME_LENGTH || value.length > 100) return `Lo username deve avere da ${MIN_USERNAME_LENGTH} a 100 caratteri.`;
  if (!/^[\p{L}\p{N}._@-]+$/u.test(value)) return 'Usa solo lettere, numeri e i caratteri . _ - @ (senza spazi).';
  if (value === currentUsername) return 'Il nuovo username è uguale a quello attuale.';
  if (!password) return 'Inserisci la password attuale per confermare.';
  return '';
}

const errorBox = 'rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700';

/** Security area: see and change the admin username, change the password. */
export default function AccountPage() {
  const [username, setUsername] = useState('');
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;
    getCurrentUsername()
      .then(name => { if (active) setUsername(name); })
      .catch(err => { if (active) setLoadError(err instanceof Error ? err.message : 'Impossibile leggere lo username.'); });
    return () => { active = false; };
  }, []);

  return (
    <div className="space-y-6">
      <UsernameCard username={username} loadError={loadError} onChanged={setUsername} />
      <PasswordCard username={username} />
    </div>
  );
}

function UsernameCard({ username, loadError, onChanged }: { username: string; loadError: string; onChanged: (name: string) => void }) {
  const [next, setNext] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const problem = validateUsernameChange(username, next, password);
    setError(problem);
    if (problem) return;

    setSaving(true);
    try {
      const value = next.trim();
      await changeUsername(password, value);
      onChanged(value);
      setNext('');
      setPassword('');
      toast.success(`Username aggiornato in “${value}”. Le altre sessioni sono state chiuse.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossibile cambiare lo username.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Username</CardTitle>
        <CardDescription>È il nome con cui accedi all’area privata. Dopo il cambio, tutte le altre sessioni vengono chiuse.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <p className="text-sm">
          Username attuale:{' '}
          {username
            ? <strong data-testid="current-username" className="rounded bg-muted px-2 py-0.5 font-mono">{username}</strong>
            : <span className="text-muted-foreground">{loadError || 'caricamento...'}</span>}
        </p>

        <form onSubmit={submit} className="grid gap-4" aria-label="Cambia username">
          {error && <div role="alert" className={errorBox}>{error}</div>}
          <div className="grid gap-2">
            <Label htmlFor="new-username">Nuovo username</Label>
            <Input id="new-username" autoComplete="username" maxLength={100} spellCheck={false} autoCapitalize="none"
              value={next} onChange={event => setNext(event.target.value)} required />
            <p className="text-xs text-muted-foreground">Da 3 a 100 caratteri: lettere, numeri e . _ - @, senza spazi.</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="username-password">Password attuale (per confermare)</Label>
            <Input id="username-password" type="password" autoComplete="current-password" maxLength={256}
              value={password} onChange={event => setPassword(event.target.value)} required />
          </div>
          <div>
            <Button type="submit" disabled={saving || !username}>{saving ? 'Salvataggio...' : 'Aggiorna username'}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function PasswordCard({ username }: { username: string }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

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
          {error && <div role="alert" className={errorBox}>{error}</div>}
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
