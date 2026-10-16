-- Supabase stellt das Schema "public" über eine REST-Schnittstelle bereit.
-- Row Level Security ohne Policies sperrt diesen Zugang (anon/authenticated) vollständig.
-- Die CRM-Oberfläche und die Agenten verbinden sich direkt als Tabelleneigentümer und sind davon nicht betroffen.
do $$
declare t text;
begin
  foreach t in array array[
    'benutzer', 'betriebe', 'kontakte', 'website_analysen', 'dokumente', 'produkte', 'angebote',
    'angebot_positionen', 'agent_laeufe', 'freigaben', 'aktivitaeten', 'aufgaben', 'schema_migrationen'
  ] loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;
