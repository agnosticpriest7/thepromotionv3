/* THE INTRO WALK MUST BE CARDINAL ONLY.

   There is no diagonal walk art. The tour route used to round its corners with short 45-degree
   chamfers, and on those the sprite picker alternates between the up/down sheet and the left/right
   sheet every frame or two. Kyle: "I don't have diagonal sprites drawn so it's just extremely fast
   switches between up/down left/right."

   Asserts the CONTRACT (§14: contracts, not coordinates) — drives the real intro and watches the
   facings it produces, so it stays valid however the route is re-authored:
     1. every facing while walking is one of the four cardinals
     2. facings don't thrash — no rapid flip-flopping inside a short window
     3. the MOVEMENT is axis-aligned too. Snapping the facing alone would silence the flicker while
        leaving the walker sliding diagonally under a left/right sprite — a moonwalk. Only the one
        frame at each corner, where a step spans two segments, may be diagonal.
   Coordinate-free, so moving a waypoint cannot rot it. */
const {createWorld}=require('./harness');
const w=createWorld(); w.startNewGame(0);
const g=w.g;
const CARD=[0,Math.PI/2,Math.PI,-Math.PI/2], EPS=0.02, WIN=30;
function offCardinal(a){
  let best=Infinity;
  for(const c of CARD){let d=Math.abs(a-c);d=Math.min(d,2*Math.PI-d);best=Math.min(best,d);}
  return best;
}
const who={player:{prev:null,last:null,changes:[],offs:0,moved:0,diag:0},
           dale:{prev:null,last:null,changes:[],offs:0,moved:0,diag:0}};
let frames=0, worstOff=0;
while(g.intro&&frames<6500){
  w.run(1,{ignoreGameOver:true}); frames++;
  const ents={player:g.player, dale:g.intro?g.intro.dale:null};
  for(const k in who){
    const e=ents[k], st=who[k]; if(!e)continue;
    if(st.prev){
      const md=Math.hypot(e.x-st.prev.x,e.y-st.prev.y);
      if(md>1.2&&md<40){                       // genuinely walking, not the endIntro warp
        st.moved++;
        const dx=Math.abs(e.x-st.prev.x), dy=Math.abs(e.y-st.prev.y);
        if(dx>0.35&&dy>0.35)st.diag++;         // genuinely diagonal travel this frame
        const off=offCardinal(e.face||0);
        if(off>worstOff)worstOff=off;
        if(off>EPS)st.offs++;
        const f=Math.round((e.face||0)/(Math.PI/2));
        if(st.last!==null&&f!==st.last)st.changes.push(frames);
        st.last=f;
      }
    }
    st.prev={x:e.x,y:e.y};
  }
}
let worstWin=0;
for(const k in who){
  const c=who[k].changes;
  for(let i=0;i<c.length;i++){
    let n=0; for(let j=i;j<c.length&&c[j]-c[i]<=WIN;j++)n++;
    if(n>worstWin)worstWin=n;
  }
}
const offs=who.player.offs+who.dale.offs;
const diag=who.player.diag+who.dale.diag, movedAll=who.player.moved+who.dale.moved;
const diagPct=movedAll?100*diag/movedAll:0;
console.log(`intro frames=${frames}  walking: player=${who.player.moved} dale=${who.dale.moved}`);
console.log(`non-cardinal facings=${offs} (worst ${worstOff.toFixed(3)} rad)  `+
            `turns: player=${who.player.changes.length} dale=${who.dale.changes.length}  `+
            `max turns in any ${WIN}-frame window=${worstWin}`);
console.log(`diagonal movement frames=${diag}/${movedAll} (${diagPct.toFixed(2)}%)`);
let bad=0;
if(offs>0){console.log(`  FAIL ${offs} frames facing off-cardinal — diagonal art does not exist`);bad++;}
if(worstWin>3){console.log(`  FAIL facing thrashes: ${worstWin} changes within ${WIN} frames`);bad++;}
/* corners only: 17 turns per walker over ~2600 walking frames is well under 1%. */
if(diagPct>3){console.log(`  FAIL ${diagPct.toFixed(2)}% of walking frames move diagonally — route is not axis-aligned`);bad++;}
if(who.player.moved<200){console.log('  FAIL intro never really walked — test proved nothing');bad++;}
console.log(bad?'INTRO AXIS: RED ❌':'INTRO AXIS: GREEN ✅ (cardinal facings only, no thrash)');
process.exit(bad?1:0);
