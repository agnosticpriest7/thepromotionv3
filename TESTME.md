# TESTME — the running list for Kyle's TV

Things that are merged and live, that a green gate **cannot** judge. A green soak means NOT
BROKEN; a clean screenshot means IT RENDERS. Whether any of it is *good* is your call, and this
is the list of what to point that call at.

Newest at the top. Tick things off or delete them once you've formed a view — nothing here needs
a reply, it's just a queue so nothing gets lost while you're away from the TV.

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
