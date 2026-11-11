/* PM-021 consolidated planning UI. Browser-local; no broker orders. */
(function(){
'use strict';
if(typeof document==='undefined'||!globalThis.PM021Portfolio)return;
function ready(){
 const anchor=document.getElementById('pmDashboard')||document.getElementById('exposureCard');
 if(!anchor)return;
 const section=document.createElement('section');section.className='card';section.id='pmPortfolio';
 section.innerHTML='<h2>PM-021 · Gesamtportfolio / Topfmodell (Testversion)</h2>'+
 '<p class="erk">EUR-Marktwerte je Bereich eingeben. Die 100.000 € Skipper Capital gehören zum Lars-Erichsen-Gesamtvolumen von 400.000 € und werden nicht zusätzlich gezählt. Schwab wird separat ausgewiesen. Kein Live-Datenabruf und keine Handelsfreigabe.</p>'+
 '<div id="pmPortfolioInputs"></div>'+
 '<div class="field"><label class="fl" for="pmPeak">Gesamtportfolio: bisheriger Höchststand (€; optional)</label><input type="number" id="pmPeak" min="0" step="any"></div>'+
 '<div class="field"><label class="fl" for="pmCurrent">Gesamtportfolio: aktueller Wert (€; optional)</label><input type="number" id="pmCurrent" min="0" step="any"></div>'+
 '<button type="button" class="btn" id="pmPortfolioRun">Topfmodell berechnen</button>'+
 '<div id="pmPortfolioResult" aria-live="polite"></div>'+
 '<p class="erk">Wichtig: Die Drawdown-Berechnung verwendet die separat eingegebenen EUR-Gesamtportfolio-Werte; die Bereichssummen sind keine automatische Zeitreihe. Schwab-USD-Werte müssen vor der Eingabe mit einem dokumentierten Kurs in EUR umgerechnet werden. Warnstufen sind Hinweise, keine Orders.</p>';
 anchor.insertAdjacentElement('afterend',section);
 const fields=[['bucket1','Topf 1 (€)'],['bucket2','Topf 2 (€)'],['bucket3','Topf 3 (€)'],['larsPrivate','Lars-Erichsen privat (€)'],['larsGmbH','Lars-Erichsen GmbH (€)'],['schwab','Schwab separat (€)'],['unassigned','Noch nicht zugeordnet (€)']];
 const inputArea=section.querySelector('#pmPortfolioInputs');
 for(const [key,label] of fields){
  const div=document.createElement('div');div.className='field';
  const l=document.createElement('label');l.className='fl';l.htmlFor='pmp-'+key;l.textContent=label;
  const i=document.createElement('input');i.id='pmp-'+key;i.type='number';i.min='0';i.step='any';i.placeholder='Noch nicht eingegeben';
  div.append(l,i);inputArea.append(div);
 }
 const euro=n=>n.toLocaleString('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0});
 section.querySelector('#pmPortfolioRun').addEventListener('click',()=>{
  const out=section.querySelector('#pmPortfolioResult');
  try{
   const entries=fields.map(([key])=>{const raw=section.querySelector('#pmp-'+key).value.trim();if(raw==='')throw Error('Bitte alle sieben Bereichswerte eingeben (0 ist zulässig).');return {id:key,bucket:key,valueEUR:Number(raw)};});
   const peak=section.querySelector('#pmPeak').value.trim(),current=section.querySelector('#pmCurrent').value.trim();
   if((peak==='')!==(current===''))throw Error('Für Drawdown bitte Höchststand und aktuellen Wert gemeinsam eingeben.');
   const options=peak===''?{}:{peakEUR:Number(peak),currentEUR:Number(current)};
   const r=globalThis.PM021Portfolio.summarize(entries,options);
   out.replaceChildren();
   const lines=[
    'Gesamtwert der eingegebenen Bereiche: '+euro(r.portfolioTotalEUR),
    'Topf 1: Fehlbetrag '+euro(r.fundingGapEUR.bucket1)+' (Soll '+euro(r.targetsEUR.bucket1)+')',
    'Topf 2: Fehlbetrag '+euro(r.fundingGapEUR.bucket2)+' (Soll '+euro(r.targetsEUR.bucket2)+')',
    'Lars-Erichsen gesamt (inkl. GmbH): '+euro(r.larsStrategyEUR)+'; Abweichung vom 400.000-€-Ziel: '+euro(r.larsTargetDifferenceEUR),
    'Schwab gesondert erfasst: '+euro(r.totalsEUR.schwab),
    'Drawdown: '+(r.drawdown===null?'nicht berechnet':(100*r.drawdown).toFixed(1)+' %')+' – '+r.drawdownStatus,
    r.totalsEUR.unassigned===0?'Kein unzugeordneter positiver Betrag in den erfassten Eingaben (keine Vollständigkeitsbestätigung).':'Offene Zuordnung: '+euro(r.totalsEUR.unassigned)
   ];
   for(const line of lines){const p=document.createElement('p');p.textContent=line;out.append(p);}
  }catch(err){out.textContent='Eingabeprüfung: '+err.message;}
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
})();
