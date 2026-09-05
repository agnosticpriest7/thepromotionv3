from pathlib import Path
import sys,json,csv,hashlib
import numpy as np
from PIL import Image,ImageDraw
HERE=Path(__file__).resolve().parent;ROOT=HERE.parent;sys.path.insert(0,str(ROOT))
from corrected_baseline import references,sheet,measure
from audit import flood_border,component_sizes
from style_pass import keyed
base=json.loads((HERE/'baseline.json').read_text());a=json.loads((HERE/'batch1.json').read_text());b=json.loads((ROOT/'batch2'/'measurements.json').read_text())
median=float(np.median([r['effective_pixel_size_per_1000h'] for r in base]));clo=min(r['colours_at_192h'] for r in base);chi=max(r['colours_at_192h'] for r in base)
blank=[('',np.zeros((1,1,3),dtype='uint8'),np.ones((1,1),bool))]*3
def entries(folder,prefix):
    result=[]
    for p in sorted(folder.glob('[0-9][0-9]_*.png')):
        if '-attempt' in p.stem:continue
        ar=np.array(Image.open(p).convert('RGB'));m=~flood_border(keyed(ar));result.append((prefix+p.stem,ar,m))
    return result
raw=entries(ROOT,'raw ');light=entries(HERE/'batch1-light','light ');approved=entries(ROOT/'rework-v2'/'cleaned-masters','approved ');batch2=entries(ROOT/'batch2'/'light','B2 ')
sheet(references()+blank+raw+light,HERE/'batch1-raw-and-light.png')
sheet(references()+blank+batch2+approved,ROOT/'batch2'/'cast-comparison.png')
sheet(references()+blank+raw,HERE/'batch1-raw-v-current.png');sheet(references()+blank+light,HERE/'batch1-light-v-current.png')
# Independent saved-file verification, including anchors and enclosed key region counts.
ver=[]
for folder in [HERE/'batch1-light',ROOT/'batch2'/'light']:
    for p in sorted(folder.glob('*.png')):
        ar=np.array(Image.open(p).convert('RGB'));m=~flood_border(keyed(ar));r=measure(ar,m);r['file']=str(p.relative_to(ROOT));r['enclosed_key_regions']=len(component_sizes(keyed(ar)&m));r['border_exact']=bool(np.all(np.concatenate([ar[0],ar[-1],ar[:,0],ar[:,-1]])==[255,0,255]));ver.append(r)
(HERE/'verification.json').write_text(json.dumps(ver,indent=2))
lines=['# Corrected baseline and Batch 2','',
'Status: comparison and flagged review drafts. Batch 1 has not been regenerated or replaced. Batch 3 has not started. Kyle chooses between Batch 1 raw and light versions and reviews Batch 2.','',
'## Reference lock','',
'Only the middle neutral frame of these five files defines the current style: `Art/sprites/walk_jax_down.png`, `walk_karl_down.png`, `walk_kyle_down.png`, `walk_raelee_down.png`, and `walk_rod_down.png`. Each original strip is 552×295, divided into three 184×295 cells. No legacy atlas entries enter this baseline. Future briefs must name reference files; ambiguous descriptions need clarification.',
'',
'## Measurement method','',
'Pixel size: exact-RGB constant runs within foreground, both axes, mean run length / figure height ×1000. Same method as the previous audit. Colour counts are exact distinct RGB values after identical nearest-neighbour sampling to 192px figure height; native counts are also reported. These are stored-pixel metrics, not inferred artist brush sizes. No rounding of RGB channels or colour bucketing is performed. This explains why colour counts need not reproduce the supplied 1,209–2,981 estimate.',
'',
'Foreground: border-connected flood of engine-key candidates, never a global deletion of every key-coloured pixel. Enclosed key pixels are retained as defects. Manual anatomical head boundary is the bottom of the chin/jaw silhouette, excluding the neck; hair top is included, including high buns. Baseline uncertainty ±2 source pixels. Yellow lines in head-grid.png show the chosen boundaries over numbered rows.',
'',
'| Named middle frame | Pixel size | W/H | Under-chin y | Head ratio | Colours at 192h | Native colours |',
'|---|---:|---:|---:|---:|---:|---:|']
for r in base:lines.append(f"| {r['file']} | {r['effective_pixel_size_per_1000h']:.3f} | {r['width_height']:.5f} | {r['under_chin_y']} | {r['head_ratio']*100:.2f}% | {r['colours_at_192h']} | {r['native_colours']} |")
lines+=['',f'Pixel median {median:.3f}; range {min(r["effective_pixel_size_per_1000h"] for r in base):.3f}–{max(r["effective_pixel_size_per_1000h"] for r in base):.3f}. Colour range at common height: {clo}–{chi}.',
'',
'**Unresolved target contradiction:** manually measured head ratios span 35.74–42.59%, median40.61%. Four named references fail the requested34–36% check. Karl also slightly exceeds the literal0.49 width limit (0.49049). I have not moved chin lines to force the brief’s numbers. The literal new checks remain in the tables below, separately from the measured reference range. This is a reason to review the boundaries/target, not certify a match by assumption.',
'',
'Jax has14 and Raelee17 enclosed key pixels under this spatial definition. Reference files were measured read-only and not repaired.','',
'## Part A — original Batch 1','',
'“Raw Batch1” means the original selected masters directly in save-rite/, which correspond to the figures quoted in the new brief. The separately approved rework-v2 is preserved and shown in the Batch2 comparison; its large-head direction is not silently substituted for these originals.',
'',
'Light option: crop foreground; Lanczos resize to280px figure height; **no palette reduction and no dithering**; separately sampled silhouette; canonical256×312 canvas, top16 and baseline295, anchor(128,296). The same light treatment is used for Batch2. The previous62px/1024-colour pass is dropped for this branch. Border background is exactmagenta; enclosed key defects use surrounding median colour; surviving near-key rim green values are increased just enough to enforce margin≥8. PNGs are reopened and checked after saving.',
'',
'| Character | W/H raw → light | Manual head | Pixel raw → light | Colours raw → light at192h | Geometry flags |',
'|---|---:|---:|---:|---:|---|']
for r in a:
    flags=[]
    if not .41<=r['width_height']<=.49:flags.append('width')
    if not .34<=r['head_ratio']<=.36:flags.append('head')
    l=r['light'];lines.append(f"| {r['name']} | {r['width_height']:.3f} → {l['width_height']:.3f} | {r['head_ratio']*100:.2f}% | {r['effective_pixel_size_per_1000h']:.3f} → {l['effective_pixel_size_per_1000h']:.3f} | {r['colours_at_192h']} → {l['colours_at_192h']} | {', '.join(flags) or 'none'} |")
lines+=['',
'The light option fixes pixel scale under this method and key/anchor defects; it does not reshape bodies or make every colour-count check pass. Original RGB-run readings are finer than the corrected baseline, so I cannot reproduce the claim that all raw masters already sit inside the pixel target. This metric is sensitive to fine colour variation; the side-by-side drawings remain the visual decision.',
'',
'Batch1 anatomical annotations are carried from the original manual audit. Its Merv entry is36.16% manual;30.3% was the old automated heuristic. These labels were reversed in an earlier supplied brief.','',
'## Part B — Grocery and Produce','',
'Eight new characters generated with the built-in image tool, exact prompts and retry prompts saved in batch2/. Full-size generated PNGs are retained alongside cleaned-masters/ and light/. Corrections were attempted for Curtis, Bekah, Russ, Sam and Gita. Kept versions balance identity and measured geometry; a retry cap was not exhausted. The result is explicitly flagged review work, not an all-checks-passing batch.',
'',
'| Character | W/H | Manual head | Pixel light | Colours at192h | Failed literal checks |',
'|---|---:|---:|---:|---:|---|']
for r in b:
    l=r['light'];fail=[k for k,v in r['checks'].items() if not v];lines.append(f"| {r['name']} | {r['width_height']:.3f} | {r['head_ratio']*100:.2f}% | {l['effective_pixel_size_per_1000h']:.3f} | {l['colours_at_192h']} | {', '.join(fail) or 'none'} |")
lines+=['',
'Head annotations on generated images are uncertain by±8 source pixels (roughly0.7percentage points). Small boundary-edge failures such as Cheryl’s must not be represented as high-precision anatomical facts. Her hair is the broadest hairstyle, but her overall figure is not the widest in the batch: that brief requirement remains flagged.',
'',
'Visual checks: no bib pockets; neck loops instead of overalls; separate trousers; Russ’s back brace centered; Bekah’s headphones centered; Cheryl earrings on both ears; Sam’s one-sided waist tie removed. Both arms/hands remain connected in the light copies. Each department has unique hair colour+silhouette combinations. Kyle still needs to decide whether the two visible sides of the neck loop read as a fabric apron in practice.',
'',
'No similarity score is a certification or regeneration trigger. Uniforms can dominate silhouette/palette similarity. No new similarity threshold has been invented.','',
'## Review images','',
'- batch1-raw-and-light.png: current five / raw original Batch1 / light original Batch1, all equal figure height.',
'- ../batch2/cast-comparison.png: current five / Batch2 light / approved Batch1 rework-v2, all equal figure height.',
'- head-grid.png: reviewable current-cast anatomical boundaries.',
'',
'**Pending:** Kyle chooses raw vs light Batch1, judges Batch2’s overall style/apron read, and resolves the head-target discrepancy using the annotated references. Batch3 stays on hold. Existing game code, naming and installed sprites have not been changed.']
lines+=['','## Resampling regression caught and fixed','',
'Independent reopening initially found 7 enclosed key pixels and 3 components in Russ after resize, despite the retained-mask check reporting zero holes. The light pipeline now re-floods the actual resized RGB output, repairs newly enclosed regions, removes detached generator flecks by retaining the largest 8-connected figure, and normalises the resulting crop. This was rerun and checked from saved PNGs. The checks are not based solely on the pre-resize mask.']
(HERE/'REPORT.md').write_text('\n'.join(lines),encoding='utf-8')
# Flat tables for Claude Code.
for name,rows in [('baseline',base),('batch1',a),('batch2',b)]:
    with (HERE/(name+'-summary.csv')).open('w',newline='') as f:
        w=csv.writer(f);w.writerow(['name','width_height','head_ratio','pixel_size','colours_at192h'])
        for r in rows:w.writerow([r.get('name',r.get('file')),r['width_height'],r['head_ratio'],r['effective_pixel_size_per_1000h'],r['colours_at_192h']])
print(json.dumps({'verification':[{k:r[k] for k in ['file','margin','holes','components','height']} for r in ver],'batch2_flags':[{ 'name':r['name'],'width':r['width_height'],'head':r['head_ratio'],'failed':[k for k,v in r['checks'].items() if not v]} for r in b]},indent=2))
