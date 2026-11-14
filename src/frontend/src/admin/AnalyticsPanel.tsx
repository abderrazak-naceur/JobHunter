import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { applicationApi, type ApplicationAnalytics, type ApplicationStatus } from '@/services/applicationApi';
import { formatDate, statusMeta } from './applications/statusMeta';

const stageLabel = (stage: string) => (stage in statusMeta ? statusMeta[stage as ApplicationStatus].label : stage);

export const percent = (part: number, whole: number) => (whole === 0 ? null : Math.round((100 * part) / whole));

/** How the search is going: pace, answers, where applications get stuck and which sources work. */
export default function AnalyticsPanel() {
  const [data, setData] = useState<ApplicationAnalytics | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    applicationApi.analytics()
      .then(result => { if (active) setData(result); })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : 'Impossibile caricare le statistiche.'); });
    return () => { active = false; };
  }, []);

  if (error) return <p role="alert" className="text-sm text-destructive">{error}</p>;
  if (!data) return <p role="status" className="text-sm text-muted-foreground">Caricamento statistiche...</p>;

  if (data.applied === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Statistiche</CardTitle>
          <CardDescription>Compaiono appena segni la prima candidatura come “Candidata”.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const maxWeek = Math.max(1, ...data.weekly.map(week => week.count));
  const maxFunnel = Math.max(1, ...data.funnel.map(stage => stage.count));

  return (
    <section aria-labelledby="analytics-title" className="space-y-6">
      <h2 id="analytics-title" className="text-xl font-extrabold tracking-tight">Statistiche</h2>

      <ul aria-label="Indicatori" className="grid gap-4 sm:grid-cols-3">
        <li>
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardDescription>Candidature inviate</CardDescription>
              <CardTitle className="text-4xl font-black text-primary">{data.applied}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">Su {data.total} salvate o inviate</CardContent>
          </Card>
        </li>
        <li>
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardDescription>Tasso di risposta</CardDescription>
              <CardTitle className="text-4xl font-black text-primary">{data.responseRatePercent ?? 0}%</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">{data.responded} su {data.applied} hanno risposto (screening, colloquio o rifiuto)</CardContent>
          </Card>
        </li>
        <li>
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardDescription>Ultime 12 settimane</CardDescription>
              <CardTitle className="text-4xl font-black text-primary">{data.weekly.reduce((sum, week) => sum + week.count, 0)}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">Candidature inviate nel periodo</CardContent>
          </Card>
        </li>
      </ul>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Candidature a settimana</CardTitle>
            <CardDescription>Le settimane partono dal lunedì; l’ultima è quella in corso.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol aria-label="Candidature a settimana" className="flex h-40 items-end gap-1.5">
              {data.weekly.map(week => (
                <li key={week.weekStart} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`Settimana dal ${formatDate(week.weekStart)}`}>
                  <span className="text-xs font-semibold">{week.count}</span>
                  <span
                    aria-hidden="true"
                    className="w-full rounded-t bg-primary/80"
                    style={{ height: `${week.count === 0 ? 2 : Math.max(8, (week.count / maxWeek) * 100)}%` }}
                  />
                  <span className="sr-only">Settimana dal {formatDate(week.weekStart)}: {week.count}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dal invio all’offerta</CardTitle>
            <CardDescription>Quante candidature sono arrivate a ogni fase, e quante sono passate alla successiva.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol aria-label="Imbuto" className="space-y-3">
              {data.funnel.map((stage, index) => {
                const conversion = index > 0 ? data.conversions[index - 1] : null;
                const rate = conversion ? percent(conversion.toCount, conversion.fromCount) : null;
                return (
                  <li key={stage.stage}>
                    <div className="flex items-center justify-between text-sm">
                      <Badge variant="outline" className={statusMeta[stage.stage as ApplicationStatus]?.className}>{stageLabel(stage.stage)}</Badge>
                      <span>
                        <span className="font-semibold">{stage.count}</span>
                        {rate !== null && <span className="ml-2 text-xs text-muted-foreground">{rate}% dalla fase precedente</span>}
                      </span>
                    </div>
                    <div aria-hidden="true" className="mt-1 h-2 rounded bg-muted">
                      <div className="h-2 rounded bg-primary" style={{ width: `${(stage.count / maxFunnel) * 100}%` }} />
                    </div>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tempo in ogni fase</CardTitle>
            <CardDescription>Giorni medi prima di passare oltre; le fasi ancora aperte contano fino a oggi.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.timeInStage.map(item => (
                <li key={item.stage} className="flex items-center justify-between">
                  <Badge variant="outline" className={statusMeta[item.stage as ApplicationStatus]?.className}>{stageLabel(item.stage)}</Badge>
                  <span className="text-sm">
                    {item.averageDays === null ? <span className="text-muted-foreground">—</span> : <><span className="font-semibold">{item.averageDays}</span> giorni</>}
                    {item.samples > 0 && <span className="ml-2 text-xs text-muted-foreground">({item.samples})</span>}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quali fonti funzionano</CardTitle>
            <CardDescription>Solo le candidature inviate: quante hanno portato a un colloquio o a un’offerta.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.bySource.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessun dato.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    <th scope="col" className="pb-2 font-medium">Fonte</th>
                    <th scope="col" className="pb-2 text-right font-medium">Inviate</th>
                    <th scope="col" className="pb-2 text-right font-medium">Colloqui</th>
                    <th scope="col" className="pb-2 text-right font-medium">Offerte</th>
                  </tr>
                </thead>
                <tbody>
                  {data.bySource.map(source => (
                    <tr key={source.source} className="border-t">
                      <th scope="row" className="py-2 text-left font-medium">{source.source}</th>
                      <td className="py-2 text-right">{source.applications}</td>
                      <td className="py-2 text-right">{source.interviews}</td>
                      <td className="py-2 text-right">{source.offers}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
