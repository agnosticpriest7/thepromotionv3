/* SENIOR SALES — COUNTERSIGN A JUNIOR'S ORDER (SPEC-countersign.md)

   Rank 3 had no verb: a seat tier and a flat +6 to standing, then rank 4 arrived with the entire
   delegation layer at once. This is that grammar one rank early, at one-job scale.

   Asserts CONTRACTS, not coordinates (§14) — the junior pool is derived from desk tiers, the 2x2
   is driven through the real cosignDo(), and nothing here names a worker or a position.

   The floor is POSED, not played into (§15): a harness world sits in the day-1 intro with the clock
   frozen and most workers parked off-screen at (-400,-400). startNewGame(0) gives a live loop, and
   posing needs `arrived=true` or the arrival scheduler re-parks everyone every frame. */
const {createWorld}=require('./harness');
let pass=0, fail=0;
const ck=(n,c,d)=>{ console.log(`  ${c?'PASS':'FAIL'}  ${n}${d?'   '+d:''}`); c?pass++:fail++; };

const w=createWorld(); w.startNewGame(0); w.run(700,{ignoreGameOver:true});
const S=w.sandbox, g=w.g, p=g.player;
for(const fn of ['cosignActive','cosignJuniors','cosignSound','cosignArrive','cosignDo','cosignExpire','cosignRollDay']){
  if(typeof S[fn]!=='function'){ console.log('RED  '+fn+' missing'); process.exit(1); }
}
/* put the floor on its feet so the tier pool is real */
g.NPCS.forEach(n=>{ if(n.alive){n.gone=false;n.wentHome=false;n.arrived=true;} });

/* ---- 1. rank gate ------------------------------------------------------------------------- */
let gateOK=true, detail=[];
for(let r=0;r<=6;r++){ p.rank=r; const on=S.cosignActive();
  if(on!==(r===3)){gateOK=false;detail.push('rank'+r+'='+on);} }
ck('active at rank 3 only', gateOK, detail.join(',')||'0-6 checked');
p.rank=3;

/* ---- 2. the junior pool derives from desk tiers -------------------------------------------- */
const mine=S.youTier();
const pool=S.cosignJuniors();
const allBelow=pool.every(n=>{ const d=g.desks.find(x=>x.owner===n.name); return d && d.tier<mine; });
ck('every junior sits below you', pool.length>0 && allBelow, pool.length+' juniors, youTier='+mine);

/* it must FOLLOW the tiers, not a name list: promote one desk to your tier and it leaves the pool */
const victim=pool[0], vd=g.desks.find(x=>x.owner===victim.name), was=vd.tier;
vd.tier=mine;
const shrunk=S.cosignJuniors().some(n=>n.name===victim.name)===false;
vd.tier=was;
ck('pool follows desk tiers (no name literals)', shrunk, 're-tiered '+victim.name.split(' ')[0]+' out of the pool');

/* ---- 3. exclusions ------------------------------------------------------------------------ */
const bad=S.cosignJuniors().filter(n=>n.boss||n.mgr||n.receptionist||n.dept==='hr'||S.deskbound(n));
ck('boss / manager / HR / reception / deskbound excluded', bad.length===0,
   bad.length?bad.map(n=>n.name).join(','):'none present');

/* ---- 4. the 2x2 pays out, and 5. never touches suspicion ---------------------------------- */
/* THE MAPPING IS THE SPEC, so it is hard-coded here as an INDEPENDENT ORACLE (§14: game-rule
   constants should be hard-coded — a test SHOULD fail when they change).

   The first version of this file derived "sound" by asking cosignSound() itself. That read as the
   tidy, non-duplicating choice and it was wrong: inverting cosignSound in the build left the whole
   suite GREEN, because the poser and the thing under test moved together. A test that cannot
   disagree with the implementation is not testing it. Caught by mutation, not by review. */
const EXPECT_MATCH={grind:'zealot',credit:'climber',solo:'paranoid',visible:'peacock',social:'socialite'};
const KINDS=Object.keys(EXPECT_MATCH);
function poseOrder(n,sound){
  n.profiled=true;
  const k=sound ? KINDS.find(x=>EXPECT_MATCH[x]===n.ptype)
                : KINDS.find(x=>EXPECT_MATCH[x]!==n.ptype);
  if(!k){ n.order=null; return false; }
  n.order={kind:k,day:g.day};
  return true;
}
/* and hold the definition itself against the oracle, over every kind x personality */
{
  const n=S.cosignJuniors()[0], keep=n.ptype;
  let wrong=0, checked=0;
  for(const pt of ['zealot','climber','paranoid','peacock','socialite']){
    n.ptype=pt;
    for(const k of KINDS){
      n.order={kind:k,day:g.day}; checked++;
      if(S.cosignSound(n)!==(EXPECT_MATCH[k]===pt))wrong++;
    }
  }
  n.ptype=keep; n.order=null;
  ck('sound/flawed matches the delegation table', wrong===0, wrong+' of '+checked+' combinations disagree');
}

function cell(sound,approve,label,expect){
  const n=S.cosignJuniors()[0];
  career_reset();
  if(!poseOrder(n,sound)){ ck(label,false,'could not pose a '+(sound?'sound':'flawed')+' order'); return; }
  const p0=p.prog, s0=p.suspicion, m0=n.mood, f0=n.friend||0, st0=n.stress;
  S.cosignDo(n,approve);
  const d={prog:p.prog-p0, susp:p.suspicion-s0, mood:n.mood-m0, friend:(n.friend||0)-f0, stress:n.stress-st0};
  ck(label, expect(d), JSON.stringify(d));
  ck('  ^ suspicion untouched', d.susp===0, 'delta '+d.susp);
  ck('  ^ order consumed', !n.order, '');
}
function career_reset(){ g.career.cosign.right=0; g.career.cosign.wrong=0; g.career.cosign.today=0; p.prog=50; }

cell(true , true , 'sound + countersign  -> progress up, mood up',   d=>d.prog>0 && d.mood>0);
cell(false, false, 'flawed + send back   -> progress up, stress up', d=>d.prog>0 && d.stress>0);
cell(false, true , 'flawed + countersign -> progress DOWN',          d=>d.prog<0);
cell(true , false, 'sound + send back    -> friendship DOWN, no gain', d=>d.friend<0 && d.prog<=0);

/* ---- 6. blind is NEUTRAL (Kyle's call) ----------------------------------------------------- */
{
  const n=S.cosignJuniors()[0]; career_reset();
  poseOrder(n,false); n.profiled=false;                       // flawed order, but you cannot read them
  const p0=p.prog, s0=p.suspicion, f0=n.friend||0;
  S.cosignDo(n,true);                                          // the WRONG call, made blind
  ck('unprofiled countersign costs nothing', p.prog===p0 && p.suspicion===s0 && (n.friend||0)===f0,
     'prog '+(p.prog-p0)+' susp '+(p.suspicion-s0)+' friend '+((n.friend||0)-f0));
  ck('  ^ and scores nothing', g.career.cosign.right===0 && g.career.cosign.wrong===0,
     JSON.stringify(g.career.cosign));
}

/* ---- 7. anti-farm cap ---------------------------------------------------------------------- */
{
  career_reset();
  /* Asserted behaviourally: correct calls stop paying once the day's allowance is spent. The cap
     VALUE is a const and unreachable from the sandbox, and restating it here would just be a second
     copy to rot (§14) — what matters is that the reward is bounded and the tail is free. */
  const gains=[];
  for(let i=0;i<8;i++){
    const js=S.cosignJuniors(); const n=js[i%js.length];
    if(!poseOrder(n,true))continue;
    const p0=p.prog; S.cosignDo(n,true); gains.push(p.prog-p0);
  }
  const paid=gains.filter(x=>x>0).length, tail=gains.slice(paid).every(x=>x===0);
  ck('the reward is capped', paid>0 && paid<gains.length, paid+' of '+gains.length+' calls paid');
  ck('  ^ and every call past the cap pays nothing', tail, JSON.stringify(gains));
}

/* ---- 8. expiry is free --------------------------------------------------------------------- */
{
  career_reset();
  const n=S.cosignJuniors()[0]; poseOrder(n,false);
  const p0=p.prog, s0=p.suspicion;
  S.cosignExpire();
  ck('an unsigned order lapses free', !n.order && p.prog===p0 && p.suspicion===s0,
     'prog '+(p.prog-p0)+' susp '+(p.suspicion-s0));
}

/* ---- 9. the day clears orders and the cap -------------------------------------------------- */
{
  const n=S.cosignJuniors()[0]; poseOrder(n,true); g.career.cosign.today=99;
  S.cosignRollDay();
  ck('day roll clears orders and resets the cap', !n.order && g.career.cosign.today===0, '');
}

/* ---- 10. save round-trip: counters persist, orders do not ---------------------------------- */
{
  /* Same API t_menu_load drives. The point of this one: career.cosign is additive and rides along
     because `career` is cloned whole, which is WHY no SAVE_VERSION bump was needed. If someone ever
     switches the save to an explicit field list, this goes red and tells them what they dropped. */
  g.career.cosign.right=7; g.career.cosign.wrong=3; g.career.cosign.today=1;
  const n=S.cosignJuniors()[0]; poseOrder(n,true);
  const save=w.rawSave();
  const snap=save.buildSnapshot(false,null);
  save.slot=0; save.Store.save(0,snap);
  g.career.cosign.right=0; g.career.cosign.wrong=0; g.career.cosign.today=0;
  save.applySnapshot(save.Store.load(0));
  const c=g.career.cosign;
  ck('countersign tally survives a save round-trip', c.right===7&&c.wrong===3, JSON.stringify(c));
  /* orders are ephemeral by design — they must NOT come back, and their absence must be harmless */
  const anyOrder=g.NPCS.some(x=>x.order);
  ck('  ^ orders do not persist', !anyOrder, anyOrder?'an order survived the load':'none restored');
}

console.log(`countersign: ${pass} pass, ${fail} fail`);
console.log(fail?'COUNTERSIGN: RED ❌':'COUNTERSIGN: GREEN ✅');
process.exit(fail?1:0);
