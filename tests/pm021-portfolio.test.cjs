const assert=require('node:assert/strict');
const {POLICY,summarize}=require('../pm021-portfolio.js');
assert.equal(POLICY.monthlyWithdrawalEUR,10000);
const p=summarize([
 {id:'cash',bucket:'bucket1',valueEUR:56724},
 {id:'gold',bucket:'bucket2',valueEUR:352686},
 {id:'long',bucket:'bucket3',valueEUR:200000},
 {id:'lars-private',bucket:'larsPrivate',valueEUR:300000},
 {id:'skipper',bucket:'larsGmbH',valueEUR:100000},
 {id:'schwab',bucket:'schwab',valueEUR:400000}
],{peakEUR:1000000,currentEUR:880000});
assert.deepEqual(p.fundingGapEUR,{bucket1:63276,bucket2:7314});
assert.equal(p.larsStrategyEUR,400000);
assert.equal(p.larsTargetDifferenceEUR,0);
assert.equal(p.drawdownStatus,'Stufe 12 %');
assert.equal(p.complete,true);
assert.equal(summarize([{id:'a',bucket:'unassigned',valueEUR:1}]).complete,false);
assert.throws(()=>summarize([{id:'x',bucket:'bucket1',valueEUR:2},{id:'x',bucket:'bucket2',valueEUR:3}]),/eindeutige ID/);
assert.throws(()=>summarize([{id:'x',bucket:'bucket1',valueEUR:-1}]),/Ungültiger/);
assert.throws(()=>summarize([{id:'x',bucket:'unknown',valueEUR:1}]),/Unbekannte/);
console.log('PM-021 consolidated portfolio tests passed');
