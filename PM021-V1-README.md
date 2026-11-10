# PM-021 – Integrierter Portfolio-Risikorechner V1 (Entwicklungsstand)

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
- Das Dashboard prüft die zeitliche Übereinstimmung der beiden CSV-Dateien noch nicht automatisch.
- Bestehende Buying-Power-Eingaben und PM-021-Marginwerte sind separate Eingabefelder; sie werden nicht automatisch abgeglichen.
- Die Anwendung ist ein **Entwurf zur gemeinsamen Prüfung**, nicht für verbindliche Handelsentscheidungen freigegeben.

## Datenschutz / Veröffentlichung
CSV-Dateien werden im Browser verarbeitet; es werden keine echten Schwab-Kontodaten ins Repository eingecheckt. Der Entwicklungszweig und PR #3 werden **nicht automatisch** in `main` übernommen.
