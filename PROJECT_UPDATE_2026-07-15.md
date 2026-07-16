# THE PROMOTION — Source Update

**2026-07-15, 3:29 PM (MDT)**

Supplement to `PROJECT.md`. Only what's changed since it was written — everything in the
base doc still holds unless noted below. Build is now **~7,180 lines / ~404 KB**.

---

## ⚠️ Ship-blocker: revert the test tweak

The printer-smash Easter egg is temporarily forced to **50%** for testing. Before shipping,
in `meltdown(n)` change `Math.random()<0.50` back to `Math.random()<0.07`. It's flagged in-line.

---

## New since PROJECT.md

### Printer-smash meltdown Easter egg — built & confirmed in real play
Extends §3 (pranks/meltdowns). 7% of meltdowns (currently 50% test) send the victim to the
real printer to beat it with a bat instead of the metal freakout.
- Per-character 4-frame bat-swing sheets for all 21 cast (`Art/sprites/bat_*.png`), sliced
  into 4 columns at runtime, keyed by sprite index in `BAT_BY_INDEX`. No-sheet characters
  fall back to their normal sprite gracefully.
- Impact frame fires hit sound + shake + puff + printer-damage-stage advance together
  (`meltEvent.lastHitSwing` gates it to once per swing).
- 4-stage `printer_wreck.png` (intact→dented→caved→rubble); persists the day, resets overnight.
- Homage track `Music/Unscheduled_Hardware_Decommission.{ogg,mp3}` (~25.8s) via the existing
  duck/silence/slam sting player (now parameterized: `playMeltdownSting(track)`).
- Cleanup on `endMeltEvent` (clears `batFrame/printerGoal/printerMode`) and `nextDay` (wreck→0).

### Player stress REVERSED (amends §3 detection/stress behavior)
- Stress now **creeps up** on the floor instead of decaying: `rankLoad = 0.05 + 0.03*rank`/s
  (intern ~3/min, CEO ~14/min). Management is where the pressure lives.
- Relief is **resting** (break/kitchen zones, −2.2/s) and **coffee** (no cooldown, −15/−18);
  a manager gets ~90s per coffee, so you hammer them to survive. (First pass was too harsh —
  idle hit 98 — and was dialed down to these values.)

### Breaking into HR files now spikes stress
- `finishSnoop()` adds **+28 stress** on top of suspicion; can tip you into a meltdown.

### NPCs can catch you — not just HR (extends §3 detection cones)
- New `workerSeesPlayer()`: a **non-ally** worker who is close (~78px) and facing you catches
  you in the act. **Allies (`friend ≥ ALLY_THRESHOLD`) look away** — friendship is now
  operational cover.
- `seenByAnyone()` (= HR or worker) is wired into every wrongdoing menu `seen`/`seen2` site,
  so risk display and suspicion cost reflect coworker presence.
- `witnessReact()` fires on core prank commits (plantGossip, jamPrinter, fakeMemo, rigDesk):
  the witness reacts with a bubble, loses mood, and adds +6 suspicion.

---

## Amendments to existing sections

- **§8 Xbox meltdown-music item:** the sting player is now track-parameterized and both the
  original `Mandatory_Wellness_Meltdown` and new `Unscheduled_Hardware_Decommission` ship
  `.ogg`+`.mp3`. The real-device Xbox test is **still open** — unchanged.
- **§1 line count:** ~6,800 → ~7,180.

---

## New open items (add to §8)

- **Revert 50%→7%** (above).
- **Printer-smash cleanup pass** — flagged as "needs cleanup" in play but specifics TBD.
  Likely on-device eyeball items: per-character bat-sheet scale/ground position (dial:
  `n.w*2.0` in the drawNPC bat block), swing speed vs. music (`perFrame=0.22`, ~0.9s/swing),
  wreck-stage readability.
- **Balance watch:** stress-creep + worker-catch interact (a stressed player rushes risky
  pranks that coworkers now witness). Good tension; watch it isn't too tight. Dials:
  `WORKER_SEE_RANGE` (78px), the +6 in `witnessReact`, `rankLoad`.

---

## Unchanged

§2 architecture, §4 saves, §5 harness (still the law — rebuild each session, run the 150k
soak before editing), §6 prior bug history, §7 Electron plan, §9 hosting, §10 roadmap
(split-screen co-op still discussed-not-built; gas-station tutorial still the big parked
item), §11 workflow. All current changes are bot-verified: regression + save round-trip clean.
