# Quizwerk

Eigenständige Live-Quizplattform. Node.js 24, npm und Docker mit Compose benötigt.
Auf macOS kann Docker über Colima laufen. Alle Befehle im Projektverzeichnis ausführen.

```sh
npm ci
docker compose up -d --wait
npm run dev
```

Web: http://localhost:3000 — API: http://localhost:3001/health.
Alternativ `docker compose up` im eigenen Terminal. Daten bleiben im Projekt-Docker-Volume.
PostgreSQL: localhost:55432, Benutzer/Datenbank quiz; Redis: localhost:56379.
Lokale Trust-Authentifizierung, nur Loopback: diese Compose-Datei nicht öffentlich betreiben.

```sh
npm run check  # ESLint, TypeScript, Unit-Tests
npm run build # Produktionsbuild aller Pakete, API und Web
```

Plan, Recherche und Fortschritt: docs/PLAN.md, docs/FEATURES.md, docs/PROGRESS.md.

## Live-Spiel
Auf der Startseite „Beispielquiz starten“ wählen. Spieler öffnen die Startseite in einem
anderen Browserprofil/Gerät, geben PIN und Namen ein. Host startet; nach jeder Frage zeigt
er die Rangliste und öffnet die nächste Frage. Zugänge werden pro Raum lokal im Browser
aufbewahrt; Reload nimmt dieselbe Teilnahme wieder auf. Auf fremden Geräten nicht speichern.

## Automatisierte Multiplayer- und Browsertests
Dienste mit Compose starten. Einen laufenden Next-Entwicklungsserver vor E2E beenden.
Die Tests starten/stoppen ihre eigenen API- und Webprozesse (Ports 3101, 3200, 3201).

```sh
npm run test:integration
PLAYWRIGHT_BROWSERS_PATH=0 npx playwright install chromium
npm run test:e2e
```

Integration: 30 Spieler, drei Fragen, 89 gespeicherte Antworten (eine absichtlich zu spät),
Duplikate und keine Lösungen/Punkte vor Fristende. E2E: Host und zwei unabhängige Browser,
inklusive Spieler-Reload nach bestätigter Antwort, bis zum Endstand. Testdaten bleiben
in der lokalen Entwicklungsdatenbank und verwenden zufällige Raum-IDs.

## Eigene Quizze
Unter „Meine Quizze“ ein lokales Erstellerkonto registrieren (Passwort mindestens zehn
Zeichen). Im Editor Fragen hinzufügen, Single Choice oder Wahr/Falsch wählen, Zeitlimit
festlegen und optional ein Bild hochladen. Fragen lassen sich verschieben und entfernen.
„Entwurf speichern“ speichert Änderungen; „Veröffentlichen“ friert eine neue Version ein.
„Spielen“ in der Bibliothek verwendet die zuletzt veröffentlichte Version. Ein laufendes
Spiel bleibt auch von späteren Veröffentlichungen unverändert. Duplizieren und Archivieren
sind ebenfalls in der Bibliothek verfügbar.

Bilder liegen in uploads/ und werden nicht eingecheckt. Konten, Sitzungen, Quizze und
Antworten liegen in PostgreSQL. Lokale Konten versenden keine E-Mails; Verifikation und
Passwort-Rücksetzung sind noch nicht implementiert. Keine echten Schülerdaten verwenden,
solange der Produktionsbetrieb nicht eingerichtet und geprüft wurde.

## Präsentation und Ergebnisse
In der Host-Lobby zeigt der QR-Code auf den Beitrittslink mit vorausgefüllter PIN.
„Präsentationsansicht“ vergrößert Fragen und Antwortflächen für den Beamer; erneut klicken
kehrt zur normalen Ansicht zurück. Spieler sehen Text und Symbole auf großen Touchflächen.
Nach Spielende öffnet der Host den Ergebnisbericht mit Frageauswertung und CSV-Download.
Der Bericht benötigt den Host-Zugang; Spieler können ihn nicht abrufen. Namen mit
Formel-Präfix werden im CSV neutralisiert. Branding: packages/ui/src/index.ts.

## Zwei API-Instanzen und Wiederherstellung
Nach `npm run build:packages && npm run build -w @quiz/api` zwei Terminals öffnen:

```sh
PORT=3001 node apps/api/dist/main.js
# Zweites Terminal:
PORT=3002 node apps/api/dist/main.js
```

Beide verwenden dieselben Compose-Dienste. Socket.IO hat einen Redis-Adapter; die Outbox
verteilt persistierte Zustandsänderungen an beide Instanzen. Web verwendet standardmäßig
3001. Für eine zweite Web-Instanz den ersten Next-Devserver beenden und mit
`NEXT_PUBLIC_API_URL=http://localhost:3002 npm run dev -w @quiz/web` starten.
Ein automatischer Load Balancer ist lokal nicht eingerichtet; den Instanzwechsel testen
Socket.IO-Integrationstests direkt. Im normalen Betrieb verbindet ein Reload wieder mit
der konfigurierten Instanz, sobald sie verfügbar ist.

Fristen liegen in PostgreSQL. Nach API-Neustart werden abgelaufene Fragen geschlossen.
Host-Ausfall: aktuelle Frage läuft bis zum Ende; der Übergang zur nächsten Frage wartet
auf den wiederverbundenen Host. Antworten sind vor dem ACK gespeichert. Eine erneute
Abgabe derselben Antwortidentität liefert den gespeicherten Wert, ohne weitere Punkte.
Outbox-Invalidierungen können mehrfach kommen; Clients laden einen versionierten Snapshot.
Redis-Pub/Sub ist kein dauerhaftes Client-Postfach: Reconnect und regelmäßiger Zustandsabgleich
schließen Zustellungslücken. PostgreSQL ist die maßgebliche Datenquelle.
