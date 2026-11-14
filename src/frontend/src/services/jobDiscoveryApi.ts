import { apiRequest } from './http';

export type SearchProfile = {
  id: string;
  name: string;
  roleKeywords: string;
  skillKeywords: string;
  location: string;
  minimumAnnualSalary: number | null;
  workMode: 'Any' | 'RemoteOrHybrid' | 'Remote' | 'Hybrid' | 'OnSite';
  minimumMatchScore: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SearchProfileInput = Omit<SearchProfile, 'id' | 'createdAt' | 'updatedAt'>;

export type JobSource = {
  id: string;
  companyName: string;
  provider: 'lever' | 'lever-eu' | 'greenhouse' | 'arbeitnow' | 'adzuna' | 'jooble';
  boardIdentifier: string;
  careersUrl: string;
  isEnabled: boolean;
  lastCheckedAt: string | null;
  lastSuccessfulAt: string | null;
  lastError: string;
  createdAt: string;
  updatedAt: string;
};

export type JobSourceInput = Pick<JobSource, 'companyName' | 'provider' | 'boardIdentifier' | 'careersUrl' | 'isEnabled'>;

export type JobListing = {
  id: string;
  externalId: string;
  title: string;
  companyName: string;
  provider: string;
  location: string;
  workMode: string;
  salaryText: string;
  description: string;
  sourceUrl: string;
  applyUrl: string;
  publishedAt: string | null;
  sourceUpdatedAt: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  matchScore: number;
  matchedKeywords: string[];
};

export type PagedJobListings = { items: JobListing[]; page: number; pageSize: number; totalCount: number };

export type JobSearchRun = {
  id: string;
  startedAt: string;
  completedAt: string | null;
  status: string;
  foundCount: number;
  newCount: number;
  updatedCount: number;
  errorCount: number;
  summary: string;
};

export type PagedJobSearchRuns = { items: JobSearchRun[]; page: number; pageSize: number; totalCount: number };

const base = '/api/v1/job-discovery';

export const jobDiscoveryApi = {
  profiles() {
    return apiRequest<SearchProfile[]>(base + '/profiles');
  },
  createProfile(input: SearchProfileInput) {
    return apiRequest<SearchProfile>(base + '/profiles', { method: 'POST', body: JSON.stringify(input) });
  },
  updateProfile(id: string, input: SearchProfileInput) {
    return apiRequest<SearchProfile>(base + '/profiles/' + id, { method: 'PUT', body: JSON.stringify(input) });
  },
  sources() {
    return apiRequest<JobSource[]>(base + '/sources');
  },
  createSource(input: JobSourceInput) {
    return apiRequest<JobSource>(base + '/sources', { method: 'POST', body: JSON.stringify(input) });
  },
  updateSource(id: string, input: JobSourceInput) {
    return apiRequest<JobSource>(base + '/sources/' + id, { method: 'PUT', body: JSON.stringify(input) });
  },
  deleteSource(id: string) {
    return apiRequest<void>(base + '/sources/' + id, { method: 'DELETE' });
  },
  search() {
    return apiRequest<JobSearchRun>(base + '/search', { method: 'POST' });
  },
  jobs(options: { search?: string; publishedFrom?: string; publishedTo?: string; minimumMatchScore?: number; page?: number; pageSize?: number } = {}) {
    const params = new URLSearchParams({ page: String(options.page ?? 1), pageSize: String(options.pageSize ?? 20) });
    if (options.search?.trim()) params.set('search', options.search.trim());
    if (options.publishedFrom) params.set('publishedFrom', options.publishedFrom);
    if (options.publishedTo) params.set('publishedTo', options.publishedTo);
    if (options.minimumMatchScore !== undefined) params.set('minimumMatchScore', String(options.minimumMatchScore));
    return apiRequest<PagedJobListings>(base + '/jobs?' + params.toString());
  },
  runs() {
    return apiRequest<PagedJobSearchRuns>(base + '/runs?page=1&pageSize=10');
  }
};
