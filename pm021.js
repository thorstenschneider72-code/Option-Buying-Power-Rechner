/* PM-021: local Schwab CSV scenario helper. Not a broker margin forecast. */
(function(root){
'use strict';
const LEVERAGE={AGQ:2,CRWL:2,ETHT:2,JNUG:2,LLYX:2,METU:2,NUGT:2,PANG:2,SOXL:3,TQQQ:3,UGL:2};
const fmt=n=>Number.isFinite(n)?n.toLocaleString('de-DE',{style:'currency',currency:'USD',maximumFractionDigits:0}):'k.A.';
function csvRows(text){
  const rows=[];let row=[],cell='',quoted=false;
  text=String(text).replace(/^\uFEFF/,'');
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
    else if(c===','&&!quoted){row.push(cell);cell='';}
    else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(v=>v.trim()))rows.push(row);row=[];cell='';}
    else cell+=c;
  }
  if(quoted)throw Error('CSV enthält ein nicht geschlossenes Anführungszeichen.');
  row.push(cell);if(row.some(v=>v.trim()))rows.push(row);
  return rows;
}
function money(s){const v=Number(String(s??'').replace(/[$,%\s]/g,'').replace(/,/g,''));return Number.isFinite(v)?v:NaN;}
function parsePositions(text){
  const rows=csvRows(text),hi=rows.findIndex(r=>r[0]==='Symbol'&&r.includes('Asset Type'));
  if(hi<0)throw Error('Schwab-Positions-CSV: Spaltenkopf nicht gefunden.');
  const headers=rows[hi],ix=k=>headers.indexOf(k);
  const symbols=new Map(),options=[],warnings=[];
  for(const r of rows.slice(hi+1)){
    if(!r[0]||r[0].startsWith('Total'))continue;
    const type=r[ix('Asset Type')],qty=money(r[ix('Qty (Quantity)')]),price=money(r[ix('Price')]);
    if(!Number.isFinite(qty)||!Number.isFinite(price))continue;
    if(type==='Equity'||type==='ETFs & Closed End Funds'){symbols.set(r[0].trim(),{symbol:r[0].trim(),qty,price,leverage:LEVERAGE[r[0].trim()]||1});}
    if(type==='Option'){
      const m=r[0].match(/^(\S+)\s+(\d{2}\/\d{2}\/\d{4})\s+([\d.]+)\s+([PC])$/);
      if(!m){warnings.push('Unbekanntes Optionssymbol: '+r[0]);continue;}
      options.push({symbol:m[1],expiry:m[2],strike:Number(m[3]),kind:m[4],qty,mark:price});
    }
  }
  if(!symbols.size&&!options.length)throw Error('Keine erkennbaren Positionen gefunden.');
  const puts=options.filter(o=>o.kind==='P'&&o.qty<0);
  const missing=[...new Set(options.filter(o=>o.qty<0&&!symbols.has(o.symbol)).map(o=>o.symbol))];
  return {stocks:[...symbols.values()],options,puts,missing,warnings};
}

function parseBalances(text){
  const rows=csvRows(text), values=new Map();
  for(const row of rows){if(row.length>=2&&row[0].trim())values.set(row[0].trim(),row[1].trim());}
  const read=k=>values.has(k)?money(values.get(k)):NaN;
  const header=rows.length&&rows[0].length?rows[0][0]:'';
  const dateMatch=header.match(/as of\s+(.+)$/i);
  const result={accountValue:read('Account Value'),marginEquity:read('Margin Equity'),equityPercent:read('Equity Percent'),cashSecuredPutRequirement:read('Cash Secured Put Requirement'),cashOnHold:read('Cash on Hold'),maintenance:read('Maintenance Requirement'),asOf:dateMatch?dateMatch[1]:null};
  if(!Number.isFinite(result.accountValue)||!Number.isFinite(result.marginEquity))throw Error('Schwab-Balances-CSV: Account Value oder Margin Equity fehlt.');
  return result;
}
function model(data,params){
  const {marginEquity,maintenance,houseFactor=1.5,timeFactor=2,drop=.2}=params;
  if(![marginEquity,maintenance,houseFactor,timeFactor,drop].every(Number.isFinite)||marginEquity<=0||maintenance<0||houseFactor<1||timeFactor<1||drop<0||drop>1)throw Error('Ungültige Szenarioparameter.');
  if(data.missing.length)throw Error('Fehlende Basiswerte für Short-Optionen: '+data.missing.join(', ')+'. Bitte fehlende Kurse ergänzen.');
  const stockMap=new Map(data.stocks.map(s=>[s.symbol,s]));
  let stockLoss=0,putLoss=0,callLoss=0,nominal=0,modelBase=0,modelStress=0,leveragedStock=0,leveragedPut=0;
  for(const s of data.stocks){
    if(s.qty<=0)continue; // short shares not modelled
    const d=Math.min(.95,drop*s.leverage),v=s.qty*s.price;
    stockLoss+=v*d;
    if(s.leverage>1)leveragedStock+=v;
  }
  for(const p of data.puts){
    const s=stockMap.get(p.symbol),qty=-p.qty,shock=Math.min(.95,drop*s.leverage);
    const spot=s.price,stressedSpot=spot*(1-shock);
    const intrinsic=Math.max(p.strike-spot,0),time=Math.max(0,p.mark-intrinsic);
    const stressedMark=Math.max(p.strike-stressedSpot,0)+time*timeFactor;
    nominal+=qty*100*p.strike;
    putLoss+=(stressedMark-p.mark)*100*qty;
    const req=(spot,mark)=>qty*100*Math.max(.2*spot-Math.max(spot-p.strike,0)+mark,.1*p.strike+mark,1);
    modelBase+=req(spot,p.mark);modelStress+=req(stressedSpot,stressedMark);
    if(s.leverage>1)leveragedPut+=qty*100*p.strike;
  }
  for(const call of data.options.filter(o=>o.kind==='C'&&o.qty<0)){
    const s=stockMap.get(call.symbol),qty=-call.qty;
    const shock=Math.min(.95,drop*s.leverage),stressedSpot=s.price*(1-shock);
    const intrinsic=Math.max(s.price-call.strike,0);
    const time=Math.max(0,call.mark-intrinsic);
    const stressedMark=Math.max(stressedSpot-call.strike,0)+time*timeFactor;
    callLoss+=(stressedMark-call.mark)*100*qty;
  }
  // Short-call P/L only: uncovered call maintenance and upside stress not modelled.
  // Conservative full-account house shock; broker may use other rules.
  const stressReq=Math.max(0,maintenance-modelBase+modelStress)*houseFactor;
  const equity=marginEquity-stockLoss-putLoss-callLoss;
  return {stockLoss,putLoss,callLoss,totalLoss:stockLoss+putLoss+callLoss,nominal,leveragedStock,leveragedPut,modelBase,modelStress,stressReq,equity,excess:equity-stressReq,baseExcess:marginEquity-maintenance,ratio:maintenance/marginEquity};
}
root.PM021={csvRows,parsePositions,parseBalances,model,LEVERAGE};
if(typeof module!=='undefined'&&module.exports)module.exports=root.PM021;
if(typeof document==='undefined')return;
function ready(){
  const target=document.getElementById('exposureCard');
  if(!target)return;
  const card=document.createElement('section');card.className='card';card.innerHTML=
  '<h2>PM-021 · Schwab-CSV-Stresstest (experimentell)</h2>'+
  '<p class="erk">Positionsdatei wird ausschließlich hier im Browser verarbeitet; keine Übertragung an GitHub oder einen Server. Für vollständige Short-Put-Szenarien müssen alle Basiswertkurse vorhanden sein; fehlende Kurse sind manuell zu ergänzen. Gehebelte ETFs: vereinfachter Faktor 2×/3×, maximal 95 % Kursverlust. Das ist keine Prognose der ETF-Entwicklung oder der Schwab-Margin.</p>'+
  '<label class="fl" for="pmfile">Schwab Individual-Positions-CSV</label><input id="pmfile" type="file" accept=".csv,text/csv" />'+
  '<div id="pmMissing"></div>'+ 
  '<div class="field"><label class="fl" for="pmEquity">Margin Equity aus thinkorswim ($)</label><input id="pmEquity" type="number" min="0" step="any" placeholder="Aktueller Schwab-Wert"/></div>'+
  '<div class="field"><label class="fl" for="pmReq">Maintenance Requirement aus thinkorswim ($)</label><input id="pmReq" type="number" min="0" step="any" placeholder="Aktueller Schwab-Wert"/></div>'+
  '<div class="field"><label class="fl" for="pmHouse">Gesamt-Maintenance-Faktor im Stress (≥1)</label><input id="pmHouse" type="number" min="1" step=".1" value="1.5"/></div>'+
  '<div class="field"><label class="fl" for="pmTime">Put-Zeitwert-Faktor im Stress (≥1)</label><input id="pmTime" type="number" min="1" step=".1" value="2"/></div>'+
  '<button type="button" class="btn" id="pmRun">CSV-Stresstest berechnen</button><div id="pmOutput" aria-live="polite"></div>'+
  '<p class="erk">Achtung: Nur Long-Aktien und Short Puts werden neu bewertet. Ungedeckte Short-Call-Margin, Short-Aktien, Korrelation, täglicher Hebelpfad, Options-Greeks, Spread-Offsets und Zuteilungs-Margin fehlen. Die gesamte Maintenance wird pauschal mit dem House-Faktor multipliziert. CSV und Kontowerte müssen vom selben Zeitpunkt stammen. Kein positives Ergebnis ist eine Handelsfreigabe.</p>';
  target.parentNode.insertBefore(card,target.nextSibling);
  let parsed=null;

  const dashboard=document.createElement('section');dashboard.className='card';dashboard.id='pmDashboard';
  dashboard.innerHTML='<h2>PM-021 · Portfolio Risk Dashboard V1.0 (Entwurf)</h2>'+
    '<p class="erk">Gemeinsame Ansicht für Buying Power und Schwab-Risiko. Alle Dateien bleiben lokal im Browser. Keine automatische Handelsfreigabe. Kontodaten und Positionsdaten müssen denselben Zeitpunkt abbilden.</p>'+
    '<div class="field"><label class="fl" for="pmBalancesFile">Schwab Balances-CSV (optional, empfohlen)</label><input id="pmBalancesFile" type="file" accept=".csv,text/csv"></div>'+
    '<div class="rg"><div class="rb"><div class="rl3">Account Value</div><div class="rv2" id="pmDashAccount">k.A.</div></div><div class="rb"><div class="rl3">Margin Equity</div><div class="rv2" id="pmDashEquity">k.A.</div></div><div class="rb"><div class="rl3">Short-Put-Nominal (Positionen)</div><div class="rv2" id="pmDashNominal">k.A.</div></div><div class="rb"><div class="rl3">Maintenance / Margin Equity</div><div class="rv2" id="pmDashRatio">k.A.</div></div></div>'+
    '<div id="pmDashStatus" class="wb" role="status">Status: Keine vollständigen Daten. Keine Risikofreigabe.</div>'+
    '<p class="erk" id="pmDashSource">Noch keine Balances-Datei geladen. Die Maintenance Requirement muss aus thinkorswim manuell eingegeben werden; der Schwab-Balances-Export enthält sie möglicherweise nicht.</p>';
  target.parentNode.insertBefore(dashboard,target.nextSibling);
  let balances=null;
  const dashText=(id,value)=>{dashboard.querySelector('#'+id).textContent=value;};
  const updateDashboard=()=>{
    const manualEq=card.querySelector('#pmEquity').value,manualReq=card.querySelector('#pmReq').value;
    const eq=manualEq.trim()===''?NaN:Number(manualEq),req=manualReq.trim()===''?NaN:Number(manualReq);
    dashText('pmDashAccount',balances?fmt(balances.accountValue):'k.A.');
    dashText('pmDashEquity',Number.isFinite(eq)&&eq>0?fmt(eq):(balances?fmt(balances.marginEquity):'k.A.'));
    dashText('pmDashRatio',Number.isFinite(req)&&req>=0&&Number.isFinite(eq)&&eq>0?(100*req/eq).toFixed(1)+' %':'k.A.');
    const nom=parsed?parsed.puts.reduce((sum,p)=>sum-p.qty*100*p.strike,0):NaN;
    dashText('pmDashNominal',Number.isFinite(nom)?fmt(nom):'k.A.');
    const status=dashboard.querySelector('#pmDashStatus');
    const complete=!!parsed&&parsed.missing.length===0&&Number.isFinite(eq)&&eq>0&&Number.isFinite(req)&&req>=0;
    status.textContent=complete?'Daten vorhanden: Szenario berechenbar, aber keine Handelsfreigabe.':'Unvollständig: '+(!parsed?'Positions-CSV fehlt. ':'')+(parsed&&parsed.missing.length?'Fehlende Options-Basiswertkurse: '+parsed.missing.join(', ')+'. ':'')+(!(Number.isFinite(eq)&&eq>0)?'Margin Equity fehlt. ':'')+(!(Number.isFinite(req)&&req>=0)?'Maintenance Requirement fehlt. ':'')+'Keine Risikofreigabe.';
  };
  dashboard.querySelector('#pmBalancesFile').addEventListener('change',async e=>{
    const file=e.target.files[0];if(!file)return;
    try{
      const b=parseBalances(await file.text());
      balances=b;
      card.querySelector('#pmEquity').value=String(b.marginEquity);
      dashboard.querySelector('#pmDashSource').textContent='Schwab Balances: '+(b.asOf||'Zeitpunkt nicht gefunden')+'. Equity Percent: '+(Number.isFinite(b.equityPercent)?b.equityPercent+' %':'k.A.')+'. Cash Secured Put Requirement: '+fmt(b.cashSecuredPutRequirement)+'. Maintenance Requirement weiterhin manuell erforderlich. Gleiche Zeitbasis beider CSV-Dateien prüfen.';
      updateDashboard();
    }catch(err){dashboard.querySelector('#pmDashSource').textContent='Importfehler: '+err.message;balances=null;updateDashboard();}
  });
  card.querySelector('#pmEquity').addEventListener('input',updateDashboard);
  card.querySelector('#pmReq').addEventListener('input',updateDashboard);
  const output=card.querySelector('#pmOutput');
  card.querySelector('#pmfile').addEventListener('change',async e=>{
    parsed=null;output.textContent='';
    const file=e.target.files[0];if(!file)return;
    try{parsed=parsePositions(await file.text());
      const missingBox=card.querySelector('#pmMissing');missingBox.replaceChildren();
      if(parsed.missing.length){
        const note=document.createElement('p');note.className='erk';note.textContent='Für diese Short-Options-Basiswerte fehlen Kurszeilen. Trage die aktuellen Kurse aus derselben Schwab-Momentaufnahme ein. Ohne vollständige Kurse wird keine Stressrechnung durchgeführt.';missingBox.append(note);
        for(const symbol of parsed.missing){
          const label=document.createElement('label');label.className='fl';label.textContent=symbol+' – aktueller Basiswertkurs ($)';
          const input=document.createElement('input');input.type='number';input.min='0.01';input.step='any';input.dataset.symbol=symbol;label.append(input);missingBox.append(label);
        }
      }
      updateDashboard();
      output.textContent='Eingelesen: '+parsed.stocks.length+' Aktien-/ETF-Zeilen, '+parsed.puts.length+' Short-Put-Zeilen, '+parsed.options.length+' Optionszeilen. '+(parsed.missing.length?'Fehlende Options-Basiswerte: '+parsed.missing.join(', '):'Alle Put-Basiswerte vorhanden.')+(parsed.warnings.length?' Warnungen: '+parsed.warnings.join('; '):'');}
    catch(err){output.textContent=err.message;}
  });
  updateDashboard();
  card.querySelector('#pmRun').addEventListener('click',()=>{
    output.replaceChildren();
    if(!parsed){output.textContent='Bitte zuerst eine Positions-CSV einlesen.';return;}
    const read=id=>{const s=card.querySelector('#'+id).value;return s.trim()===''?NaN:Number(s);};
    const marginEquity=read('pmEquity'),maintenance=read('pmReq'),houseFactor=read('pmHouse'),timeFactor=read('pmTime');
    try{
      for(const input of card.querySelectorAll('#pmMissing input')){
        const price=input.value.trim()===''?NaN:Number(input.value);
        if(!Number.isFinite(price)||price<=0)throw Error('Bitte gültigen aktuellen Kurs für '+input.dataset.symbol+' eingeben.');
        const symbol=input.dataset.symbol;
        const existing=parsed.stocks.find(s=>s.symbol===symbol);
        if(existing){existing.price=price;}else{parsed.stocks.push({symbol,qty:0,price,leverage:LEVERAGE[symbol]||1});}
      }
      parsed.missing=[];
      updateDashboard();
      const table=document.createElement('table');table.style.cssText='width:100%;font-size:.78rem;text-align:left;border-spacing:8px';
      const header=table.insertRow();['Markt','Aktienverlust','Put-Verlust','Call-Verlust/Gewinn','Stress-Maintenance','Stress-Equity','Puffer'].forEach(t=>{const h=document.createElement('th');h.textContent=t;header.append(h);});
      const results=[0,.1,.2,.3,.4].map(drop=>model(parsed,{marginEquity,maintenance,houseFactor:drop===0?1:houseFactor,timeFactor:drop===0?1:timeFactor,drop}));
      results.forEach((r,i)=>{const row=table.insertRow();[i===0?'Heute':'−'+i*10+' %',fmt(r.stockLoss),fmt(r.putLoss),fmt(r.callLoss),fmt(r.stressReq),fmt(r.equity),fmt(r.excess)].forEach(t=>row.insertCell().textContent=t);});
      const wrap=document.createElement('div');wrap.style.overflowX='auto';wrap.append(table);output.append(wrap);
      const p=document.createElement('p');p.className='erk';p.textContent='Short-Put-Nominal: '+fmt(results[0].nominal)+'; davon gehebelte Basiswerte: '+fmt(results[0].leveragedPut)+'. Aktien-/ETF-Wert in gehebelten Long-Positionen: '+fmt(results[0].leveragedStock)+'. Modellierte Put-Margin heute: '+fmt(results[0].modelBase)+'. Gemeldete Maintenance: '+fmt(maintenance)+'. Die 0-%-Zeile verwendet den gemeldeten Brokerwert ohne House-Aufschlag. Unterdeckung im Szenario bedeutet modelliertes Risiko, nicht einen sicheren Margin Call.';output.append(p);
      if(results[0].modelBase>maintenance){const w=document.createElement('p');w.className='erk';w.textContent='WARNUNG: Modellierte Put-Margin übersteigt die gesamte gemeldete Maintenance. Konto-/Positionsdaten oder Reg-T-Modell passen nicht zusammen. Szenario-Puffer nicht verlässlich.';output.prepend(w);}
      if(parsed.options.some(o=>o.kind==='C'&&o.qty<0)){const w=document.createElement('p');w.className='erk';w.textContent='Short Calls werden mit einem vereinfachten inneren Wert und Zeitwert neu bewertet. Ihre Marginanforderungen und ein Kursanstieg sind NICHT modelliert; Risiken können über- oder unterschätzt werden.';output.append(w);}
    }catch(err){output.textContent=err.message;}
  });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
})(typeof window!=='undefined'?window:globalThis);
