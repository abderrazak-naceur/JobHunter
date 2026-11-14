import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { BriefcaseBusiness, CalendarDays, CheckCircle2, Clock3, ExternalLink, Plus, RefreshCw, Search, Settings2, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { applicationApi } from '@/services/applicationApi';
import { jobDiscoveryApi, type JobListing, type JobSource, type JobSourceInput, type JobSearchRun, type SearchProfile, type SearchProfileInput } from '@/services/jobDiscoveryApi';

const defaultProfile: SearchProfileInput = {
  name: 'Ricerca principale',
  roleKeywords: 'Senior .NET Developer, Full Stack Developer, Technical Lead',
  skillKeywords: 'C#, .NET, ASP.NET Core, React, Angular, SQL, PostgreSQL, Azure, Docker',
  location: 'Milano',
  minimumAnnualSalary: 50000,
  workMode: 'RemoteOrHybrid',
  minimumMatchScore: 25,
  isActive: true
};

const emptySource: JobSourceInput = {
  companyName: '',
  provider: 'lever',
  boardIdentifier: '',
  careersUrl: '',
  isEnabled: true
};

function dateLabel(value: string | null): string {
  return value ? new Date(value).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Data non indicata dalla fonte';
}

function dateTimeLabel(value: string | null): string {
  return value ? new Date(value).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' }) : 'Mai';
}

function providerLabel(provider: string): string {
  switch (provider.toLowerCase()) {
    case 'arbeitnow': return 'Arbeitnow';
    case 'adzuna': return 'Jobs by Adzuna';
    case 'jooble': return 'Jooble Italia';
    case 'lever-eu': return 'Lever EU';
    case 'lever': return 'Lever';
    case 'greenhouse': return 'Greenhouse';
    default: return provider;
  }
}

function isAutomaticSource(source: JobSource): boolean {
  return ['arbeitnow', 'adzuna', 'jooble'].includes(source.provider.toLowerCase());
}

export default function JobDiscovery() {
  const [profile, setProfile] = useState<SearchProfile | null>(null);
  const [profileDraft, setProfileDraft] = useState<SearchProfileInput>(defaultProfile);
  const [sources, setSources] = useState<JobSource[]>([]);
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [totalJobs, setTotalJobs] = useState(0);
  const [lastRun, setLastRun] = useState<JobSearchRun | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [publishedFrom, setPublishedFrom] = useState('');
  const [publishedTo, setPublishedTo] = useState('');
  const [sourceDraft, setSourceDraft] = useState<JobSourceInput>(emptySource);
  const [showSourceForm, setShowSourceForm] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function refreshJobs(term = searchTerm, from = publishedFrom, to = publishedTo, threshold = profileDraft.minimumMatchScore) {
    const result = await jobDiscoveryApi.jobs({
      search: term,
      publishedFrom: from || undefined,
      publishedTo: to || undefined,
      minimumMatchScore: threshold,
      page: 1,
      pageSize: 50
    });
    setJobs(result.items);
    setTotalJobs(result.totalCount);
  }

  useEffect(() => {
    let active = true;
    async function initialize() {
      setLoading(true);
      setError('');
      try {
        const results = await Promise.all([jobDiscoveryApi.profiles(), jobDiscoveryApi.sources(), jobDiscoveryApi.runs()]);
        const selected = results[0].find(item => item.isActive) ?? results[0][0] ?? await jobDiscoveryApi.createProfile(defaultProfile);
        if (!active) return;
        setProfile(selected);
        setProfileDraft({
          name: selected.name, roleKeywords: selected.roleKeywords, skillKeywords: selected.skillKeywords,
          location: selected.location, minimumAnnualSalary: selected.minimumAnnualSalary,
          workMode: selected.workMode, minimumMatchScore: selected.minimumMatchScore, isActive: true
        });
        setSources(results[1]);
        setLastRun(results[2].items[0] ?? null);
        const jobResults = await jobDiscoveryApi.jobs({ minimumMatchScore: selected.minimumMatchScore, page: 1, pageSize: 50 });
        if (active) {
          setJobs(jobResults.items);
          setTotalJobs(jobResults.totalCount);
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Impossibile caricare Job Discovery.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void initialize();
    return () => { active = false; };
  }, []);

  const publishedToday = useMemo(() => {
    const today = new Date().toLocaleDateString('it-IT');
    return jobs.filter(item => item.publishedAt && new Date(item.publishedAt).toLocaleDateString('it-IT') === today).length;
  }, [jobs]);

  async function runSearch() {
    setSearching(true);
    setError('');
    setNotice('');
    try {
      const result = await jobDiscoveryApi.search();
      setLastRun(result);
      await refreshJobs();
      setSources(await jobDiscoveryApi.sources());
      setNotice(result.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ricerca non riuscita.');
    } finally {
      setSearching(false);
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    setSaving(true);
    setError('');
    try {
      const saved = await jobDiscoveryApi.updateProfile(profile.id, profileDraft);
      setProfile(saved);
      setShowProfileForm(false);
      await refreshJobs(searchTerm, publishedFrom, publishedTo, saved.minimumMatchScore);
      setNotice('Profilo di ricerca aggiornato.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Salvataggio profilo non riuscito.');
    } finally {
      setSaving(false);
    }
  }

  async function addSource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const created = await jobDiscoveryApi.createSource(sourceDraft);
      setSources(current => [...current, created].sort((a, b) => a.companyName.localeCompare(b.companyName)));
      setSourceDraft(emptySource);
      setShowSourceForm(false);
      setNotice('Fonte ' + created.companyName + ' aggiunta. Puoi avviare una ricerca.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Aggiunta fonte non riuscita.');
    } finally {
      setSaving(false);
    }
  }

  async function removeSource(source: JobSource) {
    if (!window.confirm('Rimuovere la fonte ' + source.companyName + '? Anche gli annunci raccolti da questa fonte verranno eliminati.')) return;
    try {
      await jobDiscoveryApi.deleteSource(source.id);
      setSources(current => current.filter(item => item.id !== source.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rimozione fonte non riuscita.');
    }
  }

  async function saveJob(job: JobListing) {
    try {
      await applicationApi.create({
        company: job.companyName,
        role: job.title,
        status: 'Saved',
        source: job.provider,
        url: job.sourceUrl,
        location: job.location,
        salaryRange: job.salaryText,
        contactName: '',
        contactEmail: '',
        appliedOn: null,
        nextStep: '',
        nextStepOn: null,
        notes: 'Salvata da Job Discovery.',
        offer: null
      });
      setSavedIds(current => [...current, job.id]);
      setNotice('Offerta aggiunta alle Candidature.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossibile salvare la candidatura.');
    }
  }

  async function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    try {
      await refreshJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Filtri non applicati.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Ricerca multi-fonte</p>
          <h1 className="text-3xl font-extrabold tracking-tight">Job Discovery</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">Cerca automaticamente offerte da aggregatori e board aziendali pubbliche, confrontale con il tuo profilo e candidati sul portale originale.</p>
        </div>
        <Button onClick={() => void runSearch()} disabled={searching}>
          {searching ? <RefreshCw className="animate-spin" /> : <Search />} {searching ? 'Ricerca in corso...' : 'Cerca ora'}
        </Button>
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardDescription>Offerte raccolte</CardDescription><CardTitle className="text-3xl">{totalJobs}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">Risultati nell'archivio</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Pubblicate oggi</CardDescription><CardTitle className="text-3xl">{publishedToday}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">In base alla data dichiarata dalla fonte</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Fonti attive</CardDescription><CardTitle className="text-3xl">{sources.filter(x => x.isEnabled).length}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">Fonti automatiche e board aziendali</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Ultima ricerca</CardDescription><CardTitle className="text-base">{lastRun ? dateTimeLabel(lastRun.completedAt) : 'Mai'}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">{lastRun?.summary ?? 'Non è ancora stata eseguita una ricerca'}</CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div><CardTitle>Profilo di ricerca</CardTitle><CardDescription>Le offerte vengono valutate in base ai ruoli, alle competenze e alle preferenze salvate.</CardDescription></div>
          <Button variant="outline" size="sm" onClick={() => setShowProfileForm(value => !value)}><Settings2 /> {showProfileForm ? 'Chiudi' : 'Modifica profilo'}</Button>
        </CardHeader>
        <CardContent>
          {showProfileForm ? (
            <form className="grid gap-4 md:grid-cols-2" onSubmit={saveProfile}>
              <div className="space-y-2"><Label htmlFor="jd-profile-name">Nome profilo</Label><Input id="jd-profile-name" value={profileDraft.name} onChange={e => setProfileDraft({ ...profileDraft, name: e.target.value })} required maxLength={120} /></div>
              <div className="space-y-2"><Label htmlFor="jd-location">Località</Label><Input id="jd-location" value={profileDraft.location} onChange={e => setProfileDraft({ ...profileDraft, location: e.target.value })} placeholder="Milano" /></div>
              <div className="space-y-2 md:col-span-2"><Label htmlFor="jd-roles">Ruoli (separati da virgola)</Label><Textarea id="jd-roles" value={profileDraft.roleKeywords} onChange={e => setProfileDraft({ ...profileDraft, roleKeywords: e.target.value })} rows={2} required /></div>
              <div className="space-y-2 md:col-span-2"><Label htmlFor="jd-skills">Competenze (separate da virgola)</Label><Textarea id="jd-skills" value={profileDraft.skillKeywords} onChange={e => setProfileDraft({ ...profileDraft, skillKeywords: e.target.value })} rows={2} /></div>
              <div className="space-y-2"><Label htmlFor="jd-salary">RAL minima (€)</Label><Input id="jd-salary" type="number" min="0" step="1000" value={profileDraft.minimumAnnualSalary ?? ''} onChange={e => setProfileDraft({ ...profileDraft, minimumAnnualSalary: e.target.value ? Number(e.target.value) : null })} /></div>
              <div className="space-y-2"><Label htmlFor="jd-mode">Modalità di lavoro</Label><select id="jd-mode" className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={profileDraft.workMode} onChange={e => setProfileDraft({ ...profileDraft, workMode: e.target.value as SearchProfileInput['workMode'] })}><option value="Any">Tutte</option><option value="RemoteOrHybrid">Ibrido o full remote</option><option value="Remote">Full remote</option><option value="Hybrid">Ibrido</option><option value="OnSite">In sede</option></select></div>
              <div className="space-y-2"><Label htmlFor="jd-threshold">Compatibilità minima (%)</Label><Input id="jd-threshold" type="number" min="0" max="100" value={profileDraft.minimumMatchScore} onChange={e => setProfileDraft({ ...profileDraft, minimumMatchScore: Number(e.target.value) })} /></div>
              <p className="text-xs text-muted-foreground md:col-span-2">La RAL e la modalità di lavoro vengono filtrate solo quando il sito pubblica queste informazioni. I dati non dichiarati restano visibili.</p>
              <div className="md:col-span-2 flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowProfileForm(false)}>Annulla</Button><Button type="submit" disabled={saving}>{saving ? 'Salvataggio...' : 'Salva profilo'}</Button></div>
            </form>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{profile?.name ?? 'Profilo'}</Badge>
              <Badge variant="outline">{profile?.location ?? 'Località non impostata'}</Badge>
              <Badge variant="outline">RAL da {profile?.minimumAnnualSalary?.toLocaleString('it-IT') ?? 'non impostata'} €</Badge>
              <Badge variant="outline">{profile?.workMode === 'RemoteOrHybrid' ? 'Ibrido o full remote' : profile?.workMode === 'Any' ? 'Tutte le modalità' : profile?.workMode}</Badge>
              <p className="basis-full text-sm text-muted-foreground">{profile?.roleKeywords}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div><CardTitle>Fonti di ricerca</CardTitle><CardDescription>Collega le board pubbliche delle aziende. Ogni fonte viene interrogata separatamente.</CardDescription></div>
          <Button size="sm" variant="outline" onClick={() => setShowSourceForm(value => !value)}><Plus /> Aggiungi fonte</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {showSourceForm && (
            <form onSubmit={addSource} className="grid gap-3 rounded-lg border p-4 md:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="jd-company">Azienda</Label><Input id="jd-company" value={sourceDraft.companyName} onChange={e => setSourceDraft({ ...sourceDraft, companyName: e.target.value })} required maxLength={180} /></div>
              <div className="space-y-2"><Label htmlFor="jd-provider">Provider</Label><select id="jd-provider" className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={sourceDraft.provider} onChange={e => setSourceDraft({ ...sourceDraft, provider: e.target.value as JobSourceInput['provider'] })}><option value="lever">Lever (globale)</option><option value="lever-eu">Lever EU</option><option value="greenhouse">Greenhouse</option></select></div>
              <div className="space-y-2"><Label htmlFor="jd-board">Identificativo board</Label><Input id="jd-board" value={sourceDraft.boardIdentifier} onChange={e => setSourceDraft({ ...sourceDraft, boardIdentifier: e.target.value })} placeholder="es. nome-azienda" required /></div>
              <div className="space-y-2"><Label htmlFor="jd-careers">Link Careers (facoltativo)</Label><Input id="jd-careers" type="url" value={sourceDraft.careersUrl} onChange={e => setSourceDraft({ ...sourceDraft, careersUrl: e.target.value })} placeholder="https://..." /></div>
              <div className="md:col-span-2 rounded-md bg-muted p-3 text-xs text-muted-foreground">Lever: usa lo slug presente in jobs.lever.co/SLUG; seleziona Lever EU per le board regionali europee. Greenhouse: usa il token della board careers. Sono supportati solo endpoint pubblici ufficiali; non inserire l'URL dell'API.</div>
              <div className="md:col-span-2 flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowSourceForm(false)}>Annulla</Button><Button type="submit" disabled={saving}>{saving ? 'Salvataggio...' : 'Aggiungi fonte'}</Button></div>
            </form>
          )}
          {sources.length === 0 ? <p className="text-sm text-muted-foreground">Le fonti automatiche vengono interrogate con Cerca ora. Puoi aggiungere una board Lever o Greenhouse solo per aziende specifiche.</p> : (
            <div className="divide-y">
              {sources.map(source => (
                <div key={source.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0"><p className="font-medium">{source.companyName} <Badge variant="outline" className="ml-2">{isAutomaticSource(source) ? 'Automatica · ' : ''}{providerLabel(source.provider)}</Badge></p><p className="text-xs text-muted-foreground">{isAutomaticSource(source) ? 'Ricerca automatica' : 'Board: ' + source.boardIdentifier} · Ultimo controllo: {dateTimeLabel(source.lastCheckedAt)}</p>{source.lastError && <p className="text-xs text-destructive">{source.lastError}</p>}</div>
                  <div className="flex items-center gap-2"><Badge variant={source.isEnabled ? 'secondary' : 'outline'}>{source.isEnabled ? 'Attiva' : 'Disattivata'}</Badge>{!isAutomaticSource(source) && <Button variant="ghost" size="icon" aria-label={'Rimuovi ' + source.companyName} onClick={() => void removeSource(source)}><Trash2 /></Button>}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Offerte trovate</CardTitle><CardDescription>Ordinate per data di pubblicazione; quando il provider non restituisce una data, viene indicato esplicitamente.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={applyFilters} className="grid gap-3 md:grid-cols-[1fr_170px_170px_auto]">
            <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" aria-label="Cerca offerte" placeholder="Ruolo, azienda, località..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
            <div><Label className="sr-only" htmlFor="jd-from">Pubblicate dal</Label><Input id="jd-from" type="date" aria-label="Pubblicate dal" value={publishedFrom} onChange={e => setPublishedFrom(e.target.value)} /></div>
            <div><Label className="sr-only" htmlFor="jd-to">Pubblicate fino al</Label><Input id="jd-to" type="date" aria-label="Pubblicate fino al" value={publishedTo} onChange={e => setPublishedTo(e.target.value)} /></div>
            <Button type="submit" variant="outline">Applica filtri</Button>
          </form>
          {loading ? <p role="status" className="text-sm text-muted-foreground">Caricamento offerte...</p> :
            jobs.length === 0 ? <div className="rounded-lg border border-dashed p-8 text-center"><BriefcaseBusiness className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-3 font-medium">Nessuna offerta nell'archivio</p><p className="mt-1 text-sm text-muted-foreground">Configura almeno una fonte e premi Cerca ora.</p></div> :
            <div className="space-y-3">{jobs.map(job => <JobCard key={job.id} job={job} isSaved={savedIds.includes(job.id)} onSave={() => void saveJob(job)} />)}</div>
          }
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Ultima esecuzione</CardTitle><CardDescription>Storico sintetico delle ricerche effettuate.</CardDescription></CardHeader>
        <CardContent>
          {lastRun ? <div className="flex flex-wrap items-center gap-3 text-sm"><Badge variant={lastRun.status === 'Completed' ? 'secondary' : 'outline'}>{lastRun.status}</Badge><span>{dateTimeLabel(lastRun.startedAt)}</span><span>{lastRun.newCount} nuove</span><span>{lastRun.updatedCount} aggiornate</span><span>{lastRun.errorCount} errori</span></div> : <p className="text-sm text-muted-foreground">Nessuna ricerca eseguita.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

function JobCard({ job, isSaved, onSave }: { job: JobListing; isSaved: boolean; onSave: () => void }) {
  return (
    <article className="rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{job.title}</h3><Badge variant={job.matchScore >= 70 ? 'secondary' : 'outline'}>{job.matchScore}% compatibilità</Badge></div>
          <p className="mt-1 text-sm text-muted-foreground">{job.companyName}{job.location ? ' · ' + job.location : ''}{job.workMode ? ' · ' + job.workMode : ''}</p>
        </div>
        {job.salaryText && <Badge variant="outline">{job.salaryText}</Badge>}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> Pubblicata: {dateLabel(job.publishedAt)}</span>
        {job.sourceUpdatedAt && <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> Aggiornata: {dateLabel(job.sourceUpdatedAt)}</span>}
        <span>Rilevata da JobHunter: {dateLabel(job.firstSeenAt)}</span>
        <span>Fonte: {providerLabel(job.provider)}</span>
      </div>
      {job.matchedKeywords.length > 0 && <div className="mt-3 flex flex-wrap gap-1">{job.matchedKeywords.slice(0, 6).map(keyword => <Badge key={keyword} variant="outline" className="font-normal">{keyword}</Badge>)}</div>}
      {job.description && <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{job.description}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild size="sm"><a href={job.applyUrl || job.sourceUrl} target="_blank" rel="noopener noreferrer"><ExternalLink /> Candidati sul sito</a></Button>
        <Button size="sm" variant="outline" disabled={isSaved} onClick={onSave}>{isSaved ? <><CheckCircle2 /> Salvata</> : <><Plus /> Salva in Candidature</>}</Button>
      </div>
    </article>
  );
}
