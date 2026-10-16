/** Vereinheitlicht eine Website-Angabe zu https://host/pfad ohne Schrägstrich am Ende. */
export function normalisiereWebsite(roh: string | null | undefined): string | null {
  if (!roh) return null;
  let s = roh.trim().split(/[\s;,]+/)[0] ?? '';
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    if (!u.hostname.includes('.')) return null;
    const pfad = u.pathname.replace(/\/+$/, '');
    return `${u.protocol}//${u.hostname.toLowerCase()}${pfad}`;
  } catch {
    return null;
  }
}

/** Domain ohne www. – Schlüssel für die Dublettenerkennung. */
export function domain(website: string | null): string | null {
  if (!website) return null;
  try {
    return new URL(website).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

// Seiten, die keine eigene Firmen-Website sind
const KEINE_EIGENE_SEITE = [
  'facebook.com', 'instagram.com', 'linkedin.com', 'xing.com', 'twitter.com', 'x.com', 'tiktok.com',
  'gelbeseiten.de', 'dasoertliche.de', 'yelp.de', 'yelp.com', 'google.com', 'goo.gl', 'g.page',
  'jameda.de', 'doctolib.de', 'treatwell.de', 'lieferando.de', 'booking.com', 'tripadvisor.de', 'linktr.ee',
];

export function istEigeneWebsite(website: string | null): boolean {
  const d = domain(website);
  if (!d) return false;
  return !KEINE_EIGENE_SEITE.some((k) => d === k || d.endsWith(`.${k}`));
}
