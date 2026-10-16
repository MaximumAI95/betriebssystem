// Spielt alle SQL-Dateien aus db/migrations der Reihe nach ein (jede nur einmal).
import postgres from 'postgres';
import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL fehlt.');
  process.exit(1);
}

const dir = join(dirname(fileURLToPath(import.meta.url)), '../../db/migrations');
const sql = postgres(url, { onnotice: () => {} });

try {
  await sql`create table if not exists schema_migrationen (
    datei text primary key, eingespielt_am timestamptz not null default now())`;
  const erledigt = new Set((await sql`select datei from schema_migrationen`).map((r) => r.datei));
  const dateien = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();

  for (const datei of dateien) {
    if (erledigt.has(datei)) continue;
    const inhalt = await readFile(join(dir, datei), 'utf8');
    await sql.begin(async (tx) => {
      await tx.unsafe(inhalt);
      await tx`insert into schema_migrationen (datei) values (${datei})`;
    });
    console.log(`✓ ${datei}`);
  }
  console.log('Datenbank ist aktuell.');
} finally {
  await sql.end();
}
