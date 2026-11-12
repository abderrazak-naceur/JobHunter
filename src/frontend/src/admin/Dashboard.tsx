import { useEffect, useState } from 'react';
import { BriefcaseBusiness, Palette, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { APPLICATION_STATUSES, applicationApi, type ApplicationSummary } from '@/services/applicationApi';
import { formatDate, isOverdue, statusMeta } from './applications/statusMeta';

export type AdminTab = 'overview' | 'applications' | 'portfolio' | 'companies' | 'account';

/** Where the job search stands, and what to do next. */
export default function Dashboard({ onNavigate }: { onNavigate: (tab: AdminTab) => void }) {
  const [summary, setSummary] = useState<ApplicationSummary | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    applicationApi.summary()
      .then(result => { if (active) setSummary(result); })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : 'Impossibile caricare i dati.'); });
    return () => { active = false; };
  }, []);

  const inProgress = summary ? summary.byStatus.Applied + summary.byStatus.Screening + summary.byStatus.Interview : 0;
  const cards = summary
    ? [
        { label: 'Candidature', value: summary.total, hint: 'In totale' },
        { label: 'In corso', value: inProgress, hint: 'Candidate, screening o colloquio' },
        { label: 'Colloqui', value: summary.byStatus.Interview, hint: 'Da affrontare o in corso' },
        { label: 'Offerte', value: summary.byStatus.Offer, hint: 'Da valutare' }
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-primary">Area privata</p>
        <h1 className="text-3xl font-extrabold tracking-tight">Panoramica</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">A che punto è la tua ricerca di lavoro e cosa c’è da fare.</p>
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {!summary && !error && <p role="status" className="text-sm text-muted-foreground">Caricamento...</p>}

      {summary && (
        <>
          <ul aria-label="Numeri" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map(card => (
              <li key={card.label}>
                <Card className="h-full">
                  <CardHeader className="pb-2">
                    <CardDescription>{card.label}</CardDescription>
                    <CardTitle className="text-4xl font-black text-primary">{card.value}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground">{card.hint}</CardContent>
                </Card>
              </li>
            ))}
          </ul>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Prossimi passi</CardTitle>
                <CardDescription>Le candidature aperte con una scadenza, dalla più vicina.</CardDescription>
              </CardHeader>
              <CardContent>
                {summary.upcoming.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nessun passo in programma. Aggiungi una data alle tue candidature.</p>
                ) : (
                  <ul className="divide-y">
                    {summary.upcoming.map(step => {
                      const overdue = isOverdue(step.nextStepOn);
                      return (
                        <li key={step.id} className="flex items-center justify-between gap-3 py-2">
                          <div className="min-w-0">
                            <p className="truncate font-medium">{step.nextStep || 'Prossimo passo'}</p>
                            <p className="truncate text-sm text-muted-foreground">{step.company} · {step.role}</p>
                          </div>
                          <span className={`shrink-0 text-sm ${overdue ? 'font-semibold text-destructive' : 'text-muted-foreground'}`}>
                            {formatDate(step.nextStepOn)}{overdue && ' · in ritardo'}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Per stato</CardTitle>
                <CardDescription>Quante candidature ci sono in ogni fase.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {APPLICATION_STATUSES.map(status => (
                    <li key={status} className="flex items-center justify-between">
                      <Badge variant="outline" className={statusMeta[status].className}>{statusMeta[status].label}</Badge>
                      <span className="font-semibold">{summary.byStatus[status]}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Vai a</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={() => onNavigate('applications')}><BriefcaseBusiness /> Candidature</Button>
          <Button variant="outline" onClick={() => onNavigate('portfolio')}><Palette /> Modifica il portfolio</Button>
          <Button variant="outline" onClick={() => onNavigate('companies')}><Target /> Company Radar</Button>
        </CardContent>
      </Card>
    </div>
  );
}
