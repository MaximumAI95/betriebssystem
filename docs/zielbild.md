# Zielbild: ein einziges Werkzeug für die ganze Firma

Das Betriebssystem ist das einzige Tool, mit dem Max und Daniel arbeiten. Klickt man auf einen Kunden, sieht man alles: Gespräche, Dokumente, Angebote, Rechnungen, Zahlungen, Umsatz und E-Mails.

## Kundenakte: Finanzen

- **Rechnungen und Zahlungen aus Stripe:** Stripe-Webhooks (`invoice.*`, `payment_intent.*`, `customer.subscription.*`, `mandate.updated`) schreiben in eigene Tabellen. Die Kundenakte zeigt jede Rechnung mit Betrag, Fälligkeit und Status (offen, bezahlt, überfällig, fehlgeschlagene Lastschrift).
- **Kennzahlen je Kunde:** Umsatz gesamt, offene Posten, laufende Abos und monatlicher wiederkehrender Umsatz, Zahlungsmoral.
- **Firmenweit:** Monatsumsatz, wiederkehrender Umsatz, offene Posten, Liquidität (Grundlage für die Gehaltsregel im Plan).

## Buchhaltung per Klick

- **Kein eigenes Buchhaltungsprogramm.** Rechnungen müssen GoBD-konform und ab 2027/2028 als E-Rechnung (ZUGFeRD/XRechnung) erstellt werden. Das leistet lexoffice oder sevDesk zuverlässig. Das Betriebssystem steuert es über deren API.
- **Ein Klick in der Kundenakte:** Rechnung aus dem Angebot erzeugen, E-Rechnung über die Buchhaltung erstellen, Zahlung über Stripe einziehen, Zahlungseingang automatisch abgleichen.
- **Belege:** Eingangsrechnungen landen per Upload oder E-Mail im System, werden ausgelesen und an die Buchhaltung übergeben. Der Steuerberater bekommt den DATEV-Export.

## Postfach

- **Eingehende E-Mails** werden dem passenden Betrieb zugeordnet (Absender-Domain, Kontakt) und erscheinen in der Zeitleiste.
- **Ausgehende E-Mails** schreibt der Unterlagen-Agent und legt sie als **Entwurf ins Postfach**. Man prüft sie im gewohnten Mailprogramm und klickt auf Senden. Technisch: Gmail-API, Microsoft Graph oder IMAP, je nach Anbieter.
- **Versandregel (§ 7 UWG):** Entwürfe an Betriebe ohne Anfrage oder Einwilligung erzeugt das System nicht. Für diese Fälle entsteht ein Brief-Entwurf.

## Automatisch, aber mit Haltepunkten

Alles läuft ohne Zutun, außer an den Stellen, die der Plan als Freigabe vorsieht: Lead-Einstufung, Angebot, Livegang, Rechnungen über 10.000 € und der Versand nach außen.
