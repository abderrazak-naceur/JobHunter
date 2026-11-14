import { useEffect, useState, type ReactNode } from 'react';
import LoginPage from './LoginPage';
import { getAccessToken, SESSION_ENDED_EVENT } from './session';

/** Shows the login screen until the user is signed in, and again as soon as the session ends. */
export default function AdminGate({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(() => getAccessToken() !== null);

  useEffect(() => {
    const onSessionEnded = () => setAuthenticated(false);
    window.addEventListener(SESSION_ENDED_EVENT, onSessionEnded);
    return () => window.removeEventListener(SESSION_ENDED_EVENT, onSessionEnded);
  }, []);

  useEffect(() => {
    document.title = 'Area privata · Portfolio';
    // The private area must never be indexed by search engines.
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => { meta.remove(); };
  }, []);

  if (!authenticated) return <LoginPage onSuccess={() => setAuthenticated(true)} />;
  return <>{children}</>;
}
