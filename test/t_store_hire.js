/* A REPLACEMENT HAS TO JOIN A DEPARTMENT.

   Kyle, from play: the store's org chart "wasn't showing many staff members". It was true, and the
   cause was not the chart. Every backfill path pushes `{desk, dept:n.dept}` — `dept` being the
   OFFICE field — so a store hire arrived with dept:'sales' and no `storeDept` at all. `deptStaff()`
   selects on `storeDept`, so the new person belonged to no department: absent from the org chart,
   from department health, and from anything that asks who works in bakery. Headcount looked fine
   the whole time, which is why it could run for weeks.

   Measured before the fix: fire one of the twelve, and by day 3 the crew is back to twelve while
   the departments are down to eight — permanently, and once per firing.

   ⚠️ WHY NO EXISTING TEST SAW IT. t_hire and t_hiring_depth are office tests and the office has no
   `storeDept` to lose. t_grocery_crew checks the twelve the level is BUILT with, and they are
   assigned by hand in the CREW table — the one population that could never exhibit this. The gap
   was the join between two subsystems that each worked: hiring, and departments.

   Asserts behaviour, not wiring: it fires somebody and waits for the replacement. */
const {createWorld}=require('./harness');

const DEPTS=['front','grocery','produce','deli','bakery'];
const BACK_OFFICE=['store','am','owner'];

function build(){
  const w=createWorld({storage:{'promo:level':'grocery','promo:newgame':'0','promo:char':'0'}});
  const g=w.g,S=w.sandbox;
  w.run(400); if(g.intro&&S.endIntro)S.endIntro(true); w.run(600);
  return {w,g,S};
}
const crewOf=g=>g.NPCS.filter(n=>n.alive&&!/^Shopper/.test(n.name));
const inDepts=(S)=>DEPTS.reduce((a,id)=>a+S.deptStaff(id).length,0);

let bad=0;
const ck=(name,ok,detail)=>{ console.log(`  ${ok?'PASS':'FAIL'}  ${name}   ${detail}`); if(!ok)bad++; };

const {w,g,S}=build();
const before=crewOf(g).length, deptsBefore=inDepts(S);

/* ⚠️ ANCHOR ON THE THING THAT WOULD MAKE THIS VACUOUS: if the level built with nobody in a
   department, "departments did not shrink" would pass for the wrong reason. */
ck('the store starts with staffed departments', deptsBefore>=8,
   deptsBefore+' of '+before+' crew are in a department');

const victim=crewOf(g).find(n=>n.storeRole==='staff');
ck('  ^ and there is a rank-and-file worker to dismiss', !!victim, victim?victim.name+' ('+victim.storeDept+')':'NONE FOUND');
if(!victim){ console.log('\nSTORE HIRE: RED ❌'); process.exit(1); }

const victimDept=victim.storeDept;
S.fireNPC(victim,'manager');
ck('  ^ and dismissing them actually removes them', crewOf(g).length===before-1,
   crewOf(g).length+' of '+before+' left');

/* wait for HR — the office backfills in two days; give it a week before calling it broken */
let arrived=false;
for(let d=0;d<8&&!arrived;d++){
  const target=g.day+1; let guard=0;
  while(g.day<target&&guard++<200000) w.run(1,{ignoreGameOver:true});
  if(crewOf(g).length>=before) arrived=true;
}
ck('the store backfills a dismissed worker, like the office does', arrived,
   'crew '+crewOf(g).length+' of '+before+' by day '+g.day);

if(arrived){
  const orphans=crewOf(g).filter(n=>!n.storeDept&&BACK_OFFICE.indexOf(n.storeRole)<0);
  ck('  ^ and the replacement lands IN a department', orphans.length===0,
     orphans.length?('in no department: '+orphans.map(n=>n.name).join(', ')):'every worker has one');
  const roleless=crewOf(g).filter(n=>!n.storeRole);
  ck('  ^ and has a role in the store, not just an office dept field', roleless.length===0,
     roleless.length?('no storeRole: '+roleless.map(n=>n.name).join(', ')):'every worker has one');
  ck('  ^ so the department is back to strength', inDepts(S)>=deptsBefore,
     inDepts(S)+' in departments (was '+deptsBefore+')');
  ck('  ^ and specifically the one that lost somebody', S.deptStaff(victimDept).length>=1,
     victimDept+' has '+S.deptStaff(victimDept).length);
  const mgrs=DEPTS.map(id=>S.deptStaff(id).filter(n=>n.storeRole==='manager').length);
  ck('  ^ and no department ended up with two managers', mgrs.every(m=>m<=1),
     'managers per department: '+mgrs.join('/'));
}
/* ---- 2. AND THE MANAGER'S CHAIR STAYS OPEN ----------------------------------------------
   ⚠️ THE FIRST VERSION OF THIS CHECK WAS VACUOUS AND A MUTANT SAID SO. It asserted "no more
   than one manager per department" after firing a STAFF member — so the station being refilled
   was a staff station, `desk.storeRole` was already 'staff', and the mutation that makes a hire
   inherit the station's role changed nothing. It passed for the wrong reason.
   The rule only means something when the chair that opens is a MANAGER's, so fire one. A
   department manager's empty chair is the player's own promotion route — unseatTarget() reads
   the world for a manager rather than an arc flag — so HR quietly seating a new manager in it
   would close the rung behind the player, silently, two days after they cleared it. */
{
  const {w,g,S}=build();
  const mgr=crewOf(g).find(n=>n.storeRole==='manager'&&n.storeDept);
  ck('a department manager can be dismissed', !!mgr, mgr?mgr.name+' — '+mgr.storeDept+' MANAGER':'NONE');
  if(mgr){
    const dept=mgr.storeDept, n0=crewOf(g).length;
    S.fireNPC(mgr,'manager');
    let arrived2=false;
    for(let d=0;d<8&&!arrived2;d++){
      const target=g.day+1; let guard=0;
      while(g.day<target&&guard++<200000) w.run(1,{ignoreGameOver:true});
      if(crewOf(g).length>=n0) arrived2=true;
    }
    ck('  ^ and the chair is backfilled at all', arrived2, 'crew '+crewOf(g).length+' of '+n0);
    const mgrsNow=S.deptStaff(dept).filter(n=>n.storeRole==='manager');
    ck('  ^ but HR does NOT seat a new manager — that chair is the promotion rung',
       mgrsNow.length===0, dept+' has '+mgrsNow.length+' manager(s)'+(mgrsNow.length?': '+mgrsNow.map(n=>n.name).join(', '):''));
    const staffNow=S.deptStaff(dept).filter(n=>n.storeRole==='staff');
    ck('  ^ and the replacement works there as staff', staffNow.length>=1,
       dept+' has '+staffNow.length+' staff');
  }
}

console.log('');
console.log(bad?'STORE HIRE: RED ❌':'STORE HIRE: GREEN ✅ (a replacement joins the department it fills)');
process.exit(bad?1:0);
