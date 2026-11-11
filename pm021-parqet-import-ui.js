/* Browser-only JSON import; no upload, no automatic broker API access. */
(function(){
'use strict';
function ready(){
 const host=document.getElementById('pmPortfolio');if(!host||!globalThis.PM021ParqetImport)return;
 const wrap=document.createElement('div');wrap.id='pmParqetImport';
 wrap.innerHTML='<h3>Parqet-Positionen lokal einlesen (Test)</h3><p>JSON-Datei mit Holding-ID, Portfolio, Name, currentValue und currency=EUR. Die Datei bleibt im Browser. Zuordnungen werden nicht an GitHub übertragen. Unklare Werte bleiben unzugeordnet.</p><input type="file" id="pmParqetFile" accept=".json,application/json"><div id="pmParqetMappings"></div><button type="button" id="pmParqetApply">Zuordnungen übernehmen</button><div id="pmParqetStatus" aria-live="polite"></div>';
 host.append(wrap);
 const file=wrap.querySelector('#pmParqetFile'),mappingHost=wrap.querySelector('#pmParqetMappings'),status=wrap.querySelector('#pmParqetStatus');
 let rows=null,selects=[];
 const labels={bucket1:'Topf 1',bucket2:'Topf 2',bucket3:'Topf 3',larsPrivate:'Lars privat',larsGmbH:'Lars GmbH',schwab:'Schwab',unassigned:'Nicht zugeordnet'};
 file.addEventListener('change',async()=>{
  rows=null;selects=[];mappingHost.replaceChildren();status.textContent='';
  try{
   const f=file.files&&file.files[0];if(!f)return;
   if(f.size>8e6)throw Error('Datei über 8 MB.');
   rows=globalThis.PM021ParqetImport.parse(await f.text());
   for(const p of rows){
    const line=document.createElement('div');line.className='field';
    const label=document.createElement('label');label.textContent=p.portfolio+' · '+p.name+' · '+p.valueEUR.toLocaleString('de-DE',{style:'currency',currency:'EUR'});label.htmlFor='pmmap-'+selects.length;
    const select=document.createElement('select');select.id=label.htmlFor;select.disabled=!p.eligible;
    for(const key of globalThis.PM021ParqetImport.BUCKETS){const option=document.createElement('option');option.value=key;option.textContent=labels[key];select.append(option);}
    select.value='unassigned';line.append(label,select);mappingHost.append(line);selects.push({key:p.key,select});
   }
   status.textContent=rows.length+' Positionen gelesen. Bitte die Zuordnungen auf Positionsebene prüfen.';
  }catch(e){status.textContent='Importfehler: '+e.message;}
 });
 wrap.querySelector('#pmParqetApply').addEventListener('click',()=>{
  if(!rows){status.textContent='Zuerst eine Datei einlesen.';return;}
  try{
   const mapping=Object.fromEntries(selects.map(x=>[x.key,x.select.value]));
   const result=globalThis.PM021ParqetImport.allocate(rows,mapping);
   const totals=globalThis.PM021Portfolio.summarize(result.positions);
   for(const bucket of globalThis.PM021ParqetImport.BUCKETS){
    const el=document.getElementById('pmp-'+bucket);if(el)el.value=totals.totalsEUR[bucket].toFixed(2);
   }
   status.textContent='Übernommen: '+result.positions.length+' nichtnegative Positionen; '+result.unassigned.length+' offene/ausgeschlossene Positionen; negative Bewertungen '+result.excludedNegativeEUR.toLocaleString('de-DE',{style:'currency',currency:'EUR'})+' separat abstimmen. Bitte Topfmodell berechnen anklicken.';
  }catch(e){status.textContent='Zuordnungsfehler: '+e.message;}
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
})();
