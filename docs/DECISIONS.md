# Entscheidungen

- 26.10.2026: Browseranwendung und npm-Workspaces; Node 24 ist vorhanden. Keine nativen Apps im MVP.
- PostgreSQL bleibt einzige Quelle für Spielzustand, Fristen, Antworten und Ergebnisse.
- Lokale DB nutzt ausschließlich Loopback und Trust-Authentifizierung im Entwicklungscontainer;
  keine Passwörter im Repository. Das ist keine Produktionskonfiguration.
- Host- und Spielerrechte werden durch zufällige geheime Tokens ersetzt, für Gastteilnahme und Host-Wiederaufnahme. Ersteller erhalten in Phase 3 Konten. Browser speichert sie lokal; Backend speichert nur SHA-256-Hashes.
- Neue Teilnehmer nur in Lobby; Reconnect bestehender Teilnehmer auch während der Runde.
- Eigenes Seed-Quiz und eigene Punkteformel, keine Inhalte oder Assets des Referenzprodukts.
- Gleichstand bedeutet gleiche Platzierung (1, 1, 3); sortierte Namen stabilisieren nur die Anzeige.
- Host steuert Auflösung -> Rangliste -> nächste Frage. Ablauf/alle Antworten schließen automatisch.
- Keine zusätzlichen Agenten; Umsetzung und Prüfungen in diesem Chat.
- Playwright nutzt vollständiges Chromium (channel chromium), weil die macOS Headless Shell
  bei der Aktions-Stabilitätsprüfung hängen blieb. Kein erzwungener Klick als Testumgehung.
  Browser-Temporärdaten werden für weitere Tests in .local/tmp im Projekt abgelegt.
- Test-Seeds können per SEED_SECONDS beschleunigt werden; veröffentlichte Nutzerquizze
  verwenden immer ihr gespeichertes Zeitlimit.
- Konten: lokales E-Mail/Passwort-Login, scrypt mit individuellem Salt, HttpOnly-Cookie und
  gehashte Sitzungstokens. Keine E-Mail-Verifikation oder Passwort-Rücksetzung im lokalen MVP.
- Bilder: bis 5 MB, PNG/JPEG/WebP, serverseitig dekodiert, auf höchstens 1600×1200 verkleinert
  und als WebP neu gespeichert. Uploads liegen ausschließlich im Projektordner uploads/.
- Editor speichert bewusst per Schaltfläche, warnt bei ungespeicherten Änderungen und prüft
  Revisionsnummern. Veröffentlichen erzeugt einen neuen unveränderlichen Datensatz.
- Outbox wird durch einen PostgreSQL-Trigger innerhalb jeder Raumtransaktion angelegt.
  Publisher sperren Batches mit SKIP LOCKED, veröffentlichen in Redis und markieren erst dann.
  Ein Absturz kann doppelte Invalidierungen erzeugen; versionierte Snapshots sind idempotent.
- Socket.IO Redis-Adapter verbindet API-Instanzen. Zusätzlich verteilt ein Redis-Kanal
  Outbox-Invalidierungen an lokale Sockets jeder Instanz. Reconnect/Poll schließt Pub/Sub-Lücken.
- DB-Schemamigrationen werden per PostgreSQL-Advisory-Lock serialisiert, damit zwei Instanzen
  auch bei leerer Datenbank nicht gleichzeitig inkompatible Initialisierungen durchführen.
- Lokaler App-Neustart wird abgesichert; DB-Failover/Redis-HA und Cloud-Loadbalancer bleiben
  Produktionsaufgaben. Das ist keine Behauptung einer bereits hochverfügbaren Infrastruktur.
