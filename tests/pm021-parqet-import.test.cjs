const assert=require('node:assert/strict');
const {parse,allocate}=require('../pm021-parqet-import.js');
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
console.log('PM-021 local Parqet import tests passed');
