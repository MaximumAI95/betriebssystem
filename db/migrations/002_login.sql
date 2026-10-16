-- Anmeldung für die CRM-Oberfläche (unabhängig von Supabase Auth)
alter table benutzer add column passwort_hash text;
alter table benutzer add column aktiv boolean not null default true;
