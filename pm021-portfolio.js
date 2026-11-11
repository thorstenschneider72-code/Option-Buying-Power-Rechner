/* PM-021 consolidated portfolio buckets: planning only, no trading instructions. */
(function(root){
'use strict';
const POLICY=Object.freeze({
 monthlyWithdrawalEUR:10000, bucket1Months:12, bucket2Months:36,
 maximumDrawdown:0.20, warningDrawdowns:[0.08,0.12,0.16,0.20],
 riskBudgetWeights:Object.freeze({longTerm:0.60,trading:0.20,options:0.20}),
 larsErichsenTotalEUR:400000, skipperCapitalIncludedEUR:100000
});
const finite=(x)=>typeof x==='number'&&Number.isFinite(x);
function summarize(entries,options={}){
 if(!Array.isArray(entries))throw Error('Positionsliste fehlt.');
 const values={bucket1:0,bucket2:0,bucket3:0,larsPrivate:0,larsGmbH:0,schwab:0,unassigned:0};
 const seen=new Set();
 for(const p of entries){
  if(!p||typeof p.id!=='string'||!p.id.trim()||seen.has(p.id))throw Error('Jede Position benötigt eine eindeutige ID.');
  seen.add(p.id);
  if(!finite(p.valueEUR)||p.valueEUR<0)throw Error('Ungültiger EUR-Marktwert: '+p.id);
  if(!Object.hasOwn(values,p.bucket))throw Error('Unbekannte Zuordnung: '+p.id);
  values[p.bucket]+=p.valueEUR;
 }
 const target1=POLICY.monthlyWithdrawalEUR*POLICY.bucket1Months;
 const target2=POLICY.monthlyWithdrawalEUR*POLICY.bucket2Months;
 const larsTotal=values.larsPrivate+values.larsGmbH;
 const total=Object.values(values).reduce((a,b)=>a+b,0);
 const peak=options.peakEUR, current=options.currentEUR;
 let drawdown=null,warning='nicht berechenbar';
 if(peak!==undefined||current!==undefined){
  if(!finite(peak)||!finite(current)||peak<=0||current<0)throw Error('Peak und aktueller Depotwert müssen gültig sein.');
  drawdown=Math.max(0,(peak-current)/peak);
  warning=drawdown>=.20?'Limit erreicht':drawdown>=.16?'Stufe 16 %':drawdown>=.12?'Stufe 12 %':drawdown>=.08?'Stufe 8 %':'unter Warnschwelle';
 }
 return {
  totalsEUR:values,portfolioTotalEUR:total,
  targetsEUR:{bucket1:target1,bucket2:target2},
  fundingGapEUR:{bucket1:Math.max(0,target1-values.bucket1),bucket2:Math.max(0,target2-values.bucket2)},
  larsStrategyEUR:larsTotal,larsTargetDifferenceEUR:larsTotal-POLICY.larsErichsenTotalEUR,
  skipperIncludedInLars:true,schwabSeparateRiskMonitoring:true,
  drawdown,drawdownStatus:warning,
  complete:values.unassigned===0
 };
}
root.PM021Portfolio={POLICY,summarize};
if(typeof module!=='undefined'&&module.exports)module.exports=root.PM021Portfolio;
})(typeof globalThis!=='undefined'?globalThis:this);
