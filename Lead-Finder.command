#!/bin/bash
# Lead-Finder auf dem Mac: Doppelklick (beim ersten Mal: Rechtsklick → Öffnen)
cd "$(dirname "$0")" || exit 1
ROOT="$(pwd)"

pause_ende() { echo; read -r -p "Enter drücken zum Schließen …"; exit "${1:-0}"; }

if [ ! -f web/.env.local ]; then
  echo "Bitte zuerst einmal „Start.command“ öffnen. Das richtet Datenbank und Einstellungen ein."
  pause_ende 1
fi
[ -f worker/.env.local ] || cp web/.env.local worker/.env.local
cd "$ROOT/worker" || exit 1
if [ ! -d node_modules ]; then
  echo "Installiere Pakete (nur beim ersten Mal) …"
  npm install --no-fund --no-audit || pause_ende 1
fi

echo "=== Lead-Finder ==="
read -r -p "Gebiet (z. B. Gablenberg, Karlsruhe, Ettlingen): " GEBIET
[ -z "$GEBIET" ] && pause_ende 1
read -r -p "Gehört das Gebiet zu einer Stadt? Dann Stadt eingeben (z. B. Stuttgart), sonst leer lassen: " STADT
read -r -p "Auch Betriebe ohne eigene Website übernehmen? (j/n) " ALLE

ARGS=(--gebiet "$GEBIET" --csv "$ROOT/Leads-${GEBIET// /_}-$(date +%Y-%m-%d).csv")
[ -n "$STADT" ] && ARGS+=(--stadt "$STADT")
[ "$ALLE" = "j" ] && ARGS+=(--alle)
grep -q '^GOOGLE_MAPS_API_KEY=.\+' .env.local && ARGS+=(--quelle beide)
grep -q '^ANTHROPIC_API_KEY=.\+' .env.local && ARGS+=(--claude)

echo
npm run -s finder -- "${ARGS[@]}"
echo
echo "Die Leads stehen im CRM unter „Neue Leads“ und als CSV im Programmordner."
pause_ende
