#!/bin/bash
# Betriebssystem auf dem Mac starten: Doppelklick (beim ersten Mal: Rechtsklick → Öffnen)
cd "$(dirname "$0")" || exit 1
ROOT="$(pwd)"
PGBIN="/Applications/Postgres.app/Contents/Versions/latest/bin"
PORT=3000

pause_ende() { echo; read -r -p "Enter drücken zum Schließen …"; exit "${1:-1}"; }

# Passwort verdeckt abfragen (zweimal) und Benutzer anlegen
benutzer_anlegen() {
  local name="$1" email="$2" rolle="$3" pw1 pw2
  while true; do
    read -r -s -p "Passwort für $email (mind. 12 Zeichen): " pw1; echo
    read -r -s -p "Passwort wiederholen: " pw2; echo
    if [ "$pw1" != "$pw2" ]; then echo "Die Passwörter stimmen nicht überein."; continue; fi
    if [ ${#pw1} -lt 12 ]; then echo "Bitte mindestens 12 Zeichen."; continue; fi
    SEED_PASSWORT="$pw1" npm run -s db:seed -- benutzer "$name" "$email" "$rolle" && return 0
  done
}

echo "=== Betriebssystem ==="

# 1. Node.js (mind. 22.9)
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js fehlt. Bitte die LTS-Version installieren, dann erneut starten."
  open "https://nodejs.org/de/download"
  pause_ende
fi
if ! node -e 'const [a,b]=process.versions.node.split(".").map(Number);process.exit(a>22||(a===22&&b>=9)?0:1)'; then
  echo "Node.js $(node -v) ist zu alt (mind. 22.9). Bitte die aktuelle LTS-Version installieren."
  open "https://nodejs.org/de/download"
  pause_ende
fi

# 2. Datenbank (Postgres.app)
if [ ! -x "$PGBIN/psql" ]; then
  echo "Postgres.app fehlt. Bitte installieren, in den Programme-Ordner ziehen, öffnen und auf „Initialize“ klicken."
  open "https://postgresapp.com/de/downloads.html"
  pause_ende
fi
if ! "$PGBIN/pg_isready" -q -h localhost -p 5432; then
  echo "Starte Postgres.app …"
  open -a Postgres
  for _ in 1 2 3 4 5 6 7 8 9 10; do sleep 2; "$PGBIN/pg_isready" -q -h localhost -p 5432 && break; done
fi
if ! "$PGBIN/pg_isready" -q -h localhost -p 5432; then
  echo "Die Datenbank läuft nicht. In Postgres.app auf „Initialize“ bzw. „Start“ klicken und dieses Programm erneut öffnen."
  pause_ende
fi
if ! "$PGBIN/psql" -h localhost -d postgres -tAc "select 1 from pg_database where datname='crm'" | grep -q 1; then
  echo "Lege Datenbank „crm“ an …"
  "$PGBIN/createdb" -h localhost crm || pause_ende
fi

# 3. Einstellungen (einmalig)
if [ ! -f web/.env.local ]; then
  printf 'DATABASE_URL=postgres://localhost:5432/crm\nSESSION_SECRET=%s\n' "$(openssl rand -hex 32)" > web/.env.local
  chmod 600 web/.env.local
fi
[ -f worker/.env.local ] || cp web/.env.local worker/.env.local

# Läuft es schon? Dann nur den Browser öffnen.
if lsof -nP -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Läuft bereits. Öffne http://localhost:$PORT"
  open "http://localhost:$PORT"
  exit 0
fi

cd "$ROOT/web" || exit 1

# 4. Pakete (einmalig, dauert ein paar Minuten)
if [ ! -d node_modules ]; then
  echo "Installiere Pakete (nur beim ersten Start, dauert einige Minuten) …"
  npm install --no-fund --no-audit || pause_ende
fi

# 5. Datenbank aktualisieren
npm run -s db:migrate || pause_ende

# 6. Ersten Benutzer anlegen
ANZAHL=$("$PGBIN/psql" -h localhost -d crm -tAc "select count(*) from benutzer where passwort_hash is not null")
if [ "$ANZAHL" = "0" ]; then
  echo
  echo "Noch kein Benutzer vorhanden. Lege deinen Zugang an."
  read -r -p "Dein Name: " NAME
  read -r -p "Deine E-Mail: " EMAIL
  benutzer_anlegen "$NAME" "$EMAIL" technik
  read -r -p "Zugang für Daniel auch gleich anlegen? (j/n) " J
  if [ "$J" = "j" ]; then
    read -r -p "E-Mail von Daniel: " EMAIL2
    benutzer_anlegen "Daniel" "$EMAIL2" vertrieb
  fi
  read -r -p "Beispielbetriebe zum Ausprobieren laden? (j/n) " J
  [ "$J" = "j" ] && npm run -s db:seed -- demo
fi

# 7. Bauen, wenn noch nicht gebaut oder Dateien geändert wurden
if [ ! -f .next/BUILD_ID ] || [ -n "$(find src package.json -newer .next/BUILD_ID -print -quit)" ]; then
  echo "Baue das Programm …"
  npm run -s build || pause_ende
fi

# 8. Starten
echo
echo "Das Betriebssystem läuft: http://localhost:$PORT"
echo "Dieses Fenster offen lassen. Beenden mit Ctrl+C oder Fenster schließen."
(sleep 3; open "http://localhost:$PORT") &
npx next start -p $PORT
