const { createWorld } = require('./harness');
const w=createWorld(); w.startNewGame(0); w.run(500,{ignoreGameOver:true});
const S=w.sandbox, SC=1.8, sc=v=>Math.round(v*SC);
let pass=0,fail=0; const ck=(n,c)=>{console.log(`  ${c?'PASS':'FAIL'}  ${n}`);c?pass++:fail++;};
// printer1 authored (692,144) accounting/annex; printer2 authored (932,524) sales floor
const near1=S.nearestPrinter({x:sc(700),y:sc(150),w:52,h:47});
const near2=S.nearestPrinter({x:sc(925),y:sc(515),w:52,h:47});
console.log(`  near1.x=${near1&&near1.x} (expect ~${sc(692)})   near2.x=${near2&&near2.x} (expect ~${sc(932)})`);
ck('victim in accounting picks the accounting printer', near1 && Math.abs(near1.x - sc(692)) < 80);
ck('victim on the sales floor picks the sales printer', near2 && Math.abs(near2.x - sc(932)) < 120);
ck('the two are different printers', near1 && near2 && near1!==near2);
console.log(`\nNEAREST PRINTER: ${fail===0?'GREEN ✅':'RED ❌'} (${pass} pass, ${fail} fail)`);
process.exit(fail===0?0:1);
