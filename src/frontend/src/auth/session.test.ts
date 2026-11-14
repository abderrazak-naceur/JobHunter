import { describe, expect, it, vi } from 'vitest';
import { getAccessToken, saveSession, SESSION_ENDED_EVENT, signOut } from './session';

const inOneHour = () => new Date(Date.now() + 3_600_000).toISOString();

describe('session', () => {
  it('returns null when nobody is signed in', () => {
    expect(getAccessToken()).toBeNull();
  });

  it('returns the saved token while it is valid', () => {
    saveSession({ accessToken: 'abc', expiresAt: inOneHour() });

    expect(getAccessToken()).toBe('abc');
  });

  it('drops an expired token', () => {
    saveSession({ accessToken: 'abc', expiresAt: new Date(Date.now() - 1000).toISOString() });

    expect(getAccessToken()).toBeNull();
    expect(sessionStorage.length).toBe(0);
  });

  it.each(['not json', '{}', '{"accessToken":"","expiresAt":"2999-01-01T00:00:00Z"}', '{"accessToken":"x","expiresAt":"garbage"}'])(
    'treats corrupted data %j as no session',
    raw => {
      sessionStorage.setItem('portfolio.admin.session', raw);

      expect(getAccessToken()).toBeNull();
    }
  );

  it('signOut clears the token and notifies listeners', () => {
    saveSession({ accessToken: 'abc', expiresAt: inOneHour() });
    const listener = vi.fn();
    window.addEventListener(SESSION_ENDED_EVENT, listener);

    signOut();
    window.removeEventListener(SESSION_ENDED_EVENT, listener);

    expect(getAccessToken()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
