import { useState, type DragEvent } from 'react';
import { ExternalLink, Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { APPLICATION_STATUSES, type Application, type ApplicationStatus } from '@/services/applicationApi';
import { formatDate, isOverdue, statusMeta } from './statusMeta';

type Props = {
  applications: Application[];
  onMove: (application: Application, status: ApplicationStatus) => void;
  onEdit: (application: Application) => void;
};

const DRAG_TYPE = 'text/plain';

/**
 * One column per stage. A card moves by dragging it onto another column, or - for keyboard and
 * touch users - with the "Sposta" menu on the card, which does exactly the same thing.
 */
export default function KanbanBoard({ applications, onMove, onEdit }: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStatus, setOverStatus] = useState<ApplicationStatus | null>(null);

  function drop(event: DragEvent<HTMLElement>, status: ApplicationStatus) {
    event.preventDefault();
    const id = event.dataTransfer.getData(DRAG_TYPE) || dragId;
    setDragId(null);
    setOverStatus(null);
    const application = applications.find(item => item.id === id);
    if (application && application.status !== status) onMove(application, status);
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2" role="group" aria-label="Bacheca delle candidature">
      {APPLICATION_STATUSES.map(status => {
        const items = applications.filter(item => item.status === status);
        const highlighted = overStatus === status && dragId !== null;
        return (
          <section
            key={status}
            aria-label={`Colonna ${statusMeta[status].label}`}
            onDragOver={event => { event.preventDefault(); setOverStatus(status); }}
            onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOverStatus(null); }}
            onDrop={event => drop(event, status)}
            className={`flex w-72 shrink-0 flex-col rounded-xl border bg-muted/40 p-3 transition ${highlighted ? 'border-primary bg-primary/5' : 'border-border'}`}
          >
            <header className="mb-3 flex items-center justify-between">
              <Badge variant="outline" className={statusMeta[status].className}>{statusMeta[status].label}</Badge>
              <span className="text-sm font-semibold text-muted-foreground" aria-label={`${items.length} candidature`}>{items.length}</span>
            </header>

            <ul className="flex min-h-16 flex-1 flex-col gap-3">
              {items.map(application => {
                const overdue = isOverdue(application.nextStepOn);
                return (
                  <li
                    key={application.id}
                    draggable
                    onDragStart={event => {
                      event.dataTransfer.setData(DRAG_TYPE, application.id);
                      event.dataTransfer.effectAllowed = 'move';
                      setDragId(application.id);
                    }}
                    onDragEnd={() => { setDragId(null); setOverStatus(null); }}
                    className={`cursor-grab rounded-lg border bg-card p-3 shadow-sm active:cursor-grabbing ${dragId === application.id ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{application.company}</p>
                        <p className="truncate text-sm text-muted-foreground">{application.role}</p>
                      </div>
                      <button
                        type="button"
                        aria-label={`Modifica ${application.company}`}
                        onClick={() => onEdit(application)}
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline focus-visible:outline-2"
                      >
                        <Pencil className="size-4" aria-hidden="true" />
                      </button>
                    </div>

                    {application.location && <p className="mt-1 truncate text-xs text-muted-foreground">{application.location}</p>}
                    {(application.nextStep || application.nextStepOn) && (
                      <p className={`mt-2 text-xs ${overdue ? 'font-semibold text-destructive' : 'text-muted-foreground'}`}>
                        {application.nextStep || 'Prossimo passo'} · {formatDate(application.nextStepOn)}{overdue && ' · in ritardo'}
                      </p>
                    )}
                    {application.url && (
                      <a href={application.url} target="_blank" rel="noreferrer noopener" className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                        Annuncio <ExternalLink className="size-3" aria-hidden="true" />
                      </a>
                    )}

                    <label className="mt-3 block text-xs text-muted-foreground">
                      <span className="sr-only">Sposta {application.company} in</span>
                      <select
                        aria-label={`Sposta ${application.company}`}
                        value={application.status}
                        onChange={event => onMove(application, event.target.value as ApplicationStatus)}
                        className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                      >
                        {APPLICATION_STATUSES.map(item => <option key={item} value={item}>{statusMeta[item].label}</option>)}
                      </select>
                    </label>
                  </li>
                );
              })}
              {items.length === 0 && <li className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">Nessuna candidatura</li>}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
