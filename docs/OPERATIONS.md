# Betrieb nach dem lokalen Prototyp

Diese Schritte sind geplant, nicht eingerichtet. Es wurden keine Cloud-Konten angelegt,
keine Bezahldienste gebucht und kein öffentlicher Pilot gestartet.

## Hosting

- Web hinter HTTPS/CDN; API auf mindestens zwei dauerhaft laufenden Instanzen, gemeinsam mit
  verwaltetem PostgreSQL und Redis. Alle Dienste in einer passenden gemeinsamen Region.
- Load Balancer mit WebSocket-Unterstützung und Cookie-Stickiness für HTTP-Long-Polling.
  Bei reinem WebSocket-Transport reicht Verteilung der Verbindungsaufbauten.
- Verbindungsdraining vor Deployment, kompatible Datenbankmigrationen und Rollback-Plan.
- Gemeinsamer Bildspeicher statt lokaler Upload-Ordner auf getrennten Hosts.
- WEB_ORIGIN und COOKIE_SECURE korrekt konfigurieren; HTTPS, geschützte DB/Redis-Netze,
  separate DB-Rollen, Secret-Verwaltung außerhalb des Repositories.
- E-Mail-Verifikation, Passwort-Rücksetzung, Kontolöschung, Datenexport und Löschfristen vor
  öffentlicher Nutzung ergänzen. Aufbewahrung und Einwilligungen für den Schulkontext klären.

## Backups und Wiederherstellung

- PostgreSQL: regelmäßige vollständige Sicherungen plus kontinuierliche WAL-Archivierung
  für zeitpunktgenaue Wiederherstellung. Upload-Dateien zusammen mit ihren DB-Referenzen sichern.
- Verschlüsselte getrennte Ablage, Zugriff beschränken, Aufbewahrungsregeln festlegen.
- Vor Pilotbetrieb vollständigen Restore auf isolierter Umgebung durchführen und messen.
  Vorgeschlagene erste Ziele: maximal eine Stunde Datenverlust, Wiederanlauf in einer Stunde;
  diese Ziele sind nicht nachgewiesen. Für bestätigte Antworten bei DB-Failover ist passende
  synchrone Replikation erforderlich; der lokale App-Neustarttest beweist das nicht.
- Redis enthält keine alleinigen Antworten/Ergebnisse. Nach Redis-Ausfall bleiben DB-Daten
  erhalten; Rate-Limits und Echtzeitverteilung benötigen wieder verfügbares Redis.

## Monitoring und Wartung

- /health prüft PostgreSQL und Redis. Antwortlatenz, Fehlerquote, offene Sockets, Poolbelegung,
  Outbox-Rückstand, Redis-Verfügbarkeit, CPU und Speicher überwachen.
- Alarme bei steigender Antwortlatenz, nicht ablaufenden Fragen oder wachsender Outbox.
- Alte Sitzungen, Raumtokens, Rate-Limit-Schlüssel und ausgelieferte Outbox-Einträge anhand
  definierter Fristen bereinigen. DB-Tabellen des Prototyps wachsen derzeit dauerhaft.
- Logs ohne Passwörter, Sitzungstokens oder Antwortinhalte. Den Zugriff auf Berichte begrenzen.

## Pilot

1. Zuerst interne Runde mit 5–10 Geräten und absichtlichen WLAN-Unterbrechungen.
2. Anschließend einzelne Klasse mit 30–40 Geräten und Rückmeldung zu Verständlichkeit.
3. Schrittweise mehr Klassen, mobile Browser und schwächere Netzwerke erproben.
4. Größere Kapazitäten erst nach Messung auf der tatsächlichen Produktionsinfrastruktur zusagen.

## Lokale Grenzen

- Lokal auf Loopback gebunden, QR zeigt auf die aktuelle lokale Webadresse. Kein extern
  erreichbarer Dienst und kein für Smartphones im WLAN eingerichteter Server.
- Kein automatischer Load Balancer; Ausfall-/Lasttests verbinden sich direkt mit zwei Ports.
- HTTP lokal und Trust-Authentifizierung im nur lokal veröffentlichten DB-Container.
- Lastmessungen stammen von einem Rechner ohne Internetlatenz und sind keine SLA.
