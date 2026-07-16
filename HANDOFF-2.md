# THE PROMOTION — Source Update & Handoff

**Snapshot taken:** 2026-07-15, 3:29 PM (MDT)
**Build:** `index.html` — 7,180 lines, ~404 KB, single-file HTML/JS/Canvas, no build step, no deps.
**Repo:** `Promotionv2` (GitHub user `agnosticpriest7`) — served as repo-root `index.html`, GitHub Pages. **Repo must stay PUBLIC** for free Pages.

---

## ⚠️ BEFORE YOU SHIP — REVERT THE TEST TWEAK

The printer meltdown is currently forced to **50%** for testing. Find this line and change `0.50` back to `0.07`:

```js
n.printerMode = Math.random()<0.50;   // TEMP: 50% for testing (ship value is 0.07)
```

(It's in `function meltdown(n)`, ~line 1661.) Leaving it at 50% ships a comedy Easter egg that fires half the time instead of as a rare surprise.

---

## WHAT LANDED THIS SESSION (all bot-verified, regression + save clean)

### Printer-smash meltdown Easter egg — COMPLETE & LIVE
- 7% (currently 50% test) of meltdowns: the victim marches to the real printer and beats it with a bat.
- Per-character 4-frame bat-swing sheets for all 21 characters (0–20). Sliced into 4 columns at runtime; keyed by sprite index in `BAT_BY_INDEX`.
- Impact frame (frame 2) fires together: in-game hit sound (`SFX.bad()`), screen shake, debris puff, and printer damage stage advance.
- 4-stage printer wreck (`printer_wreck.png`): intact → dented → caved → rubble. Persists through the day, resets overnight (fresh printer each morning).
- Homage track `Unscheduled_Hardware_Decommission` (~25.8s) plays instead of the metal sting, via the same duck/silence/slam sequence + ogg→mp3 fallback.
- Printer mode overrides "hunt" (victim goes for the printer, not the player).
- Graceful fallback: a character with no bat sheet does the printer march + destruction with their normal sprite.

**Assets are committed** to `Art/sprites/` (17 main + 4 hire bat sheets + `printer_wreck.png`) and `Music/` (`.ogg` + `.mp3`). Confirmed working in real play (fired on ~8th meltdown at 50%).

### Stress system — REVERSED
- Player stress now **creeps UP** on the floor instead of decaying. Rank-scaled: `rankLoad = 0.05 + 0.03*rank` per second (intern ~3/min, CEO ~14/min). Management is where the pressure lives.
- **Resting** (break room / kitchen zones) is the only passive relief (−2.2/s).
- **Coffee is the counterplay** — no cooldown, −18 (item) / −15 (machine). A manager gets ~90s per coffee, so you hammer them to survive.
- Was originally tuned to 0.18+0.06*rank; **dialed down** because pure idle hit stress 98 (punishing treadmill). Current values are a gentle-but-real background pressure.

### Breaking into HR files spikes stress
- `finishSnoop()` now adds **+28 stress** (+ existing suspicion) with a "hands shaking" log line. Can tip you into a meltdown if already high. High-risk/high-reward.

### NPCs can catch you — not just HR
- New `workerSeesPlayer()` — a non-ally worker who is **close (~78px) and facing you** catches you in the act. Tighter cone than HR (they aren't actively hunting).
- **Allies look the other way** (`friend >= ALLY_THRESHOLD`) — friendship is now operational cover, not just social.
- `seenByAnyone()` = HR OR a worker; wired into all the wrongdoing menu `seen`/`seen2` sites (pranks, theft, desk-rifling, restroom sabotage, framing) so risk display + suspicion cost reflect coworker presence.
- `witnessReact()` fires on the core prank commits (plantGossip, jamPrinter, fakeMemo, rigDesk): the witness gasps a bubble ("I SAW that.", "…noted."), loses mood, and bumps your suspicion +6.

---

## KEY CODE LANDMARKS (approx line numbers, will drift)

- `ART_FILES` / `BAT_BY_INDEX` / `BAT_SHEET` (~ln 23–48): asset registry + sprite-index→bat-sheet map.
- `batSheetFor(n)`, `drawBatFrame(...)` (~ln 42–66): bat sheet lookup + 4-column slicer.
- `meltdown(n)` (~ln 1658): rolls `printerMode`; **the 50%/7% line is here**.
- `startMeltEvent(n,final)` (~ln 1489): stages printer march + picks the sting track; `hunt` overridden by printerMode.
- `tickMeltEvent(dt)` printer branch (~ln 1536): swing loop, impact-frame hit (uses `meltEvent.lastHitSwing` to fire once per swing), wreck-stage advance.
- `drawNPC` bat-swap (~ln 4449): draws bat frame if printer-meltdown victim.
- `drawObjects` printer-wreck (~ln 4228): draws wreck stage over the printer.
- `endMeltEvent` (~ln 1633): clears `batFrame/printerGoal/printerMode`.
- `nextDay` (~ln 3350): resets `o.wreckStage=0`.
- `tickPlayerStress(dt)` (~ln 2022): the reversed stress creep.
- `finishSnoop()` (~ln 2020s): HR-files stress spike.
- `hrSeesPlayer` / `workerSeesPlayer` / `seenByAnyone` / `witnessReact` (~ln 2017–2035): detection stack.
- `PRINTER_TRACK` (~ln 6065), `playMeltdownSting(track)` / `ensureSting(track)`: parameterized sting player.

---

## THE TEST HARNESS (rebuild each session — sandbox resets)

`harness.js` extracts the `<script>`, `node --check`s it, evals under stubbed DOM/Canvas/Audio. Canvas stub THROWS on any non-finite coordinate. Manual rAF driver, `DT=16.7ms` (dt≈0.0167/frame). Internals exposed via `globalThis.__g`, `__menu`, `__save`; add names to the `EXPORTS` array to expose more.

Extract command:
```
S=$(grep -n "<script" index.html | head -1 | cut -d: -f1) && E=$(grep -n "</script>" index.html | tail -1 | cut -d: -f1) && sed -n "$((S+1)),$((E-1))p" index.html > /tmp/game_raw.js
```

**Session-start ritual:** re-extract → `node --check` → boot → run `t_regress.js` (150k frames / ~5 days; expect 0 throws/nonFinite/renderErrs/stuck) → then edit. After each change: regression + `t_menu_load.js` (save round-trip).

**Golden rules:** (1) Run it, don't read it. (2) A test that skips the acquisition path is a lie — bots must call the real functions. (3) The harness can't render real PNGs, so sprite scale/position and swing-vs-music timing need a human eyeball on the actual device.

---

## KNOWN CLEANUP / OPEN ITEMS

- **Revert 50% → 7%** (top of this doc). #1 priority.
- **"Needs some cleanup"** (your words, re: the printer smash) — pending your specifics. Likely candidates to eyeball on the TV: bat sheet **scale/ground position** per character (one-number tweak: `n.w*2.0` in the drawNPC bat block), **swing speed** (~0.9s/swing, `perFrame=0.22`) vs. the music, and whether the wreck stages read clearly.
- **Balance watch:** the new stress creep + worker-catch interact (a stressed player rushes risky pranks that coworkers now witness). Good tension, but watch it isn't *too* tight. Easy dials: `WORKER_SEE_RANGE` (78px), the +6 in `witnessReact`, and the `rankLoad` stress rate.
- **Meltdown music real-Xbox test** still pending (Xbox needs the ogg; `ensureSting` picks by canPlayType).

## DEFERRED / ROADMAP (unchanged)

- Split-screen 2-player local co-op — discussed at length, NOT built. TE2 model researched: drop-in via 2nd controller, guest is session-only (no persistent career) which collapses most complexity. User to confirm whether TE2 persists guest items/skills (affects scope). Recommended as its own post-Electron phase. Competitive "race to CEO" is thematically perfect but reintroduces two-parallel-careers complexity.
- Prank assembly pipeline, rubber-band rival, prank chaining, prank-menu legibility pass, wall phone for hints.
- Gas-station intro/tutorial level (separate stripped-down screen-state).
- Electron/Steam port (the `Store` localStorage object is the prepared seam).

## DESIGN PRINCIPLES TO DEFEND

Sabotage destabilises, paperwork fires; NPCs adapt; friends are counterplay (now literally — allies give cover from witnessing). Three CEO routes, honest hardest by design. Mechanics generate authentic behavior via incentive not restriction. Case-sensitivity of asset paths has bitten repeatedly (lowercase filenames; `Promotionv2` capital P). Design sessions kept separate from implementation sessions. Repo stays PUBLIC.
