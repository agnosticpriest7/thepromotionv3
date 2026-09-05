# Codex brief — Save-Rite master character references

Generate **34 character reference images**, one per character, all facing the viewer in a neutral
standing pose. These are identity masters: every walk strip, seated pose and facing gets built
from them later, so whatever is in these images is what the whole cast inherits.

---

## How to run this — read before starting

You generate images by calling the image tool; you can also run code, read files and measure
output. **Use all of that in a closed loop.** Do not generate 34 images and hand them over.

**Per character: generate → measure → regenerate on failure → move on.** The checks at the end
are arithmetic, not judgement — write them once as a script and run every image through it. A
character isn't done until it passes.

**Cap retries at 4 per character.** If one still fails, keep the best attempt, record which check
it failed and by how much, and continue. A stalled batch is worse than one flagged character.

**Checkpoint to disk after every character.** Write the file and append to the manifest as you
go, so an interrupted run resumes rather than restarts. Long unattended runs have been reported
to stall; losing one character to that is fine, losing thirty-three is not.

**Use high reasoning effort for the measurement and diagnosis**, where the work is deciding *why*
an image failed and what to change. Generation itself doesn't need it.

**Don't ask Kyle anything until a full batch is measured and passing.** He judges the thing no
check can measure — whether the characters read as distinct people at TV distance.

---

## Output

- `art/masters/save-rite/NN_name.png` — e.g. `01_tyson_beck.png`, `25_shopper_elderly_woman.png`
- Numbering follows this document.
- **1024px minimum on the long edge.** Downscaling is safe, upscaling isn't.
- Report the manifest when done: filename, dimensions, each check's result, and how many retries
  the character took. **High retry counts are useful signal** — they say which descriptions are
  hard to draw.

---

## Shared rules — apply to all 34

**Pose.** A single figure, standing still, facing the viewer. Feet flat and level side by side,
both arms hanging straight down. Neutral — not walking, not posed, not gesturing.

**Background.** Flat pure magenta `#FF00FF`, nothing else in the image. No gradient, no shadow,
no glow.

**Arms.** Each arm is one continuous connected shape: shoulder → sleeve → cuff → bare forearm →
hand. **No gap of background anywhere along it.** A hand floating away from a sleeve is the single
most common failure here — check for it explicitly.

**Style.** Chunky blocky pixel art, hard 1px black outline, flat cel shading, no gradients or
dithering. Stumpy cartoon build. **Head including hair is about 40% of total height**, as wide as
the shoulders. Short limbs, short torso. Hair close to the skull — a haircut, not a cloud. Simple
face: slab eyes, tiny nose, small mouth line.

**One shared body template.** All 34 use the same proportions, stance and limb length. This
matches the office cast, where 21 characters share one template and all variation is carried by
hair, skin tone, age, posture, palette and small accessories. **Do not vary the build.**

**No text or logos anywhere.**

**⚠️ No asymmetric details.** Nothing on one shoulder, one breast, or in one hand. Side-facing
strips get mirrored later, so anything one-sided flips. Where a character needs an accessory,
it must be centred or on both sides. This is already reflected in the descriptions below —
preserve it.

**Colour.** No hot pink, coral, salmon, fuchsia or magenta on any character. The engine keys out
`r−g > 60 AND b−g > 60`, so the danger is anything drifting toward fuchsia — bright red is fine because blue−green stays negative. Purple is the tightest colour in the set; watch characters 1 and 32.

---

## The uniform — staff only (1–24)

One cut, six colour treatments:

> Short-sleeved white polo shirt, a **bib apron** over it reaching to mid-thigh, dark charcoal
> trousers, plain dark brown shoes.

| Department | Apron |
|---|---|
| Front End (1–4) | slate blue |
| Grocery (5–8) | charcoal grey |
| Produce (9–12) | forest green |
| Deli (13–16) | white, with a navy trim band across the bib |
| Bakery (17–20) | cream, flour-dusted |
| Management (21–24) | **no apron** — button shirt and tie instead of the polo |

Deli's navy trim exists because the classic butcher red-and-white stripe is the one uniform that
would collide with the colour key.

---

# The 34

## Front End — slate blue apron

**01 Tyson Beck** — bagger. 19, lanky, pale, dark hair buzzed short with a grown-out fringe. Slouched. Bored, heavy-lidded.

**02 Anjali Raval** — cashier. Mid-thirties, brown skin, black hair in a low practical bun. Compact, upright. Calm, unbothered.

**03 Marguerite Dubois** — cashier. Sixties, fair, short curled silver-grey hair, reading glasses. Warm, alert, faintly amused.

**04 Danika Osei** — Front End Manager. Late twenties, dark brown skin, black hair in short twists. Upright and braced, watchful. **Navy tie under the apron** — the only Front End staffer with one.

## Grocery — charcoal apron

**05 Curtis Lam** — stocker. Forties, East Asian, black hair greying at the temples, heavy shoulders. Exhausted: drooping eyes, slack posture.

**06 Bekah Thorne** — stocker. Twenties, pale, dark red hair cut blunt at the jaw, headphones around the neck. Closed-off, flat.

**07 Ade Okonkwo** — stocker. Early twenties, dark brown skin, close-cropped hair. Upright, eager, wide-eyed.

**08 Russ Pelletier** — Grocery Manager. Fifties, heavyset, ruddy, thinning grey hair, thick moustache. **Back brace over the apron — a wide belt across the middle, centred.** Immovable.

## Produce — forest green apron

**09 Joon-ho Bae**. Thirties, Korean, black hair neatly parted, wire-rimmed glasses. Precise, tidy, upright.

**10 Sam Whitecalf**. Forties, Indigenous, long black hair tied back. Quiet, steady, unhurried.

**11 Cheryl Novak**. Fifties, fair, big permed blonde-grey hair, **hoop earrings on both ears**. Mid-sentence, mouth slightly open.

**12 Gita Mahal** — Produce Manager. Forties, South Asian, black hair in a tight bun with grey at the front. Arms straight, chin up. Proprietary, assessing.

## Deli — white apron, navy trim

**13 Vince Carboni**. Fifties, Mediterranean, thick greying black hair, heavy brows, broad. Loud, open.

**14 Aleks Petrov**. Early twenties, Eastern European, pale, sandy hair, thin. Nervous: hunched shoulders, wary eyes.

**15 Denise Fung**. Forties, Chinese, black hair in a severe short cut. Arms rigid. Genuinely frightening flat stare.

**16 Bruno Sarr** — Deli Manager. Thirties, West African, dark brown skin, close-shaved head, neat goatee. Immaculate, rigid. **Wears a hairnet.**

## Bakery — cream apron, flour-dusted

**17 Elaine Kovacs**. Fifties, Eastern European, fair, greying brown hair pinned under a white cap. Deeply tired, dark under the eyes.

**18 Manny Reyes**. Thirties, Filipino, black hair with a faded undercut. Slim, faraway, artistic. **Heaviest flour on the apron.**

**19 Tova Lindqvist**. Early twenties, Scandinavian, very pale, white-blonde hair in **two short braids, one each side**. Cheerful, open, covered in flour.

**20 Doreen Stapp** — Bakery Manager. Sixties, fair, tight grey curls, small round glasses. Small and round. A sweet smile that doesn't reach the eyes.

## Management — no apron

**21 Garret Voss** — Assistant Manager. Forties, ruddy, thinning sandy hair combed flat, soft build. Short-sleeved pale blue button shirt, navy tie, brown belt, charcoal trousers, brown shoes. Anxious, eager to please. **Both hands hold a clipboard flat against the chest, centred.**

**22 Lorne Petrie** — Store Manager. Fifties, tanned, full head of grey hair, thick grey-brown moustache, comfortable build. Long-sleeved white shirt **with sleeves rolled to the elbow**, dark green tie, charcoal trousers, brown shoes. Big open friendly grin.

**23 Merv Kastelic** — Owner. Sixties, heavyset, ruddy, bald on top with grey at the sides, heavy grey brows. White short-sleeved shirt stretched over the belly, **navy tie tucked into the waistband**, dark brown trousers, black shoes. Flat, appraising, unimpressed — a man counting something.

**24 Sandrine Pike** — head office. Forties, olive skin, black hair pulled back severely, thin rectangular glasses. **Conspicuously not store staff:** charcoal blazer over a white blouse, charcoal trousers, black shoes. Neutral, unreadable. **No bag** — it would be asymmetric.

## Shoppers — no uniform of any kind

**25** Woman, seventies, small and stooped, short curled white hair, glasses. Lavender cardigan over a cream blouse, charcoal skirt.

**26** Man, forties, heavyset, balding with dark sides, short beard. Olive green work jacket over a grey tee, charcoal trousers.

**27** Woman, thirties, tall and slim, dark brown skin, black hair in a high bun. Mustard yellow jumper, charcoal trousers.

**28** Teenage boy, lanky, pale, messy dark hair over the eyes. Oversized navy hoodie, charcoal trousers. **Headphones on the head, over both ears.**

**29** Man, fifties, tanned, close-cropped grey hair. **Dark amber** hi-vis vest over a navy work shirt, charcoal trousers, heavy boots. Deep amber or ochre — **not bright yellow-green.**

**30** Woman, forties, medium build, olive skin, shoulder-length brown hair. Teal blouse, charcoal trousers.

**31** Man, twenties, slim, light brown skin, short black hair, neat beard. Plain white tee, charcoal trousers.

**32** Woman, sixties, sturdy, fair, short grey bob, **glasses on a chain hanging down both sides of the neck**. Dusty rose cardigan, charcoal skirt.

**33** Man, thirties, average build, red hair and a full ginger beard, freckled. Dark green flannel over a plain tee, charcoal trousers.

**34** Woman, twenties, petite, East Asian, straight black hair to the shoulders. Pale blue denim jacket, charcoal trousers.

---

# Verify before presenting

Measure each image. **Regenerate anything that fails** rather than passing it on.

| Check | Pass condition | How |
|---|---|---|
| **Key holes** | 0 | flood-fill the background from the border, then count figure pixels satisfying `r−g > 60 AND b−g > 60`. **Never use a colour threshold to find the background** — it erases garments near the key |
| **Sealed pockets** | 0 | enclosed magenta *inside* the outline that flood-fill can't reach. Fill with a sampled neutral, then sweep for the anti-aliased rim |
| **Near-key margin** | report it | the smallest value of min(r−g, b−g) among figure pixels — the rule fires at 60. Below ~100 is worth flagging |
| **Arm continuity** | each figure is 1 connected component | label the figure mask; a floating hand shows as a second component |
| **Head ratio** | 35–43%, target 40% | narrowest row between 15% and 50% of height is the neck |
| **Cross-character consistency** | heights within a few % across a batch | compare figure height, head top and baseline across all characters in the batch |
| **Asymmetry** | none | flag anything visibly one-sided; it will flip when strips are mirrored |
| **Distinctness** | no two alike | compare palette and silhouette pairwise within each department |

## ⚠️ Aesthetic convergence — the failure most likely to happen here

Image models drift toward a house look across a long batch. Early reports of this model note
visual outputs converging on a similar aesthetic, and it is **exactly the failure mode Kyle is
worried about**: 34 characters that are technically correct and all look like the same person in
different clothes.

The office cast is the proof it can be avoided — 21 characters on one body template that read as
21 distinct people. Study those files before you start.

**Treat distinctness as a measured constraint, not a hope:**

- After each batch, compute a **pairwise similarity matrix** across the batch — palette histogram
  and silhouette. Report the closest pairs with their scores.
- **Any pair above your similarity threshold gets one of them regenerated**, with the specific
  difference pushed harder: different hair colour, different hair silhouette, different posture,
  different age read.
- Hair is the highest-leverage variable on a fixed body template. **No two characters within a
  department should share a hair colour and a hair silhouette.**
- Posture is the second: the descriptions specify slouched, rigid, sagging, chin-up. Draw those
  differences large enough to survive downscaling.

**Report the similarity matrix with each batch.** If everything scores close, say so plainly
rather than shipping a uniform cast.

---

**Present in four batches** so Kyle can judge distinctness side by side, which is the thing that
can't be measured:

1. **Front End + Management** (01–04, 21–24)
2. **Grocery + Produce** (05–12)
3. **Deli + Bakery** (13–20)
4. **Shoppers** (25–34)

The office cast achieves distinction on one body template through hair, palette and posture
alone. If two characters read as the same person, fix that layer — not the build.

---

# Next brief, for context — do not start it

Once Kyle approves all 34, the second brief covers **animation and recolours**: walk strips in
four facings, seated poses, and the department apron recolours.

**One thing to know now, because it will shape how you work then:** generating a side-facing walk
from a front-facing reference has failed four times in this project. The failure is always
identical — **in profile a viewer cannot tell a left leg from a right one**, so "left foot forward,
right foot forward" is undrawable and the same contact pose gets drawn twice. The walk reads as a
limp.

The fix that works: draw the two legs in **different tones**, near leg light and far leg dark, as
a property of the leg rather than of its position. Then strip the tone difference afterwards.

Nothing in these masters needs to account for that — but don't design around a front reference in
a way that makes it harder.
