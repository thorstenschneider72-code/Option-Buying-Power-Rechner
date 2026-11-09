const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {putMargin, analyseRisk} = require('../risk.js');
const p = {qty:2,strike:100,spot:100,mark:3};
assert.equal(putMargin(p),4600);
assert.equal(putMargin({qty:1,strike:80,spot:100,mark:1}),900); // 10% strike floor
assert.equal(putMargin({qty:1,strike:1,spot:1,mark:0}),100); // contract floor
assert.equal(putMargin({qty:1,strike:100,spot:80,mark:22}),3800); // ITM
const r = analyseRisk([p],10000,.2,2,1);
assert.equal(r.nominal,20000); assert.equal(r.shares,200);
assert.equal(r.current,4600); assert.equal(r.stressed,8400);
assert.equal(r.loss,6600); assert.equal(r.itm,20000);
assert.equal(analyseRisk([p],10000,0,2,1).loss,0);
assert.equal(analyseRisk([p],10000,0,2,1).stressed,4600);
assert.equal(analyseRisk([p],10000,.2,2,1.5).stressed,12600);
assert.equal(analyseRisk([],10000,.2,2,1).loss,2000);
assert.equal(analyseRisk([p,{...p,qty:1}],0,0,1,1).nominal,30000);
// Exercise the actual page scripts against a small DOM implementation.
class El {
 constructor(){this.value='';this.children=[];this.style={};this.textContent='';}
 append(...c){this.children.push(...c);} replaceChildren(){this.children=[];}
 insertRow(){const r=new El();r.insertCell=()=>{const c=new El();r.append(c);return c;};this.append(r);return r;}
 scrollIntoView(){} remove(){} setAttribute(){}
}
const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
const els={};for(const m of html.matchAll(/id="([^"]+)"/g))els[m[1]]=new El();
const storage=new Map();
const context={document:{getElementById:id=>els[id],querySelectorAll:()=>[],createElement:()=>new El()},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},alert:msg=>{context.lastAlert=msg;}};
context.window=context;
vm.createContext(context);vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],context);vm.runInContext(fs.readFileSync(require.resolve('../risk.js'),'utf8'),context);
Object.entries({nlv:100000,meq:80000,mreq:20000,sobp:0,epc:100,str:12,res:8,stockValue:50000,volFactor:2,houseFactor:1}).forEach(([id,v])=>els[id].value=String(v));
context.calc();assert.equal(els.result.style.display,'block');assert.equal(els.maxv.textContent,'-$22,000');
context.renderRisk();assert.match(els.riskResult.children[0].textContent,/25.0 %/);
const table=els.riskResult.children.find(e=>e.children[0]?.children?.length===6)?.children[0];
assert.ok(table,'scenario table');assert.equal(table.children.length,6); // header + 0,10,12,20,30
assert.ok(table.children.some(row=>row.children[0].textContent==='−20 %'));
context.document.querySelectorAll=()=>[{querySelectorAll:()=>[2,100,100,3].map(value=>({value:String(value)}))}];
context.renderRisk();
assert.match(els.riskResult.children[1].textContent,/20,000/);
let scenarios=els.riskResult.children.find(e=>e.children[0]?.children?.length===6).children[0];
let stress=scenarios.children.find(row=>row.children[0].textContent==='−20 %');
assert.equal(stress.children[3].textContent,'$23,800'); // 20k - 4.6k + 8.4k
assert.equal(stress.children[4].textContent,'$65,400'); // equity - stock loss - option loss
assert.equal(stress.children[5].textContent,'$41,600');
els.mreq.value='100';context.renderRisk();
scenarios=els.riskResult.children.find(e=>e.children[0]?.children?.length===6).children[0];
assert.equal(scenarios.children[1].children[3].textContent,'k.A.');
context.saveRisk();assert.ok(storage.get('obpRisk1').includes('"qty":2'));
context.document.querySelectorAll=()=>[];
els.volFactor.value='0';assert.equal(context.renderRisk(),false);
context.calc();assert.equal(els.result.style.display,'block'); // optional invalid inputs cannot block account calculation
context.save();assert.equal(els.result.style.display,'none'); // stale account result is hidden
context.document.querySelectorAll=()=>[{querySelectorAll:()=>[1,2,3,4].map(()=>({value:''}))}];
els.volFactor.value='2';assert.equal(context.renderRisk(),true); // completely empty rows are ignored
context.document.querySelectorAll=()=>[];
els.volFactor.value='2';els.stockValue.value='';assert.equal(context.renderRisk(),true);assert.ok(els.riskResult.children.some(e=>e.textContent.includes('Long-Aktienmarktwert eingeben')));
context.clearAll();assert.equal(els.nlv.value,'');assert.equal(els.result.style.display,'none');assert.equal(storage.size,0);
console.log('All calculation and page integration assertions passed.');
