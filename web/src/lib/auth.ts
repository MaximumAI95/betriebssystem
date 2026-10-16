import 'server-only';
import { createHmac, scryptSync, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { sql } from './db';

const COOKIE = 'sitzung';
const DAUER_S = 60 * 60 * 12; // 12 Stunden

export type Benutzer = { id: string; name: string; email: string; rolle: string };

function geheimnis(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error('SESSION_SECRET fehlt oder ist kürzer als 32 Zeichen.');
  return s;
}

function signieren(wert: string): string {
  return createHmac('sha256', geheimnis()).update(wert).digest('base64url');
}

export function passwortPruefen(passwort: string, gespeichert: string | null): boolean {
  if (!gespeichert) return false;
  const [verfahren, saltHex, hashHex] = gespeichert.split('$');
  if (verfahren !== 'scrypt' || !saltHex || !hashHex) return false;
  const erwartet = Buffer.from(hashHex, 'hex');
  const ist = scryptSync(passwort, Buffer.from(saltHex, 'hex'), erwartet.length);
  return timingSafeEqual(ist, erwartet);
}

export async function anmelden(email: string, passwort: string): Promise<boolean> {
  const [b] = await sql<{ id: string; passwort_hash: string | null }[]>`
    select id, passwort_hash from benutzer where email = ${email.toLowerCase().trim()} and aktiv`;
  if (!b || !passwortPruefen(passwort, b.passwort_hash)) return false;

  const payload = Buffer.from(JSON.stringify({ uid: b.id, exp: Math.floor(Date.now() / 1000) + DAUER_S })).toString('base64url');
  (await cookies()).set(COOKIE, `${payload}.${signieren(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: DAUER_S,
  });
  return true;
}

export async function abmelden() {
  (await cookies()).delete(COOKIE);
}

export async function aktuellerBenutzer(): Promise<Benutzer | null> {
  const wert = (await cookies()).get(COOKIE)?.value;
  if (!wert) return null;
  const [payload, sig] = wert.split('.');
  if (!payload || !sig) return null;
  const erwartet = Buffer.from(signieren(payload));
  const ist = Buffer.from(sig);
  if (erwartet.length !== ist.length || !timingSafeEqual(erwartet, ist)) return null;

  const { uid, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { uid: string; exp: number };
  if (exp < Date.now() / 1000) return null;
  const [b] = await sql<Benutzer[]>`select id, name, email, rolle from benutzer where id = ${uid} and aktiv`;
  return b ?? null;
}

/** Für Seiten und Server Actions: leitet ohne Anmeldung zum Login um. */
export async function benutzerOderLogin(): Promise<Benutzer> {
  const b = await aktuellerBenutzer();
  if (!b) redirect('/login');
  return b;
}
