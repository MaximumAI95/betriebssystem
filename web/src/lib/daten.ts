import 'server-only';
import { sql } from './db';
import type { Status } from './status';

export type Betrieb = {
  id: string;
  name: string;
  branche: string;
  gewerk: string | null;
  strasse: string | null;
  plz: string | null;
  ort: string | null;
  region: string | null;
  website: string | null;
  telefon: string | null;
  email_allgemein: string | null;
  mitarbeiter_min: number | null;
  mitarbeiter_max: number | null;
  status: Status;
  score: number | null;
  score_gruende: { kriterium: string; punkte: number; begruendung: string }[] | null;
  hat_selbst_angefragt: boolean;
  widerspruch: boolean;
  quelle: string;
  demo_loeschen_am: Date | null;
  verantwortlich_name: string | null;
  erstellt_am: Date;
  geaendert_am: Date;
};

const BETRIEB_FELDER = sql`
  b.id, b.name, b.branche, b.gewerk, b.strasse, b.plz, b.ort, b.region, b.website, b.telefon,
  b.email_allgemein, b.mitarbeiter_min, b.mitarbeiter_max, b.status, b.score, b.score_gruende,
  b.hat_selbst_angefragt, b.widerspruch, b.quelle, b.demo_loeschen_am, b.erstellt_am, b.geaendert_am,
  u.name as verantwortlich_name`;

export async function neueLeads(filter: { region?: string; branche?: string }) {
  return sql<Betrieb[]>`
    select ${BETRIEB_FELDER} from betriebe b left join benutzer u on u.id = b.verantwortlich
    where b.status in ('neu', 'angereichert', 'bewertet')
      and (${filter.region ?? null}::text is null or b.region = ${filter.region ?? null})
      and (${filter.branche ?? null}::text is null or b.branche::text = ${filter.branche ?? null})
    order by b.score desc nulls last, b.erstellt_am desc
    limit 500`;
}

export async function pipeline() {
  return sql<Betrieb[]>`
    select ${BETRIEB_FELDER} from betriebe b left join benutzer u on u.id = b.verantwortlich
    where b.status not in ('neu', 'angereichert', 'verloren', 'ausgeschlossen')
    order by b.geaendert_am desc`;
}

export async function betrieb(id: string) {
  const [b] = await sql<Betrieb[]>`
    select ${BETRIEB_FELDER} from betriebe b left join benutzer u on u.id = b.verantwortlich
    where b.id = ${id}`;
  return b ?? null;
}

export async function kontakte(betriebId: string) {
  return sql<{ id: string; vorname: string | null; nachname: string | null; funktion: string | null; email: string | null; telefon: string | null; einwilligung_email: boolean; einwilligung_aufnahme: boolean }[]>`
    select id, vorname, nachname, funktion, email, telefon, einwilligung_email, einwilligung_aufnahme
    from kontakte where betrieb_id = ${betriebId} order by erstellt_am`;
}

export async function zeitleiste(betriebId: string) {
  return sql<{ id: string; typ: string; text: string | null; am: Date; benutzer_name: string | null }[]>`
    select a.id, a.typ, a.text, a.am, u.name as benutzer_name
    from aktivitaeten a left join benutzer u on u.id = a.benutzer_id
    where a.betrieb_id = ${betriebId} order by a.am desc limit 200`;
}

export async function dokumente(betriebId: string) {
  return sql<{ id: string; typ: string; titel: string; url: string | null; version: number; freigegeben_am: Date | null; erstellt_am: Date }[]>`
    select id, typ, titel, url, version, freigegeben_am, erstellt_am
    from dokumente where betrieb_id = ${betriebId} order by erstellt_am desc`;
}

export async function analysen(betriebId: string) {
  return sql<{ id: string; url: string; art: string; lighthouse_performance: number | null; lighthouse_a11y: number | null; lighthouse_seo: number | null; mobil_ok: boolean | null; impressum_ok: boolean | null; datenschutz_ok: boolean | null; barrierefreiheit_fehler: number | null; erstellt_am: Date }[]>`
    select id, url, art, lighthouse_performance, lighthouse_a11y, lighthouse_seo, mobil_ok,
           impressum_ok, datenschutz_ok, barrierefreiheit_fehler, erstellt_am
    from website_analysen where betrieb_id = ${betriebId} order by erstellt_am desc`;
}

export type Lauf = { id: string; betrieb_id: string | null; betrieb_name: string | null; agent: string; status: string; fehler: string | null; kosten_eur: string | null; angelegt_am: Date; beendet_am: Date | null };

export async function agentLaeufe(betriebId?: string) {
  return sql<Lauf[]>`
    select l.id, l.betrieb_id, b.name as betrieb_name, l.agent, l.status, l.fehler, l.kosten_eur, l.angelegt_am, l.beendet_am
    from agent_laeufe l left join betriebe b on b.id = l.betrieb_id
    where (${betriebId ?? null}::uuid is null or l.betrieb_id = ${betriebId ?? null})
    order by l.angelegt_am desc limit 200`;
}

/** Was auf eine menschliche Entscheidung wartet. */
export async function offeneFreigaben() {
  const leads = await sql<Betrieb[]>`
    select ${BETRIEB_FELDER} from betriebe b left join benutzer u on u.id = b.verantwortlich
    where b.status = 'bewertet' and coalesce(b.score, 0) >= 55
    order by b.score desc limit 50`;
  const angebote = await sql<Betrieb[]>`
    select ${BETRIEB_FELDER} from betriebe b left join benutzer u on u.id = b.verantwortlich
    where b.status = 'prozess_check' order by b.geaendert_am`;
  const livegaenge = await sql<Betrieb[]>`
    select ${BETRIEB_FELDER} from betriebe b left join benutzer u on u.id = b.verantwortlich
    where b.status = 'qa' order by b.geaendert_am`;
  return { leads, angebote, livegaenge };
}

export async function kennzahlen() {
  const rows = await sql<{ status: Status; anzahl: number }[]>`
    select status, count(*)::int as anzahl from betriebe group by status`;
  return Object.fromEntries(rows.map((r) => [r.status, r.anzahl])) as Partial<Record<Status, number>>;
}
