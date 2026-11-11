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
  if((p.currency||p.valueCurrency)!=='EUR')throw Error('Position '+key+' muss bereits in EUR bewertet sein.');
  const v=p.currentValue;
  if(typeof v!=='number'||!Number.isFinite(v))throw Error('Ungültiger Marktwert: '+key);
  // Negative valuations (e.g. short options) are real but cannot be allocated with the nonnegative bucket engine.
  return {key,id,portfolio,name:String(p.name||id).slice(0,200),valueEUR:v,eligible:v>=0};
 });
}
function convertConnectorExport(input){
 const obj=typeof input==='string'?JSON.parse(input):input;
 const portfolios=Array.isArray(obj)?obj:obj&&Array.isArray(obj.portfolios)?obj.portfolios:null;
 if(!portfolios)throw Error('Erwartet wird {portfolios:[{name,holdings:[...]}]}.');
 const holdings=[];
 for(const port of portfolios){
  if(!port||typeof port.name!=='string'||!Array.isArray(port.holdings))throw Error('Ungültiger Portfolio-Block.');
  for(const h of port.holdings){
   if(!h||typeof h.id!=='string')throw Error('Holding-ID fehlt.');
   holdings.push({portfolio:port.name,id:h.id,name:h.name||h.id,currency:h.valueCurrency||h.currency,currentValue:h.currentValue});
  }
 }
 return {holdings};
}
function suggestBucket(p){
 const name=p.portfolio.toLowerCase(),instrument=p.name.toLowerCase();
 if(name.includes('schwab'))return 'schwab';
 if(name.includes('lars erichsen'))return 'larsPrivate';
 if(p.valueEUR<0)return 'unassigned';
 if(instrument==='euwax gold ii'||instrument==='gold'||instrument.includes('krügerrand')||instrument.includes('krugerrand')||instrument.includes('britannia'))return 'bucket2';
 if(instrument.includes('amundi euro overnight'))return 'bucket2';
 return 'unassigned';
}
function parseCSV(text){
 if(typeof text!=='string'||text.length>8e6)throw Error('CSV-Datei leer oder zu groß.');
 // RFC 4180-style quoted fields, including escaped quotes and embedded newlines.
 const records=[];let record=[],field='',quoted=false;
 for(let i=0;i<text.length;i++){
  const ch=text[i];
  if(ch==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}
  else if(ch===','&&!quoted){record.push(field);field='';}
  else if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&text[i+1]==='\n')i++;record.push(field);if(record.some(v=>v.trim()))records.push(record);record=[];field='';}
  else field+=ch;
 }
 if(quoted)throw Error('Nicht geschlossene CSV-Anführungszeichen.');
 record.push(field);if(record.some(v=>v.trim()))records.push(record);
 if(records.length<2)throw Error('CSV ohne Positionen.');
 const head=records.shift().map(s=>s.replace(/^\uFEFF/,'').trim());
 const keys=['portfolio','id','name','currency','currentValue'];
 if(!keys.every(k=>head.includes(k)))throw Error('CSV-Spalten fehlen: '+keys.filter(k=>!head.includes(k)).join(', '));
 const data=records.map(row=>{if(row.length!==head.length)throw Error('Ungültige CSV-Spaltenanzahl.');const p=Object.fromEntries(head.map((k,i)=>[k,row[i]]));p.currentValue=Number(p.currentValue);return p;});
 return parse(JSON.stringify({holdings:data}));
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
root.PM021ParqetImport={parse,parseCSV,convertConnectorExport,allocate,suggestBucket,BUCKETS};
if(typeof module!=='undefined'&&module.exports)module.exports=root.PM021ParqetImport;
})(typeof globalThis!=='undefined'?globalThis:this);
