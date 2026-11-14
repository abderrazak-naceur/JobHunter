import { useState, type FormEvent } from 'react';
import { login } from './authApi';
import './login.css';

type Props = { onSuccess: () => void };

export default function LoginPage({ onSuccess }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(username.trim(), password);
      setPassword('');
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Accesso non riuscito.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-screen">
      <form className="login-card" onSubmit={submit} aria-labelledby="login-title">
        <h1 id="login-title">Area privata</h1>
        <p>Accedi per gestire ricerche e candidature.</p>

        {error && <div className="login-error" role="alert">{error}</div>}

        <label htmlFor="login-username">Username</label>
        <input id="login-username" name="username" autoComplete="username" value={username}
          onChange={event => setUsername(event.target.value)} required maxLength={100} autoFocus />

        <label htmlFor="login-password">Password</label>
        <input id="login-password" name="password" type="password" autoComplete="current-password" value={password}
          onChange={event => setPassword(event.target.value)} required maxLength={256} />

        <button type="submit" disabled={submitting}>{submitting ? 'Accesso in corso...' : 'Accedi'}</button>
        <a className="login-back" href="/">← Torna al portfolio</a>
      </form>
    </main>
  );
}
