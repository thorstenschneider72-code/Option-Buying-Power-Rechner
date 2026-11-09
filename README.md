# Option Buying Power Rechner

Statische Browser-App: `index.html` und `risk.js` gemeinsam ausliefern. Keine externen Laufzeitbibliotheken. Kontowerte und Put-Positionen werden ausschließlich im lokalen Browserspeicher gehalten; die Löschfunktion entfernt beide Datensätze. Alte `obp25`-Kontowerte bleiben lesbar.

## Prüfung des Ausgangscodes

Version 2.5 enthielt nur `index.html`, ohne Tests. Sie berechnet Reserve = NLV × Stress + NLV × Reservequote + 10 % Maintenance (ersatzweise 5 % NLV). Buying Power minus Reserve ist eine persönliche Faustregel, keine brokerseitig verfügbare oder sicher einsetzbare Buying Power. NLV ist kein Brutto-Aktienexposure. Margin Equity minus Maintenance ist eine Momentaufnahme, kein garantierter Abstand zu einem Margin Call. Die frühere Sicherheitszusage und Handelsfreigabe wurden deshalb durch beschreibende Texte ersetzt. Eingaben von null bei Buying Power sind jetzt zulässig.

## Neue Berechnungen

- Margin-Auslastung: gemeldete Maintenance / gemeldete Margin Equity. Nicht Margin Debt / Assets (LTV), nicht 1 − freie Buying Power / NLV.
- Erfasst werden ausschließlich offene, ungedeckte Standard-Aktienputs in USD, physische Lieferung, 100 Aktien je Kontrakt, Reg-T. Keine Spreads/Offsets, Portfolio Margin, Indexoptionen, gehebelten Produkte oder angepassten Kontrakte. Dafür ist das Modell nicht geeignet.
- Brutto-Strike-Nominal und maximale vertragliche Kaufzahlung bei vollständiger Zuteilung: Summe Strike × 100 × Kontrakte. Keine Prämienverrechnung. Anzahl übernommener Aktien: Summe 100 × Kontrakte. Keine Aussage zu frei verfügbarem Cash oder tatsächlichem Nettokreditbedarf. ITM-Nominal zeigt lediglich Positionen mit Szenariokurs unter Strike; kein Assignment-Timing und keine Wahrscheinlichkeit.
- Modellierte Put-Anforderung: pro Kontrakt max(100 × (0,20 × S − max(S−K,0) + P), 100 × (0,10 × K + P), 100 USD). P ist der aktuelle Marktwert je Optionsaktie, nicht die erhaltene Prämie. Konto-Mindestequity und Sonderanforderungen sind gesondert zu prüfen.
- Szenarien: 0 %, −10 %, −20 %, −30 % sowie der gewählte Stressprozentsatz. Alle eingegebenen Aktienkurse fallen proportional. Der Optionspreis ist ausdrücklich eine Annahme: neuer innerer Wert plus heutiger Zeitwert × frei wählbarer Faktor. Kein Black-Scholes-/Volatilitätsmodell. Im 0-%-Szenario bleibt der Mark unverändert.
- Verlust: Long-Aktienwert × Kursrückgang + Veränderung der Short-Put-Verbindlichkeit. Keine zusätzliche Abziehung des Assignment-Kaufpreises: Zuteilung tauscht Geld gegen Aktien. Aktien-Margin nach Assignment ist nicht modelliert.
- Szenario-Maintenance = gemeldete Maintenance − heutige modellierte Put-Margin + Szenario-Put-Margin × House-Faktor. Der House-Faktor betrifft nur Puts. Andere Anforderungen bleiben konstant. Heutiger modellierter Anteil wird nicht noch einmal hinzuaddiert. Wenn der Anteil größer als die gemeldete Maintenance ist, werden Kontoszenarien unterdrückt. Das Modell kann auch bei kleinerem Anteil von Schwabs tatsächlicher Positionszuordnung abweichen.
- Szenario-Margin-Equity = gemeldete Margin Equity − modellierter Verlust. Vorausgesetzt werden vollständige Put-Erfassung, identischer Snapshot und vollständige Anrechnung dieser Verluste auf Margin Equity. Andere Vermögenswerte, Calls, Hedges, FX, Cashflows, Zinsen, Liquidität und brokerseitige Neubewertungen fehlen. Deshalb keine garantierte Margin-Call-Prognose und keine Aussage, ob Schwab bereits vor Erreichen eines Modellwerts liquidiert.

## Quellen

Geprüft am 09.11.2026:

- [Schwab Margin Rates and Requirements](https://www.schwab.com/margin/margin-rates-and-requirements): Options → Equity → Naked Puts; aktuelle Formel, Konto-Mindestequity und Ermessen bei House-Anforderungen.
- [Schwab Margin Disclosure Statement](https://advisorservices.schwab.com/legal/margin-disclosure-statement): House-Anforderungen können kurzfristig steigen.
- Ergänzend öffentlich zugänglich: [MetisTrades – Margin, Cash and LTV](https://www.metistrades.com/blog/guides/guide-margin-and-ltv). Dessen LTV-/persönliche Grenzwerte werden nicht als Schwab-Maintenance interpretiert. Kein Zugriff auf private MetisTrades-Kontodaten, keine Übernahme von Code.

## Tests

Mit Node.js: `node tests/risk.test.cjs` (keine Installation erforderlich). Prüft ATM/ITM/OTM, beide Margin-Untergrenzen, mehrere Positionen, −20-%-Verlust, House-Aufschlag, Nullpositionen und unveränderte 0-%-Bewertung. Die Seitenskripte werden zusätzlich mit einem kleinen DOM-Testdouble ausgeführt: Reserveformel, Buying Power null, Auslastung, fester −20-%-Fall, fehlende Eingaben und Löschen. Dies ersetzt keinen visuellen Browsertest oder Abgleich mit echten Schwab-Trade-Tickets.
