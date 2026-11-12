import { useState, type FormEvent } from 'react';
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { EntityConfig, FieldDef, FormValues } from './lists';

type Props<T> = {
  config: EntityConfig<T>;
  items: T[];
  /** Saves the new list. It rejects with a readable Error when the API refuses it. */
  onChange: (items: T[]) => Promise<void>;
};

type DialogState = { mode: 'add' } | { mode: 'edit'; index: number } | null;

function emptyValues(fields: FieldDef[]): FormValues {
  return Object.fromEntries(fields.map(field => [field.name, '']));
}

/** List with create, edit, delete and reorder for one repeatable part of the portfolio. */
export default function EntityList<T>({ config, items, onChange }: Props<T>) {
  const [dialog, setDialog] = useState<DialogState>(null);
  const [values, setValues] = useState<FormValues>({});
  const [deleting, setDeleting] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const atLimit = config.max !== undefined && items.length >= config.max;

  function openAdd() {
    setValues(emptyValues(config.fields));
    setError('');
    setDialog({ mode: 'add' });
  }

  function openEdit(index: number) {
    setValues({ ...emptyValues(config.fields), ...config.toForm(items[index]) });
    setError('');
    setDialog({ mode: 'edit', index });
  }

  async function run(action: () => Promise<void>): Promise<boolean> {
    setBusy(true);
    setError('');
    try {
      await action();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operazione non riuscita.');
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dialog) return;
    const item = config.fromForm(values);
    const next = dialog.mode === 'add' ? [...items, item] : items.map((existing, index) => (index === dialog.index ? item : existing));
    if (await run(() => onChange(next))) setDialog(null);
  }

  async function confirmDelete() {
    if (deleting === null) return;
    const index = deleting;
    if (await run(() => onChange(items.filter((_, i) => i !== index)))) setDeleting(null);
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    await run(() => onChange(next));
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1.5">
          <CardTitle>{config.plural}</CardTitle>
          <CardDescription>{config.description}</CardDescription>
        </div>
        <Button onClick={openAdd} disabled={atLimit || busy}>
          <Plus /> Aggiungi {config.singular}
        </Button>
      </CardHeader>

      <CardContent className="space-y-2">
        {error && !dialog && deleting === null && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {atLimit && <p className="text-sm text-muted-foreground">Hai raggiunto il massimo di {config.max}.</p>}

        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Nessun elemento. Con la lista vuota la sezione non compare nel sito.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border bg-card">
            {items.map((item, index) => {
              const title = config.title(item);
              return (
                <li key={index} className="flex items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{title}</p>
                    <p className="truncate text-sm text-muted-foreground">{config.subtitle(item)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button variant="ghost" size="icon" aria-label={`Sposta su ${title}`} disabled={index === 0 || busy} onClick={() => move(index, -1)}><ArrowUp /></Button>
                    <Button variant="ghost" size="icon" aria-label={`Sposta giù ${title}`} disabled={index === items.length - 1 || busy} onClick={() => move(index, 1)}><ArrowDown /></Button>
                    <Button variant="outline" size="icon" aria-label={`Modifica ${title}`} disabled={busy} onClick={() => openEdit(index)}><Pencil /></Button>
                    <Button variant="outline" size="icon" aria-label={`Elimina ${title}`} disabled={busy} onClick={() => { setError(''); setDeleting(index); }}><Trash2 /></Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      <Dialog open={dialog !== null} onOpenChange={open => { if (!open && !busy) setDialog(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{dialog?.mode === 'edit' ? `Modifica ${config.singular}` : `Nuovo ${config.singular}`}</DialogTitle>
            <DialogDescription>Le modifiche vengono pubblicate subito sul sito.</DialogDescription>
          </DialogHeader>

          <form onSubmit={submit} className="space-y-4">
            {config.fields.map(field => {
              const id = `field-${config.singular}-${field.name}`.replace(/\s+/g, '-');
              const common = {
                id,
                value: values[field.name] ?? '',
                required: field.required,
                maxLength: field.maxLength,
                placeholder: field.placeholder,
                onChange: (event: { target: { value: string } }) => setValues(current => ({ ...current, [field.name]: event.target.value }))
              };
              return (
                <div key={field.name} className="space-y-2">
                  <Label htmlFor={id}>{field.label}{field.required && ' *'}</Label>
                  {field.kind === 'textarea' ? <Textarea rows={4} {...common} /> : <Input type={field.kind === 'url' ? 'url' : 'text'} {...common} />}
                  {field.help && <p className="text-xs text-muted-foreground">{field.help}</p>}
                </div>
              );
            })}

            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" disabled={busy} onClick={() => setDialog(null)}>Annulla</Button>
              <Button type="submit" disabled={busy}>{busy ? 'Salvataggio...' : 'Salva'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleting !== null} onOpenChange={open => { if (!open && !busy) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare {deleting !== null ? `“${config.title(items[deleting])}”` : ''}?</AlertDialogTitle>
            <AlertDialogDescription>L’elemento sparisce subito dal sito. L’operazione non si può annullare.</AlertDialogDescription>
          </AlertDialogHeader>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={event => { event.preventDefault(); void confirmDelete(); }}
            >
              {busy ? 'Eliminazione...' : 'Elimina'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
