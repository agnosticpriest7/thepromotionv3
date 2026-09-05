# Corrected baseline and Batch 2

Status: comparison and flagged review drafts. Batch 1 has not been regenerated or replaced. Batch 3 has not started. Kyle chooses between Batch 1 raw and light versions and reviews Batch 2.

## Reference lock

Only the middle neutral frame of these five files defines the current style: `Art/sprites/walk_jax_down.png`, `walk_karl_down.png`, `walk_kyle_down.png`, `walk_raelee_down.png`, and `walk_rod_down.png`. Each original strip is 552×295, divided into three 184×295 cells. No legacy atlas entries enter this baseline. Future briefs must name reference files; ambiguous descriptions need clarification.

## Measurement method

Pixel size: exact-RGB constant runs within foreground, both axes, mean run length / figure height ×1000. Same method as the previous audit. Colour counts are exact distinct RGB values after identical nearest-neighbour sampling to 192px figure height; native counts are also reported. These are stored-pixel metrics, not inferred artist brush sizes. No rounding of RGB channels or colour bucketing is performed. This explains why colour counts need not reproduce the supplied 1,209–2,981 estimate.

Foreground: border-connected flood of engine-key candidates, never a global deletion of every key-coloured pixel. Enclosed key pixels are retained as defects. Manual anatomical head boundary is the bottom of the chin/jaw silhouette, excluding the neck; hair top is included, including high buns. Baseline uncertainty ±2 source pixels. Yellow lines in head-grid.png show the chosen boundaries over numbered rows.

| Named middle frame | Pixel size | W/H | Under-chin y | Head ratio | Colours at 192h | Native colours |
|---|---:|---:|---:|---:|---:|---:|
| walk_jax_down.png | 4.009 | 0.44444 | 123 | 40.61% | 8102 | 13198 |
| walk_karl_down.png | 3.923 | 0.49049 | 128 | 42.59% | 10389 | 18055 |
| walk_kyle_down.png | 4.070 | 0.45038 | 128 | 42.37% | 7224 | 12312 |
| walk_raelee_down.png | 3.894 | 0.41445 | 110 | 35.74% | 8110 | 13906 |
| walk_rod_down.png | 3.991 | 0.47104 | 122 | 39.77% | 10026 | 16879 |

Pixel median 3.991; range 3.894–4.070. Colour range at common height: 7224–10389.

**Unresolved target contradiction:** manually measured head ratios span 35.74–42.59%, median40.61%. Four named references fail the requested34–36% check. Karl also slightly exceeds the literal0.49 width limit (0.49049). I have not moved chin lines to force the brief’s numbers. The literal new checks remain in the tables below, separately from the measured reference range. This is a reason to review the boundaries/target, not certify a match by assumption.

Jax has14 and Raelee17 enclosed key pixels under this spatial definition. Reference files were measured read-only and not repaired.

## Part A — original Batch 1

“Raw Batch1” means the original selected masters directly in save-rite/, which correspond to the figures quoted in the new brief. The separately approved rework-v2 is preserved and shown in the Batch2 comparison; its large-head direction is not silently substituted for these originals.

Light option: crop foreground; Lanczos resize to280px figure height; **no palette reduction and no dithering**; separately sampled silhouette; canonical256×312 canvas, top16 and baseline295, anchor(128,296). The same light treatment is used for Batch2. The previous62px/1024-colour pass is dropped for this branch. Border background is exactmagenta; enclosed key defects use surrounding median colour; surviving near-key rim green values are increased just enough to enforce margin≥8. PNGs are reopened and checked after saving.

| Character | W/H raw → light | Manual head | Pixel raw → light | Colours raw → light at192h | Geometry flags |
|---|---:|---:|---:|---:|---|
| 01_tyson_beck | 0.421 → 0.421 | 37.83% | 1.625 → 3.919 | 5192 → 5590 | head |
| 02_anjali_raval | 0.395 → 0.396 | 35.51% | 1.683 → 3.940 | 4767 → 5020 | width |
| 03_marguerite_dubois | 0.395 → 0.396 | 36.38% | 1.396 → 3.773 | 5772 → 6169 | width, head |
| 04_danika_osei | 0.430 → 0.432 | 40.59% | 1.445 → 3.760 | 6400 → 6252 | head |
| 21_garret_voss | 0.526 → 0.525 | 39.08% | 1.528 → 3.845 | 6314 → 6814 | width, head |
| 22_lorne_petrie | 0.521 → 0.521 | 39.19% | 1.566 → 3.906 | 5284 → 5421 | width, head |
| 23_merv_kastelic | 0.587 → 0.586 | 36.16% | 1.563 → 3.946 | 4923 → 5195 | width, head |
| 24_sandrine_pike | 0.386 → 0.386 | 40.84% | 1.494 → 3.880 | 3955 → 4117 | width, head |

The light option fixes pixel scale under this method and key/anchor defects; it does not reshape bodies or make every colour-count check pass. Original RGB-run readings are finer than the corrected baseline, so I cannot reproduce the claim that all raw masters already sit inside the pixel target. This metric is sensitive to fine colour variation; the side-by-side drawings remain the visual decision.

Batch1 anatomical annotations are carried from the original manual audit. Its Merv entry is36.16% manual;30.3% was the old automated heuristic. These labels were reversed in an earlier supplied brief.

## Part B — Grocery and Produce

Eight new characters generated with the built-in image tool, exact prompts and retry prompts saved in batch2/. Full-size generated PNGs are retained alongside cleaned-masters/ and light/. Corrections were attempted for Curtis, Bekah, Russ, Sam and Gita. Kept versions balance identity and measured geometry; a retry cap was not exhausted. The result is explicitly flagged review work, not an all-checks-passing batch.

| Character | W/H | Manual head | Pixel light | Colours at192h | Failed literal checks |
|---|---:|---:|---:|---:|---|
| 05_curtis_lam | 0.453 | 37.30% | 3.813 | 5483 | head_ratio, figure_colours |
| 06_bekah_thorne | 0.410 | 29.79% | 3.890 | 5072 | head_ratio, figure_colours |
| 07_ade_okonkwo | 0.473 | 34.25% | 3.718 | 5990 | figure_colours |
| 08_russ_pelletier | 0.474 | 42.30% | 3.719 | 7402 | head_ratio |
| 09_joon_ho_bae | 0.415 | 34.83% | 3.886 | 5314 | figure_colours |
| 10_sam_whitecalf | 0.420 | 32.64% | 3.857 | 5773 | head_ratio, figure_colours |
| 11_cheryl_novak | 0.453 | 36.13% | 3.762 | 7735 | head_ratio |
| 12_gita_mahal | 0.451 | 39.18% | 3.813 | 6006 | head_ratio, figure_colours |

Head annotations on generated images are uncertain by±8 source pixels (roughly0.7percentage points). Small boundary-edge failures such as Cheryl’s must not be represented as high-precision anatomical facts. Her hair is the broadest hairstyle, but her overall figure is not the widest in the batch: that brief requirement remains flagged.

Visual checks: no bib pockets; neck loops instead of overalls; separate trousers; Russ’s back brace centered; Bekah’s headphones centered; Cheryl earrings on both ears; Sam’s one-sided waist tie removed. Both arms/hands remain connected in the light copies. Each department has unique hair colour+silhouette combinations. Kyle still needs to decide whether the two visible sides of the neck loop read as a fabric apron in practice.

No similarity score is a certification or regeneration trigger. Uniforms can dominate silhouette/palette similarity. No new similarity threshold has been invented.

## Review images

- batch1-raw-and-light.png: current five / raw original Batch1 / light original Batch1, all equal figure height.
- ../batch2/cast-comparison.png: current five / Batch2 light / approved Batch1 rework-v2, all equal figure height.
- head-grid.png: reviewable current-cast anatomical boundaries.

**Pending:** Kyle chooses raw vs light Batch1, judges Batch2’s overall style/apron read, and resolves the head-target discrepancy using the annotated references. Batch3 stays on hold. Existing game code, naming and installed sprites have not been changed.

## Resampling regression caught and fixed

Independent reopening initially found 7 enclosed key pixels and 3 components in Russ after resize, despite the retained-mask check reporting zero holes. The light pipeline now re-floods the actual resized RGB output, repairs newly enclosed regions, removes detached generator flecks by retaining the largest 8-connected figure, and normalises the resulting crop. This was rerun and checked from saved PNGs. The checks are not based solely on the pre-resize mask.