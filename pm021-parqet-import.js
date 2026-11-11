/* PM-021: local-only, explicit holding allocation; no portfolio-wide default mappings. */
(function(root){
'use strict';
const BUCKETS=['bucket1','bucket2','bucket3','larsPrivate','larsGmbH','schwab','unassigned'];
function parse(text){
 if(typeof text!=='string'||text.length>8e6)throw Error('Datei leer oder größer als 8 MB.');
 let obj;try{obj=JSON.parse(text);}catch{throw Error('Bitte eine gültige JSON-Datei verwenden.');}
 const list=Array.isArray(obj)?obj:obj&&Array.isArray(obj.holdings)?obj.holdings:null;
 if(!list)throw Error('Erwartet wird eine Liste oder {holdings:[...]}.');
 if(list.length>5000)throw Error('Zu viele Positionen.');
 const seen=new Set();
 return list.map((p,i)=>{
  if(!p||typeof p!=='object')throw Error('Ungültige Position '+(i+1));
  const portfolio=String(p.portfolio||p.portfolioName||'').trim();
  const id=String(p.id||p.holdingId||'').trim();
  const key=portfolio+'::'+id;
  if(!portfolio||!id||seen.has(key))throw Error('Portfolio und eindeutige Holding-ID erforderlich: '+(i+1));
  seen.add(key);
  if(p.currency!=='EUR')throw Error('Position '+key+' muss bereits in EUR bewertet sein.');
  const v=p.currentValue;
  if(typeof v!=='number'||!Number.isFinite(v))throw Error('Ungültiger Marktwert: '+key);
  // Negative valuations (e.g. short options) are real but cannot be allocated with the nonnegative bucket engine.
  return {key,id,portfolio,name:String(p.name||id).slice(0,200),valueEUR:v,eligible:v>=0};
 });
}
function allocate(holdings,mapping){
 if(!Array.isArray(holdings)||!mapping||typeof mapping!=='object')throw Error('Zuordnungen fehlen.');
 const seen=new Set(),positions=[],unassigned=[];
 for(const p of holdings){
  if(seen.has(p.key))throw Error('Doppelte Position: '+p.key);
  seen.add(p.key);
  const bucket=Object.hasOwn(mapping,p.key)?mapping[p.key]:'unassigned';
  if(!BUCKETS.includes(bucket))throw Error('Unbekannter Topf: '+bucket);
  if(!p.eligible){
   unassigned.push({key:p.key,reason:'Negativer Marktwert: gesondert abstimmen'});
   continue;
  }
  positions.push({id:p.key,bucket,valueEUR:p.valueEUR});
  if(bucket==='unassigned')unassigned.push({key:p.key,reason:'Zuordnung fehlt'});
 }
 return {positions,unassigned,excludedNegativeEUR:holdings.filter(p=>!p.eligible).reduce((a,p)=>a+p.valueEUR,0)};
}
root.PM021ParqetImport={parse,allocate,BUCKETS};
if(typeof module!=='undefined'&&module.exports)module.exports=root.PM021ParqetImport;
})(typeof globalThis!=='undefined'?globalThis:this);
