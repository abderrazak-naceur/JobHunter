import { getAccessToken, signOut } from '../auth/session';
import { apiBaseUrl, unreachableApiMessage } from './apiConfig';

export type BlogStatus = 'Draft' | 'Published' | 'Archived';
export type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  contentMarkdown: string;
  category: string;
  tags: string[];
  coverImageUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  status: BlogStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};
export type BlogPostInput = Omit<BlogPost, 'id' | 'createdAt' | 'updatedAt' | 'publishedAt'>;
export type BlogPage = { items: BlogPost[]; page: number; pageSize: number; total: number };
export type BlogArticleImport = { sourceUrl: string; sourceTitle: string; sourceDescription: string; sourceHost: string; extractedMarkdown: string };
export type BlogSettings = {
  siteName: string; authorName: string; tagline: string; logoUrl: string;
  heroTitle: string; heroDescription: string; primaryColor: string;
  accentColor: string; backgroundColor: string;
  textColor: string; mutedTextColor: string; surfaceColor: string;
  headerBackgroundColor: string; heroBackgroundColor: string; cardBackgroundColor: string;
  footerBackgroundColor: string; borderColor: string; buttonTextColor: string;
  template: 'premium-tech' | 'editorial-light' | 'developer-dark' | 'personal-journal' | 'minimal' | 'magazine' | 'terminal' | 'creative';
  heroEyebrow: string; heroImageUrl: string; footerDescription: string; copyrightText: string;
  navigationJson: string; socialLinksJson: string;
  fontFamily: 'Inter' | 'system' | 'Arial' | 'Georgia' | 'Roboto' | 'monospace';
  headingFontFamily: 'inherit' | 'Georgia' | 'Inter' | 'Arial' | 'monospace';
  baseFontSize: number; contentWidth: 'narrow' | 'standard' | 'wide' | 'full';
  gridColumns: '2' | '3' | '4'; cardStyle: 'rounded' | 'square' | 'bordered' | 'flat' | 'glass';
  buttonStyle: 'pill' | 'rounded' | 'square'; headerStyle: 'sticky' | 'solid' | 'centered' | 'minimal';
  heroStyle: 'split' | 'centered' | 'cover' | 'compact' | 'text-only';
  articleLayout: 'sidebar' | 'centered' | 'wide' | 'magazine';
  borderRadius: 'none' | 'small' | 'medium' | 'large' | 'pill';
  shadowStyle: 'none' | 'soft' | 'strong';
  showHeader: boolean; showHero: boolean; showSearch: boolean; showCategoryFilters: boolean;
  showFeaturedArticle: boolean; showSidebar: boolean; showAuthorCard: boolean; showFooter: boolean;
  showReadingTime: boolean; showArticleCover: boolean; customCss: string;
};
export const defaultBlogSettings: BlogSettings = {
  siteName: 'ZAK NACEUR', authorName: 'Zak Naceur', tagline: 'Developer · Tech Blog',
  logoUrl: '', heroTitle: 'Appunti dal mondo tech.',
  heroDescription: 'Approfondimenti su .NET, architetture software, AI, DevOps e sviluppo di prodotti digitali, con esempi pratici ed esperienze reali.',
  primaryColor: '#2563eb', accentColor: '#8b5cf6', backgroundColor: '#eef1ff',
  textColor: '#172554', mutedTextColor: '#64748b', surfaceColor: '#ffffff',
  headerBackgroundColor: '#050d22', heroBackgroundColor: '#050d22', cardBackgroundColor: '#ffffff',
  footerBackgroundColor: '#050d22', borderColor: '#dbeafe', buttonTextColor: '#ffffff', template: 'premium-tech',
  heroEyebrow: 'BLOG · TECNOLOGIA · SVILUPPO', heroImageUrl: '',
  footerDescription: 'Sviluppo software, architetture, AI e prodotti digitali. Idee, esperienze e soluzioni dal mondo tech.',
  copyrightText: 'Tutti i diritti riservati.',
  navigationJson: '[{"label":"Home","url":"/"},{"label":"Chi sono","url":"/#chi-sono"},{"label":"Progetti","url":"/#progetti"},{"label":"Blog","url":"/blog"},{"label":"Contatti","url":"/#contatti"}]',
  socialLinksJson: '[{"label":"LinkedIn","url":"https://www.linkedin.com/"}]',
  fontFamily: 'Inter', headingFontFamily: 'inherit', baseFontSize: 16, contentWidth: 'wide',
  gridColumns: '3', cardStyle: 'rounded', buttonStyle: 'pill', headerStyle: 'sticky',
  heroStyle: 'split', articleLayout: 'sidebar', borderRadius: 'large', shadowStyle: 'soft',
  showHeader: true, showHero: true, showSearch: true, showCategoryFilters: true,
  showFeaturedArticle: true, showSidebar: true, showAuthorCard: true, showFooter: true,
  showReadingTime: true, showArticleCover: true, customCss: ''
};

async function request<T>(path: string, init: RequestInit = {}, admin = false): Promise<T> {
  const headers = new Headers(init.headers);
  if (admin) {
    const token = getAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers });
  } catch {
    throw new Error(unreachableApiMessage);
  }
  if (response.status === 401 && admin) {
    signOut();
    throw new Error('Sessione scaduta. Accedi di nuovo.');
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { title?: string; errors?: Record<string, string[]> } | null;
    const messages = body?.errors ? Object.values(body.errors).flat().join(' ') : '';
    throw new Error(messages || body?.title || `Errore API: HTTP ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const blogApi = {
  settings: async () => ({ ...defaultBlogSettings, ...await request<BlogSettings>('/api/v1/blog/settings') }),
  saveSettings: (settings: BlogSettings) => request<BlogSettings>('/api/v1/admin/blog/settings', { method: 'PUT', body: JSON.stringify(settings) }, true),
  list: (page = 1, pageSize = 9) => request<BlogPage>(`/api/v1/blog?page=${page}&pageSize=${pageSize}`),
  get: (slug: string) => request<BlogPost>(`/api/v1/blog/${encodeURIComponent(slug)}`),
  adminList: () => request<BlogPost[]>('/api/v1/admin/blog', {}, true),
  create: (post: BlogPostInput) => request<BlogPost>('/api/v1/admin/blog', { method: 'POST', body: JSON.stringify(post) }, true),
  update: (id: string, post: BlogPostInput) => request<BlogPost>(`/api/v1/admin/blog/${id}`, { method: 'PUT', body: JSON.stringify(post) }, true),
  remove: (id: string) => request<void>(`/api/v1/admin/blog/${id}`, { method: 'DELETE' }, true),
  importArticleUrl: (url: string) => request<BlogArticleImport>('/api/v1/admin/blog/import-url', { method: 'POST', body: JSON.stringify({ url }) }, true)
};
