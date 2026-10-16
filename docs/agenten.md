# Die Agenten des Betriebssystems

Jeder Agent ist ein eigenständiger Job. Der **Orchestrator** (ein Node-Prozess auf einem EU-Server) holt mit `naechster_lauf()` den nächsten wartenden Auftrag aus der Tabelle `agent_laeufe`, startet den passenden Agenten, schreibt Ergebnis, Kosten und Fehler zurück und setzt den Status des Betriebs weiter. Ausgelöst werden die Läufe durch Statuswechsel im CRM (Datenbank-Trigger, siehe `db/schema.sql`) oder zeitgesteuert (Lead-Finder).

Grundregeln für alle Agenten:

- **Nichts geht ohne Freigabe nach außen.** Agenten erzeugen Entwürfe. Versand, Angebot, Livegang und Rechnungen über 10.000 € gibt ein Mensch frei (Tabelle `freigaben`).
- **Keine erfundenen Fakten.** Alles, was über einen Betrieb behauptet wird, braucht eine Quelle (URL, Messwert). Fehlt etwas, schreibt der Agent „unbekannt“.
- **Datensparsam.** Gespeichert werden nur Firmendaten und geschäftliche Kontaktdaten aus dem Impressum. Keine Bewertungsfotos, keine privaten Daten.
- **KI-Kennzeichnung.** Kundenseitige Dokumente tragen den Hinweis „mit KI-Unterstützung erstellt“ (Art. 50 EU AI Act).
- **Kostenbremse.** Jeder Lauf hat ein Token- und Euro-Limit (`.env`: `AGENT_MAX_EUR_PRO_LAUF`).

| # | Agent | Auslöser | Plan-Schritt |
|---|---|---|---|
| A0 | Lead-Finder | zeitgesteuert, z. B. nachts | – |
| A1 | Anreicherung | neuer Betrieb | 01 Lead |
| A2 | Bewerter | nach A1 | 01 Lead |
| — | **Freigabe 1: Daniel markiert „interessant“** | | |
| A3 | Online-Check | Status `interessant` | 03 Check |
| A4 | Demo-Generator | Status `interessant` | 02 Demo |
| A5 | QA-Agent | nach A4 und Status `qa` | 07 QA |
| A6 | Prozess-Check-Auswertung | Status `prozess_check` | Gespräch → 04 |
| A7 | Unterlagen-Agent | nach A3+A4 und nach A6 | 03/04 |
| A8 | Bau-Agent | Status `gewonnen` | 06 Bau |

---

## A0 · Lead-Finder

**Ziel:** Betriebe aus den Startbranchen in den Zielregionen finden.

- **Eingabe:** `config/lead-suche.json` (Gewerke × Orte).
- **Quelle:** Google **Places API (New)**, *Text Search*, z. B. „Kfz-Werkstatt in Karlsruhe“. Je Suche bis zu 60 Treffer, deshalb nach Stadtteilen bzw. Umlandgemeinden aufteilen.
- **Ablauf:**
  1. Text Search mit Feldmaske nur für die nötigen Felder (`id`, `displayName`, `formattedAddress`, `websiteUri`, `types`, `businessStatus`). Das hält die Kosten niedrig.
  2. Ketten und Konzeptwerkstätten herausfiltern (Liste in der Konfiguration, z. B. Bosch Car Service, ATU, Pitstop), dazu geschlossene Betriebe.
  3. Dubletten über `google_place_id` und Website-Domain erkennen.
  4. Betrieb mit `quelle = 'google_places'` anlegen. Der Trigger startet A1.
- **Wichtig, Google-Bedingungen:** Laut den Maps-Platform-Nutzungsbedingungen dürfen Places-Inhalte nicht dauerhaft gespeichert werden. Ausgenommen ist die `place_id`. Darum speichern wir **die `place_id` und die Daten aus dem Impressum der Website** (A1), nicht Googles Adresse, Telefonnummer oder Bewertungen. Bewertungszahlen fragt A2 bzw. A3 bei Bedarf frisch ab. Vor dem Start prüfen.
- **Kosten:** Text Search kostet bei Google nach Feldumfang. Vorab im Google-Cloud-Preisrechner prüfen und ein Budget-Limit setzen.

## A1 · Anreicherung

**Ziel:** Verlässliche Stammdaten aus der eigenen Website des Betriebs.

- Startseite, Impressum, Karriere- und Kontaktseite abrufen (Playwright, robots.txt beachten, höchstens 1 Anfrage pro Sekunde je Domain).
- Claude extrahiert strukturiert: Firmierung, Adresse, Telefon, allgemeine E-Mail, Inhaber oder Geschäftsführer, Handelsregister, Leistungen, Hinweise auf die Größe (Teamseite, Stellenanzeigen, „über 20 Mitarbeiter“), offene Stellen, eingesetzte Werkstatt- oder Handwerkersoftware.
- Ohne Website: als Signal vermerken (kein Ausschluss).
- Ergebnis: Felder in `betriebe` und `kontakte` (nur Geschäftsangaben), Status `angereichert`, startet A2.

## A2 · Bewerter

**Ziel:** Für Daniel eine sortierte Liste mit Begründung. **Der Bewerter entscheidet nicht**, er schlägt vor.

Score 0–100 nach dem Idealkunden aus dem Plan (Kap. 03). Die Gewichte stehen in `config/lead-suche.json`:

| Kriterium | Punkte |
|---|---|
| Branche Kfz (frei) oder Ausbau (Schreiner, Elektro, SHK, Maler) | bis 20 |
| 10–50 Mitarbeitende (unter 10: weniger Punkte, Preise wirken hoch) | bis 20 |
| sucht Personal (Stellenanzeigen, keine oder schwache Karriereseite) | bis 20 |
| Website schwach (mobil, Ladezeit, veraltet, kein Anfrageformular) | bis 20 |
| Pflichtenanlass (kein BFSG-taugliches Buchungssystem, kein Hinweis auf E-Rechnung) | bis 10 |
| Region Karlsruhe oder Stuttgart inkl. Umland | bis 10 |
| **Ausschluss:** Konzeptwerkstatt mit Website über die Zentrale (nur Module), geschlossen, Widerspruch | – |

Ergebnis: `score`, `score_gruende` (je Kriterium ein Satz mit Quelle), Status `bewertet`. Daniel sieht in der CRM-Ansicht „Neue Leads“ die Liste nach Score sortiert und klickt **„interessant“** oder **„ausschließen“**.

## A3 · Online-Check (der „Business-Check“ vor dem Gespräch)

**Ziel:** zweiseitiger Bericht für den Kunden und Gesprächsleitfaden für Daniel (Plan, Kap. 04 und 07).

- **Messen:** Lighthouse (mobil) über die PageSpeed-Insights-API oder lokal, axe-core für WCAG 2.2 AA, HTTPS, Impressum und Datenschutz vorhanden, Cookie-Banner, Anfragewege (Formular, WhatsApp, Telefon klickbar), Karriereseite, Google-Unternehmensprofil (Vollständigkeit, Öffnungszeiten, Anzahl Bewertungen, nur flüchtig abgefragt), Search-Console-Hinweise.
- **Vergleich:** 3 Wettbewerber im Umkreis, gleiche Messung, kurz.
- **Claude schreibt:**
  - *Check-Report* (PDF, 2 Seiten, Kunden-Sprache: Zeit und Anfragen statt Technik)
  - *Gesprächsleitfaden* mit 8–10 Fragen zu Anfrage, Angebot, Termin, Rechnung, Bewerbung
- Ergebnis: `website_analysen` (Art `bestand`), `dokumente` (Typen `check_report` und `gespraechsleitfaden`).

## A4 · Demo-Generator

**Ziel:** Demo-Website des Betriebs auf geschütztem Vorschau-Link, nach etwa 30 Minuten fertig.

- **Eingabe:** Stammdaten (A1), Leistungen, Öffnungszeiten, **eigenes Logo von der Website**. Keine fremden Fotos, keine Bewertungsfotos, sonst Platzhalter aus dem Design-System.
- **Technik:** Branchenvorlage (zum Start Kfz und Schreiner) im Astro-Generator, statisch gebaut. Startseite und 2 Unterseiten.
- **Bereitstellung:** `https://<slug>.vorschau.<eure-domain>` mit Zugangscode, `noindex`, ohne Cookies, EU-Hosting. Löschung automatisch am `demo_loeschen_am` (60 Tage), außer bei Auftrag.
- Danach startet A5 (QA light), Ergebnis `dokumente` (Typ `demo_link`).

## A5 · QA-Agent

**Ziel:** Nichts verlässt das Haus, das gegen das Qualitätsversprechen verstößt.

- **Prüft:** Lighthouse ≥ 95 in allen Kategorien, axe-core ohne Verstöße der Stufen „serious“ und „critical“, tote Links, Impressum und Datenschutz eingebunden (beim Livegang), `noindex` auf der Vorschau, Formular funktioniert, Mobilansicht auf 3 Breiten (Screenshots).
- **Faktencheck:** Claude vergleicht jede Aussage auf der Seite mit den Quelldaten. Erfundene Leistungen, Zertifikate oder Zahlen werden gemeldet.
- **Ergebnis:** `qa_bericht` mit Bestanden oder Mängelliste. Bei Mängeln geht die Seite einmal automatisch zurück an A4 oder A8, danach an Max. Den Livegang gibt immer Max frei.

## A6 · Prozess-Check-Auswertung

**Ziel:** Aus dem Gesprächsprotokoll den Maßnahmenplan machen.

- **Eingabe:** Protokoll oder Transkript (nur mit vermerkter Einwilligung zur Aufnahme, sonst Daniels Sprachnotiz), Check-Report.
- Claude ermittelt die **drei größten Zeitfresser**, ordnet die passenden **Bausteine aus dem 12er-Katalog** zu (Größe S, M oder L), schätzt die Ersparnis in Stunden pro Monat (als Schätzung gekennzeichnet) und schlägt ein Paket vor.
- Ergebnis: `massnahmenplan` und Vorschlag für die Angebotspositionen. Startet A7.

## A7 · Unterlagen-Agent

**Ziel:** Alles zusammenführen, was Daniel für Termin und Abschluss braucht. **Nur Entwürfe.**

- Nach A3 und A4: **Terminmappe** (Report, Leitfaden, Demo-Link, QR-Code für das Tablet), Entwurf für Brief oder Anschreiben.
- Nach A6: **Angebotsentwurf** aus `produkte` (Preise aus der Datenbank, keine freien Preise), Begleit-E-Mail-Entwurf, Hinweis auf SEPA-Mandat.
- **Versandregel (§ 7 UWG):** Ein E-Mail-Entwurf an einen Betrieb ist nur versandfähig, wenn `hat_selbst_angefragt = true` ist oder eine dokumentierte Einwilligung vorliegt. Sonst erzeugt der Agent einen **Brief-Entwurf**, und die Demo wird im Termin gezeigt. Die Oberfläche sperrt den Versand-Knopf entsprechend.

## A8 · Bau-Agent (Ausbaustufe 2, bis Ende April 2027)

- Liest Protokoll, Check-Report, Demo und gebuchtes Paket, leitet 3–5 Prioritäten ab und stellt offene Fragen und fehlende Inhalte als Liste ins Kundenportal.
- Baut die Seite auf Basis der Demo aus und stellt sie auf die Vorschau. Danach folgt A5, dann Freigabe durch Max.
