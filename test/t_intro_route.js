/* THE TOUR ROUTE MUST NOT CROSS ANYTHING SOLID.

   The intro TELEPORTS the player and the guide along a fixed route — they never collide with
   anything — so the route is the only thing keeping them out of the walls. Kyle, on the store's
   first tour: "the intro tour is really bad. clips through everything."

   ⚠️ WHY THIS IS A SUITE TEST AND NOT A CHECK IN THE GENERATOR. It WAS a check in the generator,
   and the check was hollow: `solid()` takes a BOX, the generator called it as solid(x,y,w,h), so
   `box` was a number, aabb() read undefined properties off it and returned false for every point
   in the building. "Is this walkable" answered YES for solid wall, everywhere. The generated route
   left receiving by walking west through its west wall, and I described it as verified against
   collision because a function whose name said so had returned true.
   A verification that cannot fail is worse than no verification, because it gets quoted.

   So the assertion lives here, where the anti-vacuity anchor below is run by the gate every time:
     1. no leg of either tour crosses walls, desks or containers
     2. ANCHOR — solid() must be able to see furniture at all, or (1) is vacuous
   Contract, not coordinates: nothing here names a waypoint, so re-authoring a route cannot rot it. */
const {createWorld}=require('./harness');

function check(label, make){
  const w=make(); w.run(400);          // ⚠️ blockers are empty until the first buildGrid (§14)
  const S=w.sandbox, L=w.g.layout, sc=L.S;
  const h=Math.round(16*sc);
  const box=(x,y)=>({x:x-h/2,y:y-h/2,w:h,h:h});   // route points come back ALREADY SCALED

  /* ⚠️ ANCHOR ON THE HALF THAT ACTUALLY DIES. Anchoring on walls would pass in exactly the world
     where containers are invisible to solid() — they are filled from different places at different
     times. The thing this test is guarding against is a route through furniture, so anchor on
     furniture. */
  const conts=(L.containers||[]);
  let blind=0;
  for(const c of conts) if(!S.solid(box(c.x+c.w/2, c.y+c.h/2))) blind++;

  const r=S.levelIntro().route;
  const bad=[];
  for(let i=1;i<r.length;i++){
    const a=r[i-1],b=r[i];
    const n=Math.max(2,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/4));
    for(let k=0;k<=n;k++){
      const x=a.x+(b.x-a.x)*k/n, y=a.y+(b.y-a.y)*k/n;
      if(S.solid(box(x,y))){bad.push(`leg ${i} at authored (${Math.round(x/sc)},${Math.round(y/sc)})`);break;}
    }
  }
  console.log(`\n[${label}] ${r.length} route points, ${conts.length} containers`);
  let fail=0;
  if(blind){
    console.log(`  FAIL ANCHOR: ${blind}/${conts.length} containers are not solid at their own centre —`);
    console.log(`       solid() cannot see furniture here, so the route check below proves nothing`);
    fail++;
  } else {
    console.log(`  anchor ok: all ${conts.length} containers read solid at their centre`);
  }
  if(bad.length){
    console.log(`  FAIL ${bad.length} leg(s) cross solid geometry — the tour walks through it:`);
    bad.slice(0,8).forEach(s=>console.log('       '+s));
    fail++;
  } else {
    console.log(`  no leg crosses solid geometry`);
  }
  if(r.length<6){console.log(`  FAIL route has only ${r.length} points — nothing to check`);fail++;}
  return fail;
}

let bad=0;
bad+=check('office',   ()=>{const w=createWorld();w.startNewGame(0);return w;});
bad+=check('save-rite',()=>createWorld({storage:{'promo:level':'grocery','promo:newgame':'0','promo:char':'0'}}));
console.log('');
console.log(bad?'INTRO ROUTE: RED ❌':'INTRO ROUTE: GREEN ✅ (neither tour walks through anything)');
process.exit(bad?1:0);
