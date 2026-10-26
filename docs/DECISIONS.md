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
