const { createWorld } = require('./harness');
const w=createWorld(); w.startNewGame(0); w.run(1500,{ignoreGameOver:true});
const S=w.sandbox, g=w.g, SC=1.8;
let pass=0,fail=0; const ck=(n,c)=>{console.log(`  ${c?'PASS':'FAIL'}  ${n}`);c?pass++:fail++;};
const workers=g.NPCS.filter(n=>n.alive&&S.isWorker(n));
const M=workers[0], P=workers[1];   // M=messenger, P=subject
M.friends=[]; P.friends=[]; M.rival=false; M.feudWith=null; P.meltCd=99;
const dirt=name=>{g.player.leverage.push({label:'d',target:name,power:22,src:'gossip'});};

// --- neutral messenger, subject FAR (no overhear): messenger must NOT react ---
P.x=g.player.x+2000; P.y=g.player.y;   // far
M.mood=0; M.stress=10; P.stress=30; g.player.suspicion=20;
dirt(P.name);
const mMood0=M.mood, mStress0=M.stress, pStress0=P.stress;
S.spreadRumorAbout(M,P);
ck('messenger mood UNCHANGED (no witness gasp)', M.mood===mMood0);
ck('messenger stress UNCHANGED', M.stress===mStress0);
ck('subject took the hit (stress up)', P.stress>pStress0);

// --- subject NEAR (overhears): extra reaction + player suspicion ---
P.x=g.player.x+40; P.y=g.player.y;     // within earshot
P.stress=30; P.meltCd=99; g.player.suspicion=20; M.mood=0;
dirt(P.name);
const susp0=g.player.suspicion, pStressA=P.stress;
S.spreadRumorAbout(M,P);
ck('subject overhears -> suspicion rises', g.player.suspicion>susp0);
ck('subject overhears -> extra stress vs base', P.stress>pStressA);
ck('messenger STILL unaffected when subject overhears', M.mood===0);

// --- loyal messenger still backfires ---
M.friends=[P.name]; M.friend=60; P.stress=50;
const mf0=M.friend;
S.spreadRumorAbout(M,P);
ck('loyal messenger backfires (friend drops)', M.friend<mf0);

// --- SUPPLY: once per day ---
const sup=S.objByType('supply'); sup.suppliesDay=undefined;
let m1=S.buildOptions({kind:'obj',ref:sup});
let wild1=m1.items.find(it=>/assorted prank supplies \(wildcard\)/.test(it.label));
ck('wildcard grab available when fresh', !!wild1 && !wild1.disabled);
const inv0=g.player.inv.length; wild1.act();
ck('grab adds to inventory', g.player.inv.length===inv0+1);
ck('supply day stamped', sup.suppliesDay===g.day);
let m2=S.buildOptions({kind:'obj',ref:sup});
let picked=m2.items.find(it=>/picked clean/.test(it.label));
let wild2=m2.items.find(it=>/assorted prank supplies \(wildcard\)/.test(it.label)&&!it.disabled);
ck('second grab blocked same day', !!picked && !wild2);

console.log(`\nRUMOR + SUPPLY: ${fail===0?'GREEN ✅':'RED ❌'} (${pass} pass, ${fail} fail)`);
process.exit(fail===0?0:1);
