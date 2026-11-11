const assert=require('node:assert/strict');
const {parse,parseCSV,allocate,suggestBucket}=require('../pm021-parqet-import.js');
const rows=parse(JSON.stringify({holdings:[
 {portfolio:'ING',id:'h1',name:'ETF',currency:'EUR',currentValue:100},
 {portfolio:'Schwab',id:'h2',name:'Short option',currency:'EUR',currentValue:-20},
 {portfolio:'Lars',id:'h3',name:'Gold producers',currency:'EUR',currentValue:50}
]}));
assert.equal(rows.length,3);
const r=allocate(rows,{'ING::h1':'bucket3','Lars::h3':'larsPrivate','Schwab::h2':'schwab'});
assert.equal(r.positions.length,2);assert.equal(r.excludedNegativeEUR,-20);assert.equal(r.unassigned.length,1);
assert.throws(()=>parse(JSON.stringify([{portfolio:'ING',id:'h1',currency:'EUR',currentValue:1},{portfolio:'ING',id:'h1',currency:'EUR',currentValue:2}])),/eindeutige/);
assert.throws(()=>parse(JSON.stringify([{portfolio:'ING',id:'h1',currency:'USD',currentValue:2}])),/EUR/);
assert.throws(()=>allocate(rows,{'ING::h1':'nonsense'}),/Unbekannter/);
const csv='portfolio,id,name,currency,currentValue\nING,one,"ETF, breit",EUR,123.45\nLars Erichsen Depot,two,Gold Producers,EUR,45';
const imported=parseCSV(csv);assert.equal(imported.length,2);assert.equal(imported[0].name,'ETF, breit');assert.equal(suggestBucket(imported[0]),'unassigned');assert.equal(suggestBucket(imported[1]),'larsPrivate');
assert.throws(()=>parseCSV('portfolio,id,name,currency,currentValue\nING,a,ETF,USD,12'),/EUR/);
console.log('PM-021 local Parqet import tests passed');
