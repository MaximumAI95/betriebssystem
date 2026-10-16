import type { Zuordnung } from './kategorien.ts';

/** Ein gefundener Betrieb, wie ihn eine Quelle liefert. */
export type Rohlead = {
  quelle: 'osm' | 'google_places';
  /** 'node/123' bei OSM, place_id bei Google */
  quelleId: string;
  name: string;
  strasse: string | null;
  plz: string | null;
  ort: string | null;
  website: string | null;
  telefon: string | null;
  email: string | null;
  lat: number | null;
  lon: number | null;
  kette: boolean;
  zuordnung: Zuordnung;
};

export type Suchgebiet = {
  /** z. B. 'Gablenberg' oder 'Karlsruhe' */
  name: string;
  /** übergeordnete Stadt, grenzt gleichnamige Gebiete ein, z. B. 'Stuttgart' */
  stadt?: string;
  /** CRM-Region */
  region: 'karlsruhe' | 'stuttgart' | 'sonstige';
};
