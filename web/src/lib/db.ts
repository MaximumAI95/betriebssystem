import 'server-only';
import postgres from 'postgres';

declare global {
  // eslint-disable-next-line no-var
  var __sql: postgres.Sql | undefined;
}

function verbinden() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL ist nicht gesetzt.');
  return postgres(url, { max: 5, onnotice: () => {} });
}

/** Eine Verbindung pro Prozess (auch bei Hot Reload in der Entwicklung). */
export const sql: postgres.Sql = globalThis.__sql ?? (globalThis.__sql = verbinden());
