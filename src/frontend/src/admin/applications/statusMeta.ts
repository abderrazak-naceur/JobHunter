import type { ApplicationStatus } from '@/services/applicationApi';

/** Label and colours of each stage of an application. */
export const statusMeta: Record<ApplicationStatus, { label: string; className: string }> = {
  Saved: { label: 'Salvata', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  Applied: { label: 'Candidata', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  Screening: { label: 'Screening', className: 'bg-violet-100 text-violet-800 border-violet-200' },
  Interview: { label: 'Colloquio', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  Offer: { label: 'Offerta', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  Rejected: { label: 'Rifiutata', className: 'bg-red-100 text-red-800 border-red-200' },
  Withdrawn: { label: 'Ritirata', className: 'bg-zinc-100 text-zinc-600 border-zinc-200' }
};

export function statusLabel(status: string): string {
  return status in statusMeta ? statusMeta[status as ApplicationStatus].label : status;
}

/** Today as yyyy-MM-dd in the visitor's time zone (what <input type="date"> expects). */
export function todayIso(now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** "2026-11-03" → "03/11/2026". Empty or missing dates become an em dash. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [year, month, day] = iso.slice(0, 10).split('-');
  return year && month && day ? `${day}/${month}/${year}` : iso;
}

/** True when the date is before today. */
export function isOverdue(iso: string | null | undefined, today = todayIso()): boolean {
  return Boolean(iso) && iso!.slice(0, 10) < today;
}
