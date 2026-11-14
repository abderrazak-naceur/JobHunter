import { useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { exportApi } from '@/services/exportApi';

/** Download a copy of the data. The password hash and the signing key are never part of it. */
export default function DataExport() {
  const [busy, setBusy] = useState<'backup' | 'csv' | null>(null);

  async function run(kind: 'backup' | 'csv') {
    setBusy(kind);
    try {
      const name = await (kind === 'backup' ? exportApi.backup() : exportApi.applicationsCsv());
      toast.success(`Scaricato ${name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Download non riuscito.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Copia dei dati</CardTitle>
        <CardDescription>
          Scarica portfolio, candidature (con lo storico degli stati) e aziende. Non contiene password né chiavi.
          La foto profilo non è inclusa: conserva il file originale.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <Button onClick={() => void run('backup')} disabled={busy !== null}>
          <Download /> {busy === 'backup' ? 'Preparazione...' : 'Scarica il backup (JSON)'}
        </Button>
        <Button variant="outline" onClick={() => void run('csv')} disabled={busy !== null}>
          <FileSpreadsheet /> {busy === 'csv' ? 'Preparazione...' : 'Candidature in CSV'}
        </Button>
      </CardContent>
    </Card>
  );
}
