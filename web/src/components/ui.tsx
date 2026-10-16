import Link from 'next/link';
import { STATUS_LABEL, type Status } from '@/lib/status';

const STATUS_FARBE: Partial<Record<Status, string>> = {
  interessant: 'bg-orange-100 text-orange-800',
  vorbereitet: 'bg-amber-100 text-amber-800',
  termin: 'bg-sky-100 text-sky-800',
  prozess_check: 'bg-sky-100 text-sky-800',
  angebot: 'bg-violet-100 text-violet-800',
  gewonnen: 'bg-emerald-100 text-emerald-800',
  in_umsetzung: 'bg-emerald-100 text-emerald-800',
  qa: 'bg-yellow-100 text-yellow-800',
  live: 'bg-green-100 text-green-800',
  betreuung: 'bg-green-100 text-green-800',
  verloren: 'bg-stone-200 text-stone-600',
  ausgeschlossen: 'bg-stone-200 text-stone-600',
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_FARBE[status] ?? 'bg-stone-100 text-stone-700'}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function ScoreBadge({ score }: { score: number | null }) {
  if (score == null) return <span className="text-xs text-stone-400">–</span>;
  const farbe = score >= 70 ? 'bg-emerald-600' : score >= 55 ? 'bg-amber-500' : 'bg-stone-400';
  return (
    <span className={`inline-flex h-7 w-9 items-center justify-center rounded-md text-sm font-semibold text-white tabular-nums ${farbe}`}>
      {score}
    </span>
  );
}

export function Seitenkopf({ titel, text, aktion }: { titel: string; text?: string; aktion?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold">{titel}</h1>
        {text && <p className="mt-1 text-sm text-stone-500">{text}</p>}
      </div>
      {aktion}
    </div>
  );
}

export function BetriebLink({ id, name }: { id: string; name: string }) {
  return <Link href={`/betriebe/${id}`} className="font-medium hover:text-marke hover:underline">{name}</Link>;
}

export function Leer({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500">{children}</p>;
}

const DATUM = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Berlin' });
export function datum(d: Date | null | undefined) {
  return d ? DATUM.format(d) : '–';
}

export const BRANCHE_LABEL: Record<string, string> = { kfz: 'Kfz', handwerk: 'Handwerk', physio: 'Physio', sonstige: 'Sonstige' };
export const REGION_LABEL: Record<string, string> = { karlsruhe: 'Karlsruhe', stuttgart: 'Stuttgart', sonstige: 'Sonstige' };

export function host(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url.includes('://') ? url : `https://${url}`).hostname;
  } catch {
    return url;
  }
}
