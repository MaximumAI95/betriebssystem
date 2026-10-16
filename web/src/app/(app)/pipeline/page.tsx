import { pipeline } from '@/lib/daten';
import { BOARD_SPALTEN, STATUS_LABEL } from '@/lib/status';
import { BetriebLink, ScoreBadge, Seitenkopf } from '@/components/ui';

export default async function Pipeline() {
  const betriebe = await pipeline();
  return (
    <>
      <Seitenkopf titel="Pipeline" text="Vom bewerteten Lead bis zum Betreuungskunden." />
      <div className="-mx-4 overflow-x-auto px-4 pb-4 md:-mx-8 md:px-8">
        <div className="flex gap-3">
          {BOARD_SPALTEN.map((s) => {
            const karten = betriebe.filter((b) => b.status === s);
            return (
              <section key={s} className="w-60 shrink-0">
                <h2 className="mb-2 flex justify-between text-xs font-semibold uppercase tracking-wide text-stone-500">
                  {STATUS_LABEL[s]} <span className="tabular-nums">{karten.length}</span>
                </h2>
                <div className="space-y-2">
                  {karten.map((b) => (
                    <div key={b.id} className="karte p-3">
                      <div className="flex items-start justify-between gap-2">
                        <BetriebLink id={b.id} name={b.name} />
                        <ScoreBadge score={b.score} />
                      </div>
                      <p className="mt-1 text-xs text-stone-500">{[b.gewerk, b.ort].filter(Boolean).join(' · ')}</p>
                      {b.verantwortlich_name && <p className="mt-1 text-xs text-stone-400">{b.verantwortlich_name}</p>}
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}
