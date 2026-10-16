// Quelle 1: OpenStreetMap über die Overpass-API. Kostenlos, kein Schlüssel nötig.
// Daten unter ODbL: Speichern erlaubt, Quellenangabe „© OpenStreetMap-Mitwirkende“.

import { istKette, kategorisiereOsm } from '../kategorien.ts';
import { normalisiereWebsite } from '../website.ts';
import type { Rohlead, Suchgebiet } from '../typen.ts';

const OVERPASS_URL = process.env.OVERPASS_URL ?? 'https://overpass-api.de/api/interpreter';

type OsmElement = {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

/** Escape für Werte in Overpass-QL-Strings. */
function ql(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function overpassAbfrage(gebiet: Suchgebiet): string {
  const flaeche = gebiet.stadt
    ? `area["name"="${ql(gebiet.stadt)}"]["boundary"="administrative"]->.stadt;
rel(area.stadt)["boundary"="administrative"]["name"="${ql(gebiet.name)}"];
map_to_area->.a;`
    : `area["name"="${ql(gebiet.name)}"]["boundary"="administrative"]->.a;`;

  return `[out:json][timeout:180];
${flaeche}
(
  nwr(area.a)["name"]["craft"];
  nwr(area.a)["name"]["shop"];
  nwr(area.a)["name"]["office"];
  nwr(area.a)["name"]["healthcare"];
  nwr(area.a)["name"]["amenity"];
  nwr(area.a)["name"]["tourism"~"^(hotel|guest_house|hostel|apartment)$"];
  nwr(area.a)["name"]["leisure"~"^(fitness_centre|sports_centre|dance)$"];
);
out center tags;`;
}

export function parseOverpass(json: { elements?: OsmElement[] }): Rohlead[] {
  const ergebnis: Rohlead[] = [];
  for (const el of json.elements ?? []) {
    const t = el.tags ?? {};
    const name = t['name']?.trim();
    if (!name) continue;
    const strasse = [t['addr:street'], t['addr:housenumber']].filter(Boolean).join(' ') || null;
    ergebnis.push({
      quelle: 'osm',
      quelleId: `${el.type}/${el.id}`,
      name,
      strasse,
      plz: t['addr:postcode'] ?? null,
      ort: t['addr:city'] ?? t['addr:suburb'] ?? null,
      website: normalisiereWebsite(t['website'] ?? t['contact:website'] ?? t['url']),
      telefon: t['phone'] ?? t['contact:phone'] ?? null,
      email: t['email'] ?? t['contact:email'] ?? null,
      lat: el.lat ?? el.center?.lat ?? null,
      lon: el.lon ?? el.center?.lon ?? null,
      kette: istKette(name, t),
      zuordnung: kategorisiereOsm(name, t),
    });
  }
  return ergebnis;
}

export async function sucheOsm(gebiet: Suchgebiet): Promise<Rohlead[]> {
  const antwort = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Betriebssystem-LeadFinder/0.1 (Kontakt über Impressum)',
    },
    body: new URLSearchParams({ data: overpassAbfrage(gebiet) }),
    signal: AbortSignal.timeout(200_000),
  });
  if (!antwort.ok) throw new Error(`Overpass-API antwortet mit ${antwort.status}: ${(await antwort.text()).slice(0, 300)}`);
  const leads = parseOverpass((await antwort.json()) as { elements?: OsmElement[] });
  if (leads.length === 0) {
    throw new Error(`Für „${gebiet.name}“ wurde nichts gefunden. Stimmt der Gebietsname so wie in OpenStreetMap?`);
  }
  return leads;
}
