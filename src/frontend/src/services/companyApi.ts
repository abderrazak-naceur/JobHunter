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

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/$/, '');

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers }
    });
  } catch {
    throw new Error(`API non raggiungibile (${apiBaseUrl}). Avvia il backend .NET e verifica VITE_API_BASE_URL.`);
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
