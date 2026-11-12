export type View = 'portfolio' | 'admin';

/** Maps a URL path to the view to render: `/admin` (and sub-paths) is the private area, everything else is the public portfolio. */
export function resolveView(pathname: string): View {
  const normalized = pathname.toLowerCase().replace(/\/+$/, '');
  return normalized === '/admin' || normalized.startsWith('/admin/') ? 'admin' : 'portfolio';
}
