import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, KanbanSquare, List, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  APPLICATION_STATUSES, applicationApi, toInput,
  type Application, type ApplicationStatus, type ApplicationSummary, type PagedApplications
} from '@/services/applicationApi';
import ApplicationDialog from './ApplicationDialog';
import KanbanBoard from './KanbanBoard';
import { formatDate, isOverdue, statusMeta } from './statusMeta';

const PAGE_SIZE = 10;
/** The board shows every stage at once, so it loads the most the API returns in one page. */
const BOARD_PAGE_SIZE = 100;

/** Every job saved or applied for: search, filter by stage, change the stage, edit and delete. */
export default function ApplicationsPage() {
  const [searchText, setSearchText] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ApplicationStatus | ''>('');
  const [view, setView] = useState<'list' | 'board'>('list');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PagedApplications | null>(null);
  const [summary, setSummary] = useState<ApplicationSummary | null>(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Application | null | undefined>(undefined); // undefined: closed, null: new
  const [deleting, setDeleting] = useState<Application | null>(null);
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);

  // Wait for a pause in typing before searching.
  useEffect(() => {
    if (searchText === search) return; // nothing new to search for, so do not reset the page
    const timer = setTimeout(() => { setSearch(searchText); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [searchText, search]);

  useEffect(() => {
    let active = true;
    setError('');
    const query = view === 'board'
      ? { search, status: '' as const, page: 1, pageSize: BOARD_PAGE_SIZE }
      : { search, status, page, pageSize: PAGE_SIZE };
    Promise.all([applicationApi.list(query), applicationApi.summary()])
      .then(([list, counts]) => { if (active) { setData(list); setSummary(counts); } })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : 'Impossibile caricare le candidature.'); });
    return () => { active = false; };
  }, [search, status, page, view, refresh]);

  const reload = useCallback(() => setRefresh(value => value + 1), []);

  async function changeStatus(application: Application, next: string) {
    if (next === application.status) return;
    try {
      await applicationApi.update(application.id, { ...toInput(application), status: next as ApplicationStatus });
      toast.success(`${application.company}: ${statusMeta[next as ApplicationStatus].label}`);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Aggiornamento non riuscito.');
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await applicationApi.remove(deleting.id);
      toast.success(`${deleting.company} eliminata`);
      setDeleting(null);
      // Step back one page if the last item of the page was removed.
      if (data && data.items.length === 1 && page > 1) setPage(page - 1);
      else reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Eliminazione non riuscita.');
    } finally {
      setBusy(false);
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Ricerca del lavoro</p>
          <h1 className="text-3xl font-extrabold tracking-tight">Candidature</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">Salva le offerte, segui lo stato di ogni candidatura e non perdere nessun prossimo passo.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Vista" className="flex rounded-md border">
            <Button size="sm" variant={view === 'list' ? 'default' : 'ghost'} aria-pressed={view === 'list'} onClick={() => { setData(null); setPage(1); setView('list'); }}><List /> Elenco</Button>
            <Button size="sm" variant={view === 'board' ? 'default' : 'ghost'} aria-pressed={view === 'board'} onClick={() => { setData(null); setView('board'); }}><KanbanSquare /> Bacheca</Button>
          </div>
          <Button onClick={() => setEditing(null)}><Plus /> Nuova candidatura</Button>
        </div>
      </div>

      {view === 'list' && (
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtra per stato">
        <Button size="sm" variant={status === '' ? 'default' : 'outline'} aria-pressed={status === ''} onClick={() => { setStatus(''); setPage(1); }}>
          Tutte{summary ? ` (${summary.total})` : ''}
        </Button>
        {APPLICATION_STATUSES.map(item => (
          <Button key={item} size="sm" variant={status === item ? 'default' : 'outline'} aria-pressed={status === item} onClick={() => { setStatus(item); setPage(1); }}>
            {statusMeta[item].label}{summary ? ` (${summary.byStatus[item]})` : ''}
          </Button>
        ))}
      </div>
      )}

      <div className="relative max-w-md">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input aria-label="Cerca candidature" className="pl-9" placeholder="Cerca azienda, ruolo, località o fonte..." value={searchText} onChange={e => setSearchText(e.target.value)} />
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      {view === 'board' && data && (
        <KanbanBoard applications={data.items} onMove={(application, next) => void changeStatus(application, next)} onEdit={setEditing} />
      )}
      {view === 'board' && data && data.totalCount > data.items.length && (
        <p className="text-sm text-muted-foreground">Mostrate le prime {data.items.length} di {data.totalCount} candidature: usa la ricerca per restringere.</p>
      )}
      {view === 'board' && !data && !error && <p role="status" className="text-sm text-muted-foreground">Caricamento candidature...</p>}

      {view === 'list' && (
      <Card>
        <CardContent className="p-0">
          {!data ? (
            !error && <p role="status" className="p-6 text-sm text-muted-foreground">Caricamento candidature...</p>
          ) : data.items.length === 0 ? (
            <div className="p-10 text-center">
              <p className="font-semibold">{search || status ? 'Nessuna candidatura trovata' : 'Non hai ancora nessuna candidatura'}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {search || status ? 'Prova a cambiare la ricerca o il filtro.' : 'Aggiungi la prima offerta che ti interessa.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Azienda e ruolo</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Candidata il</TableHead>
                  <TableHead>Prossimo passo</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map(application => {
                  const overdue = isOverdue(application.nextStepOn);
                  return (
                    <TableRow key={application.id}>
                      <TableCell className="max-w-[16rem]">
                        <p className="truncate font-semibold">{application.company}</p>
                        <p className="truncate text-sm text-muted-foreground">{application.role}{application.location && ` · ${application.location}`}</p>
                        {application.url && (
                          <a href={application.url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                            Annuncio <ExternalLink className="size-3" aria-hidden="true" />
                          </a>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select value={application.status} onValueChange={next => changeStatus(application, next)}>
                          <SelectTrigger aria-label={`Stato di ${application.company}`} className="w-40">
                            <SelectValue>
                              <Badge variant="outline" className={statusMeta[application.status].className}>{statusMeta[application.status].label}</Badge>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {APPLICATION_STATUSES.map(item => <SelectItem key={item} value={item}>{statusMeta[item].label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>{formatDate(application.appliedOn)}</TableCell>
                      <TableCell className="max-w-[14rem]">
                        {application.nextStep || application.nextStepOn ? (
                          <>
                            <p className="truncate text-sm">{application.nextStep || 'Prossimo passo'}</p>
                            <p className={`text-xs ${overdue ? 'font-semibold text-destructive' : 'text-muted-foreground'}`}>
                              {formatDate(application.nextStepOn)}{overdue && ' · in ritardo'}
                            </p>
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="outline" size="icon" aria-label={`Modifica ${application.company}`} onClick={() => setEditing(application)}><Pencil /></Button>
                          <Button variant="outline" size="icon" aria-label={`Elimina ${application.company}`} onClick={() => setDeleting(application)}><Trash2 /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      )}

      {view === 'list' && data && data.totalCount > PAGE_SIZE && (
        <nav aria-label="Pagine" className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Pagina {page} di {totalPages} · {data.totalCount} candidature</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Precedente</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Successiva</Button>
          </div>
        </nav>
      )}

      <ApplicationDialog
        open={editing !== undefined}
        application={editing ?? null}
        onOpenChange={open => { if (!open) setEditing(undefined); }}
        onSaved={saved => {
          toast.success(editing ? 'Candidatura aggiornata' : `${saved.company} aggiunta`);
          setEditing(undefined);
          reload();
        }}
      />

      <AlertDialog open={deleting !== null} onOpenChange={open => { if (!open && !busy) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare la candidatura di {deleting?.company}?</AlertDialogTitle>
            <AlertDialogDescription>Verranno eliminati anche lo storico degli stati e le note. L’operazione non si può annullare.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Annulla</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={event => { event.preventDefault(); void confirmDelete(); }}>
              {busy ? 'Eliminazione...' : 'Elimina'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
