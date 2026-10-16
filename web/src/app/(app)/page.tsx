import Link from 'next/link';
import { agentLaeufe, kennzahlen, offeneFreigaben } from '@/lib/daten';
import { BOARD_SPALTEN, STATUS_LABEL } from '@/lib/status';
import { Seitenkopf, datum } from '@/components/ui';

export default async function Uebersicht() {
  const [zahlen, freigaben, laeufe] = await Promise.all([kennzahlen(), offeneFreigaben(), agentLaeufe()]);
  const offen = freigaben.leads.length + freigaben.angebote.length + freigaben.livegaenge.length;
  const neu = (zahlen.neu ?? 0) + (zahlen.angereichert ?? 0) + (zahlen.bewertet ?? 0);

  return (
    <>
      <Seitenkopf titel="Übersicht" />
      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        <Link href="/leads" className="karte p-4 hover:border-marke">
          <p className="etikett">Neue Leads</p>
          <p className="text-3xl font-semibold tabular-nums">{neu}</p>
        </Link>
        <Link href="/freigaben" className="karte p-4 hover:border-marke">
          <p className="etikett">Warten auf Freigabe</p>
          <p className="text-3xl font-semibold tabular-nums">{offen}</p>
        </Link>
        <div className="karte p-4">
          <p className="etikett">Kunden (live + Betreuung)</p>
          <p className="text-3xl font-semibold tabular-nums">{(zahlen.live ?? 0) + (zahlen.betreuung ?? 0)}</p>
        </div>
      </div>

      <h2 className="mb-3 font-semibold">Pipeline</h2>
      <div className="karte mb-8 overflow-x-auto">
        <table className="w-full text-sm">
          <tbody>
            {BOARD_SPALTEN.map((s) => (
              <tr key={s} className="border-b border-stone-100 last:border-0">
                <td className="px-4 py-2">{STATUS_LABEL[s]}</td>
                <td className="px-4 py-2 text-right font-medium tabular-nums">{zahlen[s] ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mb-3 font-semibold">Letzte Agenten-Läufe</h2>
      <ul className="karte divide-y divide-stone-100 text-sm">
        {laeufe.slice(0, 8).map((l) => (
          <li key={l.id} className="flex flex-wrap justify-between gap-2 px-4 py-2">
            <span>{l.agent} · {l.betrieb_name ?? '–'}</span>
            <span className="text-stone-500">{l.status} · {datum(l.angelegt_am)}</span>
          </li>
        ))}
        {laeufe.length === 0 && <li className="px-4 py-3 text-stone-500">Noch keine Läufe.</li>}
      </ul>
    </>
  );
}
