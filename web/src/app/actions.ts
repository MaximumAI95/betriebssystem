'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { sql } from '@/lib/db';
import { anmelden, abmelden, benutzerOderLogin } from '@/lib/auth';
import { FREIGABE_FUER, darfFreigeben, istErlaubt, istStatus, STATUS_LABEL } from '@/lib/status';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function text(form: FormData, feld: string, max = 500): string | null {
  const v = form.get(feld);
  if (typeof v !== 'string') return null;
  const t = v.trim().slice(0, max);
  return t === '' ? null : t;
}

function id(form: FormData, feld = 'betrieb_id'): string {
  const v = text(form, feld, 36);
  if (!v || !UUID.test(v)) throw new Error('Ungültige ID.');
  return v;
}

export async function loginAction(_: { fehler?: string; email?: string } | undefined, form: FormData) {
  const email = text(form, 'email', 200) ?? '';
  const ok = await anmelden(email, (form.get('passwort') as string) ?? '');
  if (!ok) return { fehler: 'E-Mail oder Passwort falsch.', email };
  redirect('/');
}

export async function logoutAction() {
  await abmelden();
  redirect('/login');
}

export async function statusAendern(form: FormData) {
  const benutzer = await benutzerOderLogin();
  const betriebId = id(form);
  const nach = text(form, 'nach', 40);
  const kommentar = text(form, 'kommentar', 2000);
  if (!istStatus(nach)) throw new Error('Unbekannter Status.');

  await sql.begin(async (tx) => {
    const [b] = await tx<{ status: string; widerspruch: boolean }[]>`
      select status, widerspruch from betriebe where id = ${betriebId} for update`;
    if (!b || !istStatus(b.status)) throw new Error('Betrieb nicht gefunden.');
    if (!istErlaubt(b.status, nach)) {
      throw new Error(`Wechsel von „${STATUS_LABEL[b.status]}“ nach „${STATUS_LABEL[nach]}“ ist nicht vorgesehen.`);
    }
    if (b.widerspruch && nach !== 'ausgeschlossen') throw new Error('Der Betrieb hat widersprochen und wird nicht kontaktiert.');

    const freigabe = FREIGABE_FUER[nach];
    if (freigabe) {
      if (!darfFreigeben(benutzer.rolle, freigabe)) throw new Error('Für diese Freigabe fehlt die Berechtigung.');
      await tx`insert into freigaben (betrieb_id, art, entscheidung, kommentar, benutzer_id)
        values (${betriebId}, ${freigabe}, 'ja', ${kommentar}, ${benutzer.id})`;
      await tx`insert into aktivitaeten (betrieb_id, typ, text, benutzer_id)
        values (${betriebId}, 'freigabe', ${`Freigabe: ${STATUS_LABEL[nach]}${kommentar ? ` – ${kommentar}` : ''}`}, ${benutzer.id})`;
    } else if (kommentar) {
      await tx`insert into aktivitaeten (betrieb_id, typ, text, benutzer_id)
        values (${betriebId}, 'notiz', ${kommentar}, ${benutzer.id})`;
    }

    await tx`update betriebe set status = ${nach},
      verantwortlich = coalesce(verantwortlich, ${nach === 'interessant' ? benutzer.id : null}::uuid)
      where id = ${betriebId}`;
  });

  revalidatePath('/', 'layout');
}

export async function notizHinzufuegen(form: FormData) {
  const benutzer = await benutzerOderLogin();
  const betriebId = id(form);
  const inhalt = text(form, 'text', 5000);
  const typ = text(form, 'typ', 20) ?? 'notiz';
  if (!inhalt) return;
  if (!['notiz', 'anruf', 'besuch', 'brief', 'termin'].includes(typ)) throw new Error('Unbekannter Typ.');
  await sql`insert into aktivitaeten (betrieb_id, typ, text, benutzer_id)
    values (${betriebId}, ${typ}, ${inhalt}, ${benutzer.id})`;
  revalidatePath(`/betriebe/${betriebId}`);
}

export async function betriebAnlegen(form: FormData) {
  const benutzer = await benutzerOderLogin();
  const name = text(form, 'name', 200);
  if (!name) throw new Error('Name fehlt.');
  const branche = text(form, 'branche', 20) ?? 'sonstige';
  const region = text(form, 'region', 20);
  if (!['kfz', 'handwerk', 'physio', 'sonstige'].includes(branche)) throw new Error('Unbekannte Branche.');
  if (region && !['karlsruhe', 'stuttgart', 'sonstige'].includes(region)) throw new Error('Unbekannte Region.');

  const [neu] = await sql<{ id: string }[]>`
    insert into betriebe (name, branche, gewerk, strasse, plz, ort, region, website, telefon, email_allgemein,
                          quelle, hat_selbst_angefragt, verantwortlich)
    values (${name}, ${branche}, ${text(form, 'gewerk', 100)}, ${text(form, 'strasse', 200)}, ${text(form, 'plz', 10)},
            ${text(form, 'ort', 100)}, ${region}, ${text(form, 'website', 300)}, ${text(form, 'telefon', 50)},
            ${text(form, 'email_allgemein', 200)}, ${text(form, 'quelle', 50) ?? 'netzwerk'},
            ${form.get('hat_selbst_angefragt') === 'on'}, ${benutzer.id})
    returning id`;
  revalidatePath('/', 'layout');
  redirect(`/betriebe/${neu.id}`);
}

export async function kontaktAnlegen(form: FormData) {
  const benutzer = await benutzerOderLogin();
  const betriebId = id(form);
  const einwilligung = form.get('einwilligung_email') === 'on';
  await sql`insert into kontakte (betrieb_id, vorname, nachname, funktion, email, telefon,
                                  einwilligung_email, einwilligung_email_am)
    values (${betriebId}, ${text(form, 'vorname', 100)}, ${text(form, 'nachname', 100)}, ${text(form, 'funktion', 100)},
            ${text(form, 'email', 200)}, ${text(form, 'telefon', 50)}, ${einwilligung}, ${einwilligung ? sql`now()` : null})`;
  await sql`insert into aktivitaeten (betrieb_id, typ, text, benutzer_id)
    values (${betriebId}, 'notiz', ${`Kontakt angelegt${einwilligung ? ' (E-Mail-Einwilligung vermerkt)' : ''}`}, ${benutzer.id})`;
  revalidatePath(`/betriebe/${betriebId}`);
}

/** Werbewiderspruch: Betrieb dauerhaft ausschließen. */
export async function widerspruchVermerken(form: FormData) {
  const benutzer = await benutzerOderLogin();
  const betriebId = id(form);
  await sql.begin(async (tx) => {
    await tx`update betriebe set widerspruch = true, status = 'ausgeschlossen' where id = ${betriebId}`;
    await tx`update agent_laeufe set status = 'abgebrochen' where betrieb_id = ${betriebId} and status = 'wartend'`;
    await tx`insert into aktivitaeten (betrieb_id, typ, text, benutzer_id)
      values (${betriebId}, 'notiz', 'Werbewiderspruch vermerkt. Kein weiterer Kontakt.', ${benutzer.id})`;
  });
  revalidatePath('/', 'layout');
}
