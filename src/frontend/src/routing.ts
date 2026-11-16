export type View = 'portfolio' | 'admin' | 'blog' | 'blog-post';

/** Maps a URL path to the view to render: `/admin` (and sub-paths) is the private area, everything else is the public portfolio. */
export function resolveView(pathname: string): View {
  const normalized = pathname.toLowerCase().replace(/\/+$/, '');
  if (normalized === '/admin' || normalized.startsWith('/admin/')) return 'admin';
  if (normalized === '/blog') return 'blog';
  if (normalized.startsWith('/blog/')) return 'blog-post';
  return 'portfolio';
}
