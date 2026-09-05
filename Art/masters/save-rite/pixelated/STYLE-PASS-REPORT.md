# Batch 1 style pass — awaiting Kyle’s approval

No drawings were regenerated. Original masters and game assets are untouched. All eight processed copies are in this folder. Batch 2 has not started.

## Parameters and choice

62px figure height; Lanczos RGB downsampling; 1,024-colour maximum, RGB median-cut quantisation; no dithering. The PNGs are RGB, not indexed: Pillow’s indexed MEDIANCUT is limited to 256 colours, so the script implements median cut for the larger palette. Actual retained palettes contain 924–1,008 colours. Background is separately reserved exact #FF00FF.

A 20-colour palette cannot meet the requested comparison with the actual office atlas, which contains 873–1,400 RGB colours per figure. The saved sweep covers 56–72px and 768–1,280 colours; 62/1024 is the final intermediate tuning. It keeps every output inside the office colour-count range and within 7.6% of the office median pixel-size proxy. Higher resolutions produced smaller measured RGB runs; smaller palettes fell below the office colour-count range.

## Measurement definition and limits

Reference: all 21 front-facing neutral frames in Art/sprites/chars.png (40x64 cells, middle animation column). This is the actual existing atlas, not a screenshot or an upscaled reference sheet. Other later individual walk sets are outside this baseline.

Effective pixel size is defined here as the mean length of exact-RGB constant runs in both image axes, restricted to foreground, divided by figure height and multiplied by 1000. Formula: (2 × foreground pixel count / total horizontal-and-vertical foreground runs) × 1000 / figure height. Runs terminate at background or an RGB change. This measures stored block scale; it is sensitive to antialiasing and is NOT a semantic estimate of the artist’s brush size.

The method behind the supplied 7.62 / 6.39 figures was not supplied and the referenced pixelated/ directory was not present. These new values must not be presented as a reproduction of those numbers. The method is identical for office, original masters, and processed copies. Original measurements retain original RGB values, using the same spatial foreground mask as the processing pass.

Office pixel-size range: 17.275–18.034; median 17.637. The new check is ±15% of that measured median, with the cast range also reported. Figure colours are counted after identical nearest-neighbour sampling to 192px figure height; background is excluded. The new colour check requires membership in the observed office range 873–1,400. Neither check certifies visual style, face simplification, or proportions.

| Character | Pixel size before → after | Colours at 192h before → after | Pixel deviation vs office median | Holes | Margin | Components |
|---|---:|---:|---:|---:|---:|---:|
| 01_tyson_beck | 1.625 → 16.467 | 5192 → 991 | -6.63% | 0 | 8 | 1 |
| 02_anjali_raval | 1.683 → 16.457 | 4767 → 989 | -6.69% | 0 | 8 | 1 |
| 03_marguerite_dubois | 1.396 → 16.388 | 5772 → 996 | -7.08% | 0 | 8 | 1 |
| 04_danika_osei | 1.445 → 16.306 | 6400 → 996 | -7.55% | 0 | 8 | 1 |
| 21_garret_voss | 1.528 → 16.482 | 6314 → 1008 | -6.55% | 0 | 8 | 1 |
| 22_lorne_petrie | 1.566 → 17.037 | 5284 → 1000 | -3.40% | 0 | 8 | 1 |
| 23_merv_kastelic | 1.563 → 17.453 | 4923 → 981 | -1.04% | 0 | 8 | 1 |
| 24_sandrine_pike | 1.494 → 16.375 | 3955 → 924 | -7.16% | 0 | 8 | 1 |

## Background and repairs

Background removal uses a border-connected flood. The engine key condition supplies traversable background candidates; it is never applied as a global deletion mask. Enclosed key-coloured regions remain part of the figure until explicitly repaired. Danika’s 21 enclosed key pixels were filled region by region with the median RGB of surviving 8-neighbour ring pixels. If a median itself keys out, the nearest surviving ring colour is used.

Near-key surviving pixels are swept before and after resizing/quantisation. Their green channel is increased only as needed to make min(r−g,b−g) ≤ 52, giving at least 8 units of headroom. Thus the reported margin of 8 is deliberately enforced and then independently measured, not a fortunate quantisation outcome. Exact magenta stays outside the figure. The geometry mask is separately resized with nearest neighbour; palette operations never decide which interior pixels survive.

All eight PNGs were reopened for a separate key/flood/component/border/anchor verification. The script also checks originals against the previously saved selected attempt bytes. Check details are in verification.json.

## Anchors

Normalised now in processed copies: canvas 62×78; figure height 62; top row 8; baseline row 69; horizontal centre x=31; foot anchor (31,70), using the boundary immediately below the feet. Aspect ratio is preserved to nearest-pixel rounding. Animation should inherit this canonical alignment and apply intentional motion offsets. Originals keep their source geometry.

The 40×64 preview cells use 57px figure height and nearest-neighbour rendering, shown both at native size and enlarged 5×. These previews are not installed animation assets.

## Anatomical head proportions

Manually marked under-chin boundaries, including hair above the head and beard in the silhouette: **36.2–48.3%**, median **41.4%**. Intern: **47.4%**. Each boundary is uncertain by ±1 atlas pixel (roughly ±1.7–1.8 percentage points); the extremes with that uncertainty span about 34.5–50.0%. The cyan lines in office-chin-review.png make the annotations reviewable.

Replace the old universal 40% rule with this measured range and character-appropriate office comparisons. A strict universal range is still a screening aid, not a reason to reshape every character to its edge. Intern-like stumpiness belongs toward the upper end. This pass does not reshape Batch 1, whose smaller heads and face construction still need visual approval.

Record correction: the previous manifest labels Merv’s 30.3% as the automated width heuristic and 36.2% as the manually annotated result (under-chin y=535). The new brief reverses those labels. The office measurements here do not use either automated result.

| Office character | Head top y | Under-chin y | Figure height | Head ratio |
|---|---:|---:|---:|---:|
| intern | 5 | 32 | 57 | 47.4% |
| sterling | 4 | 26 | 57 | 38.6% |
| brenda | 5 | 28 | 57 | 40.4% |
| marla | 4 | 30 | 58 | 44.8% |
| peggy | 4 | 29 | 58 | 43.1% |
| marcus | 5 | 28 | 57 | 40.4% |
| priya | 4 | 25 | 57 | 36.8% |
| chad | 4 | 27 | 58 | 39.7% |
| dana | 5 | 28 | 57 | 40.4% |
| otis | 4 | 25 | 58 | 36.2% |
| wren | 5 | 30 | 56 | 44.6% |
| sana | 5 | 28 | 57 | 40.4% |
| gil | 5 | 28 | 57 | 40.4% |
| ramesh | 4 | 30 | 58 | 44.8% |
| vera | 4 | 29 | 58 | 43.1% |
| doug | 4 | 27 | 57 | 40.4% |
| ravinder | 4 | 28 | 58 | 41.4% |
| hank | 4 | 28 | 58 | 41.4% |
| zora | 4 | 28 | 57 | 42.1% |
| hire_blazer | 4 | 29 | 58 | 43.1% |
| dale | 4 | 32 | 58 | 48.3% |

## Kyle’s pending decisions

Review style-review.png and game-cells-5x.png. Approve or request adjustment to the processed style. Decide whether the four Front End bib aprons read correctly, or should use the explicitly plain fabric apron wording for subsequent work. They still show two straps and a broad bib pocket; pixelation has not redesigned those garments.

Tyson/Marguerite remain a priority visual comparison. The earlier similarity score 0.836 versus the office maximum 0.768 is a screening flag dominated partly by matching uniforms, not a regeneration instruction. No new identity certification is claimed. Batch 2 stays on hold until Kyle approves style and answers the apron question.