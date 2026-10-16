import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseOverpass, overpassAbfrage } from '../src/finder/quellen/osm.ts';
import { parseGoogle } from '../src/finder/quellen/google.ts';
import { kategorisiereOsm, kategorisiereGoogle, istKette, brancheFuerCrm, nachName } from '../src/finder/kategorien.ts';
import { normalisiereWebsite, istEigeneWebsite, domain } from '../src/finder/website.ts';
import { zusammenfuehren, filtern } from '../src/finder/zusammenfuehren.ts';
import { alsCsv } from '../src/finder/csv.ts';

const overpass = JSON.parse(readFileSync(new URL('./fixtures/overpass.json', import.meta.url), 'utf8'));

test('Website wird vereinheitlicht', () => {
  assert.equal(normalisiereWebsite('www.Beispiel.example/'), 'https://www.beispiel.example');
  assert.equal(normalisiereWebsite('http://a.example/seite/'), 'http://a.example/seite');
  assert.equal(normalisiereWebsite('https://a.example; https://b.example'), 'https://a.example');
  assert.equal(normalisiereWebsite('keine'), null);
  assert.equal(domain('https://www.a.example/x'), 'a.example');
  assert.equal(istEigeneWebsite('https://www.facebook.com/firma'), false);
  assert.equal(istEigeneWebsite('https://m.facebook.com/firma'), false);
  assert.equal(istEigeneWebsite('https://firma.example'), true);
});

test('OSM-Tags ergeben Bereich und Kategorie', () => {
  assert.deepEqual(
    { ...kategorisiereOsm('X', { craft: 'electrician' }) },
    { bereich: 'handwerk', kategorie: 'Elektroinstallateur', passung: 'hoch', sicher: true },
  );
  assert.equal(kategorisiereOsm('X', { shop: 'car_repair' }).bereich, 'kfz');
  assert.equal(kategorisiereOsm('X', { healthcare: 'physiotherapist', amenity: 'doctors' }).kategorie, 'Physiotherapie');
  assert.deepEqual([kategorisiereOsm('X', { shop: 'florist' }).bereich, kategorisiereOsm('X', { shop: 'florist' }).kategorie], ['einzelhandel', 'Blumenladen']);
  assert.equal(kategorisiereOsm('X', { shop: 'unbekannt_xy' }).kategorie, 'Geschäft');
  assert.ok(kategorisiereOsm('Schule', { amenity: 'school' }).ausschluss);
  assert.ok(kategorisiereOsm('Verein', { office: 'association' }).ausschluss);
});

test('Ohne passenden Tag hilft der Name, aber nur als unsicher', () => {
  const z = kategorisiereOsm('Müller Sanitär und Heizung', { office: 'yes' });
  assert.equal(z.bereich, 'handwerk');
  assert.equal(z.sicher, false);
  assert.equal(kategorisiereOsm('Firma XY', { office: 'yes' }).bereich, 'dienstleistung');
  assert.equal(kategorisiereOsm('Elektro Huber', { office: 'company' }).bereich, 'handwerk');
  assert.equal(kategorisiereOsm('Huber GmbH', { office: 'company' }).sicher, false);
  assert.equal(nachName('Friseur Haarscharf')?.bereich, 'beauty');
  assert.equal(nachName('Hallo Welt'), null);
});

test('Google-Typen werden zugeordnet', () => {
  assert.equal(kategorisiereGoogle('X', ['electrician', 'point_of_interest']).kategorie, 'Elektroinstallateur');
  assert.equal(kategorisiereGoogle('X', ['clothing_store']).bereich, 'einzelhandel');
  assert.equal(kategorisiereGoogle('Kfz Meier', ['point_of_interest']).bereich, 'kfz');
});

test('Ketten werden erkannt', () => {
  assert.equal(istKette('Lidl'), true);
  assert.equal(istKette('Bäckerei Schmid', { brand: 'Schmid' }), true);
  assert.equal(istKette('Bäckerei Schmid'), false);
});

test('Branche im CRM', () => {
  assert.equal(brancheFuerCrm({ bereich: 'kfz', kategorie: 'Autohaus' }), 'kfz');
  assert.equal(brancheFuerCrm({ bereich: 'gesundheit', kategorie: 'Physiotherapie' }), 'physio');
  assert.equal(brancheFuerCrm({ bereich: 'gesundheit', kategorie: 'Zahnarztpraxis' }), 'sonstige');
});

test('Overpass-Abfrage grenzt Stadtteil über die Stadt ein und escaped Eingaben', () => {
  const q = overpassAbfrage({ name: 'Gablenberg', stadt: 'Stuttgart', region: 'stuttgart' });
  assert.match(q, /area\["name"="Stuttgart"\]/);
  assert.match(q, /rel\(area\.stadt\)\["boundary"="administrative"\]\["name"="Gablenberg"\]/);
  assert.match(overpassAbfrage({ name: 'A"b', region: 'sonstige' }), /"A\\"b"/);
});

test('Overpass-Antwort wird gelesen, Einträge ohne Namen übersprungen', () => {
  const leads = parseOverpass(overpass);
  assert.equal(leads.length, 12);
  const e = leads.find((l) => l.quelleId === 'node/1')!;
  assert.equal(e.website, 'https://www.elektro-testmann.example');
  assert.equal(e.strasse, 'Teststraße 1');
  assert.equal(e.plz, '70186');
  const way = leads.find((l) => l.quelleId === 'way/2')!;
  assert.equal(way.lat, 48.782);
  assert.equal(way.website, 'https://autowerkstatt-probe.example');
});

test('Zusammenführen erkennt gleiche Domain, Filtern sortiert aus', () => {
  const leads = zusammenfuehren(parseOverpass(overpass));
  assert.equal(leads.filter((l) => domain(l.website) === 'elektro-testmann.example').length, 1);
  const f = filtern(leads, true);
  assert.equal(f.ketten, 1);           // Lidl
  assert.equal(f.ausgeschlossen, 1);   // Schule
  assert.equal(f.ohneWebsite, 2);      // Instagram-Friseur, Blumenladen
  assert.deepEqual(f.behalten.map((l) => l.name).sort(), [
    'Autowerkstatt Probe', 'Elektro Testmann GmbH', 'Firma XY', 'Müller Sanitär und Heizung',
    'Physio am Berg', 'Steuerkanzlei Beispiel', 'Trattoria Esempio',
  ]);
  assert.equal(filtern(leads, false).behalten.length, 9);
});

test('OSM hat Vorrang, Google ergänzt fehlende Angaben', () => {
  const osm = parseOverpass({ elements: [{ type: 'node', id: 99, tags: { name: 'Malerei Farbe', craft: 'painter', 'addr:postcode': '70186' } }] });
  const google = parseGoogle([{ id: 'g1', displayName: { text: 'Malerei Farbe' }, websiteUri: 'https://malerei-farbe.example',
    addressComponents: [{ longText: '70186', types: ['postal_code'] }, { longText: 'Stuttgart', types: ['locality'] }], types: ['painter'] }]);
  const [l, ...rest] = zusammenfuehren([...google, ...osm]);
  assert.equal(rest.length, 0);
  assert.equal(l!.quelle, 'osm');
  assert.equal(l!.website, 'https://malerei-farbe.example');
  assert.equal(l!.ort, 'Stuttgart');
});

test('Google: geschlossene Betriebe fallen weg', () => {
  const r = parseGoogle([
    { id: 'a', displayName: { text: 'Offen' }, types: ['plumber'] },
    { id: 'b', displayName: { text: 'Zu' }, types: ['plumber'], businessStatus: 'CLOSED_PERMANENTLY' },
  ]);
  assert.deepEqual(r.map((x) => x.name), ['Offen']);
});

test('CSV mit Semikolon, Anführungszeichen und Schutz vor Formeln', () => {
  const [l] = parseOverpass({ elements: [{ type: 'node', id: 1, tags: { name: '=HYPERLINK("x");Test', craft: 'electrician' } }] });
  const csv = alsCsv([l!]);
  assert.ok(csv.startsWith('﻿Name;Bereich;'));
  const [t] = parseOverpass({ elements: [{ type: 'node', id: 2, tags: { name: 'A', phone: '+49 (0) 711 12345' } }] });
  assert.match(alsCsv([t!]), /;0711 12345;/);
  assert.match(csv, /"'=HYPERLINK\(""x""\);Test";Handwerk & Bau;Elektroinstallateur;hoch/);
});
