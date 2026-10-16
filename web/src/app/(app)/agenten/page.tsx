import { agentLaeufe } from '@/lib/daten';
import { BetriebLink, Leer, Seitenkopf, datum } from '@/components/ui';

export default async function Agenten() {
  const laeufe = await agentLaeufe();
  return (
    <>
      <Seitenkopf titel="Agenten" text="Warteschlange und Protokoll. Die Agenten selbst kommen in den nächsten Schritten dazu." />
      {laeufe.length === 0 ? <Leer>Noch keine Läufe.</Leer> : (
        <div className="karte overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500">
              <tr><th className="px-4 py-2">Agent</th><th className="px-4 py-2">Betrieb</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Angelegt</th><th className="px-4 py-2 text-right">Kosten</th></tr>
            </thead>
            <tbody>
              {laeufe.map((l) => (
                <tr key={l.id} className="border-b border-stone-100 last:border-0">
                  <td className="px-4 py-2">{l.agent}</td>
                  <td className="px-4 py-2">{l.betrieb_id && l.betrieb_name ? <BetriebLink id={l.betrieb_id} name={l.betrieb_name} /> : '–'}</td>
                  <td className={`px-4 py-2 ${l.status === 'fehler' ? 'text-red-700' : ''}`} title={l.fehler ?? undefined}>{l.status}</td>
                  <td className="px-4 py-2 text-stone-500">{datum(l.angelegt_am)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{l.kosten_eur ? `${Number(l.kosten_eur).toFixed(2)} €` : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
