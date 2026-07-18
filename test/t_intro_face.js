const { createWorld } = require('./harness');
const w=createWorld(); w.startNewGame(0);
const g=w.g;
let bad=0, checks=0, prev=null, frames=0;
while(g.intro && frames<6500){
  w.run(1,{ignoreGameOver:true}); frames++;
  const p=g.player; if(!p) break;
  if(prev){
    const mdx=p.x-prev.x, mdy=p.y-prev.y, moved=Math.hypot(mdx,mdy);
    // real walking steps are only a few px/frame; a big jump is a warp (e.g. endIntro
    // depositing the player at their desk), which is not "walking" and has no facing.
    if(moved>1.2 && moved<40){ // meaningfully walking (not a teleport)
      checks++;
      const moveAng=Math.atan2(mdy,mdx), faceAng=p.face||0;
      let d=Math.abs(moveAng-faceAng); d=Math.min(d,2*Math.PI-d);
      if(d>Math.PI/2) bad++;  // facing >90 deg off from movement = walking backwards/wrong
    }
  }
  prev={x:p.x,y:p.y};
}
console.log(`intro frames=${frames}, movement checks=${checks}, backwards/wrong-facing frames=${bad}`);
console.log(bad===0 ? 'FACE: GREEN ✅ (player always faces the way it walks)' : 'FACE: RED ❌ ('+bad+' bad frames)');
process.exit(bad===0?0:1);
