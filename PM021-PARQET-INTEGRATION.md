# PM-021 – Parqet-Abgleich (Stand 11.11.2026)

## Verifizierte Datenquelle
Parqet-Connector, neun zugängliche Portfolios, Holdings-Abfrage in EUR, 11.11.2026. Die aggregierten Werte sind **keine** validierte konsolidierte PM-021-Bilanz. **Keine personenbezogenen Positionen, Kontodaten oder aktuellen Vermögenswerte im Repository speichern.**

## Integration und Abgrenzung
- Der Browser der GitHub-Pages-Anwendung hat **keinen direkten Zugriff** auf die authentifizierte ChatGPT-Parqet-Verbindung. Eine angebliche automatische Synchronisierung ohne eigene autorisierte API-Integration wäre falsch.
- Sichere V1-Option: Parqet-Positionsdaten als lokale Datei importieren und ausschließlich im Browser verarbeiten. Schema- und Betragsvalidierung, Währung und Kursstichtag verlangen.
- Positionen aus allen neun Portfolios erfassen, aber Zuordnung **auf Holding-Ebene**, nicht pauschal je Depot.
- Goldproduzenten-ETF und Royal Gold im Lars-Erichsen-Depot bleiben Trading; übrige Goldpositionen vorläufig Topf 2.
- Lars-Erichsen-Strategie: insgesamt 400.000 EUR einschließlich 100.000 EUR Skipper Capital GmbH; GmbH-Anteil nicht zusätzlich addieren.
- Schwab: eigene Risikoüberwachung; Parqet-Options-Custom-Holding, Aktien und Cash nicht unbesehen als brokerseitige Net Liquidation interpretieren.
- Parqet-Girokonten, Tagesgeld, Cash und Wertpapierbestände nach eindeutiger Quelle/ID zusammenführen; nicht dieselbe Kontoposition mehrfach zählen.
- Parqet enthält möglicherweise keine vollständigen externen Bankguthaben, Unternehmenswerte oder nicht erfasste Anlagen.
- Für Gesamt-Drawdown eine konsistente historische Vermögenszeitreihe und definierte Ein-/Auszahlungen verwenden; Peak/Current aus Einzelstichtagen ist nur eine grobe Anzeige.

## Noch nicht implementiert
1. Sicherer lokaler Parqet-Dateiimport und Holding-zu-Topf-Zuordnung mit persistierbarer Konfiguration.
2. Reproduzierbarer Vergleich zu externen Konten, Firmenbeständen und Schwab-NLV.
3. End-to-End-Validierung mit vollständigem realem Datensatz.

## Freigabe
Draft PR #3, keine Veröffentlichung, kein Merge, keine Handelsfreigabe.
