import Link from 'next/link';
import { leadUebersicht, neueLeads, type LeadFilter } from '@/lib/daten';
import { benutzerOderLogin } from '@/lib/auth';
import { StatusKnoepfe } from '@/components/status-knoepfe';
import { BEREICH_LABEL, BereichBadge, BetriebLink, host, Leer, REGION_LABEL, ScoreBadge, Seitenkopf, StatusBadge } from '@/components/ui';

type Suche = { region?: string; bereich?: string; gebiet?: string; passung?: string };

function filterAus(s: Suche): LeadFilter {
  return { region: s.region || undefined, bereich: s.bereich || undefined, gebiet: s.gebiet || undefined, passung: s.passung || undefined };
}

export default async function Leads({ searchParams }: { searchParams: Promise<Suche> }) {
  const benutzer = await benutzerOderLogin();
  const suche = await searchParams;
  const filter = filterAus(suche);
  const [leads, uebersicht] = await Promise.all([neueLeads(filter), leadUebersicht({ ...filter, bereich: undefined })]);
  const query = new URLSearchParams(Object.entries(filter).filter((e): e is [string, string] => Boolean(e[1]))).toString();

  return (
    <>
      <Seitenkopf
        titel="Neue Leads"
        text="Vom Lead-Finder nach Bereichen geordnet. „Interessant“ startet Online-Check und Demo-Website automatisch."
        aktion={<a href={`/leads/export${query ? `?${query}` : ''}`} className="knopf">CSV herunterladen</a>}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Link href={`/leads?${new URLSearchParams(Object.entries({ ...filter, bereich: undefined }).filter((e): e is [string, string] => Boolean(e[1])))}`} className={`rounded-full border px-3 py-1 text-sm ${!filter.bereich ? 'border-marke bg-marke-hell text-marke' : 'border-stone-300 bg-white'}`}>
          Alle
        </Link>
        {uebersicht.bereiche.map((b) => (
          <Link
            key={b.bereich}
            href={`/leads?${new URLSearchParams({ ...Object.fromEntries(new URLSearchParams(query)), bereich: b.bereich })}`}
            className={`rounded-full border px-3 py-1 text-sm ${filter.bereich === b.bereich ? 'border-marke bg-marke-hell text-marke' : 'border-stone-300 bg-white'}`}
          >
            {BEREICH_LABEL[b.bereich] ?? b.bereich} <span className="tabular-nums text-stone-400">{b.anzahl}</span>
          </Link>
        ))}
      </div>

      <form className="mb-4 flex flex-wrap gap-2">
        {filter.bereich && <input type="hidden" name="bereich" value={filter.bereich} />}
        <select name="gebiet" defaultValue={filter.gebiet ?? ''} className="eingabe w-auto">
          <option value="">Alle Gebiete</option>
          {uebersicht.gebiete.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <select name="region" defaultValue={filter.region ?? ''} className="eingabe w-auto">
          <option value="">Alle Regionen</option>
          {Object.entries(REGION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select name="passung" defaultValue={filter.passung ?? ''} className="eingabe w-auto">
          <option value="">Jede Passung</option>
          <option value="hoch">Passung hoch</option>
          <option value="mittel">Passung mittel</option>
          <option value="niedrig">Passung niedrig</option>
        </select>
        <button className="knopf">Filtern</button>
      </form>

      <p className="mb-3 text-sm text-stone-500">{leads.length === 500 ? 'Die ersten 500' : leads.length} Leads</p>

      {leads.length === 0 ? (
        <Leer>Keine neuen Leads für diese Auswahl. Der Lead-Finder legt sie hier ab, oder du legst einen Betrieb von Hand an.</Leer>
      ) : (
        <ul className="space-y-3">
          {leads.map((b) => (
            <li key={b.id} className="karte flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
              <ScoreBadge score={b.score} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <BetriebLink id={b.id} name={b.name} />
                  <StatusBadge status={b.status} />
                  <BereichBadge bereich={b.bereich} kategorie={b.kategorie} />
                </div>
                <p className="text-sm text-stone-500">
                  {[b.ort, b.gebiet && b.gebiet !== b.ort ? b.gebiet : null, host(b.website) ?? 'keine Website', b.telefon].filter(Boolean).join(' · ')}
                </p>
                {b.score_gruende && (
                  <ul className="mt-2 space-y-0.5 text-sm text-stone-700">
                    {b.score_gruende.slice(0, 4).map((g, i) => (
                      <li key={i}><span className="tabular-nums text-stone-400">+{g.punkte}</span> {g.begruendung}</li>
                    ))}
                  </ul>
                )}
              </div>
              <StatusKnoepfe betriebId={b.id} status={b.status} rolle={benutzer.rolle} kompakt />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
