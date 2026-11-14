import { apiRequest } from './http';

export const CONTACT_KINDS = ['Recruiter', 'Referral', 'Colleague', 'Other'] as const;
export type ContactKind = (typeof CONTACT_KINDS)[number];

export type Contact = {
  id: string;
  name: string;
  kind: ContactKind;
  company: string;
  role: string;
  email: string;
  phone: string;
  profileUrl: string;
  notes: string;
  lastContactOn: string | null; // yyyy-MM-dd
  nextFollowUpOn: string | null; // yyyy-MM-dd
  createdAt: string;
  updatedAt: string;
};

export type ContactInput = Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>;
export type PagedContacts = { items: Contact[]; page: number; pageSize: number; totalCount: number };
export type ContactSummary = { total: number; followUpsDue: number; nextFollowUps: Contact[] };
export type ContactQuery = { search?: string; kind?: ContactKind | ''; page?: number; pageSize?: number };

const base = '/api/v1/contacts';

export function toInput(contact: Contact): ContactInput {
  return {
    name: contact.name,
    kind: contact.kind,
    company: contact.company,
    role: contact.role,
    email: contact.email,
    phone: contact.phone,
    profileUrl: contact.profileUrl,
    notes: contact.notes,
    lastContactOn: contact.lastContactOn,
    nextFollowUpOn: contact.nextFollowUpOn
  };
}

export const contactApi = {
  list({ search = '', kind = '', page = 1, pageSize = 10 }: ContactQuery = {}) {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (search.trim()) params.set('search', search.trim());
    if (kind) params.set('kind', kind);
    return apiRequest<PagedContacts>(`${base}?${params.toString()}`);
  },
  create(input: ContactInput) {
    return apiRequest<Contact>(base, { method: 'POST', body: JSON.stringify(input) });
  },
  update(id: string, input: ContactInput) {
    return apiRequest<Contact>(`${base}/${id}`, { method: 'PUT', body: JSON.stringify(input) });
  },
  remove(id: string) {
    return apiRequest<void>(`${base}/${id}`, { method: 'DELETE' });
  },
  summary() {
    return apiRequest<ContactSummary>(`${base}/summary`);
  }
};

export const kindLabel: Record<ContactKind, string> = {
  Recruiter: 'Recruiter',
  Referral: 'Segnalatore',
  Colleague: 'Collega',
  Other: 'Altro'
};
