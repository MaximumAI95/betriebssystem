import { betriebAnlegen } from '@/app/actions';
import { Seitenkopf } from '@/components/ui';

export default function NeuerBetrieb() {
  return (
    <>
      <Seitenkopf titel="Betrieb anlegen" text="Für Leads aus Netzwerk, Empfehlung oder eigener Anfrage. Die Anreicherung startet automatisch." />
      <form action={betriebAnlegen} className="karte grid max-w-2xl gap-4 p-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="etikett" htmlFor="name">Firmenname *</label>
          <input id="name" name="name" required className="eingabe" />
        </div>
        <div>
          <label className="etikett" htmlFor="branche">Branche</label>
          <select id="branche" name="branche" className="eingabe" defaultValue="handwerk">
            <option value="kfz">Kfz</option>
            <option value="handwerk">Handwerk</option>
            <option value="physio">Physio</option>
            <option value="sonstige">Sonstige</option>
          </select>
        </div>
        <div>
          <label className="etikett" htmlFor="gewerk">Gewerk</label>
          <input id="gewerk" name="gewerk" placeholder="z. B. Schreiner" className="eingabe" />
        </div>
        <div className="sm:col-span-2">
          <label className="etikett" htmlFor="strasse">Straße</label>
          <input id="strasse" name="strasse" className="eingabe" />
        </div>
        <div>
          <label className="etikett" htmlFor="plz">PLZ</label>
          <input id="plz" name="plz" className="eingabe" />
        </div>
        <div>
          <label className="etikett" htmlFor="ort">Ort</label>
          <input id="ort" name="ort" className="eingabe" />
        </div>
        <div>
          <label className="etikett" htmlFor="region">Region</label>
          <select id="region" name="region" className="eingabe" defaultValue="karlsruhe">
            <option value="karlsruhe">Karlsruhe</option>
            <option value="stuttgart">Stuttgart</option>
            <option value="sonstige">Sonstige</option>
          </select>
        </div>
        <div>
          <label className="etikett" htmlFor="quelle">Quelle</label>
          <select id="quelle" name="quelle" className="eingabe" defaultValue="netzwerk">
            <option value="netzwerk">Netzwerk</option>
            <option value="empfehlung">Empfehlung</option>
            <option value="anfrage">Eigene Anfrage des Betriebs</option>
            <option value="innung">Innung / Kammer</option>
            <option value="besuch">Besuch vor Ort</option>
          </select>
        </div>
        <div>
          <label className="etikett" htmlFor="website">Website</label>
          <input id="website" name="website" placeholder="https://" className="eingabe" />
        </div>
        <div>
          <label className="etikett" htmlFor="telefon">Telefon</label>
          <input id="telefon" name="telefon" className="eingabe" />
        </div>
        <div className="sm:col-span-2">
          <label className="etikett" htmlFor="email_allgemein">E-Mail (Impressum)</label>
          <input id="email_allgemein" name="email_allgemein" type="email" className="eingabe" />
        </div>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="hat_selbst_angefragt" /> Der Betrieb hat selbst bei uns angefragt (erlaubt E-Mail-Kontakt)
        </label>
        <div className="sm:col-span-2">
          <button className="knopf-primaer">Anlegen</button>
        </div>
      </form>
    </>
  );
}
