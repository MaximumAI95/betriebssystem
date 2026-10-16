// Lead-Finder (Agent A0)
//
//   npm run finder -- --gebiet Gablenberg --stadt Stuttgart
//   npm run finder -- --gebiet Karlsruhe --quelle beide --claude --csv karlsruhe.csv
//   npm run finder -- --gebiet Gablenberg --stadt Stuttgart --trocken   (nichts speichern, nur anzeigen)

import { parseArgs } from 'node:util';
import { writeFile } from 'node:fs/promises';
import postgres from 'postgres';
import { BEREICHE, BEREICH_SCHLUESSEL } from './kategorien.ts';
import { sucheOsm } from './quellen/osm.ts';
import { sucheGoogle } from './quellen/google.ts';
import { ordneMitClaudeEin } from './claude.ts';
import { filtern, zusammenfuehren } from './zusammenfuehren.ts';
import { laufBeenden, laufStarten, speichern } from './speichern.ts';
import { alsCsv } from './csv.ts';
import type { Rohlead, Suchgebiet } from './typen.ts';

const HILFE = `Lead-Finder: findet Betriebe in einem Gebiet und ordnet sie in Bereiche ein.

  --gebiet <Name>        Stadtteil, Stadt oder Gemeinde (Pflicht), z. B. Gablenberg
  --stadt <Name>         übergeordnete Stadt, z. B. Stuttgart (bei Stadtteilen empfohlen)
  --region <r>           karlsruhe | stuttgart | sonstige (sonst aus Stadt abgeleitet)
  --quelle <q>           osm (Standard, kostenlos) | google | beide
  --alle                 auch Betriebe ohne eigene Website übernehmen
  --claude               unklare Fälle mit Claude einordnen (ANTHROPIC_API_KEY)
  --csv <Datei>          Ergebnis zusätzlich als CSV speichern
  --trocken              nichts in die Datenbank schreiben
  --hilfe                diese Hilfe`;

const { values: a } = parseArgs({
  options: {
    gebiet: { type: 'string' }, stadt: { type: 'string' }, region: { type: 'string' },
    quelle: { type: 'string', default: 'osm' }, alle: { type: 'boolean', default: false },
    claude: { type: 'boolean', default: false }, csv: { type: 'string' },
    trocken: { type: 'boolean', default: false }, hilfe: { type: 'boolean', default: false },
  },
});

if (a.hilfe || !a.gebiet) {
  console.log(HILFE);
  process.exit(a.hilfe ? 0 : 1);
}
if (!['osm', 'google', 'beide'].includes(a.quelle!)) {
  console.error('--quelle muss osm, google oder beide sein.');
  process.exit(1);
}

function regionAus(text: string): Suchgebiet['region'] {
  const t = text.toLowerCase();
  if (a.region === 'karlsruhe' || a.region === 'stuttgart' || a.region === 'sonstige') return a.region;
  if (t.includes('stuttgart')) return 'stuttgart';
  if (t.includes('karlsruhe')) return 'karlsruhe';
  return 'sonstige';
}

const gebiet: Suchgebiet = { name: a.gebiet, stadt: a.stadt, region: regionAus(`${a.stadt ?? ''} ${a.gebiet}`) };
const log = (t: string) => console.error(`  ${t}`);

const sql = a.trocken ? null : postgres(process.env.DATABASE_URL ?? '', { onnotice: () => {} });
if (sql && !process.env.DATABASE_URL) {
  console.error('DATABASE_URL fehlt. Mit --trocken lässt sich der Finder ohne Datenbank testen.');
  process.exit(1);
}
const laufId = sql ? await laufStarten(sql, { ...a, gebiet }) : null;

try {
  console.error(`Suche in ${gebiet.stadt ? `${gebiet.name} (${gebiet.stadt})` : gebiet.name} …`);
  const roh: Rohlead[] = [];
  let googleAnfragen = 0;
  if (a.quelle !== 'google') {
    const osm = await sucheOsm(gebiet);
    log(`OpenStreetMap: ${osm.length} Einträge`);
    roh.push(...osm);
  }
  if (a.quelle !== 'osm') {
    const g = await sucheGoogle(gebiet, { fortschritt: log });
    googleAnfragen = g.anfragen;
    log(`Google Places: ${g.leads.length} Betriebe aus ${g.anfragen} Anfragen`);
    roh.push(...g.leads);
  }

  const zusammen = zusammenfuehren(roh);
  const f = filtern(zusammen, !a.alle);
  let tokens = { ein: 0, aus: 0 };
  if (a.claude) {
    const c = await ordneMitClaudeEin(f.behalten, log);
    tokens = { ein: c.tokensEin, aus: c.tokensAus };
    log(`Claude hat ${c.geaendert} unklare Betriebe eingeordnet`);
  }
  const leads = f.behalten.filter((l) => !l.zuordnung.ausschluss);
  const nachAusschluss = f.behalten.length - leads.length;

  const jeBereich = Object.fromEntries(BEREICH_SCHLUESSEL.map((b) => [b, leads.filter((l) => l.zuordnung.bereich === b).length]));
  const gespeichert = sql ? await speichern(sql, leads, gebiet) : null;

  console.log(`\nErgebnis ${gebiet.name}: ${leads.length} Leads`);
  for (const b of BEREICH_SCHLUESSEL) {
    if (jeBereich[b]) console.log(`  ${BEREICHE[b].label.padEnd(28)} ${String(jeBereich[b]).padStart(4)}   Passung ${BEREICHE[b].passung}`);
  }
  console.log(`\nAussortiert: ${f.ketten} Ketten, ${f.ausgeschlossen + nachAusschluss} keine Betriebe, ${f.ohneWebsite} ohne eigene Website${a.alle ? '' : ' (mit --alle übernehmen)'}`);
  const unsicher = leads.filter((l) => !l.zuordnung.sicher).length;
  if (unsicher && !a.claude) console.log(`${unsicher} Betriebe nur über den Namen eingeordnet (mit --claude prüfen lassen)`);
  if (gespeichert) console.log(`Im CRM: ${gespeichert.neu} neu, ${gespeichert.schonVorhanden} schon vorhanden`);
  if (a.trocken) console.log('Trockenlauf: nichts gespeichert.');
  if (a.csv) {
    await writeFile(a.csv, alsCsv(leads));
    console.log(`CSV: ${a.csv}`);
  }
  if (a.quelle !== 'google') console.log('Daten: © OpenStreetMap-Mitwirkende (ODbL)');

  if (sql && laufId) {
    await laufBeenden(sql, laufId, {
      gefunden: roh.length, nach_zusammenfuehren: zusammen.length, leads: leads.length, je_bereich: jeBereich,
      ketten: f.ketten, ohne_website: f.ohneWebsite, google_anfragen: googleAnfragen, ...gespeichert,
    }, undefined, tokens);
  }
} catch (e) {
  const meldung = e instanceof Error ? e.message : String(e);
  if (sql && laufId) await laufBeenden(sql, laufId, null, meldung);
  console.error(`\nFehler: ${meldung}`);
  process.exitCode = 1;
} finally {
  await sql?.end();
}
