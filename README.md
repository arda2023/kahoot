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
