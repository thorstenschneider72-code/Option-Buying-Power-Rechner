# PM-021 – Integrierter Portfolio-Risikorechner V1.0 (abgeschlossene Testversion)

## Bedienung
1. Bestehende Buying-Power-Eingaben können unverändert verwendet werden.
2. Unter „Portfolio Risk Dashboard“ die aktuelle Schwab Balances CSV auswählen.
3. Unter „Schwab-CSV-Stresstest“ die Positions-CSV **vom selben Zeitpunkt** auswählen.
4. Fehlende Basiswertkurse von Short-Optionen aus der gleichen Momentaufnahme manuell ergänzen.
5. Die tatsächliche **Maintenance Requirement** aus thinkorswim eingeben. Der Balances-Export enthält diesen Wert möglicherweise nicht.
6. Stresstest starten und 0/−10/−20/−30/−40 % vergleichen. Der −20-%-Depotverlust wird zusätzlich gegen den Account Value ausgewiesen.

## Berechnungsumfang
- Long-Aktien/ETFs, Short Puts und Short Calls; nominale Short-Put-Verpflichtungen.
- Gehebelte ETFs werden im Szenario stark vereinfacht linear mit dem hinterlegten Hebelfaktor modelliert.
- Options-Zeitwerte und die Maintenance im Stress werden durch vereinfachte Annahmen geschätzt.
- Fehlende Optionsbasiswerte oder nicht lesbare Optionszeilen sperren die Rechnung.
- Ohne Maintenance Requirement keine Stressrechnung. Kein Szenarioergebnis stellt eine Handelsfreigabe dar.

## Nicht enthalten / bekannte Einschränkungen
- **Keine brokergetreue Schwab-Margin-Prognose**; House-Margin, Portfolio Margin, Konzentrationszuschläge, Reg-T-Sonderfälle und Intraday-Veränderungen können stark abweichen.
- Short-Call-Margin, Short-Aktien, Spreads, Greeks, täglicher Hebelpfad, Korrelation und Zuteilung sind nicht vollständig abgebildet.
- Import und Modell basieren auf den unterstützten Schwab-CSV-Layouts. Bei abweichenden Exporten ist ein erneuter Test erforderlich.
- Das Dashboard sperrt die Berechnung bei nicht übereinstimmenden oder nicht lesbaren Zeitstempeln der beiden CSV-Dateien. Der **manuell eingegebene** Maintenance-Wert hat jedoch keinen maschinenlesbaren Zeitstempel und muss separat mit dem Kontostand abgeglichen werden.
- Bestehende Buying-Power-Eingaben und PM-021-Marginwerte sind separate Eingabefelder; sie werden nicht automatisch abgeglichen.
- **Status V1.0: technische Testversion abgeschlossen, nicht für verbindliche Handelsentscheidungen freigegeben.**

## Datenschutz / Veröffentlichung
CSV-Dateien werden im Browser verarbeitet; es werden keine echten Schwab-Kontodaten ins Repository eingecheckt. Der Entwicklungszweig und PR #3 werden **nicht automatisch** in `main` übernommen.

## Abschlussprotokoll V1.0 – 11.11.2026
- GitHub Actions für Commit `3bcd89ea25555e859682a8b7b0d2653152084292`: beide Workflows erfolgreich.
- Historischer Schwab-CSV-Snapshot vom **10.11.2026 06:18 ET**: Account Value **516.978,23 USD**, Margin Equity **349.464,65 USD**, Short-Put-Nominal **144.900 USD**; 8 Aktien-, 10 ETF-, 13 Short-Put- und 18 Short-Call-Zeilen. Short Calls nach Stückzahl gedeckt. Positionszeilen-`Margin Req` summieren sich auf **222.083 USD**; das ist **keine** bestätigte gesamte Broker-Maintenance.
- Nutzer meldet am **11.11.2026** die **aktuelle gesamte Maintenance Requirement von 223.700 USD**. Diese Angabe ist **nicht nachweislich zeitgleich** mit dem CSV-Snapshot vom Vortag. Sie darf deshalb nicht als bestätigte historische Maintenance in den 10.11.-Stresstest übernommen werden.
- Rein illustrative Gegenüberstellung mit der *historischen* Margin Equity: 223.700 / 349.464,65 = **64,01 %**; rechnerischer Puffer 125.764,65 USD. **Kein aktuelles Margin Ratio und keine zeitgleiche Kontorechnung!** Für aktuelle Kennzahlen muss die aktuelle Margin Equity aus Schwab verwendet werden.
- Historische Ersatzkurse für CRWL, DIS, FCX, LLYX und TQQQ sind nicht Schwab-Snapshot-Marks. Früher genannte Stress-Puffer/-Verluste sind unvalidierte Modellrechnungen und dürfen nicht als Brokerwerte verwendet werden.
- **Abnahmestatus:** Technische V1.0-Testversion abgeschlossen; kein Merge, kein Deployment, keine Live-Handelsfreigabe. V1.1-Backlog: Zeitstempel/Quelle des Maintenance-Werts, brokerseitige Stressmargin, exakte Options- und Hebelmodellierung, Echtzeit-Datenabgleich.
