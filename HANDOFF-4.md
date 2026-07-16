# THE PROMOTION — Claude Code Opening Brief (repo migration + safety rails)

**Repo:** new = `thepromotionv3` (`agnosticpriest7`). Remote:
`https://github.com/agnosticpriest7/thepromotionv3.git`. Future Pages URL:
`https://agnosticpriest7.github.io/thepromotionv3/`. Old repo = `Promotionv2` (leave untouched
as the safety net; it holds the known-good build + all assets).

**Purpose of this doc:** the on-ramp for the FIRST Claude Code session. Do the safety rails
**before** any feature work. Do **not** start on floors or layout until Milestone 0 (a clean
new repo with a green baseline soak that deploys) is done and confirmed by Kyle.

---

## HUMAN PREREQUISITES — Kyle does these before pasting this doc to Code

Run Code on the **home PC** (not a phone — the harness needs Node/git locally). In order:

1. **The empty `thepromotionv3` repo already exists on GitHub** (public). ✅ done.
2. **Install on the PC:** Node.js (the harness runs on it), git, and Claude Code. Confirm current
   install steps at `docs.claude.com`.
3. **Get the files locally:** `git clone` the OLD repo `Promotionv2` so Code has the real
   `index.html` + `Art/` / `Music/` / `Sound/` assets in a folder it can see.
4. **Authenticate push access** (gh CLI login, token, or SSH key) so Code can push to
   `thepromotionv3`. **Verify it with one throwaway commit + push BEFORE real work** — this is the
   single most common place to get stuck. If a push ever fails later, it's almost always this.
5. **Then** hand Code this doc and let it run Milestone 0 below.

Two things stay Kyle's hands regardless: the **GitHub Pages toggle** (a web-UI click) and
**testing on the actual Xbox/TV**.

**Read these first, in order:** `PROJECT.md` → `HANDOFF-2.md` → `HANDOFF-3.md`. HANDOFF-3 Part A
corrects PROJECT.md §3 (several shipped systems are undocumented there — the day schedule,
meeting attendance, the audit/shakedown, three-tier storage, the drill/alarm). Trust the code
over the docs where they disagree.

**The one law that governs everything (PROJECT.md §5):** *run it, don't read it.* Nearly every
real bug in this project read fine in the source and only showed up when the world ran ~5 in-game
days. Your advantage over a chat session is that you can actually run the harness — use it
constantly, not once.

---

## MILESTONE 0 — Clean repo migration (do this first, nothing else)

Goal: a pristine `promotion-v3` repo whose commit #1 is the current known-good build, deploying
on GitHub Pages, with the harness green — so the old `Promotionv2` repo stays untouched as a
safety net.

1. **Create a new repo** (suggested `promotion-v3`). **Public** — GitHub Pages on the free plan
   requires it (PROJECT.md §9). Making it private silently tears down the Pages site.
2. **Copy in only what ships:** `index.html`, `PROJECT.md`, `HANDOFF-2.md`, `HANDOFF-3.md`, this
   file, and the asset folders `Art/`, `Music/`, `Sound/`. **Leave `V1index.html … V34index.html`
   behind** — git history replaces the manual version-file habit entirely. This is the cleanup §8
   has been asking for.
3. **Baseline commit.** Commit that exactly as-is as "baseline: known-good build (~7,253 lines)".
   Do not "improve" anything in this commit. It is the safety net; it must match what currently
   works on the live site.
4. **Turn on Pages:** Settings → Pages → Source = Deploy from a branch → `main` / root. Wait for
   the build, open the new URL.
5. **Verify the deploy for real** (see the asset-case checklist below) — confirm sprites, the
   title background, and audio actually load on the new URL, not just that the page opens.
6. **Rebuild the harness and run the baseline soak** (150k frames / ~5 days; expect 0 throws,
   0 non-finite, 0 renderErrs, 0 stuck NPCs, and ranks/seats/desks in agreement). Extract command
   and harness details are in HANDOFF-2 §"THE TEST HARNESS". Save the harness files into the repo
   (e.g. a `/test` dir) so they persist — no more rebuilding from scratch each session.

**Milestone 0 is done when:** the new URL serves the game with all assets loading AND the baseline
soak is green AND that state is committed. Hand back to Kyle to confirm on the TV before proceeding.

---

## ONE-TIME AUTH (so you can push for him)

- **Local git works out of the box** — commit, branch, diff, revert freely.
- **Pushing to GitHub needs credentials wired once** (a GitHub token, or `gh` authenticated, or an
  SSH key) in this environment. That's a one-time human setup, not something to invent. Confirm the
  current recommended path at `docs.claude.com` / `support.claude.com` rather than guessing.
- Once authenticated: **a push to `main` IS a deploy** (Pages serves repo-root `index.html`, no
  build step). Commit → push → Pages rebuilds (~1–2 min) → Kyle hard-refreshes on the TV.

---

## THE PERMANENT WORKFLOW RULE (this is how we "don't wreck anything")

Because push-to-`main` = live-on-the-TV, the safety rule is:

> **Work on a branch. Edit → run the baseline soak → only merge/push to `main` when the soak is
> green.** Risky/structural work (anything touching the nav grid, seat model, saves, or NPC
> scheduler) never goes straight to `main`.

- One logical change per commit, with a message that says what and why.
- A bad change is one `git revert` away — that replaces "which indexNN.html was the good one".
- Default cadence for solo testing: push a green build to `main`, tell Kyle, he pulls it up on the
  Xbox and judges the feel. Ask Kyle whether he wants auto-push-when-green or staged-for-approval.

---

## ASSET-CASE CHECKLIST (the #1 silent-failure cause — PROJECT.md §9)

URLs and asset paths are **case-sensitive on Pages** even if your local FS isn't. A single wrong
letter = an asset that silently fails to load, no error. When copying assets into the new repo:

- Filenames on disk must **exactly** match the paths in `index.html` (e.g. `title_bg.png`, not
  `Title_bg.png`; lowercase sprite names with underscores).
- `ART_PATH='Art/sprites/'` and the `Music/` / `Sound/` paths are literal and case-exact.
- After deploy, **eyeball the live URL:** all 21 character sprites, `title_bg.png`, the soundtrack
  tracks, and the meltdown stings. A missing asset here looks like "the game but broken", not a crash.

---

## DO-NOT-TOUCH / GOTCHAS (agent-specific traps)

- **The 50% printer test flag is INTENTIONAL.** `meltdown(n)` (~ln 2097) has
  `Math.random()<0.50 // TEMP: 50% for testing (ship value is 0.07)`. Do **not** "helpfully" revert
  it to 0.07 — Kyle relies on the high rate to test the printer smash. Reverting to 7% is a
  pre-ship item **Kyle owns** (HANDOFF-3 Part D #1). Leave the flag and its comment as-is.
- **Desks are ground truth** (§5). If code and the nav grid disagree about a desk, rebuild the grid
  — don't patch around it. The seat/desk/rank agreement check is the single most important soak
  assertion; it disagreed since day one and kept resurfacing.
- **Anything with fixed coords must be scaled by `S`** (§2, world authored at 1240×760).
- **Saves are versioned** (`SAVE_VERSION`). Any schema change bumps it and old saves refuse to load
  — that's correct behavior, just expected. The `Store` object is the only code that touches
  `localStorage` and is the prepared Electron seam; keep that single-seam discipline.
- **Repo stays PUBLIC.** (§9.)
- **Dead code flagged for optional removal:** `plantGossip` / `spreadGossip` are defined but no
  longer called (replaced by the rumour rework, HANDOFF-3 Part B #5). Remove only if asked.

---

## DIVISION OF LABOR (important — don't over-claim "done")

- **Code owns "does it run correctly across many days":** throws, non-finite coords, stuck NPCs,
  seat/desk/rank agreement, clean save round-trips. The soak is your gate.
- **Kyle owns "does it look and feel right":** swing timing, sprite scale/position, whether the
  layout reads, whether it's fun. The harness **cannot** see these.
- **A green soak means NOT BROKEN, not GOOD.** Never treat a passing soak as design approval. Ship
  the structurally-sound build for Kyle to judge; the verdict is his.

---

## WHAT COMES AFTER THE RAILS (trajectory, not this session's work)

Once Milestone 0 is confirmed, the real project is the **floor system** (parking-lot bookend →
main simulated floor → executive floor). The agreed approach, from the design discussion:

- **Do NOT build three concurrently-simulated floors.** Follow TE2's actual model: **one active
  floor** fully simulated; other floors **suspended**. The elevator is a **handoff node**
  (despawn from current floor's active set, spawn at destination) — not traversable space. Off-floor
  rivals advance **logically, not physically** (state/bookkeeping resolved on the day boundary or a
  coarse tick, surfaced via the office feed), which preserves TP's autonomy without simulating
  unrendered physics. The 10:00 meeting is your "rollcall" that re-converges everyone daily.
- **Milestone 1 (its own brief, after Kyle signs off Milestone 0):** introduce a `floor` abstraction
  with the current office as floor 1 and a **trivial empty floor 2**. Prove the **elevator
  despawn/spawn handoff** and a **save round-trip across floors** survive a 150k soak. Author zero
  rooms into floor 2 until that scaffold is green. Frame first, rooms second.

A dedicated floor-abstraction spec (elevator handoff contract, off-floor rival resolver, per-floor
nav grid + save schema) will follow as HANDOFF-5 once the rails are up.

---

## FIRST-SESSION DEFINITION OF DONE

New `promotion-v3` repo, public, Pages live at a confirmed URL with all assets loading, baseline
build committed unchanged, harness committed and its baseline soak green, push access set up.
**Then stop and hand to Kyle.** No layout, no floors, no features until he confirms the rails hold.
