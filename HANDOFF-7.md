# HANDOFF-7 — Preview loop, debug hook, playtest fixes

**2026-07-27.** Live/committed state: `main` @ `fc46492`, full gate green (27/27).
Supersedes `HANDOFF-6` (the seated-art run — **now complete**, sprites 0–20 all have seated art).

---

## What changed this session

### 1. You can look at the game now
- **`.claude/launch.json` committed** — serves the repo root at `http://localhost:3000`.
- **Never `file://`.** Under `file://` the canvas taints, `getImageData` throws inside
  `keyOutMagenta`, it catches and returns the raw image, and **every magenta-keyed sprite renders
  with an opaque magenta background**. Looks like an art bug; isn't.
- **The colour key is verified programmatically, not by eye:** `keyOutMagenta` returns a
  `<canvas>` on success and the raw `<img>` on taint. `ART['stall_v'].tagName === 'CANVAS'` = keyed.
  Corner-pixel alpha 0 proves the magenta really went transparent. Confirmed clean over http for
  `stall_v`, `stall_h`, `printer_wreck`, `bat_dale`, `bat_marcus`, `sit_dale_down`, `cubicle_desk`.
- ⚠️ **Stale-clone trap:** the old `Promotionv2` clone on this machine has its **own older
  `index.html`**. It is a *sibling*, not a parent/child, so `cwd` can neither reach it nor avoid it —
  sessions must be **rooted in `thepromotionv3`**. Always verify what is actually being served
  (byte count + a symbol grep) before trusting a screenshot. Full detail in `CLAUDE.md` §8–§10.

### 2. `window.__dbg` — dev-only posing hook (`?debug=1` + localhost)
Poses a state for a screenshot instead of playing to it. Off by default, **never arms on Pages**,
rendering/inspection only, nothing persisted, no `SAVE_VERSION` bump, unknown names no-op.
Nine entry points: `help · state · time · seat · tp · melt · favour · rank · day`
(`melt` forces the 7% printer homage by briefly pinning `Math.random` around the real `meltdown()`).

**The intro silently ruins poses** — a fresh `startGame` runs the day-1 tour, which overwrites Dale's
and the player's positions every frame. Bail with `endIntro(true)` (a game fn in page scope, *not*
part of `__dbg`) or use **Test Game**. Full API + posing gotchas in `CLAUDE.md` §11.

### 3. Favour lapse window — measured, left alone
An unanswered favour ask lapses at the end of its work block. That was flagged as *possibly* too
tight; it isn't. Measured with the game's own nav grid and A*:

| | |
|---|---|
| Worst-case crossing | **17.6 s** (NE corner → Chad, 3228 px) |
| Player speed | 3.06 px/frame ≈ **184 px/s** axis-aligned @60fps (diagonals ~1.41× faster) |
| Lapse window | **72 s** floor (the three 65-min blocks); 150 s on the long afternoon block |
| Headroom | **≈ 4.1×** |

Asks only spawn at a block *start*, so the player gets the whole block. **No change made.**

### 4. Also shipped (see the commits for detail)
Stacie's playtest batch `21cd7e6` (intern/senior-sales seating, Dale-favour + delegate jobs on the
right-hand panel, the "everyone is a Peacock" delegate label, reserved desks no longer printing a
false VACANT, favours boosted + a green "!" over anyone holding one) · the **CEO office gate**
(Ravinder gatekeeps; coffee ×3 sends him to the loo; confront-or-brush-off inside) · the **day-1
intro** running on the office clock `cef6261` · **favours are opt-in** `fa2db72`.

---

## Open items

- **Duplicate GRIND row in the delegate menu.** Two rows appear, both reading "suits a Zealot".
  **Not investigated.** May be two genuinely distinct options collapsing onto one label, or a real
  duplicate in the tray. Start at `delegAssignMenu` / `delegOpen()`.
- **HUD overlap.** The TODAY checklist prints over desks and room labels. Seen in **four different
  world states at full width**, so it is **not** pane geometry. This is the prank-menu legibility
  item from `HANDOFF-3` Part C-b — now with evidence attached.
- **Kitchen cleanup** — parked from `HANDOFF-6`, still never started.

## Standing TV items (Kyle's verdict, gamepad in hand)

- The **favours accept flow** — does opt-in feel right, or fiddly?
- **`RAV_LOO_SECONDS = 26`** — enough time to get in, confront Sterling, and get out?
- The **HUD overlap** above.
- The **seated bullpen** — this is the *before* baseline for `drawSeated`.

## Not started

**`drawSeated`** — explicitly the next branch. Do not begin it without Kyle's go-ahead.

---

A green soak means **NOT BROKEN**. A clean screenshot means **IT RENDERS**. Neither means **GOOD** —
that verdict is Kyle's, on the TV. (`CLAUDE.md` §13.)
