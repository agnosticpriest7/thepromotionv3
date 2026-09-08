/* EVERY STORE CREW MEMBER WEARS THEIR OWN FACE.

   ⚠️ THE ONE REGISTRATION THAT FAILS SILENTLY. Adding a crew member means six places: ART_FILES,
   MAGENTA_BG, CHAR_SHEETS, SEAT_ART, CAST, and the CREW table. Five break loudly -- a missing file
   404s, a missing sheet entry throws, a missing seat entry drops the pose. CAST does not:
   `rawCharIndexFor` reads `CAST[n.name]`, finds nothing, falls through to the name-hash pool and
   hands the character a stock OFFICE face. Vince, Aleks, Elaine and Manny shipped that way for
   twenty minutes: art loaded, seated poses keyed, placement clean, two bakery staff standing behind
   the counter in office blazers. Caught by looking at a screenshot and disbelieving the clothes.

   ⚠️ AND t_grocery_crew ALREADY CATCHES THAT ONE -- verified, not assumed: delete a CAST line and
   it goes red naming the person. The suite was never blind to this; I had simply not run the gate
   between adding the crew and looking. Worth writing down plainly, because "no test could have
   found it" is a much better story than "I had not run the tests yet", and only the second is true.

   What this file adds is the two neighbours of that bug which nothing else asserts: that no two
   crew resolve to the SAME face (the hash pool collides silently, so a fallback can hide as twins
   in a shop that looks fully staffed), and that every crew member has all four seated facings --
   Save-Rite's crew sit down at break, and a missing facing drops the pose rather than erroring.
   It also runs in about a second against t_grocery_crew's three minutes.

   ⚠️ ASKS THE GAME, NOT THE TABLES. CAST / CHAR_SHEETS / SEAT_ART are `const` and never land on
   the sandbox global, so a test reading them reads `undefined` and passes having compared nothing
   -- which the first draft of this file did. `charIndexFor` and `seatedPersonSpriteFor` are
   function declarations, so they ARE reachable, and they are what the renderer itself calls. */
const {createWorld}=require('./harness');

const w=createWorld({storage:{'promo:level':'grocery','promo:newgame':'0','promo:char':'0'}});
const g=w.g, S=w.sandbox;
w.run(400);

let bad=0;
const ck=(name,ok,detail)=>{ console.log(`  ${ok?'PASS':'FAIL'}  ${name}   ${detail}`); if(!ok)bad++; };

const crew=g.NPCS.filter(n=>n.alive && !/^Shopper/.test(n.name) && n.storeRole);

/* ⚠️ ANCHOR. Every check below walks `crew`; an empty roster scores a clean sweep having compared
   nothing. And if the resolver itself were missing, every lookup would come back null and the
   "wrong world" filter would find nothing to complain about. */
ck('the store has a crew to check at all', crew.length>=12, crew.length+' crew with a store role');
ck('  ^ and the game exposes the resolver the renderer uses',
   typeof S.charIndexFor==='function' && typeof S.seatedPersonSpriteFor==='function',
   'charIndexFor + seatedPersonSpriteFor');

/* 1. THE ONE THAT WOULD HAVE CAUGHT THE BLAZERS. A hash-pool fallback still returns a perfectly
      valid index, so "has an index" passes while the person wears Marla's cardigan. What separates
      them is WHICH art the index points at, and the seated resolver names the file outright. */
const wrongWorld=crew.map(n=>{
  const sp=S.seatedPersonSpriteFor(n,'down');
  return {n, art: sp&&sp.name ? sp.name : '(none)'};
}).filter(o=>o.art.indexOf('save-rite/')!==0);
ck('every crew member resolves to Save-Rite art, not an office face', wrongWorld.length===0,
   wrongWorld.length ? wrongWorld.map(o=>o.n.name+' -> '+o.art).join('; ')
                     : 'all '+crew.length+' draw from save-rite/');

/* 2. all four facings, because Save-Rite's crew sit down at break and a missing one drops the pose */
const partial=crew.filter(n=>['down','up','left','right']
  .some(d=>{const sp=S.seatedPersonSpriteFor(n,d); return !sp||!sp.name;}));
ck('  ^ with a seated pose in all four facings', partial.length===0,
   partial.length ? partial.map(n=>n.name).join(', ') : crew.length+' complete sets');

/* 3. two people must never share a face. The hash pool collides silently, which is how a fallback
      hides in plain sight: the shop looks staffed and two of them are twins. */
const byIdx={};
crew.forEach(n=>{ const i=S.charIndexFor(n); (byIdx[i]=byIdx[i]||[]).push(n.name); });
const shared=Object.entries(byIdx).filter(([,names])=>names.length>1);
ck('  ^ and no two crew share one face', shared.length===0,
   shared.length ? shared.map(([i,names])=>'index '+i+': '+names.join(' + ')).join('; ')
                 : crew.length+' distinct faces');

console.log('');
console.log(bad?'STORE CAST: RED ❌':'STORE CAST: GREEN ✅ (every crew member wears their own face)');
process.exit(bad?1:0);
