import { aktuellerBenutzer } from '@/lib/auth';
import { neueLeads } from '@/lib/daten';

const BEREICH: Record<string, string> = {
  handwerk: 'Handwerk & Bau', kfz: 'Kfz', gesundheit: 'Gesundheit & Pflege', beauty: 'Beauty & Wellness',
  dienstleistung: 'Büro & Dienstleistung', gastronomie: 'Gastronomie & Hotel', freizeit_bildung: 'Sport, Freizeit & Bildung',
  einzelhandel: 'Einzelhandel', sonstige: 'Sonstige',
};

function feld(v: string | number | null | undefined): string {
  const s = v == null ? '' : String(v);
  const sicher = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[";\n]/.test(sicher) ? `"${sicher.replace(/"/g, '""')}"` : sicher;
}

export async function GET(request: Request) {
  if (!(await aktuellerBenutzer())) return new Response('Nicht angemeldet', { status: 401 });
  const p = new URL(request.url).searchParams;
  const leads = await neueLeads({
    region: p.get('region') || undefined, bereich: p.get('bereich') || undefined,
    gebiet: p.get('gebiet') || undefined, passung: p.get('passung') || undefined,
  }, 10_000);

  const kopf = ['Name', 'Bereich', 'Kategorie', 'Passung', 'Score', 'Status', 'Website', 'Telefon', 'E-Mail', 'Straße', 'PLZ', 'Ort', 'Gebiet', 'Quelle'];
  const zeilen = leads.map((b) => [
    b.name, BEREICH[b.bereich] ?? b.bereich, b.kategorie, b.passung, b.score, b.status, b.website,
    b.telefon?.replace(/^\+49\s*(\(0\))?\s*/, '0'), b.email_allgemein, b.strasse, b.plz, b.ort, b.gebiet, b.quelle,
  ].map(feld).join(';'));

  const datum = new Date().toISOString().slice(0, 10);
  return new Response('﻿' + [kopf.join(';'), ...zeilen].join('\n') + '\n', {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="leads-${p.get('bereich') ?? 'alle'}-${datum}.csv"`,
    },
  });
}
