/* ERRAND POINTS MUST NOT HAND OUT THE SAME SQUARE TWICE.

   errandPoints is eight FIXED coordinates shared by the whole floor. startErrand used to hand every
   NPC who rolled the water cooler that one identical pixel, and they then dwelled on it for 2.5-5s
   — so two or three people stood inside each other, twitching. Kyle: "they travel to talk to
   someone, basically occupy the same space, and both characters flicker and move slightly back and
   forth, looking like they are stuck."

   Asserts the CONTRACT (§14: contracts, not coordinates) — dispatch a crowd at one errand point and
   no two of them may be assigned the same spot. Coordinate-free, so moving a cooler cannot rot it. */
const {createWorld}=require('./harness.js');
const w=createWorld({seed:99});
w.run(600,{ignoreGameOver:true});

const S=1.8, MIN=10*S;                       // closer than this is the same square on screen
/* Driven through startErrand, the real entry point — errandPoints is a const and consts are not
   reachable from the harness sandbox.

   The floor is POSED rather than played into. A harness world sits in the day-1 intro with the clock
   frozen and 17 of 19 workers still parked off-screen at (-400,-400), so simply running frames never
   produces a populated floor to dispatch. (That parking is also a trap for any probe that measures
   NPC proximity: those 17 are all at the same pixel, mutual distance 0, and will happily masquerade
   as "overlapping pairs".) Clearing `gone` and dealing them onto the floor tests the assignment
   itself, which is the thing under test, and keeps the test independent of intro behaviour. */
const startErrand=w.sandbox.startErrand;
if(typeof startErrand!=='function'){console.log('RED  startErrand missing');process.exit(1);}

const crowd=w.g.NPCS.filter(n=>n.alive&&!n.receptionist&&!n.boss).slice(0,10);
if(crowd.length<3){console.log('RED  not enough workers to test');process.exit(1);}
crowd.forEach((n,i)=>{ n.gone=false; n.wentHome=false; n.errand=null;
  n.x=Math.round(300+ (i%5)*90); n.y=Math.round(300+ Math.floor(i/5)*90); });

let fails=0, checked=0, dispatched=0;
for(let round=0;round<60;round++){
  crowd.forEach(n=>{n.errand=null;});
  crowd.forEach(n=>{try{startErrand(n);}catch(e){}});
  const byType={};
  crowd.forEach(n=>{
    if(!n.errand||n.errand.ptype==='conspire')return;
    (byType[n.errand.ptype]=byType[n.errand.ptype]||[]).push(n);
  });
  for(const t in byType){
    const g=byType[t]; dispatched+=g.length;
    for(let a=0;a<g.length;a++)for(let b=a+1;b<g.length;b++){
      checked++;
      const d=Math.hypot(g[a].errand.x-g[b].errand.x,g[a].errand.y-g[b].errand.y);
      if(d<MIN){
        fails++;
        if(fails<=5)console.log(`  FAIL ${t}: ${g[a].name} and ${g[b].name} both sent to `+
          `(${g[a].errand.x},${g[a].errand.y}) ~ (${g[b].errand.x},${g[b].errand.y}) — ${(d/S).toFixed(1)}u apart`);
      }
    }
  }
}
crowd.forEach(n=>{n.errand=null;});
console.log(`errand spots: ${dispatched} dispatches, ${checked} same-destination pairs, ${fails} colliding`);
if(fails){console.log('RED  errand points are handing out the same square');process.exit(1);}
console.log('GREEN errand points space people out');
