# THE PROMOTION — Feature Register

**What this is.** One row per feature, with its real status **checked against the code**, not against
the handoffs. It exists because the docs drifted badly in both directions: `PROJECT.md` §10 spent
months pointing at the prank assembly pipeline as "the next build target" while the thing was
already shipping, and three sprite PNGs stayed on the open-items list after they stopped being
requested at all.

**The rule for this file:** a status change needs evidence — a symbol in `index.html`, a passing
test, or a measurement. If you cannot point at one, the status does not move. Where a claim was
verified, the evidence is in the row.

Status vocabulary:

| | |
|---|---|
| **SHIPPED** | in the build and reachable in play |
| **PARTIAL** | core works; a named piece is missing |
| **NOT BUILT** | designed or discussed, no code |
| **DELAYED** | deliberately parked, with a reason |
| **REMOVED** | tried or specced, then dropped — kept so it isn't re-proposed |
| **KYLE** | needs his verdict or his hardware; not a code task |

Last audited **2026-08-01** against `main`.

---

## Core loop

| Feature | Status | Evidence / note |
|---|---|---|
| Seven-rank ladder, 3 CEO routes | SHIPPED | `RANKS`, `ceoByMerit`, `DALE_ARC`, `sendCatfishEmail` |
| 10-phase day schedule | SHIPPED | `PHASES` 8:00→17:00, `isWorkPhase` |
| Meeting attendance + notes alibi | SHIPPED | `checkMeeting`, whiteboard "leave early" |
| Audit / shakedown | SHIPPED | `scheduleAudit`, `resolveAudit` — one per day, 9:00–15:30 |
| Three-tier desk storage | SHIPPED | pockets 8 / drawer 6 / behind-panel 4 |
| Fire drill + player-pulled alarm | SHIPPED | `scheduleDrill` 18%/day, `pullAlarm` |
| Detection cones (HR + boss + coworkers) | SHIPPED | `hrSeesPlayer`, `workerSeesPlayer`, allies give cover |
| Personalities, intel-gating, pranks | SHIPPED | 5 `PTYPES`, `SIGNATURE`, `n.profiled` |
| Rumours (messenger → subject) | SHIPPED | `spreadRumorAbout`; dirt = 100% and spends it |
| Meltdowns + printer-smash homage | SHIPPED | 7% (`printerMode`); `t_meltdown` |
| Save system, 3 slots, versioned | SHIPPED | `Store` is the only `localStorage` seam |

## The one that surprised us

| Feature | Status | Evidence / note |
|---|---|---|
| **Prank assembly pipeline** | **SHIPPED** | All four stages exist. **Intel:** `planPrank` labels the menu `UNREAD — you are guessing`, signature prank sorted first. **Materials:** `PARTS` recipes + `RECIPE_HINT`, container `KIND_BIAS`, a 3-tier / 15-kit craft grid with per-part green/red; the five master kits each need something *stolen*. **Window:** `advancePrankStage` refuses while the owner is within 44u ("wait until they leave") or HR is looking; each stage is a 5s `startAct` **at their desk**; tier 2–3 need repeat trips. **Resolution:** `armPrank` → springs when they return to their seat; `image` waits for witnesses within 95u; `triggerPrankResolve` → fit/miss, or `masterPlant` → HR strike. State persists as `prankBuild={type,tier,stage,armed}`. |
| ↳ no deadline dimension | NOT BUILT | The window is *opportunistic*, never time-boxed. HANDOFF-3's "get this from there **before then**" is the one phrase not literally true — nothing expires. |
| ↳ no cross-floor tracker | NOT BUILT | A half-built prank is invisible until you walk to that person. Same legibility gap the paths panel closed for promotions. |

## Management layer

| Feature | Status | Evidence / note |
|---|---|---|
| AM delegation layer (D1) | SHIPPED | `deleg={q,done,dem,seq,esc}`, `DELEG_MATCH`, `DELEG_TARGET=12` |
| Manager verbs (hire/fire/promote/demote) | SHIPPED | `t_manager_fire`, `t_promote`, `t_demote` |
| Manager branch-health hold (merit route) | SHIPPED | `MERIT_TARGET=70`, `MERIT_DAYS=3` |
| **Senior Sales "countersign a junior's order"** | **SHIPPED** 2026-08-01 | Rank 3 had no verb at all — a seat tier and a flat `+6`. Now: an order appears on a junior's desk with a `kind` from the **same `DELEG_MATCH` table**, and it is *sound* when the work suited its author, so the read the player needs at AM is practised here as a binary call on one person. Signing bad work costs standing; rejecting good work costs the relationship. Penalties route to the boss channel, never HR suspicion. `cosign*` in `index.html`, guarded by `t_countersign.js` (25 assertions, mutation-verified). Full record incl. Kyle's decisions: **`SPEC-countersign.md`**. |
| ↳ blind (unprofiled) call | **neutral, for testing** | Kyle's call. Costs nothing, pays nothing, says so. Unlike a prank you cannot profile at leisure first — the order lapses at the end of the block. Reversible by deleting the `blind` early-return in `cosignDo`. |
| ↳ visible artifact on the desk | SHIPPED | `drawOrderPaper` — a ruled sheet with a gold signature band, canvas-drawn so it needs no PNG and cannot be confused with the `note` loot item. Anchored to the desk **sprite**, not the collision box. |
| Dale's "D" graceful-close upgrade | NOT BUILT | The `npcLeaving` default ships; the "hold the gate and choose" desk-menu doesn't. Consolation must be capped promotion progress, never `vpFavor`. |
| Manager-appoints-AM / org mechanics | NOT BUILT | No hooks or fields yet, per the D1 spec. |

## Legibility

| Feature | Status | Evidence / note |
|---|---|---|
| **Paths / progress panel** | **SHIPPED** | `renderPaths()` → "THE WAY UP — three roads to CEO" with `meritCard`+`loyCard`+`catCard`. Guarded by `t_paths.js`, which cites HANDOFF-3 Part C(b) by name. `PROJECT.md` §10 still called this "partly present" — corrected 2026-08-01. |
| **Meeting-miss penalty re-currencied** | **SHIPPED** | HANDOFF-3 Part C(a) is done: `missMeeting()` rank-scales (below Junior Sales nobody looks) and escalates to `triggerDiscipline()` on the second miss. Off the HR suspicion channel entirely. |
| Health decomposition + ally thresholds | SHIPPED | `healthBreakdown`, presentation-only |
| Delegation legibility | SHIPPED | `t_deleg_legibility` |
| Prank-menu legibility pass | NOT BUILT | Surface the personality read *at the point of decision*. |

## World / art

| Feature | Status | Evidence / note |
|---|---|---|
| Level overhaul, world widened to 1500 | SHIPPED | see HANDOFF-5 |
| Seated cast, sprites 0–27 | SHIPPED | `SEAT_ART`; `drawSeated` chair+person composite |
| Character select, 5 playable | SHIPPED | `PLAYABLE`, `CHAR_SHEETS` |
| Guest hires (Rod / Karl / NWH) | SHIPPED | `GUESTS`, `GUEST_CHANCE=0.10`, hidden — arrive in place of a hire |
| Rooms: kitchen, janitorial, break, reception | SHIPPED | HANDOFF-7's "kitchen cleanup, never started" is **done** |
| Per-rank soundtrack | SHIPPED | `RANK_TRACKS`, all 7 ranks |
| Guest bat-swing art (25/26/27) | DELAYED | Kyle is generating. Meltdowns degrade safely; one `BAT_BY_INDEX` line each when they land. Rod's (`bat_rod`) is in. |
| **3 missing sprite PNGs** | **REMOVED** | No longer an issue: `drawer` / `shift_covered` / `coffee_run` are absent from disk but **nothing requests them**. Live load = 250 asset requests, **0 HTTP errors, 0 broken art**; all 230 `ART_FILES` entries resolve. Stale memory deleted. |
| East-wall windows don't render | DELAYED | `WINDOWS` generator loops on scaled `W`, so they land off-world. Folded into the held window branch, not a standalone fix. |
| `window-alignment-daylight` branch | DELAYED | Held for Kyle's TV review AND ~23 commits stale. **Rebuild on `main`, don't fast-merge.** |

## Big deferred

| Feature | Status | Evidence / note |
|---|---|---|
| **Level select** | **SHIPPED** 2026-08-04 | Menu gains a level step before character select: `LEVELS` / `currentLevel` / `levelById` / `levelBuilt`, a `levelpick` menu mode, `promo:level` riding the existing reload handoff, and `level` recorded additively in the save (no `SAVE_VERSION` bump — it stays 4, which is what protects live playtest saves). Slot rows show which level a save is in. `SPEC-levels.md`. |
| **Grocery (Save-Rite) — one empty room** | **SHIPPED** 2026-08-04 | The `loadLevel(id)` seam, proved with the smallest possible world: four walls, one room, one spawn, no cast, no props, no ladder. Office is a deliberate NO-OP in `loadLevel`, so it boots down exactly the path it always did. `t_grocery.js` (13 assertions) — enclosure is a flood fill over the real nav grid, mutation-verified by cutting a gap in a wall. |
| ↳ office-specific code that broke *any* other world | **the map** | `assembleAtElevator()` set `player.x=ELEVATOR.x` (an office const) at boot **and every day roll**, overwriting the level's own spawn · `startIntro()` walks Dale along `INTRO_ROUTE` and dereferences a manager that doesn't exist · `drawDecor()` is entirely office props incl. the canvas-drawn `PAPER SUPPLY CO.` sign · `drawFloor()` paints office room tiles · `renderInner()` draws five table consts (`meetingTable/2`, `breakTable/2`, `kitchenTable`) + `drawElevator()` which live in their OWN consts, not in the arrays `loadLevel` clears. All guarded, none generalised. |
| ↳ grocery player's rank | **NOT BUILT (finding)** | Boots at rank 0, so the HUD reads `INTERN` / "next: JUNIOR SALES" — the office ladder, in a grocery store. Nothing was touched to get there; building a grocery ladder is a later branch. |
| ↳ cross-level save loading | **FIXED 2026-08-04** | `Load Game` applied a snapshot **in place with no reload**, so a grocery save opened while the page booted office would put grocery state on an office floor. Now routes through a reload (`promo:loadgame`); with no reload available it refuses rather than half-applying. Asserted. |
| Floor system (multi-floor + elevator handoff) | NOT BUILT | Separate from the above and NOT a competitor: one building, floors suspended, elevator as a despawn/spawn node, off-floor rivals resolved logically. The original HANDOFF-5 spec was never written (HANDOFF-5 reused the number for the level overhaul). Level select is a prerequisite if this is ever wanted. Only the two "co-op tease" reserved desks exist. |
| Gas-station intro / tutorial level | DELAYED | Parked until the office feels done. Needs a second map/screen state **and** a mission-scripting system that doesn't exist. Deliberately does not teach sabotage. |
| Split-screen 2-player co-op | DELAYED | Researched (TE2 model: drop-in, session-only guest), explicitly not built. Two reserved desks tease it. |
| Electron / Steam port | DELAYED | Zero references. `Store` is the prepared seam. Watch the `file://` colour-key taint caveat. |
| Rubber-band rival | NOT BUILT | (`rubberbands` in the code is a **loot item**, unrelated.) |
| Prank chaining | NOT BUILT | |
| Wall phone for in-world hints | NOT BUILT | TE2-style pull-not-push help. |
| 2pm all-hands (second daily beat) | REMOVED | Considered and dropped — the break-phase population shifts already give the metronome a second half. |
| Scaled-B (Dale recommends you remotely) | REMOVED | Rejected: `vpFavor` alone opens CEO, skipping the Manager→CEO hold. |

## Known bugs (not features)

| Item | Status | Note |
|---|---|---|
| Rank bars drawn across Dale's face | **REMOVED 2026-08-02** | Dale (`n.mgr`) and Sterling (`n.boss`) were the only NPCs with an overhead gold bar, and Dale's was still pinned to the top of his 29px **collision box** — 24px below the top of his 61px sprite, i.e. across his face. The identical bug was found and fixed for Sterling once (that is what `headTop()` exists for) and never carried across. Removed rather than repositioned, on Kyle's call: it agrees with the game's own stated rule ("NO NAME TAGS AT ALL. Everyone has a face — learn them"), and these two are the most recognisable sprites in the cast. Two lines to restore; measure from `headTop(n)`, never `n.y`. |
| Meltdown pips drawn across every face | **FIXED 2026-08-02** | Same bug, unreported: the red "prior meltdown" pips were also at `n.y-3`, so anyone who had melted down wore them across the face. Now measured from `headTop(n)`. Found by checking the neighbours of the reported bug rather than only the line named. |
| Stale countersign order survives a load | **FIXED 2026-08-01** | `applySnapshot` `Object.assign`s onto the live cast, so a field the snapshot never carried is left alone — an ephemeral order (and its paper) outlived the load. Now cleared on load; `t_countersign` asserts the tally persists and the orders do not. |
| **`botrun` craft-after-loot** | **RESOLVED 2026-08-01** | Never a game bug — **the pockets**. `INV_CAP` is 8 and the looting loop filled it, leaving no room for the kits `doCraft` pushes. The bot now makes room and asserts only recipes `partsStatus()` says it can afford: 2/2 crafted. An earlier "fix" that popped items to make room was worse — it threw away the parts it had just looted. |
| `doCraft` on a no-part recipe | **FIXED 2026-08-01** | `calendar` / `well` have no `kit_<id>`; crafting them pushed a kit nothing consumes and threw on `ITEMS[...].label` — 6 and 11 throws in a 300-frame window. Unreachable from the menu (the button reads NO CRAFTING NEEDED), which is not the same as safe. `doCraft` now refuses. |
| Duplicate GRIND row in delegate menu | OPEN | Carried from HANDOFF-7, never investigated. Start at `delegAssignMenu` / `delegOpen()`. |
| HUD overlap (TODAY checklist over desks) | OPEN | Seen in four world states at full width, so not pane geometry. |
| Ravinder gone by day 14 unattended | OPEN | He gatekeeps the CEO office — that gate may evaporate in a long game. Never investigated. |
| `NPCS` never prunes | OPEN | 19 → 32 over 28 days; `buildSnapshot` serialises all of it, so **save size grows with playtime** (17.5 KB by day 14). Plausibly by design — leverage and history reference people who left. |
| Lounge corridor has no room caption | OPEN | Outside every `ROOMS` rect, so `roomAt()` returns null. Folding it into RECEPTION is small. |
| Default desk sprite art→facing map | OPEN | Latent, not broken — every desk is correct via explicit `seatDir`. |

## Kyle's call

| Item | Note |
|---|---|
| **Loyalty payoff over-promises** | Beat 16 reads as a CEO promotion but only opens gates and lands you at AM, then two more full bars. Three fixes written up in `PROJECT.md` §8. Payoff code deliberately untouched pending a Stacie playtest. |
| **Merit path beatability** | No confirmed human clear. A cold bot can't hold health ≥70 for 3 days. May need a feud-rate or target tune. |
| **Meltdown music on Xbox** | Needs a real-device test — can't be done from here. Xbox reportedly can't decode mp3, hence `.ogg`. |
| 16 meeting seats vs 23 desks | ~7 now **stand in a ring** rather than piling on one square (that pile was the "Zora walks backwards" bug). A third table is small now the pattern is wired. |
| Reception's marble room is bare | Seating moved to the corridor per the map. |
| Old `V*index.html` files | Clutter the repo root; harmless. Could move to `/archive`. |
