import { statusAendern } from '@/app/actions';
import { erlaubteUebergaenge, FREIGABE_FUER, STATUS_LABEL, darfFreigeben, type Status } from '@/lib/status';

/** Zeigt nur die Übergänge, die aus dem aktuellen Status erlaubt sind. Freigaben sind hervorgehoben. */
export function StatusKnoepfe({ betriebId, status, rolle, kompakt = false }: { betriebId: string; status: Status; rolle: string; kompakt?: boolean }) {
  const ziele = erlaubteUebergaenge(status);
  if (ziele.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {ziele.map((nach) => {
        const freigabe = FREIGABE_FUER[nach];
        const erlaubt = !freigabe || darfFreigeben(rolle, freigabe);
        const negativ = nach === 'verloren' || nach === 'ausgeschlossen';
        return (
          <form key={nach} action={statusAendern}>
            <input type="hidden" name="betrieb_id" value={betriebId} />
            <input type="hidden" name="nach" value={nach} />
            <button
              type="submit"
              disabled={!erlaubt}
              title={erlaubt ? undefined : 'Diese Freigabe erteilt Max'}
              className={freigabe ? 'knopf-primaer' : negativ ? 'knopf text-stone-500' : 'knopf'}
            >
              {freigabe ? `✓ ${kompakt ? STATUS_LABEL[nach] : `Freigeben: ${STATUS_LABEL[nach]}`}` : `→ ${STATUS_LABEL[nach]}`}
            </button>
          </form>
        );
      })}
    </div>
  );
}
