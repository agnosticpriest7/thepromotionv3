/* THE TOUR MUST END BECAUSE IT IS OVER, NOT BECAUSE A SAFETY NET FIRED.

   `tickIntro` has an absolute bail at `intro.age>100` so a wedged tour can never trap a player
   forever. That is the right thing to have. But the store's end condition still counted the
   OFFICE's beats — `intro.i>=INTRO_BEATS.length`, eleven — while Save-Rite fires seven. The
   condition was therefore unsatisfiable in the store: all seven beats played out by 53 seconds and
   the guide then stood at the tills saying nothing for another 47, until the bail took it.

   From the couch that is not "a long tour", it is a tour that appears to have hung. And no test in
   the suite could see it: the walk is cardinal, the route clears every prop, the save round-trips,
   nothing overlaps, and it does eventually end. Every existing assertion was about the tour's
   CONTENT. None was about its TERMINATION.

   ⚠️ THE SHAPE TO REMEMBER (CLAUDE.md §14): the level-aware beats change fixed two of the three
   `INTRO_BEATS` references the code's own comment warned about, and there were four. A comment
   saying "N places" is a count someone made once; grep is a count that is true now.

   Contract, not coordinates — nothing here knows a route, a beat count or a duration:
     1. the tour ends inside the safety net's window rather than ON it
     2. it ends soon after its own last beat, not minutes later
     3. both buildings, because the office is what made this invisible for a whole session */
const {createWorld}=require('./harness');

const SAFETY=100;          // the bail in tickIntro; this test exists to prove we never reach it
const MAX_TAIL=8;          // seconds of silence allowed after the final beat starts

function measure(label, make){
  const w=make(), g=w.g;
  let frames=0,lastBeat=0,lastAge=0,prevI=-1,beats=0,walked=0,prev=null;
  while(g.intro&&frames<SAFETY*60*1.5){
    if(g.intro.i!==prevI){prevI=g.intro.i;lastBeat=frames;beats++;}
    lastAge=g.intro.age;
    const p=g.player; if(prev){const d=Math.hypot(p.x-prev.x,p.y-prev.y); if(d>1.2&&d<40)walked++;}
    prev={x:p.x,y:p.y};
    w.run(1,{ignoreGameOver:true}); frames++;
  }
  const secs=frames/60, tail=(frames-lastBeat)/60;
  console.log(`\n[${label}] ended at ${secs.toFixed(1)}s (frame ${frames}), final intro.age=${lastAge.toFixed(1)}`);
  console.log(`  ${beats} beats, last at ${(lastBeat/60).toFixed(1)}s -> ${tail.toFixed(1)}s tail   walking frames=${walked}`);
  let bad=0;
  if(g.intro){
    console.log(`  FAIL tour never ended at all`);bad++;
  } else if(lastAge>=SAFETY-1){
    console.log(`  FAIL ended on the ${SAFETY}s SAFETY NET (age ${lastAge.toFixed(1)}), not on its own beats —`);
    console.log(`       the end condition is unsatisfiable for this level`);bad++;
  }
  if(tail>MAX_TAIL){
    console.log(`  FAIL ${tail.toFixed(1)}s of dead air after the last beat (max ${MAX_TAIL}) — reads as a hang`);bad++;
  }
  /* ⚠️ ANTI-VACUITY, and it has to anchor on the half that actually dies. A tour that ends
     INSTANTLY passes both checks above with a perfect score: age 0, tail 0. So assert the thing
     that would make them meaningless — that a real tour ran, with beats and with walking. */
  if(beats<4){console.log(`  FAIL only ${beats} beats fired — no tour to measure, checks above are vacuous`);bad++;}
  if(walked<400){console.log(`  FAIL player walked ${walked} frames — no tour to measure`);bad++;}
  return bad;
}

let bad=0;
bad+=measure('office',   ()=>{const w=createWorld();w.startNewGame(0);return w;});
bad+=measure('save-rite',()=>createWorld({storage:{'promo:level':'grocery','promo:newgame':'0','promo:char':'0'}}));
console.log('');
console.log(bad?'INTRO END: RED ❌':'INTRO END: GREEN ✅ (both tours end on their own beats, safety net untouched)');
process.exit(bad?1:0);
