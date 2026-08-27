# TESTME — the running list for Kyle's TV

Things that are merged and live, that a green gate **cannot** judge. A green soak means NOT
BROKEN; a clean screenshot means IT RENDERS. Whether any of it is *good* is your call, and this
is the list of what to point that call at.

Newest at the top. Tick things off or delete them once you've formed a view — nothing here needs
a reply, it's just a queue so nothing gets lost while you're away from the TV.

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
