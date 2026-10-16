// Quelle 2: Google Places API (New), Text Search. Braucht GOOGLE_MAPS_API_KEY.
// Findet mehr Websites als OSM, kostet aber pro Anfrage (Budget-Limit in der Google Cloud setzen).
// Google-Bedingungen: Places-Inhalte nicht dauerhaft vorhalten. Die Anreicherung (A1) ersetzt
// Name und Adresse später durch die Angaben aus dem Impressum der Website.

import { istKette, kategorisiereGoogle } from '../kategorien.ts';
import { normalisiereWebsite } from '../website.ts';
import type { Rohlead, Suchgebiet } from '../typen.ts';

const URL_TEXTSUCHE = 'https://places.googleapis.com/v1/places:searchText';
const FELDER = [
  'places.id', 'places.displayName', 'places.addressComponents', 'places.websiteUri',
  'places.nationalPhoneNumber', 'places.types', 'places.primaryType', 'places.businessStatus',
  'places.location', 'nextPageToken',
].join(',');

/** Suchbegriffe quer durch alle Bereiche. „in <Gebiet>“ wird angehängt. */
export const SUCHBEGRIFFE = [
  'Elektriker', 'Sanitär Heizung', 'Schreinerei', 'Malerbetrieb', 'Dachdecker', 'Fliesenleger', 'Metallbau',
  'Bauunternehmen', 'Garten- und Landschaftsbau', 'Bäckerei', 'Metzgerei', 'Raumausstatter', 'Glaserei',
  'Kfz-Werkstatt', 'Autohaus', 'Reifenservice', 'Karosserie Lackierung',
  'Friseur', 'Kosmetikstudio', 'Nagelstudio', 'Massage',
  'Physiotherapie', 'Zahnarzt', 'Arztpraxis', 'Heilpraktiker', 'Pflegedienst', 'Optiker', 'Hörakustik',
  'Steuerberater', 'Rechtsanwalt', 'Versicherungsagentur', 'Immobilienmakler', 'Architekturbüro', 'Hausverwaltung',
  'Restaurant', 'Café', 'Hotel',
  'Fitnessstudio', 'Fahrschule', 'Tanzschule',
];

type Ort = {
  id: string;
  displayName?: { text: string };
  addressComponents?: { longText: string; types: string[] }[];
  websiteUri?: string;
  nationalPhoneNumber?: string;
  types?: string[];
  primaryType?: string;
  businessStatus?: string;
  location?: { latitude: number; longitude: number };
};

function komponente(o: Ort, typ: string): string | null {
  return o.addressComponents?.find((k) => k.types.includes(typ))?.longText ?? null;
}

export function parseGoogle(orte: Ort[]): Rohlead[] {
  return orte
    .filter((o) => o.displayName?.text && o.businessStatus !== 'CLOSED_PERMANENTLY')
    .map((o) => {
      const name = o.displayName!.text.trim();
      const typen = [o.primaryType, ...(o.types ?? [])].filter((t): t is string => Boolean(t));
      return {
        quelle: 'google_places' as const,
        quelleId: o.id,
        name,
        strasse: [komponente(o, 'route'), komponente(o, 'street_number')].filter(Boolean).join(' ') || null,
        plz: komponente(o, 'postal_code'),
        ort: komponente(o, 'locality'),
        website: normalisiereWebsite(o.websiteUri),
        telefon: o.nationalPhoneNumber ?? null,
        email: null,
        lat: o.location?.latitude ?? null,
        lon: o.location?.longitude ?? null,
        kette: istKette(name),
        zuordnung: kategorisiereGoogle(name, typen),
      };
    });
}

async function textsuche(schluessel: string, textQuery: string, pageToken?: string) {
  const antwort = await fetch(URL_TEXTSUCHE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': schluessel, 'X-Goog-FieldMask': FELDER },
    body: JSON.stringify({ textQuery, languageCode: 'de', regionCode: 'DE', pageSize: 20, pageToken }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!antwort.ok) throw new Error(`Google Places antwortet mit ${antwort.status}: ${(await antwort.text()).slice(0, 300)}`);
  return (await antwort.json()) as { places?: Ort[]; nextPageToken?: string };
}

export async function sucheGoogle(
  gebiet: Suchgebiet,
  optionen: { begriffe?: string[]; maxSeiten?: number; fortschritt?: (text: string) => void } = {},
): Promise<{ leads: Rohlead[]; anfragen: number }> {
  const schluessel = process.env.GOOGLE_MAPS_API_KEY;
  if (!schluessel) throw new Error('GOOGLE_MAPS_API_KEY ist nicht gesetzt.');
  const ort = gebiet.stadt ? `${gebiet.name}, ${gebiet.stadt}` : gebiet.name;
  const maxSeiten = optionen.maxSeiten ?? 3;
  const gesehen = new Map<string, Rohlead>();
  let anfragen = 0;

  for (const begriff of optionen.begriffe ?? SUCHBEGRIFFE) {
    let token: string | undefined;
    for (let seite = 0; seite < maxSeiten; seite++) {
      const daten = await textsuche(schluessel, `${begriff} in ${ort}`, token);
      anfragen++;
      for (const lead of parseGoogle(daten.places ?? [])) gesehen.set(lead.quelleId, lead);
      token = daten.nextPageToken;
      if (!token) break;
    }
    optionen.fortschritt?.(`${begriff}: bisher ${gesehen.size} Betriebe`);
  }
  // Text Search liefert auch Treffer außerhalb des Gebiets; die Stadt muss passen.
  const stadt = (gebiet.stadt ?? gebiet.name).toLowerCase();
  const leads = [...gesehen.values()].filter((l) => !l.ort || l.ort.toLowerCase().includes(stadt));
  return { leads, anfragen };
}
