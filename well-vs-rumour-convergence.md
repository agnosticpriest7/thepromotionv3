# Well vs. spoken rumour — should they converge mechanically?

Written on the `well-vs-rumour-reconcile` branch, alongside the text/framing pass that made
"Poison the Well" read as the slow-built cousin of "Spread a rumour". **Nothing mechanical was
built here.** This is the option written down before the prank-assembly pipeline work commits to it.

## The three verbs today (same fiction, three rulesets)

| Verb | Trigger / home | Document | Delivery | Payoff |
|---|---|---|---|---|
| **Spread a rumour** (`spreadRumorAbout`) | talk menu → pick a **messenger**, then a **subject** | **spends** it (or 40% hearsay with none) | through a **messenger** — full carrier stack: loyalty backfire, feud ×1.3, personality ×(Socialite/Zealot/Paranoid), unknown-carrier, overhear | **immediate** stress hit |
| **Poison the Well** (`well` prank) | prank system → `planPrank` → `advancePrankStage` at the **target's** desk | **needs one, keeps it** (seed, not spend) | **direct** — you build it yourself, no messenger, stage by stage | **staged build → delayed** `triggerPrankResolve` |
| **Expose them as the office leak** (`expose` prank) | prank system, Socialite **expert** rung | (no leverage doc) | direct build | public reveal / humiliation |

`well` and `expose` are the Socialite ladder (`['well','expose','m_socialite']`); the spoken rumour
is available through **any** messenger, modified by that messenger's personality. So the same
fiction is split across two subsystems (talk-menu/social vs. prank build) with incompatible rules.

## The convergence question

> Should the spoken rumour become the **shallow entry point** of the Poison-the-Well pipeline —
> "float it in one breath" as stage 0, "build it over days" as the deeper stages of one act?

Conceptually clean, and the framing now sells it: float = shallow/immediate/cheap, build =
patient/durable. But three seams have to be reconciled, and two of them are load-bearing.

## What it would cost (the seams, hardest first)

1. **Delivery model — the big one.** The spoken rumour's whole texture is the **messenger + carrier
   stack** (loyalty, feud, personality ×, unknown-carrier, overhear) — the system we *just* built.
   The well has **no messenger**; you author it directly at the desk. A literal merge forces a
   choice: either the built version grows a messenger (and inherits the carrier stack), or the
   carrier stack becomes a property of the *shallow entry only*. The latter is almost certainly
   right — "float via someone else" vs. "build it yourself" is a real fictional distinction, not an
   accident — but it means the pipeline is **shared spine, divergent delivery**, not one merged verb.

2. **Document consumption.** Spoken **spends**; well **seeds and keeps**. That difference is now
   deliberate framing, so a unified pipeline must preserve it as a rule ("floating burns the dirt;
   building plants it"), not smooth it away. Cheap to state, but it's a real branch in the model.

3. **Payoff timing & ownership.** Spoken = immediate hit in the social code; well = staged →
   delayed resolve in the prank system (`prankBuild` state, saved; `triggerPrankResolve`). Converging
   means one **shared rumour core** both call into, and deciding who owns it. Touches the save schema
   (staged state persists; spoken is stateless) and splits/merges the test coverage
   (`t_rumor_carrier` + `t_rumor_supply` cover spoken; the prank path is separate).

4. **Personality gating.** `well` is the Socialite *signature* (the ladder makes it their thing);
   the spoken rumour is universal-with-modifiers. A pipeline has to say whether "build the rumour"
   stays Socialite-gated while "float the rumour" is open to anyone.

## Recommendation (decide at the pipeline branch, not now)

Model a **single "rumour about X, powered by a document" spine** with two depths:
- **shallow entry = the spoken rumour** — delivered *through a messenger* (keep the carrier stack
  here), immediate, **spends** the doc (or 40% hearsay);
- **deep build = Poison the Well** — *direct authorship*, no messenger, **keeps** the doc, staged,
  durable payoff.

They share the doc-strength model (`levTier`/power) and the fiction; they **stay different in
delivery and consumption by design**. So "convergence" is a **shared core + shared strength model**,
**not** a merge of the delivery mechanics — the carrier system stays spoken-only on purpose.

**Cost:** moderate. Extract a shared rumour core, route both verbs through it, formalize the
float-spends / build-keeps rule, reconcile payoff timing, extend the save schema for staged state,
unify tests. **Risk:** low if the carrier stack stays entry-only; **high** if someone tries to make
the built version inherit the messenger/carrier rules — that's where the design fights itself.

The framing pass in this branch is the cheap, correct first move and is independently shippable.
Hold the mechanical merge for the prank-assembly pipeline branch, and start it from this spine.
