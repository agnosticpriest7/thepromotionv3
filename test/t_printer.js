const { createWorld } = require('./harness');
const w=createWorld(); w.startNewGame(0); w.run(500,{ignoreGameOver:true});
const S=w.sandbox, SC=1.8, sc=v=>Math.round(v*SC);
let pass=0,fail=0; const ck=(n,c)=>{console.log(`  ${c?'PASS':'FAIL'}  ${n}`);c?pass++:fail++;};
// printer1 authored (92,224) NW; printer2 authored (1140,430) annex-right
const near1=S.nearestPrinter({x:sc(100),y:sc(230),w:52,h:47});
const near2=S.nearestPrinter({x:sc(1130),y:sc(440),w:52,h:47});
console.log(`  near1.x=${near1&&near1.x} (expect ~${sc(92)})   near2.x=${near2&&near2.x} (expect ~${sc(1140)})`);
ck('victim in NW picks the NW printer', near1 && Math.abs(near1.x - sc(92)) < 80);
ck('victim by the annex picks the 2nd printer', near2 && Math.abs(near2.x - sc(1140)) < 120);
ck('the two are different printers', near1 && near2 && near1!==near2);
console.log(`\nNEAREST PRINTER: ${fail===0?'GREEN ✅':'RED ❌'} (${pass} pass, ${fail} fail)`);
process.exit(fail===0?0:1);
