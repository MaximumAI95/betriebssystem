import { BEREICHE } from './kategorien.ts';
import type { Rohlead } from './typen.ts';

function feld(v: string | number | null | undefined): string {
  const s = v == null ? '' : String(v);
  // Schutz gegen Formel-Injektion in Excel
  const sicher = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[";\n]/.test(sicher) ? `"${sicher.replace(/"/g, '""')}"` : sicher;
}

/** +49 711 123 → 0711 123, damit Excel die Nummer nicht als Formel liest. */
function telefonNational(t: string | null): string | null {
  return t ? t.trim().replace(/^\+49\s*(\(0\))?\s*/, '0') : null;
}

/** CSV mit Semikolon (öffnet sich in deutschem Excel direkt richtig). */
export function alsCsv(leads: Rohlead[]): string {
  const kopf = ['Name', 'Bereich', 'Kategorie', 'Passung', 'Website', 'Telefon', 'E-Mail', 'Straße', 'PLZ', 'Ort', 'Quelle'];
  const zeilen = leads.map((l) =>
    [l.name, BEREICHE[l.zuordnung.bereich].label, l.zuordnung.kategorie, l.zuordnung.passung, l.website, telefonNational(l.telefon), l.email,
      l.strasse, l.plz, l.ort, l.quelle === 'osm' ? 'OpenStreetMap' : 'Google'].map(feld).join(';'));
  return '﻿' + [kopf.join(';'), ...zeilen].join('\n') + '\n';
}
