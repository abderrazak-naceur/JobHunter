import { getAccessToken, signOut } from '../auth/session';
import { apiBaseUrl, unreachableApiMessage } from './apiConfig';

export type CompanyPriority = 'Alta' | 'Media' | 'Bassa';

export type Company = {
  id: string;
  name: string;
  website: string;
  careersUrl: string;
  location: string;
  sector: string;
  technologies: string;
  priority: CompanyPriority;
  notes: string;
  followed: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CompanyRequest = Omit<Company, 'id' | 'createdAt' | 'updatedAt'>;

type PagedCompanies = { items: Company[]; page: number; pageSize: number; totalCount: number };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAccessToken();
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers
      }
    });
  } catch {
    throw new Error(unreachableApiMessage);
  }

  if (response.status === 401) {
    // Token missing, expired or rejected: go back to the login screen.
    signOut();
    throw new Error('Sessione scaduta. Accedi di nuovo.');
  }

  if (!response.ok) {
    if (response.status === 409) {
      const body = await response.json().catch(() => null) as { message?: string } | null;
      throw new Error(body?.message || 'Questa pagina Careers è già registrata.');
    }
    if (response.status === 400) {
      const body = await response.json().catch(() => null) as { errors?: Record<string, string[]> } | null;
      const messages = body?.errors ? Object.values(body.errors).flat() : [];
      throw new Error(messages.join(' ') || 'Controlla i dati inseriti.');
    }
    if (response.status === 404) throw new Error('Azienda non trovata.');
    throw new Error(`Errore API: HTTP ${response.status}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const companyApi = {
  list(search = '') {
    const params = new URLSearchParams({ page: '1', pageSize: '100' });
    if (search.trim()) params.set('search', search.trim());
    return request<PagedCompanies>(`/api/v1/companies?${params.toString()}`);
  },
  create(company: CompanyRequest) {
    return request<Company>('/api/v1/companies', { method: 'POST', body: JSON.stringify(company) });
  },
  update(id: string, company: CompanyRequest) {
    return request<Company>(`/api/v1/companies/${id}`, { method: 'PUT', body: JSON.stringify(company) });
  },
  remove(id: string) {
    return request<void>(`/api/v1/companies/${id}`, { method: 'DELETE' });
  }
};
