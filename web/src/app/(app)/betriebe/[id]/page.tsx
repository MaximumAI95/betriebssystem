import { notFound } from 'next/navigation';
import { benutzerOderLogin } from '@/lib/auth';
import { agentLaeufe, analysen, betrieb, dokumente, kontakte, zeitleiste } from '@/lib/daten';
import { emailVersandErlaubt, STATUS_LABEL, istStatus } from '@/lib/status';
import { kontaktAnlegen, notizHinzufuegen, widerspruchVermerken } from '@/app/actions';
import { StatusKnoepfe } from '@/components/status-knoepfe';
import { BRANCHE_LABEL, REGION_LABEL, ScoreBadge, StatusBadge, datum, host } from '@/components/ui';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function Abschnitt({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <section className="karte p-4">
      <h2 className="mb-3 font-semibold">{titel}</h2>
      {children}
    </section>
  );
}

function Zeile({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-stone-100 py-1.5 text-sm last:border-0">
      <dt className="text-stone-500">{k}</dt>
      <dd className="text-right">{v ?? '–'}</dd>
    </div>
  );
}

function statusText(t: string | null) {
  return (t ?? '').split(' → ').map((s) => (istStatus(s) ? STATUS_LABEL[s] : s)).join(' → ');
}

export default async function BetriebSeite({ params }: { params: Promise<{ id: string }> }) {
  const benutzer = await benutzerOderLogin();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const b = await betrieb(id);
  if (!b) notFound();
  const [ks, zl, docs, ans, laeufe] = await Promise.all([kontakte(id), zeitleiste(id), dokumente(id), analysen(id), agentLaeufe(id)]);
  const emailOk = emailVersandErlaubt(b, ks.some((k) => k.einwilligung_email));

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <ScoreBadge score={b.score} />
          <div>
            <h1 className="text-xl font-semibold">{b.name}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-stone-500">
              <StatusBadge status={b.status} />
              {[b.gewerk, b.ort, b.verantwortlich_name && `zuständig: ${b.verantwortlich_name}`].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
        <StatusKnoepfe betriebId={b.id} status={b.status} rolle={benutzer.rolle} />
      </div>

      {b.widerspruch && (
        <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">Werbewiderspruch vermerkt. Diesen Betrieb nicht kontaktieren.</p>
      )}
      <p className={`mb-6 rounded-md p-3 text-sm ${emailOk ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}>
        {emailOk
          ? 'E-Mail-Versand erlaubt (eigene Anfrage oder dokumentierte Einwilligung).'
          : 'Kein E-Mail-Versand (§ 7 UWG): Kontakt per Brief, Telefon oder Besuch. Die Demo im Termin zeigen.'}
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Abschnitt titel="Stammdaten">
            <dl>
              <Zeile k="Branche" v={BRANCHE_LABEL[b.branche]} />
              <Zeile k="Adresse" v={[b.strasse, [b.plz, b.ort].filter(Boolean).join(' ')].filter(Boolean).join(', ') || null} />
              <Zeile k="Region" v={b.region ? REGION_LABEL[b.region] : null} />
              <Zeile k="Website" v={b.website ? <a href={b.website.includes('://') ? b.website : `https://${b.website}`} target="_blank" rel="noreferrer" className="text-marke hover:underline">{host(b.website)}</a> : null} />
              <Zeile k="Telefon" v={b.telefon ? <a href={`tel:${b.telefon}`} className="hover:underline">{b.telefon}</a> : null} />
              <Zeile k="E-Mail (Impressum)" v={b.email_allgemein} />
              <Zeile k="Mitarbeitende" v={b.mitarbeiter_min != null ? `${b.mitarbeiter_min}–${b.mitarbeiter_max ?? '?'}` : null} />
              <Zeile k="Quelle" v={b.quelle} />
              <Zeile k="Selbst angefragt" v={b.hat_selbst_angefragt ? 'ja' : 'nein'} />
              <Zeile k="Demo löschen am" v={b.demo_loeschen_am ? new Date(b.demo_loeschen_am).toLocaleDateString('de-DE') : null} />
            </dl>
          </Abschnitt>

          {b.score_gruende && b.score_gruende.length > 0 && (
            <Abschnitt titel="Warum dieser Score">
              <ul className="space-y-1 text-sm">
                {b.score_gruende.map((g, i) => (
                  <li key={i}><span className="font-medium">{g.kriterium}</span> <span className="tabular-nums text-stone-400">+{g.punkte}</span>: {g.begruendung}</li>
                ))}
              </ul>
            </Abschnitt>
          )}

          <Abschnitt titel="Ansprechpartner">
            {ks.length > 0 && (
              <ul className="mb-4 space-y-2 text-sm">
                {ks.map((k) => (
                  <li key={k.id}>
                    <span className="font-medium">{[k.vorname, k.nachname].filter(Boolean).join(' ') || 'Ohne Namen'}</span>
                    {k.funktion && <span className="text-stone-500"> · {k.funktion}</span>}
                    <span className="block text-stone-500">{[k.telefon, k.email].filter(Boolean).join(' · ')}</span>
                    {k.einwilligung_email && <span className="text-xs text-emerald-700">E-Mail-Einwilligung vermerkt</span>}
                  </li>
                ))}
              </ul>
            )}
            <details>
              <summary className="cursor-pointer text-sm text-marke">Kontakt hinzufügen</summary>
              <form action={kontaktAnlegen} className="mt-3 grid gap-2 sm:grid-cols-2">
                <input type="hidden" name="betrieb_id" value={b.id} />
                <input name="vorname" placeholder="Vorname" className="eingabe" />
                <input name="nachname" placeholder="Nachname" className="eingabe" />
                <input name="funktion" placeholder="Funktion (z. B. Inhaber)" className="eingabe" />
                <input name="telefon" placeholder="Telefon" className="eingabe" />
                <input name="email" type="email" placeholder="E-Mail" className="eingabe sm:col-span-2" />
                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  <input type="checkbox" name="einwilligung_email" /> Einwilligung in E-Mail-Kontakt liegt vor (dokumentiert)
                </label>
                <button className="knopf sm:col-span-2 justify-center">Speichern</button>
              </form>
            </details>
          </Abschnitt>

          <Abschnitt titel="Website-Analysen">
            {ans.length === 0 ? <p className="text-sm text-stone-500">Noch keine. Der Online-Check startet bei „Interessant“.</p> : (
              <ul className="space-y-2 text-sm">
                {ans.map((a) => (
                  <li key={a.id}>
                    <span className="font-medium">{a.art}</span> · {host(a.url)} · {datum(a.erstellt_am)}
                    <span className="block text-stone-500">
                      Leistung {a.lighthouse_performance ?? '–'} · Barrierefreiheit {a.lighthouse_a11y ?? '–'} · SEO {a.lighthouse_seo ?? '–'}
                      {a.impressum_ok === false && ' · Impressum fehlt'}{a.datenschutz_ok === false && ' · Datenschutz fehlt'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Abschnitt>
        </div>

        <div className="space-y-4">
          <Abschnitt titel="Dokumente">
            {docs.length === 0 ? <p className="text-sm text-stone-500">Noch keine. Report, Leitfaden und Demo-Link erscheinen hier.</p> : (
              <ul className="space-y-1 text-sm">
                {docs.map((d) => (
                  <li key={d.id} className="flex justify-between gap-2">
                    <span>{d.url ? <a href={d.url} target="_blank" rel="noreferrer" className="text-marke hover:underline">{d.titel}</a> : d.titel} <span className="text-stone-400">v{d.version}</span></span>
                    <span className="text-stone-500">{d.freigegeben_am ? 'freigegeben' : 'Entwurf'}</span>
                  </li>
                ))}
              </ul>
            )}
          </Abschnitt>

          <Abschnitt titel="Zeitleiste">
            <form action={notizHinzufuegen} className="mb-4 space-y-2">
              <input type="hidden" name="betrieb_id" value={b.id} />
              <textarea name="text" rows={2} placeholder="Notiz, Gesprächsergebnis …" className="eingabe" required />
              <div className="flex gap-2">
                <select name="typ" className="eingabe w-auto">
                  <option value="notiz">Notiz</option>
                  <option value="anruf">Anruf</option>
                  <option value="besuch">Besuch</option>
                  <option value="brief">Brief</option>
                  <option value="termin">Termin</option>
                </select>
                <button className="knopf">Speichern</button>
              </div>
            </form>
            <ol className="space-y-3 text-sm">
              {zl.map((a) => (
                <li key={a.id} className="border-l-2 border-stone-200 pl-3">
                  <p className="text-xs text-stone-500">{datum(a.am)} · {a.typ} · {a.benutzer_name ?? 'System'}</p>
                  <p className="whitespace-pre-wrap">{a.typ === 'statuswechsel' ? statusText(a.text) : a.text}</p>
                </li>
              ))}
            </ol>
          </Abschnitt>

          <Abschnitt titel="Agenten">
            {laeufe.length === 0 ? <p className="text-sm text-stone-500">Keine Läufe.</p> : (
              <ul className="space-y-1 text-sm">
                {laeufe.map((l) => (
                  <li key={l.id} className="flex justify-between gap-2">
                    <span>{l.agent}</span>
                    <span className={l.status === 'fehler' ? 'text-red-700' : 'text-stone-500'}>{l.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </Abschnitt>

          {!b.widerspruch && (
            <form action={widerspruchVermerken} className="text-right">
              <input type="hidden" name="betrieb_id" value={b.id} />
              <button className="text-xs text-stone-500 hover:text-red-700 hover:underline">Werbewiderspruch vermerken</button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
