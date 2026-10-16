import { neueLeads } from '@/lib/daten';
import { benutzerOderLogin } from '@/lib/auth';
import { StatusKnoepfe } from '@/components/status-knoepfe';
import { BetriebLink, BRANCHE_LABEL, host, Leer, REGION_LABEL, ScoreBadge, Seitenkopf, StatusBadge } from '@/components/ui';

export default async function Leads({ searchParams }: { searchParams: Promise<{ region?: string; branche?: string }> }) {
  const benutzer = await benutzerOderLogin();
  const { region, branche } = await searchParams;
  const leads = await neueLeads({ region: region || undefined, branche: branche || undefined });

  return (
    <>
      <Seitenkopf
        titel="Neue Leads"
        text="Vom Bewerter sortiert. „Interessant“ startet Online-Check und Demo-Website automatisch."
      />
      <form className="mb-4 flex flex-wrap gap-2">
        <select name="region" defaultValue={region ?? ''} className="eingabe w-auto">
          <option value="">Alle Regionen</option>
          {Object.entries(REGION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select name="branche" defaultValue={branche ?? ''} className="eingabe w-auto">
          <option value="">Alle Branchen</option>
          {Object.entries(BRANCHE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="knopf">Filtern</button>
      </form>

      {leads.length === 0 ? (
        <Leer>Keine neuen Leads. Der Lead-Finder legt sie hier ab, oder du legst einen Betrieb von Hand an.</Leer>
      ) : (
        <ul className="space-y-3">
          {leads.map((b) => (
            <li key={b.id} className="karte flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
              <ScoreBadge score={b.score} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <BetriebLink id={b.id} name={b.name} />
                  <StatusBadge status={b.status} />
                </div>
                <p className="text-sm text-stone-500">
                  {[b.gewerk, b.ort, host(b.website) ?? 'keine Website'].filter(Boolean).join(' · ')}
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
