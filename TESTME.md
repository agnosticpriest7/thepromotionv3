# TESTME — the running list for Kyle's TV

Things that are merged and live, that a green gate **cannot** judge. A green soak means NOT
BROKEN; a clean screenshot means IT RENDERS. Whether any of it is *good* is your call, and this
is the list of what to point that call at.

Newest at the top. Tick things off or delete them once you've formed a view — nothing here needs
a reply, it's just a queue so nothing gets lost while you're away from the TV.

---

## From `grocery-prop-compression` (2026-08-30)

### 1. ⭐⭐⭐ The four props you judged, at the factors you approved
Baler **unchanged** (the anchor), checkstand **x0.63**, pallet **x0.75**, go-back cart **x0.85**.

Measured against a person's drawn height: the checkstand went **2.41x -> 1.52x**, the pallet
**1.13x -> 0.85x**, the cart **1.17x -> 1.00x** (exactly one person-height). The baler stays 1.57x.

### 2. ⚠️ THE FRONT END NOW READS SPARSE — this is the thing to look at
The lanes are correctly scaled against people now, but they kept the positions they had when they
were 45 authored wide. At 27 wide the walkways went **175 -> 193** authored and only about **12% of
the frontage is checkout**. It looks under-furnished.

That is a *positioning* consequence, not a scale error — the fix is moving the lanes closer
together, which is a layout change I did not make. **Tell me if it bothers you and it is a small
branch.**

### 3. ⚠️ THE STORE IS DELIBERATELY MIXED-SCALE NOW — and this is the judgement call
Four props are compressed; the shelf runs, deli/bakery cases, dairy case and produce tables are
still at true plan scale. **Stand at about (500, 500)** — the cross-aisle between the shelf block
and the checkouts. The block ends at y469 and the lanes start at y520, so a **compressed lane and an
uncompressed shelf run are in the same frame**.

If that reads fine, the rest stays as it is. If it reads wrong, the next branch compresses
everything and repacks the floor.

My read, for what it is worth: they do not clash, because the eye compares each to the *people*
rather than to each other — and the lane now passes that test. But that is exactly the call I
cannot make for you.

**Aisles are untouched** — still 65 authored clear, every aisle walks, door to sales floor walks.

---

## From `grocery-prop-scale` (2026-08-29)

### 1. ⭐⭐ The props are all at one scale now
You were right that they were wrong against **each other**, not against the floor. Measured, they
ran from **25.9 to 120 authored units per metre — a 4.6x spread**. Everything is now sized from its
real-world size at one scale (**42.2 units per metre**, taken from the character sprite: a person
is 0.5 m across the shoulders). Spread is now **0.7%**.

**The baler grew 1.63x**, pallets 1.30x, the go-back cart 1.41x, produce tables 1.25x. The
checkstands only came down 7% — they were nearly right; they *read* as huge because the baler beside
them was 63% undersized. A checkout lane is now **1.71x** the width of a baler, where it was 2.99x.

**Side effect worth a look:** the shelf runs went 60 → 55 authored (a gondola is 1.3 m), and since
the pitch didn't move, **the aisles got wider — 60 → 65**. The runs are where you left them.

**One thing I did not change, deliberately.** The brief listed the deli/bakery case as "1.5 m per
unit". At 1.5 m wide that asset would be 0.46 m deep, which is not a deli counter — it's drawn as a
**multi-section run**, 4.27 m wide and 1.3 m deep, and it was already correct. Sizing it as briefed
would have shrunk a right fixture to a third.

### 2. The Bakery is clean — and it was worse than you saw
The couch and the desk were **office decor drawn with no level gate at all**. The desk was the
**CEO's executive desk**; the couch was the **reception waiting couch**. Not the manager/owner desks
from last branch — those are correctly in the back office.

**All eleven pieces were bleeding, not two.** The other nine are in DELI, PRODUCE, GROCERY, the
FRONT END and the ENTRANCE — rooms you hadn't walked into. **And a sweep found a twelfth nobody had
reported:** the office's reception counter has been standing in the store's FRONT END among the
checkouts.

All of it now draws per-level. **Worth walking the whole store once** to confirm nothing else looks
imported.

---

## From `grocery-props-and-lights` (2026-08-28)

### 1. ⭐⭐⭐ THE STORE HAS LIGHTS. Everything you approved was judged in the dark.
They come up at **8:15** and go out at **4:45**, same as the office, because it is the same code.
Measured lift: mean screen luminance **64.5 → 106, about 1.64x**.

**This is a re-judgement of every asset so far.** The shelf runs, the endcap, the checkstand, the
floor colours and the aisle spacing were all approved on an unlit floor. If anything now looks
washed out or flat, that is the lighting revealing it — **tell me and I will not tune the art to
hide it**.

Day 1 is lit from 8:00 on purpose (the orientation tour); the breaker sequence starts day 2.

### 2. ⚠️ THE CHECKOUTS MOVED, AND THAT IS A LAYOUT CHANGE YOU SHOULD LOOK AT
The lanes used to be **east-west bars**. The checkstand art is drawn **north-south**, and rotating
a top-down sprite lights it from the wrong side — so with both mirrors supplied, the lanes were
re-laid perpendicular to the south wall: four lanes, **tills facing each other** in each pair.

The gaps between lanes are the walkways now, which is how a real front end works. 172 authored
between the lanes of a pair, 592 through the middle, and the entrance door opens into that middle
gap so you walk in and straight up the store. **Does the front end read better or worse?** This is
the one thing here that changes how the store plays, not just how it looks.

### 3. The store is furnished
Deli and bakery cases (butted into one continuous run), a **dairy case** (new fixture, set dressing
only), four **produce trays** with no two neighbours alike, **pallets** in receiving, the **baler**,
and the **go-back cart** at the front end. The manager's and owner's offices finally have desks.

Lockers, the department board, the intercom and the break table were already reusing office art —
that is by design and unchanged.

---

## From `grocery-shelf-endcaps` (2026-08-28)

### 1. The aisle runs have south endcaps ⭐⭐
Every run now ends in a proper endcap facing the front-of-store cross-aisle. South ends only —
the product band is along the cap's bottom edge, so a north cap would light from the wrong side.

**This closes the open question from last time.** The runs had shrunk 245 → 199 authored and I
flagged the leftover gap as "wider cross-aisle or a hole?". The caps take that space back: run 199
+ cap 47 = **246**, so the block is back to the length it was before the art changed, and the
question is moot. Aisle width is still untouched at 60.

### 2. ⚠️ The checkstands are NOT done — and I need a decision
The new checkstand art is drawn **north-south** (447 × 1039, a lane running away from you). Your
store's checkouts are laid out **east-west**: four lanes, each 148 × 48, horizontal bars of three
counter units at y 560. Your brief said stop and report rather than rotate, so I stopped.

Two ways out, both yours:
- **Re-lay the checkouts north-south** — lanes perpendicular to the south wall, which is what the
  art assumes and what most real shops look like. Changes the front end's layout.
- **Re-draw the art east-west** — keeps the floor as you judged it.

Also: **`checkstand_r.png` never arrived.** Only three images came through — the endcap, one
checkstand, and a run-with-cap composite (496 × 2036) that isn't one of the eight listed files.

---

## From `grocery-shelf-art` (2026-08-27)

### 1. The grocery aisles have real shelf art ⭐⭐⭐ — and this one is a look-at-it call
Five purpose-built runs replace the placeholder `supply_shelf`. Each asset is a **whole aisle run**
drawn top-down: fixture spine down the centre, product banding facing out into both aisles. Six runs
over five variants, assigned **a,b,c,d,e,a** — deterministic, so the same aisle looks the same every
load and you can judge a layout twice.

**The couch-distance question is whether five faces read as VARIED or as NOISY.** No test answers
that. Walk the block and look at it side on.

**⚠️ The runs are shorter than they were: 245 → 199 authored.** Not a compression fudge — a sprite's
height is derived from its width, so six runs at the art's native aspect would each need 74 wide,
and six of those plus 58-wide aisles needs 734 where the floor has 652. Keeping six aisles and the
aisle width meant spending the difference on run length. It shows up as a **wider cross-aisle along
the south end of the block**. If that reads as a hole rather than a cross-aisle, the fix is
**five runs instead of six**, which fits at full native size — your call, and a small change.

**Aisle width is untouched.** Blocker-to-blocker is 60 authored, exactly what it was.

### 2. Three things moved because the runs got wider
- **Russ Pelletier** now stands in the south cross-aisle at the foot of his aisles (was inside the
  new run 6).
- **The Endcap** now sits at the head of a run rather than across an aisle mouth.
- **Your own station** moved to the head of the last run. It used to be "at the end of an aisle",
  which stopped being true when the band widened — it ended up standing *in* aisle 4.

Worth checking these three feel like they're in sensible places, since I chose the spots.

---

## From `grocery-rank-index-leaks` (2026-08-27)

### 1. The store has its own ORG chart now ⭐⭐
**Panel → ORG, in Save-Rite.** It used to be the office's chart wearing a shop's clothes: it named
**Mr. Sterling as CEO** (not in the building), showed **Dale's manager chair** (no Dale), printed
**"HR: —"** (the store has no HR), filed all twelve staff under **JUNIOR SALES**, and at OWNER
displayed the entire office CEO merit block — including the **"land a client"** prompt you spotted.

It now shows: who is over you (Owner / Store Manager / Assistant Manager, marked **YOU** when it is
you), then the five departments with each manager and their crew, department health, and you in
your own department while you are still in one.

**What to check:** climb a few rungs and open ORG at each. Does it read like a shop's org chart?
Is department health useful there, or noise? The office chart is provably unchanged — I hashed it
at all six ranks against `main` with a fixed seed and it is byte-identical.

### 2. Your 5pm card at Assistant Manager
A store AM delegates all day but got **no delegation scoreboard** at 5pm — the day-end card was
keyed to a stale copy of a gate. DELEGATED CLEAN and Demerits now appear at both AM and Store
Manager. Also: an Owner's card no longer shows the office's "BRANCH HEALTH · need 80" line.

---

## From `grocery-customers`, `grocery-delegation`, `grocery-sightlines-prototype` (2026-08-27)

### ⭐⭐⭐ SIGHTLINES — the prototype, and the only thing here that is a real question
**Panel → SETTINGS → `👁 Sightlines (store, prototype)`.** Off by default. Turn it on and off
inside one run; that comparison is the entire experiment.

What it does: a sabotage costs **more if a member of staff can see you** and **less if nobody can**.
Base 18 becomes **29 seen / 7 unseen**. Shelf runs block sight, so **an aisle is cover and the front
end is a stage** — that fell out of the nav grid for free, which is why this was cheap to try.

Three questions, none of them testable:
- **Does the floor become tense?** Does walking into the open feel different from working an aisle?
- **Does sabotage stop being strictly better?** It is the fastest road to unseating a manager. If
  being seen makes it expensive, the three roads become a real choice. If not, this idea has not
  earned its place.
- **Is it legible?** ⚠️ **This is the likeliest failure and I could not fix it.** The only feedback
  is a log line — *"— Danika watching"* or *"— nobody saw"* — after the fact. If you cannot tell
  why suspicion jumped, it is noise. That is the argument for a visible indicator, and the reason
  to judge it before building one.

**It is a prototype and it is meant to be thrown away.** "This needs a real vision system to be any
good" is a perfectly good answer.

### 1. The shop has customers ⭐
Six shoppers at a time walk in, look at a few things and leave. `CUSTOMER_TARGET = 6` is the dial.
They cannot be talked to, pranked, gossiped about or delegated to — they are scenery that moves.
**Is six right?** A store too busy to walk is worse than an empty one.

### 2. The ending goes and looks at the sign ⭐
Reaching Owner now holds the camera on the fascia for 3.6 seconds before the modal, so you actually
see `MERV'S` become your name. Previously it changed off-camera while you stood in the back office.

### 3. Delegation is the store's now
The tray at Assistant Manager and Store Manager hands out store work — pallets, date codes, the ad
display, the front end. An AM delegates to Department Managers and floor staff; a Store Manager
delegates to the AM and the Department Managers. **Does it feel like managing, or like admin?**

### 4. Office changes you may notice
The delegate menu numbers duplicate jobs `(1 of 2)` when two of a kind are on the tray — they used
to be indistinguishable. Nothing else in the office moved.

---

## From `grocery-upper-rungs`, `grocery-endgame`, `grocery-loose-ends` (2026-08-26)

### ⭐⭐⭐ THE LADDER NOW GOES ALL THE WAY, AND IT RESOLVES
The store has six real rungs and an ending. This is the first time it can be played start to
finish. Everything below is subordinate to: **does the whole climb hold together?**

### 1. The back half has its own shape ⭐
Rungs 4–6 used to just arrive. Now:

| rung | how you get it | intended feel |
|---|---|---|
| **Assistant Manager** | your department beats the other four by 4, three days running | a performance comparison |
| **Store Manager** | settle what you owe Lorne — repay in full, or use leverage | a debt |
| **Owner** | keep the store at 70 for three days, then **Merv offers** | a succession you can decline |

Deliberately not "three roads" three times. **Garret is passed over, not destroyed. Merv is never
sabotaged** — he sells because he's glad to. Whether that last contrast reads as earned or hollow
is the question the whole level has been building to.

### 2. Taking Lorne's job ⭐ the beat I'd watch closest
If you used the **loyalty road** at rung 3, he moved a Department Manager aside for you — and the
debt to take *his* job is correspondingly larger (7 favours instead of 3). Repay it and he puts
you up for his own job gladly, which is meant to be worse than betraying him. There's a leverage
route too, costing 22 suspicion.

### 3. The sign ⭐⭐
`MERV'S` all game. At Owner it reads **your name** — `KYLE'S`, `STACIE'S`, `RAELEE'S`, `JAX'S`,
`THE INTERN'S`. It's at the entrance, drawn at world scale.

**One limitation worth your call:** Merv is in the back office, so at the moment you accept, the
camera is nowhere near the fascia. The change is real and persistent, but you have to walk to the
front to see it. A camera pan would land it properly — that's new mechanics, so I left it.

The ending beat is deliberately tiny: *"They changed the sign on a Tuesday. Nobody made a speech."*
Then the modal and back to the menu, matching what the office already does.

### 4. Office changes you'll notice
Two, both text-only, no behaviour moved:
- **Gate hints are much shorter.** The CEO one was 274 characters in a two-line slot and mostly
  invisible; it's 59 now. The full text still lives in THE WAY UP.
- **The whiteboard during a meeting** now also offers an outstanding board task, if you have one.
  Otherwise identical.

### 5. Dale no longer introduces himself in a supermarket
At Department Manager the store was logging *"Dale has started looking at you… a second path is
open."* Dale doesn't work there. Fixed, along with the catfish, countersign and HR freeze all
switching themselves on at store ranks.

---

## From `grocery-flavour` (2026-08-26)

### 1. Does the store sound like a shop now? ⭐ the point of the branch
Ten people have voices. Walk up to each one. The intent:

- **Russ Pelletier** won't move — bad back, thirty-one years, *"Ask Curtis. Curtis can reach it."*
- **Gita Mahal** runs Produce like her own business. *"Everything in here is dying. The job is
  deciding how fast."*
- **Doreen Stapp** is sweet and ruthless. Sweetheart, love — and *"I have outlasted six store
  managers, love."*
- **Bruno Sarr** guards his counter. **Danika Osei** is managing a queue that never ends.
- **Priya** is unbothered, **Marguerite** knows everyone, **Bekah** barely speaks (mostly "...").
- **Lorne Petrie** is warm and always slightly asking for something.

They also talk to themselves ambiently. **Worth knowing: they were never silent** — before this
they were saying office lines (*"Did the boss see?"*, *"You did NOT hear this…"*) with randomised
personalities. So the change is a voice swap, not new noise.

### 2. Do the departments feel different to work? ⭐
Each department now has its own four jobs. A Bakery clerk pulls racks, marks down yesterday's
bread, ices cakes, sets the proof. A Produce clerk culls, mists, rotates berries, builds the wall
display. **This is words on the same triggers** — no new mechanics — so the honest question is
whether that's enough to make one run feel unlike another, or whether it needs real differences.

### 3. Placeholder by intent
Both parts are deliberately shallow. No branching dialogue, no consequences, no department-specific
mechanics. If the flavour lands, that's the argument for going deeper; if it doesn't, better to
know before building more on top.

---

## From `grocery-unseating` (2026-08-26)

### 0. Do three ways of removing one person feel like three different games? ⭐⭐ THE BIG ONE
This is the question the whole branch is asking, and it can't be answered by a test.

Pick a department, then take **merit** on one run, **loyalty** on another, **sabotage** on a
third. The intended feel:

| road | how it should feel |
|---|---|
| **Merit** | slow and safe. Run the department well for three days. Nobody gets hurt — the manager is moved *up*, and you're the obvious replacement. |
| **Loyalty** | fast once built, but you owe Lorne Petrie, and he'll remember he did it for you. |
| **Sabotage** | fastest, and the only one that raises suspicion. Two failures landed on their department and they're out. |

If two of them feel like the same button with different text, that's the finding.

### 0b. Is the sabotage fiction right?
It's the office prank pipeline with store words: date codes, the rota, stock counts that never
tie, a forged temperature log. Reads well on paper — does it read as *grocery* in play, or as
office pranks in a costume?

### 0c. The three dials
`UNSEAT_MERIT_DAYS 3`, `UNSEAT_LOYAL_TARGET 4` favours, `UNSEAT_SABO_TARGET 2` failures. These
are guesses. If merit feels like a grind or sabotage feels cheap, they're one-line changes.

### 0d. Lorne Petrie exists now, and so do three new managers
Gita Mahal (Produce), Bruno Sarr (Deli), Doreen Stapp (Bakery), Lorne Petrie (Store Manager).
Placeholder art, no dialogue yet. Ten NPCs on the floor now — worth a look at whether the shop
feels staffed or crowded.

### 0e. THE WAY UP panel at rung 3
It now lists all three roads with live progress on each. Before this branch it told store players
to *"Ask Dale if he needs anything (start sucking up)"* — in a shop with no Dale. Check it reads
clearly at couch distance.

### 0f. ⚠️ A HUD BUG I FOUND BUT DID NOT FIX — the office's gate hints overflow badly
Measured in the office, the rank-note line runs **106 characters at Assistant Manager, 212 at
Manager and 273 at CEO**. That slot is about two lines wide, so those hints wrap off the top-left
and clip behind the rank title — the CEO one is mostly invisible. Long-standing, not caused by
any recent branch, and it's a HUD change rather than a ladder one so I left it alone.

The store's equivalent now fits in 68 characters (`Bruno has the chair — see THE WAY UP`), and
there's an assertion pinning it there. **Worth deciding whether the office's deserve the same
treatment** — it's the panel that tells you what to do next, and right now at CEO it doesn't.

### A. The department prompt no longer accuses you
**Was:** `next: DEPARTMENT CLERK (BLOCKED: you have to put in for a department first)`
**Now:** `next: DEPARTMENT CLERK (Pick a department to move up.)`

Your call was to change it, so this is just a confirmation read. The office still says
`BLOCKED:` on gates that really are refusals — worth one glance at an office run to check that
still feels right, since it's now the only place the word appears.

---

## From `grocery-ladder` (2026-08-25)

### B. Does the department choice land? ⭐ the big one
It arrives early, before you've seen much of any department, and it's permanent. That might be
exactly right — people pick jobs on almost no information — or it might land before it can mean
anything. **Notice what you feel when the menu comes up**, not just whether it works.

### C. Does a six-rung ladder feel like a career?
The question the whole level exists to ask. Climb it once end to end.

### D. The top half is currently a formality
Rungs 4–6 have no gates yet (the store's own gates are this branch's unseating paths, which only
cover rung 3). So the back half is unearned by design right now. You're judging the *shape*, not
the difficulty.

### E. The DELEGATE tray shows at the store's AM and Store Manager rungs
Existing office mechanic firing on rank index — not wired deliberately. Soaks clean. Does a shop
want that tray at all?

---

## From `grocery-npcs-first-crew` (2026-08-25)

### F. Six staff on the shop floor
Priya and Marguerite on the checkstands, Danika on Front End, Curtis and Bekah in the aisles,
Russ off the aisle ends. They **stand** — there's no chair or nameplate at a station. Does a
standing crew read as staff, or as furniture that moves?

### G. Watch a break
All six should head back of house. This is where the worst bugs were: before the fix, half walked
into the world's north-west corner and the other half stood in the middle of aisle 5.

### H. Old saves refuse to load
`SAVE_VERSION` went 4 → 5. Not optional — a pre-crew grocery save would have loaded and silently
deleted all six staff. Expect your old slots to be gone.

### I. Three crew stand beside their desk, not inside it
Lorne Petrie (Store Manager), Garret Voss (Receiving) and Merv Kastelic (Owner) had their standing
spots authored on top of the furniture they belong to — the two desks and a receiving pallet, all
three of which I added in `grocery-props-and-lights`. Merv genuinely could not stand at his own
station; the other two were clipped but usable. Each has moved 8–12 authored units: the two
managers now stand behind their desks, Garret in front of the pallet.

**What to look at:** back of house. Merv in the OWNER room and Lorne in STORE MANAGER should read
as standing *at* their desks, not merged into them. Garret should be clear of the receiving pallet.
It is a small nudge — if any of the three now looks oddly far from their desk, say so and I will
tune the distance.

### J. The back of house has rooms, and the front end has a checkout run
The east side of the store now runs all the way down: a corridor off the existing block, then a
walk-in cooler, an assistant manager's office and a cash office, each 237 deep. **Garret Voss has
moved out of the receiving bay** and works in the assistant manager's office at (1240,470) —
standing beside his desk, not in it.

The four checkstands were spread over 1127 authored units, most of the width of the shop. They are
now a 528-unit run in two clusters either side of the doors.

**What to look at:** walk in and look at the front end first — it should read as one checkout run
you can take in at a glance, with the doors opening into the gap in the middle. Then go through the
swing doors and down the back. The cooler is the only genuinely walled room back there; you should
have to use its door rather than walking through the wall like you can between the manager offices.

**The thing I'd most like your eye on:** those three rooms are 237 deep and about 130 wide, so they
are deeper than they are wide — the assistant manager's office in particular reads long. That is
what three rooms across a 438-wide block produces. If it looks wrong on the TV, say so and it can
become four rooms, or two rows.

### K. The morning huddle happens in the back now
It used to gather the crew around the office meeting room's coordinates, which in the store is the
middle of the GROCERY aisle — eleven of eighteen staff walked onto the sales floor for it every
morning. It now happens in RECEIVING. **Watch the 09:00 huddle** and check it looks like a shift
briefing in the back rather than a scrum in aisle four. The office is untouched.

### L. Save-Rite is a supermarket now
The whole store was re-laid to your plan. **Everything moved**, so treat this as a fresh look
rather than a diff.

- **You come in at the front-left.** Doors at x 220–340 in the south wall, through a glass
  vestibule — the walls use the same translucent pane the CEO's office is built from.
- **Perimeter departments.** Dairy and deli along the north wall, bakery north-east, produce
  south-east. Frozen is the westmost aisle against the wall, not a department — it still has
  shelf art, so it will not read as frozen until it gets its own cases.
- **Five aisle runs, four aisles**, then a cross-aisle, then four checkouts across the front.
- **Back rooms along the north**, off one corridor: walk-in cooler, store manager, owner,
  assistant manager, break room, and receiving in the north-east corner.
- **A dock and a yard outside the east wall**, where the semi backs in.

**What to look at first:** stand at the doors and just walk the perimeter clockwise. It should
read as a shop you have been in. Then go through the swing doors — they are the gap in the dairy
wall, roughly x 384–474 — and check the back reads as a corridor with rooms off it rather than a
maze.

**The thing I most want your eye on:** the cooler is the west end of the back rooms *because* its
south wall is the dairy wall — that is where the dairy cases sit, loaded from inside and served
from the aisle. If that reads wrong on the TV, the whole back-room order changes.

**Known and deliberate:** there is no separate staff WC any more — at 78 wide it was costing
receiving the width it needed, and receiving kept sealing itself with its own furniture. The
toilet folds into the break room. Say the word and I will find it space elsewhere.

**Old saves will refuse to load.** `SAVE_VERSION` went 5 → 6. Not optional: a v5 save would drop
you into a store whose departments, desks and stations have all moved.

### M. The store got bigger, and the back rooms got sensible
Four changes off your walkthrough.

- **The store is 265 taller.** It was cramped: the aisle block had the service counters hard
  against its top and the tills hard against its bottom. There is a real cross-aisle above the
  runs now and a deep front end below them.
- **The entrance is a doorway, not a corridor.** The glass vestibule stopped running the whole
  width of the building; it ends at x=430.
- **No receiving room.** You were right that the bump-out is the receiving room — an indoor one
  duplicated it and ate the width everything else needed. The dock opens straight into the back
  corridor at truck height, and **the staff WC is back** as its own room.
- **Produce shifted down** off the bakery's heels; the bakery counter squared up across its block.

**What to look at:** walk the aisles first — that is the change you asked for, so it is the one
that has to feel right. Then the back: corridor along the north, cooler at the west end on the
dairy wall, offices, break room, WC, and the roller door at the east end where the truck backs in.

**Watch for:** the office is unchanged, but the WORLD grew, and the office building did not. If
you see grey carpet or empty floor stretching below the office instead of grass, or anybody
standing outside its south wall, that is this change and I want to know.

### N. Everybody works their own job now
Before this, everyone stood on their station all day. Measured on day 1: the store manager spent
35% of it inside his own office, the owner 54%, and the bakery manager 44% of hers in no room at
all. Now the distinction is the job:

- **Cashiers stay at the tills** — Priya and Marguerite move less than anyone.
- **Grocery clerks work the aisles** — Curtis and Bekah, 55–71% of the day in GROCERY.
- **Department managers walk their own department** — Bruno the deli, Doreen the bakery, Gita
  produce, Russ grocery. Roughly twice the movement of a clerk.
- **Store manager, assistant manager and owner walk the whole sales floor**, dropping back to
  their offices between laps rather than sitting behind a door.

**What to look at:** stand still somewhere on the floor for a minute of game time and just watch.
It should read as a shop with staff in it rather than a set of people standing on marks. In
particular check that Lorne, Garret and Merv actually come past you — if they feel like they never
settle, or conversely never leave, the dwell is one number and easy to tune.

**The one I'd watch for:** a manager standing somewhere daft — inside a counter, in a doorway, or
in the middle of an aisle mouth. Their route points come off the room shapes, so a badly-shaped
room would show up as somebody loitering in a silly place rather than as an error.

### O. The pass over N: does each department actually feel worked?
N put people on the right jobs. Watching a full day back showed the jobs still didn't *look* like
work, so this is the follow-up. Measured on day 1 across a working day, before → after:

| what a player sees | before | after |
|---|---|---|
| bakery manager on the **staff** side of her own counter | 25% | 96% |
| deli manager on the staff side of his | 63% | 89% |
| cashiers within reach of a till | 59% | 69% |
| grocery clerks at a shelf run | 57% | 79% |
| two crew standing inside each other | 10% | 3% |
| time in the **back corridor** during work hours | 10–29% | 3–9% |

**What to look at:**

- **Stand in front of the deli and the bakery counters.** Bruno and Doreen should be *behind* the
  case, serving across it. Doreen was on the customer side three quarters of the day before this —
  if she is ever in front of her own counter now, I want to know.
- **Watch the aisles.** Staff should be working the shelves — facing, rotating, price checks — not
  only walking through. Bubbles say what they're doing.
- **Watch the swing doors for a minute.** Before this, five of the nine reasons to walk anywhere
  were behind them, so the shop floor drained on a rota. Traffic through them should now look
  occasional rather than constant.
- **Look for two people standing on the same spot.** Much rarer now, but the fix is a nudge, not a
  wall — they can still brush past each other.

**The one I'd watch for:** somebody doing shelf work at a fixture that has no art for it yet — the
frozen section especially, since that's still waiting on your assets. A clerk facing an invisible
shelf will look like they're working on nothing.

### P. The posts you marked on the TV
Your screenshots, turned into where people stand. All of it derives from the fixtures or the
sprites, so re-laying the floor moves the crew with it.

**A bug was underneath all of this and it's worth knowing about.** `deskSeat()` stands a person 26
units clear of a desk's *edge* — correct for furniture you sit at, wrong for a station, which is a
floor marker that already means "stand here". Every store station was displaced ~38 units from
where it was authored. It hid because the offset usually landed on open floor and just looked
approximate. But a cashier's seat side points *into* her own till, so that spot was rejected and
she fell through to the next candidate — working the **bagging end of her own lane by accident**.
So some of what you were looking at was never where I'd put it.

**What to look at:**

- **The lanes.** Cashiers stand beside the register (the screen/PIN pad end), not halfway down the
  belt where they used to be. Three lanes and two front-end staff, so the bagging shelves and the
  spare register are worked on rotation rather than owned — you should see people move between
  them, not stand frozen.
- **The deli counter.** Bruno was authored at x=620; his case ends at x=619. He was standing *past
  the end of it*. He's now centred behind it. Doreen was worse — her spot was inside the bakery
  case's collision, so the grid shoved her to the back wall.
- **The counters moved up 8, and 8 was all there was.** I measured it in the browser rather than
  guess: shifting them up 8 costs nothing because the loss falls inside the nav grid's own padding,
  but at 12 the staff band behind them collapses to a single 18-unit row — walkable, but too thin
  for two people to pass. If you want them tighter than this, I need to move the back-room wall
  north first. Say so and I'll do it.
- **The cash room.** Lorne and Merv now walk in; Garret does not. It's one post on a 23-post round,
  so expect it a couple of times a day rather than constantly — if it reads as "never", the dwell
  is one number.

**Two things I want your call on:**

1. **There is no dedicated bagger NPC** — the roster has two front-end staff and a front-end
   manager. Right now they rotate through the bagging posts. If you want somebody permanently on
   the bagging shelf, that's a new crew member, and I'd rather you pick the name.
2. **The AM is deliberately excluded from the cash room.** You said manager and owner, so that's
   what it is. One entry to add Garret if he should be in there too.

### Q. The store stops speaking in office words
I went looking for anything else worth fixing before you test, and found one family of bug. None of
it was findable by reading the code — the tables all looked fine, because they were the *office's*
tables being read by the store. I caught it by intercepting the store's own log for five in-game
days and grepping what it actually said.

| what you'd have seen | where |
|---|---|
| "Bruno Sarr's **desk** (empty) — Search their **drawers**" | standing in the middle of the deli |
| "Gita took my **stapler** last month. Take something off their **desk**." | favour ask |
| "Slip something incriminating into Bekah's desk. **HR will do the rest.**" | favour ask, in a building with no HR |
| "Grab me a **stapler**? I'm dying." / "letterhead from the **printer**" | fetch favours, via two separate paths |
| "The **office** churns on without you." | ~10 times in 5 days |
| "You slammed the **desk** and shouted at the **monitor**." | your own meltdown |

**The one that actually cost you something:** planting evidence *deleted a piece of leverage
permanently and could never pay off*. It splices the document out of your dirt and tells you "now
you just need HR to check it" — there is no HR in the store, so nothing could ever check it. That
option now says so and is disabled. A favour that *asks* you to plant still works, because it
credits on the act.

All of it keys on **structure, not the level's name** — a building whose workers stand at posts
instead of sitting at desks is a shop floor — so a third level gets the right words for free. The
office keeps every one of its own words, and the test asserts that too, otherwise this could be
"fixed" by deleting the vocabulary everywhere.

**What to look at:** walk up to a crew member and press A. It should say *their station* and *go
through their things*. Then read the ticker for a day and see if anything still sounds like an
office — that sweep is now a test, but it only knows the words I thought of.

**Two I did NOT fix, because they're your call:**

1. **"Bag the orders at your lane" is completed at a cubicle desk 384 units from the nearest till**,
   in the middle of GROCERY. Your desk in the store is an office cubicle standing in the open on
   the sales floor — it's the anchor every `via:'desk'` task routes to. The honest fix is that your
   work anchor follows your post as you rank up (bagger → a lane, clerk → an aisle), which is a
   design change rather than a polish pass. I didn't want to guess it the day you test.
2. **The store's containers stock office supplies** — 11 staplers, letterhead, sticky notes. Making
   that store-native (a price gun, a box cutter, a spare apron) needs new items, and inventing item
   ids right before a test seemed like the wrong trade.
