import { Pencil, Trophy } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Application } from '@/services/applicationApi';
import { bestOffer, formatEuro, grossPerPayment, totalGross } from './offers';
import { formatDate, isOverdue } from './statusMeta';

type Props = {
  applications: Application[];
  onEdit: (application: Application) => void;
};

/** The offers received, side by side: one column per offer, one row per term. */
export default function OffersComparison({ applications, onEdit }: Props) {
  if (applications.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nessuna offerta da confrontare</CardTitle>
          <CardDescription>Porta una candidatura allo stato “Offerta” e compila i dettagli dell’offerta per vederla qui.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const best = bestOffer(applications.map(application => application.offer));
  const missingTerms = applications.filter(application => totalGross(application.offer) === null);

  const rows: { label: string; value: (application: Application) => React.ReactNode }[] = [
    { label: 'RAL (lordo annuo)', value: a => formatEuro(a.offer?.grossAnnual) },
    { label: 'Bonus annuo', value: a => formatEuro(a.offer?.bonus) },
    { label: 'Totale lordo annuo', value: a => <strong>{formatEuro(totalGross(a.offer))}</strong> },
    { label: 'Lordo per mensilità (13)', value: a => formatEuro(grossPerPayment(a.offer, 13)) },
    { label: 'Lordo per mensilità (14)', value: a => formatEuro(grossPerPayment(a.offer, 14)) },
    {
      label: 'Smart working',
      value: a => a.offer?.remoteDaysPerWeek === null || a.offer?.remoteDaysPerWeek === undefined
        ? '—'
        : `${a.offer.remoteDaysPerWeek} ${a.offer.remoteDaysPerWeek === 1 ? 'giorno' : 'giorni'} a settimana`
    },
    { label: 'Località', value: a => a.location || '—' },
    { label: 'Benefit', value: a => a.offer?.benefits || '—' },
    {
      label: 'Decidere entro',
      value: a => {
        const date = a.offer?.decisionBy;
        if (!date) return '—';
        const late = isOverdue(date);
        return <span className={late ? 'font-semibold text-destructive' : ''}>{formatDate(date)}{late && ' · scaduta'}</span>;
      }
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Confronto delle offerte</CardTitle>
        <CardDescription>
          Importi lordi. Il netto dipende da aliquote, addizionali regionali e comunali e detrazioni personali, quindi non viene stimato.
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[36rem] text-sm">
          <caption className="sr-only">Confronto delle offerte ricevute</caption>
          <thead>
            <tr>
              <th scope="col" className="w-48 pb-3 text-left text-xs font-medium text-muted-foreground">Voce</th>
              {applications.map((application, index) => (
                <th key={application.id} scope="col" className="pb-3 text-left align-bottom">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      {best === index && (
                        <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                          <Trophy className="size-3" aria-hidden="true" /> Lordo più alto
                        </span>
                      )}
                      <p className="truncate font-semibold">{application.company}</p>
                      <p className="truncate text-xs font-normal text-muted-foreground">{application.role}</p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Modifica l’offerta di ${application.company}`}
                      onClick={() => onEdit(application)}
                      className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline focus-visible:outline-2"
                    >
                      <Pencil className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.label} className="border-t">
                <th scope="row" className="py-2 pr-4 text-left font-medium text-muted-foreground">{row.label}</th>
                {applications.map((application, index) => (
                  <td key={application.id} className={`py-2 pr-4 align-top ${best === index ? 'bg-emerald-50/60' : ''}`}>{row.value(application)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {missingTerms.length > 0 && (
          <p className="mt-4 text-xs text-muted-foreground">
            Manca la RAL per: {missingTerms.map(application => application.company).join(', ')}. Aggiungila con la matita per confrontarle.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
