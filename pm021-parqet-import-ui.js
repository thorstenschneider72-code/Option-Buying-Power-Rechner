/* Browser-only JSON import; no upload, no automatic broker API access. */
(function(){
'use strict';
function ready(){
 const host=document.getElementById('pmPortfolio');if(!host||!globalThis.PM021ParqetImport)return;
 const wrap=document.createElement('div');wrap.id='pmParqetImport';
 wrap.innerHTML='<h3>Parqet-Positionen lokal einlesen (Test)</h3><p>JSON- oder CSV-Datei mit den Feldern portfolio, id, name, currentValue und currency=EUR. Die Datei bleibt im Browser. Zuordnungen werden nicht an GitHub übertragen. Unklare Werte bleiben unzugeordnet.</p><input type="file" id="pmParqetFile" accept=".json,.csv,application/json,text/csv"><div id="pmParqetMappings"></div><button type="button" id="pmParqetSave">Zuordnungen lokal speichern</button><button type="button" id="pmParqetExport">Zuordnungen als JSON sichern</button><label for="pmParqetMapFile">Gesicherte Zuordnungen laden</label><input type="file" id="pmParqetMapFile" accept=".json,application/json"><button type="button" id="pmParqetApply">Zuordnungen übernehmen</button><div id="pmParqetStatus" aria-live="polite"></div>';
 host.append(wrap);
 const file=wrap.querySelector('#pmParqetFile'),mappingHost=wrap.querySelector('#pmParqetMappings'),status=wrap.querySelector('#pmParqetStatus');
 let rows=null,selects=[];
 const storageKey='pm021-parqet-allocations-v1';
 function validMap(obj){if(!obj||typeof obj!=='object'||Array.isArray(obj))throw Error('Ungültige Zuordnungsliste.');const result=Object.create(null);for(const [key,bucket] of Object.entries(obj)){if(key.length>400||!globalThis.PM021ParqetImport.BUCKETS.includes(bucket))throw Error('Ungültige Zuordnung: '+key);result[key]=bucket;}return result;}
 function stored(){try{return validMap(JSON.parse(localStorage.getItem(storageKey)||'{}'));}catch{return Object.create(null);}}
 function selected(){return validMap(Object.fromEntries(selects.map(x=>[x.key,x.select.value])));}
 function applyMap(map){for(const x of selects){if(Object.hasOwn(map,x.key)&&!x.select.disabled)x.select.value=map[x.key];}}

 const labels={bucket1:'Topf 1',bucket2:'Topf 2',bucket3:'Topf 3',larsPrivate:'Lars privat',larsGmbH:'Lars GmbH',schwab:'Schwab',unassigned:'Nicht zugeordnet'};
 file.addEventListener('change',async()=>{
  rows=null;selects=[];mappingHost.replaceChildren();status.textContent='';
  try{
   const f=file.files&&file.files[0];if(!f)return;
   if(f.size>8e6)throw Error('Datei über 8 MB.');
   const content=await f.text();if(f.name.toLowerCase().endsWith('.csv'))rows=globalThis.PM021ParqetImport.parseCSV(content);else {const data=JSON.parse(content);rows=globalThis.PM021ParqetImport.parse(JSON.stringify(data&&Array.isArray(data.portfolios)?globalThis.PM021ParqetImport.convertConnectorExport(data):data));}
   for(const p of rows){
    const line=document.createElement('div');line.className='field';
    const label=document.createElement('label');label.textContent=p.portfolio+' · '+p.name+' · '+p.valueEUR.toLocaleString('de-DE',{style:'currency',currency:'EUR'});label.htmlFor='pmmap-'+selects.length;
    const select=document.createElement('select');select.id=label.htmlFor;select.disabled=!p.eligible;
    for(const key of globalThis.PM021ParqetImport.BUCKETS){const option=document.createElement('option');option.value=key;option.textContent=labels[key];select.append(option);}
    select.value=globalThis.PM021ParqetImport.suggestBucket(p);line.append(label,select);mappingHost.append(line);selects.push({key:p.key,select});
   }
   applyMap(stored());
   const identifiers=new Map();for(const p of rows){if(!p.eligible)continue;const signature=p.name.trim().toLowerCase();if(!signature)continue;const arr=identifiers.get(signature)||[];arr.push(p.portfolio);identifiers.set(signature,arr);}
   const overlaps=[...identifiers].filter(([,ps])=>new Set(ps).size>1);
   status.textContent=rows.length+' Positionen gelesen. Vorschläge anhand von Depot und Gold-Bezeichnungen vorbelegt (bitte prüfen); '+overlaps.length+' gleiche Bezeichnungen in mehreren Depots (Prüfhinweis, kein automatischer Dublettenabzug). Gespeicherte Zuordnungen geladen, soweit vorhanden.';
  }catch(e){status.textContent='Importfehler: '+e.message;}
 });
 wrap.querySelector('#pmParqetSave').addEventListener('click',()=>{try{if(!rows)throw Error('Zuerst Positionen einlesen.');localStorage.setItem(storageKey,JSON.stringify({...stored(),...selected()}));status.textContent='Zuordnungen lokal in diesem Browser gespeichert.';}catch(e){status.textContent='Speichern fehlgeschlagen: '+e.message;}});
 wrap.querySelector('#pmParqetExport').addEventListener('click',()=>{try{if(!rows)throw Error('Zuerst Positionen einlesen.');const json=JSON.stringify({schema:'pm021-mapping-v1',mapping:{...stored(),...selected()}},null,2);const url=URL.createObjectURL(new Blob([json],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='pm021-zuordnungen.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent='Zuordnungsdatei erstellt. Sie enthält Positionskennungen, aber keine Marktwerte.';}catch(e){status.textContent=e.message;}});
 wrap.querySelector('#pmParqetMapFile').addEventListener('change',async(e)=>{try{const file=e.target.files&&e.target.files[0];if(!file)return;if(file.size>1000000)throw Error('Zuordnungsdatei zu groß.');const obj=JSON.parse(await file.text());if(obj.schema!=='pm021-mapping-v1')throw Error('Unbekanntes Zuordnungsschema.');const map=validMap(obj.mapping);applyMap(map);localStorage.setItem(storageKey,JSON.stringify({...stored(),...map}));status.textContent='Zuordnungen importiert und lokal gespeichert.';}catch(err){status.textContent='Zuordnungsimport fehlgeschlagen: '+err.message;}});
 wrap.querySelector('#pmParqetApply').addEventListener('click',()=>{
  if(!rows){status.textContent='Zuerst eine Datei einlesen.';return;}
  try{
   const mapping=selected();
   const result=globalThis.PM021ParqetImport.allocate(rows,mapping);
   const totals=globalThis.PM021Portfolio.summarize(result.positions);
   const audit=globalThis.PM021ParqetAudit.audit(rows);
   for(const bucket of globalThis.PM021ParqetImport.BUCKETS){
    const el=document.getElementById('pmp-'+bucket);if(el)el.value=totals.totalsEUR[bucket].toFixed(2);
   }
   const run=document.getElementById('pmPortfolioRun');if(run)run.click();
   status.textContent='Übernommen: '+result.positions.length+' nichtnegative Positionen; '+result.unassigned.length+' offene/ausgeschlossene Positionen; negative Bewertungen '+result.excludedNegativeEUR.toLocaleString('de-DE',{style:'currency',currency:'EUR'})+' separat abstimmen. Topfmodell aktualisiert. Brutto positive Werte: '+audit.grossPositiveEUR.toLocaleString('de-DE',{style:'currency',currency:'EUR'})+'; Nettowert einschließlich negativer Bewertungen: '+audit.netEUR.toLocaleString('de-DE',{style:'currency',currency:'EUR'})+'. Dies ist noch keine validierte Gesamtbilanz.';
  }catch(e){status.textContent='Zuordnungsfehler: '+e.message;}
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
})();
