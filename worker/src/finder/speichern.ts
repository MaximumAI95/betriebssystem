import postgres from 'postgres';
import { brancheFuerCrm } from './kategorien.ts';
import { istEigeneWebsite } from './website.ts';
import type { Rohlead, Suchgebiet } from './typen.ts';

export type Speicherergebnis = { neu: number; schonVorhanden: number };

export async function speichern(sql: postgres.Sql, leads: Rohlead[], gebiet: Suchgebiet): Promise<Speicherergebnis> {
  let neu = 0;
  for (const l of leads) {
    const z = l.zuordnung;
    const rows = await sql`
      insert into betriebe (
        name, branche, gewerk, bereich, kategorie, passung, strasse, plz, ort, region, gebiet,
        website, telefon, email_allgemein, quelle, osm_id, google_place_id, lat, lon)
      values (
        ${l.name}, ${brancheFuerCrm(z)}, ${z.kategorie}, ${z.bereich}, ${z.kategorie}, ${z.passung},
        ${l.strasse}, ${l.plz}, ${l.ort ?? gebiet.stadt ?? gebiet.name}, ${gebiet.region}, ${gebiet.name},
        ${istEigeneWebsite(l.website) ? l.website : null}, ${l.telefon}, ${l.email}, ${l.quelle},
        ${l.quelle === 'osm' ? l.quelleId : null}, ${l.quelle === 'google_places' ? l.quelleId : null},
        ${l.lat}, ${l.lon})
      on conflict do nothing
      returning id`;
    if (rows.length > 0) neu++;
  }
  return { neu, schonVorhanden: leads.length - neu };
}

export async function laufStarten(sql: postgres.Sql, eingabe: object): Promise<string> {
  const [lauf] = await sql<{ id: string }[]>`
    insert into agent_laeufe (agent, status, eingabe, gestartet_am, versuche)
    values ('lead_finder', 'laeuft', ${sql.json(eingabe as postgres.JSONValue)}, now(), 1)
    returning id`;
  return lauf!.id;
}

export async function laufBeenden(sql: postgres.Sql, id: string, ergebnis: object | null, fehler?: string, tokens?: { ein: number; aus: number }) {
  await sql`
    update agent_laeufe set
      status = ${fehler ? 'fehler' : 'fertig'},
      ergebnis = ${ergebnis ? sql.json(ergebnis as postgres.JSONValue) : null},
      fehler = ${fehler ?? null},
      tokens_ein = ${tokens?.ein ?? null},
      tokens_aus = ${tokens?.aus ?? null},
      beendet_am = now()
    where id = ${id}`;
}
