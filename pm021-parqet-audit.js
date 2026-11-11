/* PM-021: consistency checks; alerts only, never automatically delete holdings. */
(function(root){
'use strict';
function audit(holdings){
 if(!Array.isArray(holdings))throw Error('Positionsliste fehlt.');
 const warnings=[],byPortfolio=Object.create(null),ids=new Set();
 for(const h of holdings){
  if(ids.has(h.key))warnings.push({type:'duplicate-id',key:h.key,message:'Doppelte Holding-ID'});
  ids.add(h.key);
  const row=byPortfolio[h.portfolio]||(byPortfolio[h.portfolio]={count:0,positiveEUR:0,negativeEUR:0});
  row.count++;
  if(h.valueEUR>=0)row.positiveEUR+=h.valueEUR;
  else {row.negativeEUR+=h.valueEUR;warnings.push({type:'negative',key:h.key,message:'Negative Bewertung gesondert prüfen'});}
 }
 const netEUR=Object.values(byPortfolio).reduce((a,p)=>a+p.positiveEUR+p.negativeEUR,0);
 const grossPositiveEUR=Object.values(byPortfolio).reduce((a,p)=>a+p.positiveEUR,0);
 if(holdings.some(h=>h.portfolio.toLowerCase().includes('schwab')))warnings.push({type:'schwab',message:'Parqet-Wert nicht als Schwab-Net-Liquidation verwenden'});
 return {byPortfolio,netEUR,grossPositiveEUR,warnings,validated:false};
}
root.PM021ParqetAudit={audit};
if(typeof module!=='undefined'&&module.exports)module.exports=root.PM021ParqetAudit;
})(typeof globalThis!=='undefined'?globalThis:this);
