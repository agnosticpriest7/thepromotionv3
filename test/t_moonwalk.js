/* NOBODY WALKS BACKWARDS.

   Kyle: "Zora sometimes walks backwards when traveling forward like some moonwalker."

   It was never Zora and never her art (all four of her walk rows check out against the rest of the
   cast). It was the MEETING: there are 16 chairs and 23 desks, and every seatless attendee used to
   be sent to ONE identical pixel. They arrived, followPath stopped — so `moving` went false and the
   facing froze — and separate() then shoved the pile around. Because the nudge is applied AFTER
   facing is set, the shove never turned them: they slid across the floor locked mid-pose. Measured
   during Meeting before the fix: 19.4% of Zora's moving frames were 179-180 degrees off her facing.

   Two contracts, both coordinate-free (§14):
     1. an NPC moved ONLY by the separation nudge still faces the way it is actually travelling
     2. meetingStand() hands every seatless attendee a spot of their own

   The floor is POSED, not played into — a harness world sits in the day-1 intro with the clock
   frozen and 17 of 19 workers parked off-screen at (-400,-400) (§15). */
const {createWorld}=require('./harness');
/* startNewGame gives a LIVE loop. A bare createWorld never ticks the per-frame NPC bookkeeping —
   the block under test — so the pose just sits there and the test proves nothing. */
const w=createWorld(); w.startNewGame(0);
w.run(400,{ignoreGameOver:true});
const S=1.8;
let bad=0;

/* ---- 1. separation-only motion must not be backwards ---------------------------------------- */
const crowd=w.g.NPCS.filter(n=>n.alive&&!n.receptionist&&!n.boss).slice(0,10);
if(crowd.length<4){console.log('RED  not enough workers to pose');process.exit(1);}
/* Stack them nearly on top of each other: updateNPC has nothing to do (no goal, no errand), so the
   ONLY thing that can move them is separate() — precisely the state that produced the moonwalk. */
const cx=Math.round(560*S), cy=Math.round(430*S);
/* `arrived` matters: without it the arrival scheduler re-parks them off-screen every frame and the
   pose silently evaporates (see __dbg.seat, which sets the same three flags). */
crowd.forEach((n,i)=>{ n.gone=false;n.wentHome=false;n.arrived=true;
  n.errand=null;n.goal=null;n.path=null;n.seat=null;
  n.x=cx+(i%3)*2; n.y=cy+Math.floor(i/3)*2; n.face=0; });
const prev=new Map();
let moved=0, backwards=0, worstDeg=0;
for(let f=0;f<900;f++){
  crowd.forEach(n=>prev.set(n.name,{x:n.x,y:n.y}));
  w.run(1,{ignoreGameOver:true});
  for(const n of crowd){
    const p=prev.get(n.name); if(!p)continue;
    const dx=n.x-p.x, dy=n.y-p.y, d=Math.hypot(dx,dy);
    if(d<=0.25)continue;
    moved++;
    let a=Math.abs(Math.atan2(dy,dx)-(n.face||0)); a=Math.min(a,2*Math.PI-a);
    const deg=a*180/Math.PI; if(deg>worstDeg)worstDeg=deg;
    if(a>Math.PI/2)backwards++;
  }
}
console.log(`nudge-only motion: ${moved} moving frames, ${backwards} backwards (worst ${worstDeg.toFixed(0)} deg)`);
if(moved<40){console.log('  FAIL nobody moved — the pose proved nothing');bad++;}
if(backwards>0){console.log(`  FAIL ${backwards} frames travelling >90 deg from the way they face`);bad++;}

/* ---- 2. seatless meeting attendees each get their own spot ---------------------------------- */
const meetingStand=w.sandbox.meetingStand;
if(typeof meetingStand!=='function'){console.log('  FAIL meetingStand missing');bad++;}
else{
  const MIN=10*S;
  const all=w.g.NPCS.filter(n=>n.alive&&!n.receptionist&&!n.boss);
  all.forEach(n=>{n.gone=false;n.wentHome=false;n.arrived=true;n.seat=null;n.mtgStand=null;n.mtgStandPh=null;});
  const spots=all.map(n=>({name:n.name,p:meetingStand(n)}));
  let closest=Infinity, pair=null;
  for(let a=0;a<spots.length;a++)for(let b=a+1;b<spots.length;b++){
    const d=Math.hypot(spots[a].p.x-spots[b].p.x, spots[a].p.y-spots[b].p.y);
    if(d<closest){closest=d;pair=[spots[a].name,spots[b].name];}
  }
  const distinct=new Set(spots.map(s=>s.p.x+','+s.p.y)).size;
  console.log(`meeting stand spots: ${spots.length} attendees, ${distinct} distinct, `+
              `closest ${(closest/S).toFixed(1)} authored`);
  if(distinct<spots.length){console.log('  FAIL two attendees share a standing spot');bad++;}
  if(closest<MIN){console.log(`  FAIL ${pair&&pair.join(' and ')} stand ${(closest/S).toFixed(1)}u apart`);bad++;}
}
console.log(bad?'MOONWALK: RED ❌':'MOONWALK: GREEN ✅ (nobody travels backwards; every stander has room)');
process.exit(bad?1:0);
