# THE PROMOTION — Source Update, Systems Correction & Design Audit

**Snapshot:** 2026-07-15 (evening session).
**Build:** `index.html` — ~7,253 lines, ~417 KB. Single-file HTML/JS/Canvas, no build step, no deps.
**Repo:** `Promotionv2` (`agnosticpriest7`), GitHub Pages, repo-root `index.html`. **Stays PUBLIC.**

Read this alongside `PROJECT.md` and `HANDOFF-2.md`. **Part A corrects `PROJECT.md`** — several
shipped systems are undocumented there, and a fresh session that trusts the docs will believe
they don't exist and try to build them again. That nearly happened this session (see Part C).

---

## ⚠️ SHIP-BLOCKER (unchanged, still #1)

Printer meltdown is forced to **50%** for testing. In `meltdown(n)` (~ln 2097) change
`Math.random()<0.50` back to `0.07` before shipping.

---

## PART A — CORRECTIONS TO `PROJECT.md` §3 (systems that EXIST and are UNDOCUMENTED)

> These are built, tested, and live. **Do not rebuild them.** They are the game's "shape of
> time" layer — the metronome, the stash-threat, and the opportunity windows. `PROJECT.md` §3
> describes ranks, paths, pranks, detection, and world autonomy, but omits everything below.

### A1. The day is a fixed 10-phase schedule (the metronome)
`PHASES` (~ln 1296), `currentPhase()`, `isWorkPhase()`. A day runs 8:00→17:00. The floor's
population physically shifts by phase — seats clear and re-assign at breaks/meeting/lunch
(`clearSeats`, `assignSeats`, ~ln 1834 / 3823-3824).

| Phase | Time | Notes |
|---|---|---|
| Clock-In | 8:00–8:30 | day opens |
| Regular Work | 8:30–9:45 | boss cone hunts slacking |
| Morning Break | 9:45–10:00 | floor drifts to break/kitchen; rest zones relieve stress |
| **Meeting** | **10:00–10:45** | **attendance checked — see A2** |
| Regular Work | 10:45–12:00 | |
| Lunch / Break | 12:00–12:45 | floor empties to break zones |
| Regular Work | 12:45–14:00 | |
| Afternoon Break | 14:00–14:15 | |
| Regular Work | 14:15–16:30 | |
| Clock-Out | 16:30–17:00 | world quiesces; 5pm autosave (see §4) |

The break/lunch phases are de facto **opportunity windows** — the bullpen thins out.

### A2. Meeting attendance (10:00 meeting)
Two ways to get credit, `meetingCredited`/`phaseCred['Meeting']`:
- **Be there:** `checkMeeting()` (~ln 3809) credits proximity to the conference table
  (+5 promotion progress, −6 suspicion).
- **Take notes:** at the whiteboard during the meeting (~ln 2918) → +7 progress, −4 suspicion,
  **AND you're licensed to slip out early** while everyone else is seated for ~40 minutes.
  This is the game's cleanest designed heist window: the alibi and the window are the same act.
- **Miss it:** at phase-end (~ln 3822) `addSuspicion(8,'Your absence at the meeting was noticed')`.
  ⚠️ This currency is wrong and is flagged for change — see **Part C (a)**.

There is currently **one** hard daily beat (the 10:00 meeting). No PM equivalent (a 2pm all-hands
was discussed as optional, not required — the break-phase population shifts already give the
metronome a second half).

### A3. Audit / shakedown system (the stash-threat)
`scheduleAudit()` (~ln 1071) arms **one audit per day** at a random time between **9:00 and 15:30**.
`triggerAudit()` (~ln 1092) picks a target by priority:
1. **55% chance:** a visibly-struggling worker (stress tier ≥2 or has mistakes) — flavor/pressure.
2. else a **planted** desk — "anonymous tip" (this is how framing pays off).
3. else a **random owned desk — which can be YOURS** ("DESK AUDIT INCOMING").

`resolveAudit(desk)` (~ln 1119):
- **Your desk:** everything loose in the **drawer** is seized (`+suspicion = min(30, 8+8·found)`).
  A **framed** item planted in your desk costs +22 suspicion. A clean drawer gives −6.
  **Behind-the-panel is never found** — that's its entire purpose.
- **An NPC's desk:** a half-built prank of yours found there **traces back to you** (+25 suspicion,
  the build is destroyed). Planted evidence **strikes the owner** (+30 stress, −25 mood, formal
  strike, can trigger their meltdown) and does **not** trace to you.

### A4. Three-tier desk storage (contraband management)
`openDesk()` (~ln 1181), caps at ~ln 879/1067-1069. A thing lives in one of three places:
- **POCKETS** — `INV_CAP = 8`. Safe from a desk audit, but a **write-up/discipline** turns them out.
- **DRAWER** — `DRAWER_CAP = 6`. First place HR looks; an audit takes **everything** in it.
- **BEHIND THE PANEL** — `HIDDEN_CAP = 4`. HR never finds it, but it holds little, is slower to
  access, and stashing while HR is watching is its own problem (`stashContraband`, ~ln 1263).

Contraband = **prank kits** and **leverage documents**. This is a per-item placement decision with
a different failure mode per tier — richer than a binary "contraband pouch."

### A5. Fire drill + manual alarm (opportunity windows)
- **Random drill:** `scheduleDrill()` (~ln 1073) — **18% chance/day**, random 9:00–15:00, during a
  work phase. Floor evacuates ~16s (`alarmActive`, `evac`, tick ~ln 3830 / 4358). "Not your doing."
- **Player-pulled alarm:** `pullAlarm()` (~ln 4346) — the fire alarm object clears the **whole floor**
  (chaos; if HR sees you pull it, that's a risk). While an alarm is active HR is **distracted**
  (`distracted`, ~ln 3785) — the intended cover for lifting the HR keycard.

---

## PART B — SHIPPED THIS SESSION (all `node --check` clean; visual items need on-device eyeball)

1. **Printer-smash run-to-printer fixed.** In `tickMeltEvent` printer branch, the victim now keeps
   the bat **down** and uses the normal walk sprite while pathing over (`batFrame=null`, swing clock
   held at 0); the bat comes up and swinging starts on arrival. Previously she held the windup pose
   the whole walk. Also stopped re-stomping the errand every frame.

2. **The pink is fixed via load-time color-key.** `keyOutMagenta()` + `COLORKEY` set in `loadArt`
   (~ln 500s). The `bat_*` sheets and `printer_wreck.png` were exported with a solid magenta (#f0f)
   background instead of alpha; we key it to transparent on load and hand back a canvas that `ok()`
   and `drawBatFrame` treat like an Image. Covers all 21 bat sheets + the wreck, and any bat sheet
   added later. **Caveat for the Electron port:** reading pixels off `file://` images can taint the
   canvas in some configs → the key silently no-ops (pink returns, no crash). Fine on GitHub Pages
   (same-origin). Permanent fix if it ever bites under Electron: re-export those PNGs with real alpha.

3. **Printer moved** `(92,224)` → `(108,238)` (authored units) for more swing room, off the cramped
   NW corner. Nav grid rebuilds from object positions at boot. The NPC printer-errand point
   (`errandPoints`, ~ln 925, still at `100,262`) was left beside it — bump that if ambient copy-runs
   look off.

4. **Intro tour lines** (`INTRO_BEATS`, ~ln 2306): annex now "…You'll be here soon." (was "You'll
   start there."); HR now "…Stay out of their sight." (was "…their eyeline.").

5. **Rumor system reworked to match intent.** New flow: talk to any worker (the **messenger**) →
   "Spread a rumour (pick who it's about)…" → submenu of everyone else (the **subject**).
   - `dirtOn(subject)` (any leverage: gossip/desk/hrfile) → **100%** and the dirt is **spent**
     (gone for blackmail). No dirt → **40%** and a weaker bite (power 16 vs the item's power).
   - Loyal messenger (friend of the subject) → **backfires** (telegraphed in the submenu).
   - Rival / feuding messenger carries it **1.3×**. Credits `kind:'rumor'` missions when the
     subject matches the ask.
   - New funcs `pickRumorSubject` / `spreadRumorAbout` (~ln 3150s). Old `plantGossip` /
     `spreadGossip` are now **dead code** (defined, uncalled) — flagged for removal (Part D).
   - Tuning dials to feel on device: the `0.40` fudge chance and the `16` fudged power.

---

## PART C — DESIGN AUDIT: THE PROMOTION vs THE ESCAPISTS 2 (verdict + tracked changes)

Full-loop audit run this session. **Corrected conclusion** (an early draft was wrong because it
audited from the docs, which omit Part A):

**TP already has the parts that make TE2 fun, and in several cases beats them:**
- **The double life / alibi** — TP's boss-cone (hunts *whether you're working*, not just where you
  are) + allies-look-away cover is stronger and more thematic than TE2's rollcall.
- **Risk legibility** — visible cones, suspicion with stated reasons.
- **World autonomy** — TP's office is a live actor (rivals climb, feud, melt down, get fired by
  emergent drama). TE2's prison is a static clock. This is TP's *own* fun, not borrowed.
- **Knowledge loop** — personality system = TE2's "case the guards": system knowledge carries across
  runs, target knowledge (who's the Zealot this run?) is re-earned. Intel-as-prerequisite is the
  case-the-target step.
- **Slapstick** — the printer smash is TE2's systemic-comedy channel.
- **The metronome, the stash-threat, and opportunity windows** — the 10:00 meeting, the audit +
  three-tier storage, and the drill/alarm (Part A) are TE2's schedule/shakedown/window layer.
  **These exist.** The early-draft finding that TP "lacks the shape of time" was largely wrong.

**The real residue is LEGIBILITY, not structure.** An intern *is* accumulating real progress toward
three summits (leverage, friend-points, Dale beats, rank toward the Manager-gated catfish), but it
doesn't **look** like one growing tunnel — the player can't watch the hole get deeper. (This merges
the earlier "the org chart isn't a visible fence yet" finding.) Note also: TE2's tunnel isn't free
on day one either — INT thresholds and keycards hard-gate it, exactly like TP's rank gates. Rank *is*
the red keycard. The gates are fine; the visibility is the gap.

### Tracked design changes (NOT yet built — decide, then implement)

**(a) Meeting-miss penalty — wrong CURRENCY, then severity.** Missing standup routes +8 **suspicion**
(HR's wrongdoing channel) — but missing a meeting is **slacking**, which by TP's own architecture is
the **boss's** domain. Change: route the miss to the **slack/boss channel or promotion progress**,
not suspicion; **scale with rank** (an intern's absence is invisible; an AM's is conspicuous);
**escalate** (first miss noted, second miss in a run triggers the discipline/write-up path). This
delivers Kyle's "make the hit more severe" via escalation + rank-scaling rather than a bigger flat
number on day one — and it grows exactly as skipping the meeting becomes more tempting.

**(b) Paths / progress panel (pure legibility, gates unchanged).** Surface three "thermometers" so
the intern can see the hole getting deeper: the **Merit** branch-health streak (x/3 days ≥70), the
**Loyalty** Dale-arc beat count (x/16), and the **Catfish** prerequisites with the **Manager lock
shown**. Changes no gates; just makes the accumulating projects visible as projects.

### Confirmed next build target
**Prank assembly pipeline** (intel → materials → execution window → resolution as explicit stages).
This is TP's **material-hunt layer** — it converts "make progress" into "get *this* from *there*
before *then*," which is TE2's actual moment-to-moment texture. The audit **confirms** this is the
correct next target (it was already top of the deferred list).

---

## PART D — OPEN ITEMS (carry-forward)

- **Revert 50%→7%** (top of this doc). #1.
- **Meeting-penalty currency change** — Part C (a). Decide + implement.
- **Paths/progress panel** — Part C (b).
- **Remove dead `plantGossip` / `spreadGossip`** if wanted (now uncalled).
- **On-device eyeball:** printer run-over reads right; no magenta fringe at sprite edges (if a thin
  pink line remains, the source art has anti-aliased magenta → widen the key threshold in
  `keyOutMagenta`); rumor feel (`0.40` chance, `16` fudge power).
- **Xbox meltdown-music real-device test** — still open (`ensureSting` picks format by `canPlayType`).
- **Electron color-key taint caveat** — Part B (2).
- **Prior deferred (unchanged):** rubber-band rival, prank chaining, prank-menu legibility pass, wall
  phone for hints, gas-station tutorial level, split-screen co-op, Electron/Steam port.

---

## PROCESS NOTE (why this doc exists)

`PROJECT.md` §3 omits the schedule, meeting attendance, audit/shakedown, three-tier storage, and
drill/alarm systems (all in Part A). That omission caused this session's design audit to nearly
recommend **rebuilding systems that already ship**. Anyone reading only the docs will hit the same
trap. **Fold Part A into `PROJECT.md` §3 at the next consolidation**, and keep the golden rule from
§5: run the build, don't just read it — and don't trust the docs to be complete.
