const fs=require('fs');
const P=JSON.parse(fs.readFileSync('C:/Users/Kyle_/Documents/thepromotionv3/docs_level_plan.json','utf8'));
const E=P.elements;
const by=t=>E.filter(e=>e.t===t);
const T=10;                          // wall thickness (authored units)
const GAP=44;                        // door gap width
const rnd=v=>Math.round(v);

// ---------- WALLS ----------
// segment -> rect
function segRect(x1,y1,x2,y2){
  if(y1===y2){ return {x:Math.min(x1,x2), y:y1-T/2, w:Math.abs(x2-x1), h:T}; }
  if(x1===x2){ return {x:x1-T/2, y:Math.min(y1,y2), w:T, h:Math.abs(y2-y1)}; }
  // diagonal (shouldn't happen) -> bounding box
  return {x:Math.min(x1,x2),y:Math.min(y1,y2),w:Math.abs(x2-x1)||T,h:Math.abs(y2-y1)||T};
}
const walls=[];
// explicit wall segments
by('wall').forEach(w=>walls.push(segRect(w.x1,w.y1,w.x2,w.y2)));

// walled rooms: outline with door gaps. [name,x,y,w,h]
const WALLED=[
  ['CEO Office',0,0,260,180],['HR Office',400,0,160,180],['Manager Office',880,0,160,180],
  ['Asst. Manager',1040,0,120,120],['Meeting Room',380,280,260,220],['Break Room',840,280,260,220],
  ['Supply Closet',640,340,200,100],['Restroom',380,600,280,160],['Exec Restroom',0,280,240,140],
  ['Senior Sales A',1240,480,160,100],['Senior Sales B',1240,380,160,100],['Senior Sales C',1240,280,160,100],
];
const doors=by('door').map(d=>({x:d.x,y:d.y}));
// build an edge wall (a segment along a room side) and carve gaps where a door center sits on it
function edge(ax,ay,bx,by_,isH){
  // collect door centers on this edge (within T of the line, between endpoints)
  const gaps=[];
  for(const d of doors){
    if(isH){ if(Math.abs(d.y-ay)<=T && d.x>Math.min(ax,bx)-1 && d.x<Math.max(ax,bx)+1) gaps.push(d.x); }
    else   { if(Math.abs(d.x-ax)<=T && d.y>Math.min(ay,by_)-1 && d.y<Math.max(ay,by_)+1) gaps.push(d.y); }
  }
  gaps.sort((p,q)=>p-q);
  const segs=[]; let start=isH?Math.min(ax,bx):Math.min(ay,by_); const end=isH?Math.max(ax,bx):Math.max(ay,by_);
  for(const g of gaps){ const gs=g-GAP/2, ge=g+GAP/2; if(gs>start) segs.push([start,gs]); start=Math.max(start,ge); }
  if(start<end) segs.push([start,end]);
  segs.forEach(([s,e])=>{ if(e-s<2)return; walls.push(isH?{x:s,y:ay-T/2,w:e-s,h:T}:{x:ax-T/2,y:s,w:T,h:e-s}); });
}
WALLED.forEach(([n,x,y,w,h])=>{
  edge(x,y,x+w,y,true);        // top
  edge(x,y+h,x+w,y+h,true);    // bottom
  edge(x,y,x,y+h,false);       // left
  edge(x+w,y,x+w,y+h,false);   // right
});

// ---------- ROOMS (label zones) ----------  {name,x,y,w,h,c}
const RC={ 'CEO Office':'#8e44ad','HR Office':'#c0392b','Manager Office':'#c9a41a','Asst. Manager':'#7c7768',
  'Meeting Room':'#c9a41a','Break Room':'#4a8c5a','Supply Closet':'#8a6a3a','Restroom':'#7c7768','Exec Restroom':'#7c7768',
  'Senior Sales':'#3b6ea5','Kitchen':'#c9a41a','Accounting':'#3b6ea5','Reception':'#3b6ea5' };
const ROOMS=[
  {name:'CEO OFFICE',x:0,y:0,w:260,h:180,c:RC['CEO Office'],glass:true},
  {name:'HR',x:400,y:0,w:160,h:180,c:RC['HR Office']},
  {name:"MANAGER",x:880,y:0,w:160,h:180,c:RC['Manager Office']},
  {name:'ASST. MANAGER',x:1040,y:0,w:120,h:120,c:RC['Asst. Manager']},
  {name:'ACCOUNTING',x:600,y:0,w:280,h:180,c:RC['Accounting']},
  {name:'MEETING ROOM',x:380,y:280,w:260,h:220,c:RC['Meeting Room']},
  {name:'BREAK ROOM',x:840,y:280,w:260,h:220,c:RC['Break Room']},
  {name:'SUPPLY CLOSET',x:640,y:340,w:200,h:100,c:RC['Supply Closet']},
  {name:'RESTROOM',x:380,y:600,w:280,h:160,c:RC['Restroom']},
  {name:'EXEC RESTROOM',x:0,y:280,w:240,h:140,c:RC['Exec Restroom']},
  {name:'RECEPTION',x:0,y:420,w:240,h:260,c:RC['Reception']},
  {name:'KITCHEN',x:1160,y:0,w:240,h:280,c:RC['Kitchen']},
  {name:'SENIOR SALES',x:1240,y:280,w:160,h:300,c:RC['Senior Sales'],glass:true},
  {name:'SALES FLOOR',x:1020,y:580,w:380,h:180,c:'#3b6ea5'},
  {name:'JUNIOR SALES',x:660,y:580,w:360,h:180,c:'#4a8c5a'},
  {name:'ELEVATOR',x:0,y:680,w:220,h:80,c:'#7c7768'},
];

console.log('WALLS ('+walls.length+'):');
console.log(walls.map(w=>`{x:${rnd(w.x)},y:${rnd(w.y)},w:${rnd(w.w)},h:${rnd(w.h)}}`).join(','));
console.log('\nROOMS ('+ROOMS.length+'):');
console.log(ROOMS.map(r=>`{name:'${r.name}',x:${r.x},y:${r.y},w:${r.w},h:${r.h},c:'${r.c}'${r.glass?',glass:true':''}}`).join(',\n  '));

// ---------- WORKER DESKS (source of truth for the roster) ----------
// [x,y,w,h, owner|null, tier, dept]  — empties keep owner:null
const DESKS=[
  [660,600,40,60,'you',0,'sales'],            // Intern 1 = player start
  [660,700,40,60,null,0,'sales',{reserved:true}], // Intern 2 empty (co-op)
  [860,660,60,40,'Marcus',0,'sales'],
  [900,700,40,60,'Priya',0,'sales'],
  [840,700,40,60,'Otis',0,'sales'],
  [1040,720,60,40,'Chad',1,'sales'],
  [1140,720,60,40,'Dana',1,'sales'],
  [1240,720,60,40,'Ramesh',1,'sales'],
  [1340,720,60,40,'Vera',1,'sales'],
  [1240,580,60,40,'Doug',1,'sales'],
  [1340,580,60,40,null,1,'sales'],            // one sales chair open day 1
  [1320,280,60,40,'Wren',2,'sales'],
  [1320,380,60,40,'Sana',2,'sales'],
  [1320,480,60,40,'Gil',2,'sales'],
  [680,60,40,60,'Nadia',0,'acct'],            // Accountant 1 (new)
  [720,60,40,60,'Vaughn',0,'acct'],           // Accountant 2 (new)
  [320,160,80,20,'Colette',0,'exec'],         // CEO Assistant (new)
  [1120,0,40,60,null,0,'sales',{reserved:true}], // Asst Manager office empty (tease)
];
console.log('\nDESKS ('+DESKS.length+'):');
console.log(DESKS.map(d=>`{x:${d[0]},y:${d[1]},w:${d[2]},h:${d[3]},owner:${d[4]?"'"+d[4]+"'":'null'},tier:${d[5]},dept:'${d[6]}'${d[7]&&d[7].reserved?',reserved:true':''},rigged:null,planted:null}`).join(',\n  '));

// ---------- TABLES ----------
console.log('\nmeetingTable = {x:540,y:320,w:40,h:120};   // Meeting Room conference table');
console.log('breakTableA = {x:880,y:340,w:40,h:120}; breakTableB = {x:1020,y:340,w:40,h:120};');
console.log('kitchenCounter = {x:1200,y:0,w:200,h:40};   // north counter (open concept)');

// ---------- OBJECTS (interactive) ----------
const OBJ=[
  ['printer',932,524,34,26,'Printer'],['printer',692,144,34,26,'Printer'],
  ['water',760,488,24,30,'Water'],['water',760,288,24,30,'Water'],
  ['coffee',1240,240,30,26,'Coffee'],['files',500,40,30,26,'HR Files'],
  ['alarm',1032,522,16,22,'Fire alarm'],['phones',1060,620,32,22,'Sales phones'],
  ['supply',740,360,40,26,'Supply station'],['board',400,300,84,26,'Whiteboard'],
];
console.log('\nOBJECTS ('+OBJ.length+'):');
console.log(OBJ.map(o=>`{type:'${o[0]}',x:${o[1]},y:${o[2]},w:${o[3]},h:${o[4]},label:'${o[5]}'${o[0]==='printer'?',jammed:false':''}}`).join(',\n  '));

// ---------- CONTAINERS (bins + shelves + lockers) ----------
const bins=by('bin').map(b=>({x:b.x-14,y:b.y-11,w:28,h:22,kind:'box',label:'Contraband bin'}));
const shelvesRaw=by('shelf');
const shelves=shelvesRaw.map(s=>({x:s.x,y:s.y,w:s.w,h:s.h,kind:'cabinet',label:'Shelf'}));
console.log('\nCONTAINERS bins+shelves ('+(bins.length+shelves.length)+'):');
console.log([...bins,...shelves].map(c=>`{x:${rnd(c.x)},y:${rnd(c.y)},w:${rnd(c.w)},h:${rnd(c.h)},label:'${c.label}',kind:'${c.kind}'}`).join(',\n  '));

// ---------- CHAIRS (raw anchors, for reference) ----------
const chairs=by('chair');
console.log('\nCHAIRS: '+chairs.length+' anchors (meeting/break/kitchen seats regenerated by fitTableSeats)');

// ---------- LANDMARKS ----------
console.log('\nEXIT/elevator = {x:60,y:720};  MUSTER = {x:150,y:720};');
console.log('HR_OFFICE = {x:480,y:90};  DALE_DESK = {x:900,y:60,w:60,h:40};  reception = {x:80,y:500};');
console.log('SENIOR/SALES sealed zones: senior sales rooms (glass, locked until SENIOR).');
