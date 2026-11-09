/* USD, standard physically settled equity puts only. See README.md. */
function putMargin(p, spot=p.spot, mark=p.mark) {
  return p.qty * Math.max(100*(.2*spot-Math.max(spot-p.strike,0)+mark),100*(.1*p.strike+mark),100);
}
function analyseRisk(puts, stockValue, drop, timeFactor, houseFactor) {
  let nominal=0, shares=0, current=0, stressed=0, optionLoss=0, itm=0;
  for(const p of puts){
    const spot=p.spot*(1-drop);
    const mark=drop===0?p.mark:Math.max(p.strike-spot,0)+Math.max(p.mark-Math.max(p.strike-p.spot,0),0)*timeFactor;
    nominal+=p.strike*100*p.qty; shares+=100*p.qty;
    current+=putMargin(p); stressed+=putMargin(p,spot,mark)*houseFactor;
    optionLoss+=(mark-p.mark)*100*p.qty;
    if(spot<p.strike)itm+=p.strike*100*p.qty;
  }
  return {nominal,shares,current,stressed,loss:stockValue*drop+optionLoss,itm};
}
if(typeof module!=='undefined')module.exports={putMargin,analyseRisk};
if(typeof document!=='undefined'){
function numberField(label,value,min,step){
  const el=document.createElement('label');el.className='fl';el.textContent=label;
  const input=document.createElement('input');input.type='number';input.min=min;input.step=step;input.value=value??'';input.oninput=saveRisk;el.append(input);return el;
}
window.addPut=function(p={}){
  const row=document.createElement('div');row.className='card';
  [['Kontrakte (positive ganze Zahl)',p.qty,1,1],['Strike $',p.strike,.01,'any'],['Aktueller Aktienkurs $',p.spot,.01,'any'],['Aktueller Put-Mark je Aktie $ (nicht vereinnahmte Prämie)',p.mark,0,'any']].forEach(a=>row.append(numberField(...a)));
  const b=document.createElement('button');b.textContent='Position entfernen';b.type='button';b.className='btnd';b.onclick=()=>{row.remove();saveRisk();};row.append(b);document.getElementById('positions').append(row);
};
function getPuts(){return Array.from(document.querySelectorAll('#positions .card')).filter(row=>Array.from(row.querySelectorAll('input')).some(i=>i.value!=='')).map(row=>{const v=Array.from(row.querySelectorAll('input')).map(i=>i.value===''?NaN:Number(i.value));return {qty:v[0],strike:v[1],spot:v[2],mark:v[3]};});}
window.saveRisk=function(){document.getElementById('riskResult').replaceChildren();try{localStorage.setItem('obpRisk1',JSON.stringify({puts:getPuts(),stockValue:document.getElementById('stockValue').value,time:document.getElementById('volFactor').value,house:document.getElementById('houseFactor').value}));}catch(e){/* Calculation remains available without storage. */}};
window.renderRisk=function(){
  const out=document.getElementById('riskResult');out.replaceChildren();
  const read=id=>{const v=document.getElementById(id).value;return v===''?NaN:Number(v);};
  const puts=getPuts(), stock=read('stockValue'),time=read('volFactor'),house=read('houseFactor');
  const meq=read('meq'),req=read('mreq');
  const paragraph=t=>{const p=document.createElement('p');p.className='erk';p.textContent=t;out.append(p);};
  if(puts.some(p=>!Object.values(p).every(Number.isFinite)||!Number.isInteger(p.qty)||p.qty<1||p.strike<=0||p.spot<=0||p.mark<0||p.mark<Math.max(p.strike-p.spot,0))||!Number.isFinite(time)||time<1||!Number.isFinite(house)||house<1){paragraph('Bitte jede begonnene Put-Zeile vollständig ausfüllen: ganze Kontraktzahl ≥ 1, Strike und Aktienkurs > 0, heutiger Put-Mark ≥ 0. Vollständig leere Zeilen werden ignoriert. Der Mark darf nicht unter dem inneren Wert (Strike minus Aktienkurs, mindestens 0) liegen; beide Faktoren müssen mindestens 1 sein.');return false;}
  paragraph('Margin-Auslastung = gemeldete Maintenance Requirement / gemeldete Margin Equity × 100. '+(Number.isFinite(meq)&&meq>0&&Number.isFinite(req)&&req>=0?(100*req/meq).toFixed(1)+' %; aktueller rechnerischer Überschuss '+fmt(meq-req)+'.':'Nicht verfügbar: Margin Equity > 0 und Maintenance ≥ 0 erforderlich.'));
  const base=analyseRisk(puts,0,0,1,1);
  paragraph('Erfasste Puts: Brutto-Strike-Nominal / Zahlung bei vollständiger Zuteilung '+fmt(base.nominal)+'; zu übernehmende Aktien '+base.shares.toLocaleString('de-DE')+' (über alle Positionen). Kein Nettofinanzierungsbedarf: Cash, Sicherheiten und Prämien werden nicht verrechnet. Bei unvollständiger Erfassung sind auch die Summen unvollständig.');
  if(!Number.isFinite(stock)||stock<0){paragraph('Für Szenarien den Long-Aktienmarktwert eingeben (0 ausdrücklich zulässig). Reserve-Faustregel bleibt verfügbar.');return true;}
  paragraph('Szenarioannahmen: alle Aktien und Put-Underlyings fallen gleich stark. Put-Mark = innerer Wert im Szenario + heutiger Zeitwert × Faktor '+time+'; bei 0 % unveränderter Mark. Put-Margin × House-Faktor '+house+'. Sonstige Maintenance bleibt konstant. Keine Modellierung von Laufzeit, Greeks, Hedging, Zinsen oder Liquidität.');
  const canAnchor=Number.isFinite(meq)&&meq>0&&Number.isFinite(req)&&req>=base.current;
  paragraph('Auf kleinen Bildschirmen die Tabelle seitlich wischen, um alle Spalten zu sehen.');
  const wrap=document.createElement('div');wrap.style.overflowX='auto';wrap.tabIndex=0;wrap.setAttribute('aria-label','Seitlich scrollbare Stressszenarien');const table=document.createElement('table');table.style.cssText='width:100%;font-size:.8rem;text-align:left;border-spacing:12px';
  const header=table.insertRow();['Markt','Geschätzter Verlust¹','Put-Margin²','Gesamt-Maintenance³','Margin Equity³','Überschuss³','ITM-Strike-Nominal'].forEach(t=>{const th=document.createElement('th');th.textContent=t;header.append(th);});
  [...new Set([0,.1,.2,Number(document.getElementById('str').value)/100,.3])].sort((a,b)=>a-b).forEach(drop=>{
    const r=analyseRisk(puts,stock,drop,time,house), total=canAnchor?req-base.current+r.stressed:null, eq=meq-r.loss;
    const row=table.insertRow();[drop===0?'Heute / House-Sensitivität':'−'+Math.round(drop*100)+' %',fmt(r.loss),fmt(r.stressed),total===null?'k.A.':fmt(total),canAnchor?fmt(eq):'k.A.',canAnchor?fmt(eq-total):'k.A.',fmt(r.itm)].forEach(t=>{row.insertCell().textContent=t;});
  });wrap.append(table);out.append(wrap);
  paragraph('¹ Nur erfasste Puts und angegebene Long-Aktien. ² Positionsschätzung nach Reg-T-Basisformel, keine Brokerzusage. ³ Gemeldete Maintenance minus heutige modellierte Put-Margin plus Szenario-Put-Margin: verhindert Doppelzählung. Margin Equity minus modellierter Verlust setzt voraus, dass diese Verluste die Margin Equity vollständig treffen. Wenn die heutige Put-Schätzung die gemeldete Maintenance übersteigt, werden Kontoszenarien unterdrückt (Daten oder Modell passen nicht).');
  paragraph('Ein negativer Überschuss ist eine modellierte Unterdeckung; ein positiver Wert garantiert weder Sicherheit noch ausbleibende Liquidation. Schwab kann House-Anforderungen jederzeit erhöhen. Zuteilung wird nicht zusätzlich als Verlust abgezogen: Die Zahlung kauft Aktien; Aktien-Margin nach Zuteilung ist hier nicht modelliert.');return true;
};
try{const d=JSON.parse(localStorage.getItem('obpRisk1')||'null');if(d){(d.puts||[]).forEach(p=>addPut(p));document.getElementById('stockValue').value=d.stockValue??'';document.getElementById('volFactor').value=d.time??2;document.getElementById('houseFactor').value=d.house??1;}}catch(e){/* Ignore corrupt or inaccessible saved data. */}
}
