-- =====================================================================
-- Betriebssystem / CRM · Datenbankschema (PostgreSQL 15+, z. B. Supabase EU)
-- Grundlage: Businessplan Kap. 07 „Betriebssystem, Stripe und Tools“
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Aufzählungen
-- ---------------------------------------------------------------------

-- Pipeline eines Betriebs. Statuswechsel mit (Freigabe) setzt ein Mensch.
create type lead_status as enum (
  'neu',             -- vom Lead-Finder angelegt
  'angereichert',    -- Website/Impressum ausgelesen
  'bewertet',        -- Score vom Bewerter liegt vor
  'interessant',     -- (Freigabe 1) Daniel markiert → startet Demo + Online-Check
  'vorbereitet',     -- Demo + Check-Report + Leitfaden liegen bereit
  'termin',          -- Erstgespräch / Prozess-Check vereinbart
  'prozess_check',   -- Prozess-Check durchgeführt, Protokoll im CRM
  'angebot',         -- (Freigabe 2) Angebot freigegeben und verschickt
  'gewonnen',        -- unterschrieben, Anzahlung offen/erhalten
  'in_umsetzung',    -- Bau-Agent + Max
  'qa',              -- (Freigabe 3) Qualitätscheck, Max gibt Livegang frei
  'live',            -- Website live, Schlusszahlung + Abo
  'betreuung',       -- laufendes Abo
  'verloren',
  'ausgeschlossen'   -- passt nicht / Widerspruch / nicht kontaktieren
);

create type branche as enum ('kfz', 'handwerk', 'physio', 'sonstige');

create type agent_typ as enum (
  'lead_finder', 'anreicherung', 'bewerter', 'online_check',
  'demo_generator', 'qa', 'prozess_check', 'bau_agent', 'unterlagen'
);

create type lauf_status as enum ('wartend', 'laeuft', 'fertig', 'fehler', 'abgebrochen');

create type dokument_typ as enum (
  'check_report', 'gespraechsleitfaden', 'demo_link', 'gespraechsprotokoll',
  'massnahmenplan', 'angebot', 'email_entwurf', 'brief_entwurf',
  'prioritaetenliste', 'qa_bericht', 'sonstiges'
);

create type aktivitaet_typ as enum (
  'notiz', 'anruf', 'besuch', 'brief', 'email_eingang', 'email_ausgang',
  'termin', 'statuswechsel', 'agent', 'freigabe'
);

-- ---------------------------------------------------------------------
-- Benutzer (Max, Daniel, später Teilzeitkraft)
-- ---------------------------------------------------------------------
create table benutzer (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null unique,
  rolle       text not null check (rolle in ('vertrieb', 'technik', 'betreuung', 'admin')),
  erstellt_am timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Betriebe (Unternehmen / Leads / Kunden)
-- ---------------------------------------------------------------------
create table betriebe (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  branche            branche not null default 'sonstige',
  gewerk             text,                      -- z. B. 'Kfz-Werkstatt', 'Schreiner', 'Elektro', 'SHK'
  strasse            text,
  plz                text,
  ort                text,
  region             text check (region in ('karlsruhe', 'stuttgart', 'sonstige')),
  website            text,
  telefon            text,
  email_allgemein    text,                      -- aus dem Impressum
  handelsregister    text,
  mitarbeiter_min    int,                       -- Schätzung, siehe quelle_mitarbeiter
  mitarbeiter_max    int,
  quelle_mitarbeiter text,

  -- Google: Laut Google-Maps-Plattform-Bedingungen nur die place_id dauerhaft speichern.
  -- Bewertung/Anzahl werden bei Bedarf frisch abgefragt (siehe docs/agenten.md).
  google_place_id    text unique,

  status             lead_status not null default 'neu',
  score              int check (score between 0 and 100),
  score_gruende      jsonb,                      -- [{kriterium, punkte, begruendung}]
  verantwortlich     uuid references benutzer(id),

  -- Recht / Einwilligung (§ 7 UWG, DSGVO)
  hat_selbst_angefragt boolean not null default false, -- nur dann automatischer Demo-Versand
  widerspruch          boolean not null default false, -- Werbewiderspruch → nie kontaktieren
  quelle               text not null,                  -- 'google_places', 'netzwerk', 'anfrage', 'empfehlung', ...
  demo_loeschen_am     date,                           -- Demo ohne Auftrag nach 60 Tagen löschen

  erstellt_am        timestamptz not null default now(),
  geaendert_am       timestamptz not null default now()
);

create index on betriebe (status);
create index on betriebe (region, branche);
create unique index betriebe_website_unique on betriebe (lower(website)) where website is not null;

-- ---------------------------------------------------------------------
-- Ansprechpartner
-- ---------------------------------------------------------------------
create table kontakte (
  id                       uuid primary key default gen_random_uuid(),
  betrieb_id               uuid not null references betriebe(id) on delete cascade,
  vorname                  text,
  nachname                 text,
  funktion                 text,               -- Inhaber, Meister, Büro
  email                    text,
  telefon                  text,
  einwilligung_email       boolean not null default false,
  einwilligung_email_am    timestamptz,
  einwilligung_aufnahme    boolean not null default false, -- § 201 StGB: Gesprächsaufzeichnung
  einwilligung_aufnahme_am timestamptz,
  erstellt_am              timestamptz not null default now()
);
create index on kontakte (betrieb_id);

-- ---------------------------------------------------------------------
-- Website-Analysen (Online-Check, QA)
-- ---------------------------------------------------------------------
create table website_analysen (
  id                    uuid primary key default gen_random_uuid(),
  betrieb_id            uuid not null references betriebe(id) on delete cascade,
  url                   text not null,
  art                   text not null check (art in ('bestand', 'demo', 'neu')),
  lighthouse_performance int,
  lighthouse_a11y        int,
  lighthouse_seo         int,
  lighthouse_best_practices int,
  ladezeit_lcp_ms        int,
  mobil_ok               boolean,
  https_ok               boolean,
  impressum_ok           boolean,
  datenschutz_ok         boolean,
  cookie_banner          boolean,
  barrierefreiheit_fehler int,                  -- axe-core Verstöße (WCAG 2.2 AA)
  karriereseite_vorhanden boolean,
  anfragewege            jsonb,                 -- ['formular','whatsapp','telefon','email']
  cms_erkannt            text,
  google_profil          jsonb,                 -- nur flüchtige Kennzahlen zum Zeitpunkt des Checks
  wettbewerber           jsonb,                 -- 3 Vergleichsbetriebe
  rohdaten               jsonb,
  erstellt_am            timestamptz not null default now()
);
create index on website_analysen (betrieb_id);

-- ---------------------------------------------------------------------
-- Dokumente (Reports, Leitfäden, Angebote, E-Mail-Entwürfe)
-- ---------------------------------------------------------------------
create table dokumente (
  id              uuid primary key default gen_random_uuid(),
  betrieb_id      uuid not null references betriebe(id) on delete cascade,
  typ             dokument_typ not null,
  titel           text not null,
  inhalt_md       text,                         -- Text / Markdown
  datei_pfad      text,                         -- Storage-Pfad (PDF)
  url             text,                         -- z. B. Demo-Vorschau-Link
  version         int not null default 1,
  ki_erstellt     boolean not null default true, -- Art. 50 EU AI Act: Kennzeichnung
  freigegeben_von uuid references benutzer(id),
  freigegeben_am  timestamptz,
  erstellt_von_lauf uuid,                        -- FK unten gesetzt
  erstellt_am     timestamptz not null default now()
);
create index on dokumente (betrieb_id, typ);

-- ---------------------------------------------------------------------
-- Angebote (Pakete und Bausteine aus dem Businessplan)
-- ---------------------------------------------------------------------
create table produkte (
  code            text primary key,             -- 'sichtbar', 'baustein_1_m', ...
  name            text not null,
  art             text not null check (art in ('paket', 'modul', 'baustein', 'einstieg')),
  einmalig_netto  numeric(10,2) not null default 0,
  monatlich_netto numeric(10,2) not null default 0,
  mindestlaufzeit_monate int,
  aktiv           boolean not null default true
);

create table angebote (
  id              uuid primary key default gen_random_uuid(),
  betrieb_id      uuid not null references betriebe(id) on delete cascade,
  status          text not null default 'entwurf'
                  check (status in ('entwurf', 'freigegeben', 'versendet', 'unterschrieben', 'abgelehnt', 'abgelaufen')),
  kaufart         text not null default 'kauf' check (kaufart in ('kauf', 'miete')),
  summe_einmalig  numeric(10,2),
  summe_monatlich numeric(10,2),
  gueltig_bis     date,
  dokument_id     uuid references dokumente(id),
  stripe_customer_id     text,
  stripe_subscription_id text,
  freigegeben_von uuid references benutzer(id),
  freigegeben_am  timestamptz,
  erstellt_am     timestamptz not null default now()
);

create table angebot_positionen (
  id          uuid primary key default gen_random_uuid(),
  angebot_id  uuid not null references angebote(id) on delete cascade,
  produkt_code text not null references produkte(code),
  menge       int not null default 1,
  einmalig_netto  numeric(10,2) not null,
  monatlich_netto numeric(10,2) not null
);

-- ---------------------------------------------------------------------
-- Agenten-Läufe (Warteschlange + Protokoll) – der Orchestrator pollt 'wartend'
-- ---------------------------------------------------------------------
create table agent_laeufe (
  id            uuid primary key default gen_random_uuid(),
  betrieb_id    uuid references betriebe(id) on delete cascade, -- null beim Lead-Finder
  agent         agent_typ not null,
  status        lauf_status not null default 'wartend',
  eingabe       jsonb not null default '{}',
  ergebnis      jsonb,
  fehler        text,
  versuche      int not null default 0,
  tokens_ein    int,
  tokens_aus    int,
  kosten_eur    numeric(8,4),
  angelegt_am   timestamptz not null default now(),
  gestartet_am  timestamptz,
  beendet_am    timestamptz
);
create index on agent_laeufe (status, angelegt_am);
create index on agent_laeufe (betrieb_id);

alter table dokumente
  add constraint dokumente_lauf_fk foreign key (erstellt_von_lauf) references agent_laeufe(id);

-- ---------------------------------------------------------------------
-- Freigaben (menschliche Haltepunkte laut Plan: Lead, Angebot, Livegang, Rechnung > 10.000 €)
-- ---------------------------------------------------------------------
create table freigaben (
  id           uuid primary key default gen_random_uuid(),
  betrieb_id   uuid not null references betriebe(id) on delete cascade,
  art          text not null check (art in ('lead_interessant', 'angebot', 'livegang', 'rechnung_gross', 'versand')),
  entscheidung text not null check (entscheidung in ('ja', 'nein')),
  kommentar    text,
  benutzer_id  uuid not null references benutzer(id),
  am           timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Aktivitäten / Zeitleiste und Aufgaben
-- ---------------------------------------------------------------------
create table aktivitaeten (
  id          uuid primary key default gen_random_uuid(),
  betrieb_id  uuid not null references betriebe(id) on delete cascade,
  kontakt_id  uuid references kontakte(id) on delete set null,
  typ         aktivitaet_typ not null,
  text        text,
  daten       jsonb,
  benutzer_id uuid references benutzer(id),  -- null = Agent/System
  am          timestamptz not null default now()
);
create index on aktivitaeten (betrieb_id, am desc);

create table aufgaben (
  id          uuid primary key default gen_random_uuid(),
  betrieb_id  uuid references betriebe(id) on delete cascade,
  titel       text not null,
  faellig_am  date,
  zustaendig  uuid references benutzer(id),
  erledigt    boolean not null default false,
  erstellt_am timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Automatik: Statuswechsel protokollieren und Agenten auslösen
-- ---------------------------------------------------------------------
create or replace function betriebe_statuswechsel() returns trigger as $$
begin
  new.geaendert_am := now();
  if new.status is distinct from old.status then
    insert into aktivitaeten (betrieb_id, typ, text, daten)
    values (new.id, 'statuswechsel', old.status || ' → ' || new.status,
            jsonb_build_object('von', old.status, 'nach', new.status));

    -- Ab „interessant“ laufen Demo und Online-Check ohne Zutun (Plan, Kap. 07)
    if new.status = 'interessant' and not new.widerspruch then
      insert into agent_laeufe (betrieb_id, agent) values
        (new.id, 'online_check'),
        (new.id, 'demo_generator');
      new.demo_loeschen_am := current_date + 60;
    elsif new.status = 'prozess_check' then
      insert into agent_laeufe (betrieb_id, agent) values (new.id, 'prozess_check');
    elsif new.status = 'gewonnen' then
      insert into agent_laeufe (betrieb_id, agent) values (new.id, 'bau_agent');
      new.demo_loeschen_am := null;
    elsif new.status = 'qa' then
      insert into agent_laeufe (betrieb_id, agent) values (new.id, 'qa');
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_betriebe_status
  before update on betriebe
  for each row execute function betriebe_statuswechsel();

-- Neu angelegte Betriebe automatisch anreichern
create or replace function betriebe_neu() returns trigger as $$
begin
  insert into agent_laeufe (betrieb_id, agent) values (new.id, 'anreicherung');
  return new;
end;
$$ language plpgsql;

create trigger trg_betriebe_neu
  after insert on betriebe
  for each row execute function betriebe_neu();

-- Nächsten wartenden Lauf atomar übernehmen (mehrere Worker möglich)
create or replace function naechster_lauf(p_agenten agent_typ[] default null)
returns agent_laeufe as $$
  update agent_laeufe set status = 'laeuft', gestartet_am = now(), versuche = versuche + 1
  where id = (
    select id from agent_laeufe
    where status = 'wartend' and (p_agenten is null or agent = any(p_agenten))
    order by angelegt_am
    for update skip locked
    limit 1
  )
  returning *;
$$ language sql;

-- ---------------------------------------------------------------------
-- Stammdaten: Pakete und Module aus dem Businessplan (Stand 16.10.2026, netto)
-- ---------------------------------------------------------------------
insert into produkte (code, name, art, einmalig_netto, monatlich_netto, mindestlaufzeit_monate) values
  ('online_check',      'Online-Check mit Demo-Website',        'einstieg',     0,    0, null),
  ('prozess_check',     'Prozess-Check vor Ort',                'einstieg',   690,    0, null),
  ('sichtbar',          'Sichtbar',                             'paket',     3490,  149, 12),
  ('sichtbar_miete',    'Sichtbar (Miete, ab März 2027)',       'paket',      490,  299, 24),
  ('sichtbar_karriere', 'Sichtbar + Karriere',                  'paket',     4900,  249, 12),
  ('entlastet',         'Entlastet',                            'paket',     8900,  590, 12),
  ('komplett',          'Betrieb Komplett',                     'paket',    13900,  990, 12),
  ('baustein_s',        'Automatisierungsbaustein S',           'baustein',   490,   39, 12),
  ('baustein_m',        'Automatisierungsbaustein M',           'baustein',   990,   79, 12),
  ('baustein_l',        'Automatisierungsbaustein L',           'baustein',  1990,  149, 12),
  ('karriereseite',     'Karriereseite einzeln',                'modul',     1890,   49, 12),
  ('local_seo',         'Google Search Console und Local SEO',  'modul',      390,   49, 12),
  ('erechnung',         'E-Rechnung und Belege (Bausteine 8+9)','modul',     1490,  129, 12),
  ('chatbot',           'Website-Chatbot',                      'modul',      790,   49, 12),
  ('fotoshooting',      'Fotoshooting im Betrieb',              'modul',      690,    0, null);
