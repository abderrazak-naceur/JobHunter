/**
 * Admin session kept in sessionStorage: it disappears when the tab is closed.
 * The token is short-lived and only grants access to the admin API.
 */
const STORAGE_KEY = 'portfolio.admin.session';

export const SESSION_ENDED_EVENT = 'portfolio:session-ended';

export type Session = { accessToken: string; expiresAt: string };

export function saveSession(session: Session): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

/** Returns the access token, or null when there is no session or it has expired. */
export function getAccessToken(): string | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const session = JSON.parse(raw) as Partial<Session>;
    const expiresAt = session.expiresAt ? Date.parse(session.expiresAt) : NaN;
    if (typeof session.accessToken === 'string' && session.accessToken && expiresAt > Date.now()) {
      return session.accessToken;
    }
  } catch {
    // fall through: corrupted data is treated as no session
  }

  sessionStorage.removeItem(STORAGE_KEY);
  return null;
}

/** Clears the session and tells the UI to show the login screen again. */
export function signOut(): void {
  sessionStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(SESSION_ENDED_EVENT));
}
