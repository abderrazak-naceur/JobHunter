import { apiRequest } from './http';

export const APPLICATION_STATUSES = ['Saved', 'Applied', 'Screening', 'Interview', 'Offer', 'Rejected', 'Withdrawn'] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export type Application = {
  id: string;
  company: string;
  role: string;
  status: ApplicationStatus;
  source: string;
  url: string;
  location: string;
  salaryRange: string;
  contactName: string;
  contactEmail: string;
  appliedOn: string | null; // yyyy-MM-dd
  nextStep: string;
  nextStepOn: string | null; // yyyy-MM-dd
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type ApplicationEvent = { id: string; at: string; fromStatus: string | null; toStatus: string };
export type ApplicationDetail = Application & { events: ApplicationEvent[] };
export type ApplicationInput = Omit<Application, 'id' | 'createdAt' | 'updatedAt'>;

export type PagedApplications = { items: Application[]; page: number; pageSize: number; totalCount: number };

export type UpcomingStep = { id: string; company: string; role: string; nextStep: string; nextStepOn: string };
export type ApplicationSummary = { total: number; byStatus: Record<ApplicationStatus, number>; upcoming: UpcomingStep[] };

export type ApplicationQuery = { search?: string; status?: ApplicationStatus | ''; page?: number; pageSize?: number };

const base = '/api/v1/applications';

/** The editable fields of an application, e.g. to change one of them and send it back. */
export function toInput(application: Application): ApplicationInput {
  return {
    company: application.company,
    role: application.role,
    status: application.status,
    source: application.source,
    url: application.url,
    location: application.location,
    salaryRange: application.salaryRange,
    contactName: application.contactName,
    contactEmail: application.contactEmail,
    appliedOn: application.appliedOn,
    nextStep: application.nextStep,
    nextStepOn: application.nextStepOn,
    notes: application.notes
  };
}

export const applicationApi = {
  list({ search = '', status = '', page = 1, pageSize = 10 }: ApplicationQuery = {}) {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (search.trim()) params.set('search', search.trim());
    if (status) params.set('status', status);
    return apiRequest<PagedApplications>(`${base}?${params.toString()}`);
  },
  get(id: string) {
    return apiRequest<ApplicationDetail>(`${base}/${id}`);
  },
  create(input: ApplicationInput) {
    return apiRequest<ApplicationDetail>(base, { method: 'POST', body: JSON.stringify(input) });
  },
  update(id: string, input: ApplicationInput) {
    return apiRequest<ApplicationDetail>(`${base}/${id}`, { method: 'PUT', body: JSON.stringify(input) });
  },
  remove(id: string) {
    return apiRequest<void>(`${base}/${id}`, { method: 'DELETE' });
  },
  summary() {
    return apiRequest<ApplicationSummary>(`${base}/summary`);
  }
};
