# Betriebssystem: eigenes CRM mit Agenten

Bauunterlagen für das CRM und die Agenten-Pipeline aus dem Businessplan (Kap. 07, Stand 16.10.2026).
Ziel: Daniel markiert einen Lead als „interessant“. Nach rund 30 Minuten liegen Demo-Website, Check-Report, Gesprächsleitfaden und Anschreiben-Entwurf im CRM.

## Inhalt dieses Ordners

| Datei | Inhalt |
|---|---|
| `db/migrations/` | Datenbank: Betriebe, Kontakte, Analysen, Dokumente, Angebote, Pakete und Preise aus dem Plan, Agenten-Warteschlange, Freigaben, Zeitleiste, Login, Row Level Security. **Getestet mit PostgreSQL 16.** |
| `worker/` | Agenten. Bisher: **Lead-Finder** (`worker/src/finder/`) |
| `web/` | CRM-Oberfläche (Next.js): Übersicht, Neue Leads, Pipeline, Betriebsakte, Freigaben, Agenten |
| `docs/zielbild.md` | Zielbild: ein Tool für alles (Finanzen, Buchhaltung, Postfach) |
| `docs/agenten.md` | Die 9 Agenten: Auslöser, Ein- und Ausgaben, Regeln, rechtliche Grenzen |
| `config/lead-suche.json` | Regionen, Gewerke, Ketten-Ausschluss, Score-Gewichte, Limits |
| `.env.example` | Welche Zugangsdaten gebraucht werden (Werte nie in den Chat) |

## Auf dem Mac starten (ohne Programmierkenntnisse)

Siehe `LIESMICH.txt`: Node.js und Postgres.app installieren, dann `Start.command` öffnen (beim ersten Mal per Rechtsklick → Öffnen). Leads sucht `Lead-Finder.command`.

## Schnellstart (lokal oder auf dem Server)

Voraussetzungen: Node.js 22 und eine PostgreSQL-Datenbank (lokal oder Supabase).

```bash
cd web
npm install
export DATABASE_URL="postgres://…"                 # bei Supabase: Connection String „Session pooler“
export SESSION_SECRET="$(openssl rand -hex 32)"     # mind. 32 Zeichen, geheim halten
npm run db:migrate                                   # spielt db/migrations/*.sql ein
npm run db:seed -- benutzer "Daniel" daniel@firma.de vertrieb   # fragt das Passwort ab
npm run db:seed -- benutzer "Max" max@firma.de technik
npm run db:seed -- demo                              # optional: Beispielbetriebe zum Ausprobieren
npm run build && npm start                           # http://localhost:3000
```

Tests: `npm test` (Status-Logik, Freigaben, Versandregel) und `npm run lint` (TypeScript).

## Lead-Finder

Findet Betriebe aller Branchen in einem Gebiet, ordnet sie in 9 Bereiche ein und legt sie im CRM unter „Neue Leads“ ab. Dort lassen sie sich nach Bereich, Gebiet, Region und Passung filtern und als CSV herunterladen.

```bash
cd worker
npm install
export DATABASE_URL="postgres://…"
npm run finder -- --gebiet Gablenberg --stadt Stuttgart --trocken          # nur anzeigen
npm run finder -- --gebiet Gablenberg --stadt Stuttgart --csv gablenberg.csv
npm run finder -- --gebiet Karlsruhe --quelle beide --claude                 # Google + OSM, unklare Fälle mit Claude
npm run finder -- --hilfe
```

| Quelle | Kosten | Stärke | Voraussetzung |
|---|---|---|---|
| `osm` (Standard) | kostenlos | darf gespeichert werden (ODbL, Quellenangabe) | Zugriff auf `overpass-api.de` |
| `google` | pro Anfrage (ca. 40 Suchbegriffe × bis zu 3 Seiten je Gebiet) | findet mehr Betriebe mit Website | `GOOGLE_MAPS_API_KEY`, Budget-Limit setzen |
| `beide` | wie Google | beste Abdeckung, Dubletten werden zusammengeführt | beides |

**Bereiche:** Handwerk & Bau, Kfz (Passung hoch) · Gesundheit & Pflege, Beauty & Wellness, Büro & Dienstleistung, Gastronomie & Hotel (mittel) · Sport, Freizeit & Bildung, Einzelhandel, Sonstige (niedrig).
**Aussortiert werden:** Ketten und Filialisten, öffentliche Einrichtungen, Vereine, Schulen und standardmäßig Betriebe ohne eigene Website (Facebook- oder Instagram-Seiten zählen nicht; mit `--alle` trotzdem übernehmen).
Jeder neue Lead stößt automatisch die Anreicherung (A1) an. Mehrfache Läufe erzeugen keine Dubletten.

**Rollen:** `vertrieb` (Daniel) stuft Leads ein und gibt Angebote frei. `technik` (Max) darf zusätzlich den Livegang freigeben. `admin` darf alles.

## Architektur

```
                ┌──────────────────────────── CRM-Oberfläche (Next.js) ───────────────────────────┐
                │ Neue Leads (Score) · Betriebsakte · Pipeline-Board · Freigaben · Dokumente       │
                └──────────────┬─────────────────────────────────────────────────────▲───────────┘
                               │ Status ändern (z. B. „interessant“)                 │ Ergebnisse
                               ▼                                                     │
        ┌──────────── PostgreSQL (Supabase, Frankfurt) ────────────┐                 │
        │ betriebe → Trigger → agent_laeufe (Warteschlange)         │─────────────────┘
        └──────────────────────────┬────────────────────────────────┘
                                   │ naechster_lauf()
                                   ▼
        ┌──────────── Orchestrator / Worker (Node, EU-Server) ─────────────────────────┐
        │ A0 Lead-Finder · A1 Anreicherung · A2 Bewerter · A3 Online-Check              │
        │ A4 Demo-Generator · A5 QA · A6 Prozess-Check · A7 Unterlagen · A8 Bau-Agent   │
        │ Claude Agent SDK · Playwright · Lighthouse · axe-core · Astro-Vorlagen        │
        └──────────────┬──────────────────────┬────────────────────────┬───────────────┘
                       ▼                      ▼                        ▼
               Google Places API      Vorschau-Hosting (EU)       Stripe (Stufe 1/2)
```

**Stack (Vorschlag, passend zum Plan):**
- **Oberfläche:** Next.js + Tailwind, eigene Anmeldung mit E-Mail und Passwort (unabhängig vom Hosting), nur Max, Daniel und später die Teilzeitkraft.
- **Datenbank und Dateien:** Supabase in Frankfurt mit Auftragsverarbeitungsvertrag (AVV), Row Level Security.
- **Worker:** Node/TypeScript mit dem Claude Agent SDK auf einem kleinen EU-Server (z. B. Hetzner, ca. 5–15 € im Monat). Ein eigener Server ist nötig, weil Playwright und Lighthouse einen echten Browser brauchen.
- **Warum kein Lovable für das CRM:** Der Plan erlaubt Lovable für interne Werkzeuge. Für Kundendaten wollen wir aber volle Kontrolle über Hosting-Region, AVV und Code. Lovable bleibt eine Option, um Oberflächen schnell zu skizzieren.
- **Warum kein HubSpot oder Pipedrive:** Die Automatik ab „interessant“ und die Freigabe-Logik sind der Kern des Geschäftsmodells. Eigenes Datenmodell bedeutet keine Lizenzkosten pro Sitz und keine n8n-Lizenzfrage.

## Was ihr bereitstellen müsst (einmalig)

1. **GitHub:** GitHub-Konto mit Claude verbinden (claude.ai → Einstellungen → GitHub) und ein **privates Repository** anlegen, z. B. `betriebssystem`. Ohne Repo geht alles verloren, wenn diese Cloud-Umgebung endet.
2. **Supabase:** Konto anlegen, Projekt in **Region Frankfurt (eu-central-1)** erstellen, AVV abschließen.
3. **Claude API:** API-Schlüssel unter console.anthropic.com (kommerzielle Bedingungen, AVV), Ausgabenlimit setzen.
4. **Google Cloud:** Projekt mit Abrechnung, **Places API (New)** und **PageSpeed Insights API** aktivieren, Schlüssel auf diese APIs beschränken, **Budget-Alarm** setzen.
5. **Domain** für die Vorschau-Links (z. B. `vorschau.eure-firma.de`).
6. **Zugangsdaten** als Secrets in der Cloud-Umgebung hinterlegen (Umgebungsmenü → Bearbeiten), mit den Namen aus `.env.example`.
7. **Netzwerk:** Die Cloud-Umgebung muss `*.supabase.co`, `places.googleapis.com`, `www.googleapis.com` und `api.anthropic.com` erreichen dürfen.
8. **Anwalt:** Versandregel nach § 7 UWG, Demo mit Logo des Betriebs, Gesprächsaufzeichnung und AGB prüfen lassen (steht so auch im Plan).

## Bauplan

| Meilenstein | Inhalt | Ziel laut Plan |
|---|---|---|
| **M1 · Grundgerüst** ✅ | Datenbank, Login, CRM-Oberfläche: Leads-Liste, Betriebsakte, Pipeline-Board, Freigaben, Zeitleiste, Agenten-Protokoll. *Offen: Einrichtung bei Supabase und auf dem Server.* | Nov 2026 |
| **M2 · Leads** | A0 Lead-Finder ✅ (alle Branchen, 9 Bereiche, OSM + Google, CSV), danach A1 Anreicherung, A2 Bewerter. Pilot mit **einer Region und einem Gewerk** (z. B. Kfz Karlsruhe), Qualität mit Daniel prüfen | Nov 2026 |
| **M3 · Check und Unterlagen** | A3 Online-Check (Report-PDF, Leitfaden), A7 Terminmappe und Brief-Entwurf | Dez 2026 |
| **M4 · Demo** | A4 Demo-Generator mit 2 Branchenvorlagen (Kfz, Schreiner), Vorschau-Hosting mit Zugangscode, Löschung nach 60 Tagen, A5 QA | Jan 2027 (Stufe 1) |
| **M5 · Abschluss und Finanzen** | A6 Prozess-Check-Auswertung, Angebot aus der Preistabelle, E-Signatur, Stripe-Checkout mit SEPA-Mandat. **Finanzen in der Kundenakte:** Rechnungen, Zahlungen, Umsatz, offene Posten aus Stripe-Webhooks | Jan–Feb 2027 |
| **M5b · Buchhaltung und Postfach** | Buchhaltung per Klick über lexoffice- oder sevDesk-API (E-Rechnung, Zahlungsabgleich, Belege, DATEV-Export). Postfach: eingehende Mails in der Zeitleiste, Entwürfe ins Postfach. Siehe `docs/zielbild.md` | Feb–Mär 2027 |
| **M6 · Lieferung** | A8 Bau-Agent, Kundenportal für Rückfragen, Reports, Upsell-Signale | bis Apr 2027 (Stufe 2) |

## Rechtliche Leitplanken (fest eingebaut)

- **Keine Werbe-E-Mails ohne Einwilligung** (§ 7 UWG, auch B2B). Versand-Knopf nur bei `hat_selbst_angefragt` oder dokumentierter Einwilligung, sonst Brief-Entwurf.
- **Google-Daten:** Dauerhaft nur die `place_id`, Stammdaten aus dem Impressum.
- **DSGVO:** Nur geschäftliche Angaben. Bei Erstkontakt Information nach Art. 14 DSGVO (Hinweis im Brief), Widerspruch führt zum Status `ausgeschlossen`. Löschfristen für Demos (60 Tage) und nicht verfolgte Leads (Vorschlag 12 Monate).
- **Aufzeichnung** nur mit vermerkter Einwilligung (§ 201 StGB), Audio nach Transkription löschen.
- **KI-Kennzeichnung** auf kundenseitigen Dokumenten (Art. 50 EU AI Act).

*Orientierung, keine Rechtsberatung.*
