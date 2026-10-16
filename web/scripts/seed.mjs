// Legt Benutzer an bzw. setzt ihr Passwort neu.
//   node scripts/seed.mjs benutzer "Max" max@firma.de technik
//   (Passwort wird abgefragt bzw. aus SEED_PASSWORT gelesen)
// Mit "demo" werden Beispielbetriebe für die lokale Entwicklung angelegt.
import postgres from 'postgres';
import { scryptSync, randomBytes } from 'node:crypto';
import { createInterface } from 'node:readline/promises';

const sql = postgres(process.env.DATABASE_URL, { onnotice: () => {} });
const [befehl, ...args] = process.argv.slice(2);

function hash(passwort) {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString('hex')}$${scryptSync(passwort, salt, 64).toString('hex')}`;
}

try {
  if (befehl === 'benutzer') {
    const [name, email, rolle] = args;
    if (!name || !email || !rolle) throw new Error('Aufruf: seed.mjs benutzer <Name> <E-Mail> <vertrieb|technik|betreuung|admin>');
    let passwort = process.env.SEED_PASSWORT;
    if (!passwort) {
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      passwort = await rl.question('Passwort (mind. 12 Zeichen): ');
      rl.close();
    }
    if (passwort.length < 12) throw new Error('Passwort zu kurz.');
    await sql`insert into benutzer (name, email, rolle, passwort_hash)
      values (${name}, ${email.toLowerCase()}, ${rolle}, ${hash(passwort)})
      on conflict (email) do update set name = excluded.name, rolle = excluded.rolle, passwort_hash = excluded.passwort_hash`;
    console.log(`✓ Benutzer ${email} gespeichert.`);
  } else if (befehl === 'demo') {
    const beispiele = [
      ['Autohaus Beispiel GmbH', 'kfz', 'Kfz-Werkstatt', 'Karlsruhe', 'karlsruhe', 'https://example.com', 82, 'bewertet'],
      ['Schreinerei Muster', 'handwerk', 'Schreiner', 'Ettlingen', 'karlsruhe', 'https://example.org', 71, 'bewertet'],
      ['Elektro Test KG', 'handwerk', 'Elektro', 'Esslingen am Neckar', 'stuttgart', null, 64, 'bewertet'],
      ['SHK Probe GmbH', 'handwerk', 'SHK', 'Stuttgart', 'stuttgart', 'https://example.net', 48, 'bewertet'],
      ['Kfz-Service Demo', 'kfz', 'Kfz-Werkstatt', 'Bruchsal', 'karlsruhe', null, null, 'neu'],
    ];
    for (const [name, branche, gewerk, ort, region, website, score, status] of beispiele) {
      await sql`insert into betriebe (name, branche, gewerk, ort, region, website, score, status, quelle, score_gruende)
        values (${name}, ${branche}, ${gewerk}, ${ort}, ${region}, ${website}, ${score}, ${status}, 'demo',
          ${score ? sql.json([
            { kriterium: 'Branche', punkte: 20, begruendung: `${gewerk} gehört zu den Startbranchen.` },
            { kriterium: 'Personal', punkte: 15, begruendung: 'Beispiel: 2 offene Stellen auf der Website.' },
          ]) : null})
        on conflict do nothing`;
    }
    console.log('✓ Demo-Betriebe angelegt (Quelle "demo").');
  } else {
    console.log('Befehle: benutzer <Name> <E-Mail> <Rolle> | demo');
  }
} finally {
  await sql.end();
}
