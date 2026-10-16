// Pipeline-Status, erlaubte manuelle Übergänge und menschliche Freigaben (Businessplan Kap. 07).

export const STATUS = [
  'neu', 'angereichert', 'bewertet', 'interessant', 'vorbereitet', 'termin', 'prozess_check',
  'angebot', 'gewonnen', 'in_umsetzung', 'qa', 'live', 'betreuung', 'verloren', 'ausgeschlossen',
] as const;

export type Status = (typeof STATUS)[number];

export const STATUS_LABEL: Record<Status, string> = {
  neu: 'Neu',
  angereichert: 'Angereichert',
  bewertet: 'Bewertet',
  interessant: 'Interessant',
  vorbereitet: 'Vorbereitet',
  termin: 'Termin',
  prozess_check: 'Prozess-Check',
  angebot: 'Angebot',
  gewonnen: 'Gewonnen',
  in_umsetzung: 'In Umsetzung',
  qa: 'Qualitätscheck',
  live: 'Live',
  betreuung: 'Betreuung',
  verloren: 'Verloren',
  ausgeschlossen: 'Ausgeschlossen',
};

/** Spalten des Pipeline-Boards (ohne die Endzustände). */
export const BOARD_SPALTEN: Status[] = [
  'bewertet', 'interessant', 'vorbereitet', 'termin', 'prozess_check',
  'angebot', 'gewonnen', 'in_umsetzung', 'qa', 'live', 'betreuung',
];

export type FreigabeArt = 'lead_interessant' | 'angebot' | 'livegang';

/** Übergänge, die eine dokumentierte Freigabe erfordern. */
export const FREIGABE_FUER: Partial<Record<Status, FreigabeArt>> = {
  interessant: 'lead_interessant',
  angebot: 'angebot',
  live: 'livegang',
};

const UEBERGAENGE: Record<Status, Status[]> = {
  neu: ['interessant', 'ausgeschlossen'],
  angereichert: ['interessant', 'ausgeschlossen'],
  bewertet: ['interessant', 'ausgeschlossen'],
  interessant: ['termin', 'verloren'],
  vorbereitet: ['termin', 'verloren'],
  termin: ['prozess_check', 'verloren'],
  prozess_check: ['angebot', 'verloren'],
  angebot: ['gewonnen', 'verloren'],
  gewonnen: ['in_umsetzung'],
  in_umsetzung: ['qa'],
  qa: ['live', 'in_umsetzung'],
  live: ['betreuung'],
  betreuung: ['verloren'],
  verloren: ['bewertet'],
  ausgeschlossen: ['bewertet'],
};

export function erlaubteUebergaenge(von: Status): Status[] {
  return UEBERGAENGE[von] ?? [];
}

export function istErlaubt(von: Status, nach: Status): boolean {
  return erlaubteUebergaenge(von).includes(nach);
}

export function istStatus(wert: unknown): wert is Status {
  return typeof wert === 'string' && (STATUS as readonly string[]).includes(wert);
}

/** Wer darf welche Freigabe erteilen. Livegang gibt laut Plan Max (Technik) frei. */
export function darfFreigeben(rolle: string, art: FreigabeArt): boolean {
  if (rolle === 'admin') return true;
  if (art === 'livegang') return rolle === 'technik';
  return rolle === 'vertrieb' || rolle === 'technik';
}

/** § 7 UWG: E-Mail nur bei eigener Anfrage oder dokumentierter Einwilligung. */
export function emailVersandErlaubt(b: { hat_selbst_angefragt: boolean; widerspruch: boolean }, kontaktEinwilligung = false): boolean {
  if (b.widerspruch) return false;
  return b.hat_selbst_angefragt || kontaktEinwilligung;
}
