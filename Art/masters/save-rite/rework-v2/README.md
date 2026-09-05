# Batch 1 redraw to Kyle’s three new style references

Eight separate front-facing identity masters redrawn with the built-in image tool. No batch 2 characters or walk animations were generated. Previous versions and installed game assets are unchanged.

The new direction uses larger heads, shorter limbs, broad dark outlines, simple block eyes and compact bodies. The three supplied sheets are style references, not a request to copy their identities or generate animation sheets. Character names, ages, hairstyles, uniforms and Garret’s clipboard were carried forward. Aprons are described as fabric bib aprons over separate trousers.

- `cleaned-masters/`: eight full-size 1254×1254 PNG redraws, border-connected background made exact magenta and near-key pixels repaired using the previously authorised cleanup pass. Use these as the current full-size review masters.
- `game-size/`: eight aligned 62×78 PNGs, figure height 62, using the existing 62h/1024-colour median-cut pass without dithering. All eight checked: zero enclosed key pixels, one connected component, margin 8. Review copies, not installed animations.
- PNGs in this directory: untouched image-tool outputs retained for provenance. Anjali has 246 enclosed key pixels in that raw output; repaired versions are in both subfolders above.
- `review-sheet.png`: office Intern then eight new characters at equal figure height.
- `game-preview-native.png`: comparison in actual 40×64 cells.
- `prompts.json`: exact prompts, references and image-tool source paths.
- `measurements.json`: raw and processed checks; anatomical annotations are manual estimates with ±10 source pixels uncertainty.

Processed RGB-run pixel-size proxy: 16.429–17.922 versus the previous office baseline 17.275–18.034 (all within 15% of office median). Figure colours at common 192px height: 931–1,019 versus office 873–1,400. These are the same documented proxies as the previous style pass, not visual certification.

Approximate anatomical head ratios now span 41.7–49.4%, compared with 35.5–40.8% previously. Sandrine sits slightly above the measured office range, while Tyson and Merv sit toward its middle; this remains a visual review flag, not an automatic regeneration rule. The new references take precedence over an arbitrary universal head ratio.

Kyle’s approval of this style is still pending. Batch 2 remains on hold.


---

## STYLE APPROVED — 2026-09-04

Kyle, on seeing the batch 1 review sheet: *"I approve this style it is very close."*

So this is the reference direction for **batch 2 and for the walk strips**: larger heads,
shorter limbs, broad dark outlines, simple block eyes, compact bodies. The head-ratio
spread (41.7-49.4%, against the office's 35.5-40.8%) is a CONSEQUENCE of that direction and
is approved with it -- it is not a defect to regress toward the office range.

### One thing to settle before batch 2

**02 is filed as `anjali_raval`; the game builds `Priya Raval`.** Same surname, different
given name. `charIndexFor()` resolves a sprite BY NAME, so an asset filed under Anjali will
never attach to Priya -- she would fall through to the name-hash pool and keep wearing a
stock face. (She is doing exactly that today: the store's Priya resolves to `CAST['Priya']`
= 6, which is the OFFICE Priya's sprite.)

Either the game gets renamed to Anjali or the asset gets renamed to Priya -- but it has to
be decided before the walk strips are cut, because they inherit the filename.
