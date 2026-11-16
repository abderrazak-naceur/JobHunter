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
  list: (page = 1, pageSize = 9) => request<BlogPage>(`/api/v1/blog?page=${page}&pageSize=${pageSize}`),
  get: (slug: string) => request<BlogPost>(`/api/v1/blog/${encodeURIComponent(slug)}`),
  adminList: () => request<BlogPost[]>('/api/v1/admin/blog', {}, true),
  create: (post: BlogPostInput) => request<BlogPost>('/api/v1/admin/blog', { method: 'POST', body: JSON.stringify(post) }, true),
  update: (id: string, post: BlogPostInput) => request<BlogPost>(`/api/v1/admin/blog/${id}`, { method: 'PUT', body: JSON.stringify(post) }, true),
  remove: (id: string) => request<void>(`/api/v1/admin/blog/${id}`, { method: 'DELETE' }, true)
};
