import { domain, istEigeneWebsite } from './website.ts';
import type { Rohlead } from './typen.ts';

function nameSchluessel(l: Rohlead): string {
  const n = l.name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '');
  return `${n}|${l.plz ?? ''}`;
}

/**
 * Führt Treffer aus mehreren Quellen zusammen. Gleiche Website-Domain oder gleicher Name
 * plus PLZ gelten als derselbe Betrieb. OSM-Einträge haben Vorrang, fehlende Angaben
 * werden aus der anderen Quelle ergänzt.
 */
export function zusammenfuehren(leads: Rohlead[]): Rohlead[] {
  const sortiert = [...leads].sort((a, b) => (a.quelle === b.quelle ? 0 : a.quelle === 'osm' ? -1 : 1));
  const nachDomain = new Map<string, Rohlead>();
  const nachName = new Map<string, Rohlead>();
  const ergebnis: Rohlead[] = [];

  for (const l of sortiert) {
    const d = istEigeneWebsite(l.website) ? domain(l.website) : null;
    const vorhanden = (d && nachDomain.get(d)) || nachName.get(nameSchluessel(l));
    if (vorhanden) {
      vorhanden.website ??= l.website;
      vorhanden.telefon ??= l.telefon;
      vorhanden.email ??= l.email;
      vorhanden.strasse ??= l.strasse;
      vorhanden.plz ??= l.plz;
      vorhanden.ort ??= l.ort;
      if (!vorhanden.zuordnung.sicher && l.zuordnung.sicher) vorhanden.zuordnung = l.zuordnung;
      const vd = istEigeneWebsite(vorhanden.website) ? domain(vorhanden.website) : null;
      if (vd) nachDomain.set(vd, vorhanden);
      continue;
    }
    ergebnis.push(l);
    if (d) nachDomain.set(d, l);
    nachName.set(nameSchluessel(l), l);
  }
  return ergebnis;
}

export type Filterergebnis = { behalten: Rohlead[]; ketten: number; ausgeschlossen: number; ohneWebsite: number };

export function filtern(leads: Rohlead[], nurMitWebsite: boolean): Filterergebnis {
  const r: Filterergebnis = { behalten: [], ketten: 0, ausgeschlossen: 0, ohneWebsite: 0 };
  for (const l of leads) {
    if (l.kette) r.ketten++;
    else if (l.zuordnung.ausschluss) r.ausgeschlossen++;
    else if (nurMitWebsite && !istEigeneWebsite(l.website)) r.ohneWebsite++;
    else r.behalten.push(l);
  }
  return r;
}
