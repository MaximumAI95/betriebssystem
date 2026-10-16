import { benutzerOderLogin } from '@/lib/auth';
import { offeneFreigaben, type Betrieb } from '@/lib/daten';
import { StatusKnoepfe } from '@/components/status-knoepfe';
import { BetriebLink, Leer, ScoreBadge, Seitenkopf } from '@/components/ui';

function Liste({ titel, text, betriebe, rolle }: { titel: string; text: string; betriebe: Betrieb[]; rolle: string }) {
  return (
    <section className="mb-8">
      <h2 className="font-semibold">{titel} <span className="text-stone-400 tabular-nums">{betriebe.length}</span></h2>
      <p className="mb-3 text-sm text-stone-500">{text}</p>
      {betriebe.length === 0 ? <Leer>Nichts offen.</Leer> : (
        <ul className="space-y-2">
          {betriebe.map((b) => (
            <li key={b.id} className="karte flex flex-wrap items-center gap-3 p-3">
              <ScoreBadge score={b.score} />
              <div className="min-w-0 flex-1">
                <BetriebLink id={b.id} name={b.name} />
                <p className="text-xs text-stone-500">{[b.gewerk, b.ort].filter(Boolean).join(' · ')}</p>
              </div>
              <StatusKnoepfe betriebId={b.id} status={b.status} rolle={rolle} kompakt />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function Freigaben() {
  const benutzer = await benutzerOderLogin();
  const { leads, angebote, livegaenge } = await offeneFreigaben();
  return (
    <>
      <Seitenkopf titel="Freigaben" text="Die menschlichen Haltepunkte aus dem Businessplan. Rechnungen über 10.000 € folgen mit Stripe." />
      <Liste titel="Leads einstufen" text="Bewertete Leads ab Score 55. Daniel entscheidet." betriebe={leads} rolle={benutzer.rolle} />
      <Liste titel="Angebote freigeben" text="Prozess-Check erledigt, Angebotsentwurf prüfen und freigeben." betriebe={angebote} rolle={benutzer.rolle} />
      <Liste titel="Livegang freigeben" text="Qualitätscheck bestanden? Max gibt frei." betriebe={livegaenge} rolle={benutzer.rolle} />
    </>
  );
}
