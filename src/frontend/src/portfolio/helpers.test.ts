import { Cloud, Database, MonitorSmartphone, Server, Sparkles } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { initialsOf, isExternal, iconForGroup, pluralize } from './helpers';

describe('portfolio helpers', () => {
  it.each([
    ['Backend', Server],
    ['API e servizi', Server],
    ['Frontend', MonitorSmartphone],
    ['Dati', Database],
    ['Database', Database],
    ['Cloud e DevOps', Cloud],
    ['Soft skill', Sparkles],
    ['', Sparkles]
  ])('picks an icon for the group %j', (title, icon) => {
    expect(iconForGroup(title)).toBe(icon);
  });

  it.each([
    ['Mario Rossi', 'MR'],
    ['  Zak   Naceur  ', 'ZN'],
    ['Anna Maria De Luca', 'AL'],
    ['Madonna', 'MA'],
    ['x', 'X'],
    ['   ', '?'],
    ['', '?']
  ])('builds initials for %j', (name, expected) => {
    expect(initialsOf(name)).toBe(expected);
  });

  it('pluralizes counts', () => {
    expect(pluralize(1, 'competenza', 'competenze')).toBe('1 competenza');
    expect(pluralize(0, 'competenza', 'competenze')).toBe('0 competenze');
    expect(pluralize(7, 'competenza', 'competenze')).toBe('7 competenze');
  });

  it('tells external links from internal ones', () => {
    expect(isExternal('https://example.com')).toBe(true);
    expect(isExternal('HTTP://example.com')).toBe(true);
    expect(isExternal('/cv.pdf')).toBe(false);
    expect(isExternal('mailto:a@b.it')).toBe(false);
  });
});
