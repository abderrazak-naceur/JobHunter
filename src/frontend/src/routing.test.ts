import { describe, expect, it } from 'vitest';
import { resolveView } from './routing';

describe('resolveView', () => {
  it.each(['/', '', '/index.html', '/anything', '/administrator', '/projects/admin'])(
    'shows the public portfolio for %j',
    path => expect(resolveView(path)).toBe('portfolio')
  );

  it.each(['/admin', '/admin/', '/ADMIN', '/admin/companies'])(
    'shows the admin area for %j',
    path => expect(resolveView(path)).toBe('admin')
  );
});
