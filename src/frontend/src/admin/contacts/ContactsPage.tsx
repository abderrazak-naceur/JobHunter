import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Mail, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CONTACT_KINDS, contactApi, kindLabel, type Contact, type ContactKind, type ContactSummary, type PagedContacts } from '@/services/contactApi';
import { formatDate, isOverdue } from '../applications/statusMeta';
import ContactDialog from './ContactDialog';

const PAGE_SIZE = 10;

/** People met during the search (recruiters, referrals, colleagues) and when to get back to them. */
export default function ContactsPage() {
  const [searchText, setSearchText] = useState('');
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState<ContactKind | ''>('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PagedContacts | null>(null);
  const [summary, setSummary] = useState<ContactSummary | null>(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Contact | null | undefined>(undefined); // undefined: closed, null: new
  const [deleting, setDeleting] = useState<Contact | null>(null);
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);

  // Wait for a pause in typing before searching.
  useEffect(() => {
    if (searchText === search) return;
    const timer = setTimeout(() => { setSearch(searchText); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [searchText, search]);

  useEffect(() => {
    let active = true;
    setError('');
    Promise.all([contactApi.list({ search, kind, page, pageSize: PAGE_SIZE }), contactApi.summary()])
      .then(([list, counts]) => { if (active) { setData(list); setSummary(counts); } })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : 'Impossibile caricare i contatti.'); });
    return () => { active = false; };
  }, [search, kind, page, refresh]);

  const reload = useCallback(() => setRefresh(value => value + 1), []);

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await contactApi.remove(deleting.id);
      toast.success(`${deleting.name} eliminato`);
      setDeleting(null);
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
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Rete</p>
          <h1 className="text-3xl font-extrabold tracking-tight">Contatti</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">Recruiter, segnalatori e colleghi: chi hai sentito e quando riscrivergli.</p>
        </div>
        <Button onClick={() => setEditing(null)}><Plus /> Nuovo contatto</Button>
      </div>

      {summary && summary.followUpsDue > 0 && (
        <p role="status" className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {summary.followUpsDue === 1 ? 'C’è 1 contatto da ricontattare' : `Ci sono ${summary.followUpsDue} contatti da ricontattare`} oggi o in ritardo.
        </p>
      )}

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtra per tipo">
        <Button size="sm" variant={kind === '' ? 'default' : 'outline'} aria-pressed={kind === ''} onClick={() => { setKind(''); setPage(1); }}>
          Tutti{summary ? ` (${summary.total})` : ''}
        </Button>
        {CONTACT_KINDS.map(item => (
          <Button key={item} size="sm" variant={kind === item ? 'default' : 'outline'} aria-pressed={kind === item} onClick={() => { setKind(item); setPage(1); }}>
            {kindLabel[item]}
          </Button>
        ))}
      </div>

      <div className="relative max-w-md">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input aria-label="Cerca contatti" className="pl-9" placeholder="Cerca nome, azienda o ruolo..." value={searchText} onChange={e => setSearchText(e.target.value)} />
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardContent className="p-0">
          {!data ? (
            !error && <p role="status" className="p-6 text-sm text-muted-foreground">Caricamento contatti...</p>
          ) : data.items.length === 0 ? (
            <div className="p-10 text-center">
              <p className="font-semibold">{search || kind ? 'Nessun contatto trovato' : 'Non hai ancora nessun contatto'}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {search || kind ? 'Prova a cambiare la ricerca o il filtro.' : 'Aggiungi il primo recruiter o la prima persona che ti ha aiutato.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Persona</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Ultimo contatto</TableHead>
                  <TableHead>Da ricontattare</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map(contact => {
                  const overdue = isOverdue(contact.nextFollowUpOn);
                  return (
                    <TableRow key={contact.id}>
                      <TableCell className="max-w-[16rem]">
                        <p className="truncate font-semibold">{contact.name}</p>
                        <p className="truncate text-sm text-muted-foreground">
                          {[contact.role, contact.company].filter(Boolean).join(' · ') || '—'}
                        </p>
                        <div className="flex gap-3 text-xs">
                          {contact.email && (
                            <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                              <Mail className="size-3" aria-hidden="true" /> {contact.email}
                            </a>
                          )}
                          {contact.profileUrl && (
                            <a href={contact.profileUrl} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-primary hover:underline">
                              Profilo <ExternalLink className="size-3" aria-hidden="true" />
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline">{kindLabel[contact.kind]}</Badge></TableCell>
                      <TableCell>{formatDate(contact.lastContactOn)}</TableCell>
                      <TableCell>
                        {contact.nextFollowUpOn ? (
                          <span className={`text-sm ${overdue ? 'font-semibold text-destructive' : ''}`}>
                            {formatDate(contact.nextFollowUpOn)}{overdue && ' · in ritardo'}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="outline" size="icon" aria-label={`Modifica ${contact.name}`} onClick={() => setEditing(contact)}><Pencil /></Button>
                          <Button variant="outline" size="icon" aria-label={`Elimina ${contact.name}`} onClick={() => setDeleting(contact)}><Trash2 /></Button>
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

      {data && data.totalCount > PAGE_SIZE && (
        <nav aria-label="Pagine" className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Pagina {page} di {totalPages} · {data.totalCount} contatti</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Precedente</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Successiva</Button>
          </div>
        </nav>
      )}

      <ContactDialog
        open={editing !== undefined}
        contact={editing ?? null}
        onOpenChange={open => { if (!open) setEditing(undefined); }}
        onSaved={(saved, created) => {
          toast.success(created ? `${saved.name} aggiunto` : 'Contatto aggiornato');
          setEditing(undefined);
          reload();
        }}
      />

      <AlertDialog open={deleting !== null} onOpenChange={open => { if (!open && !busy) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>Il contatto e le sue note verranno eliminati. L’operazione non si può annullare.</AlertDialogDescription>
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
