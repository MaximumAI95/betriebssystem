-- Lead-Finder: Betriebe aller Branchen, gegliedert nach Bereich und Kategorie
alter table betriebe add column bereich   text not null default 'sonstige';
alter table betriebe add column kategorie text;                 -- z. B. 'Elektroinstallateur', 'Friseur'
alter table betriebe add column passung   text check (passung in ('hoch', 'mittel', 'niedrig'));
alter table betriebe add column osm_id    text unique;          -- z. B. 'node/123456'
alter table betriebe add column lat       double precision;
alter table betriebe add column lon       double precision;
alter table betriebe add column gebiet    text;                 -- Suchgebiet, z. B. 'Gablenberg'

create index on betriebe (bereich);
create index on betriebe (gebiet);
