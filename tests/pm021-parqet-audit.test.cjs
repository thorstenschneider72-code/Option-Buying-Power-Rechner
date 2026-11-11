const assert=require('node:assert/strict');
const {audit}=require('../pm021-parqet-audit.js');
const rows=[{key:'a::1',portfolio:'A',valueEUR:100},{key:'b::2',portfolio:'Schwab',valueEUR:-20}];
const r=audit(rows);assert.equal(r.grossPositiveEUR,100);assert.equal(r.netEUR,80);assert.equal(r.byPortfolio.Schwab.negativeEUR,-20);assert.equal(r.validated,false);assert.ok(r.warnings.some(w=>w.type==='schwab'));
console.log('PM-021 reconciliation tests passed');
