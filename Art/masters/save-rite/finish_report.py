"""Build audit reports and labelled diagnostic views; selected master pixels stay unchanged."""
import json, csv, re, shutil
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from audit import ROOT, inspect, similarities, baseline

# Anatomical under-chin/neck boundary manually inspected on saved 3x coordinate grids.
NECK={'01_tyson_beck':555,'02_anjali_raval':543,'03_marguerite_dubois':505,'04_danika_osei':614,
      '21_garret_voss':507,'22_lorne_petrie':538,'23_merv_kastelic':535,'24_sandrine_pike':575}
SELECTED={'01':4,'02':2,'03':4,'04':3,'21':4,'22':4,'23':4,'24':3}
HAIR={'01':('dark brown','short buzzcut/fringe'),'02':('black','smooth centre-part low bun'),
 '03':('silver grey','short curls'),'04':('black','short twists'),
 '21':('sandy','thinning flat crown'),'22':('grey','full compact cap'),
 '23':('grey','bald top with side hair'),'24':('black','severe smooth pulled-back cap')}

baseline()
manifest=json.loads((ROOT/'manifest.json').read_text()); entries=[]
for name,r in manifest.items():
 im=Image.open(ROOT/r['filename']); fresh,mask=inspect(im); r.update(fresh)
 r['selected_attempt']=SELECTED[name[:2]]; r['retries']=4
 r['anatomical_neck_y']=NECK[name]; r['anatomical_neck_uncertainty_px']=4
 r['head_ratio_verified']=(NECK[name]-r['head_top'])/r['height']
 r['head_ratio_verified_interval']=[(NECK[name]-r['head_top']-4)/r['height'],(NECK[name]-r['head_top']+4)/r['height']]
 r['checks']['head_ratio_verified']=.35<=r['head_ratio_verified']<=.43
 r['checks']['one_component']=r['components']==1
 r['checks']['key_holes']=r['key_pixels']==0
 r['checks']['pure_magenta_border']=r['border_exact_magenta_fraction']==1
 r['checks']['within_office_front_width_height_range']=23/57<=r['width_height']<=37/57
 r['checks']['flat_3_tones_per_material']='fail: residual colour variation; see interior patch measurement'
 r['checks']['no_asymmetric_accessories']='visual pass; not pixel-perfect bilateral symmetry'
 r['checks']['arm_continuity_visual']='pass; both attached, Garret deliberately bent'
 r['checks']['pose']='Garret centred clipboard exception' if name.startswith('21') else 'front standing, arms down'
 r['hair_colour'],r['hair_silhouette']=HAIR[name[:2]]
 rgb=np.array(im.convert('RGB')); y=round(r['head_top']+r['height']*.64); x=(r['bbox'][0]+r['bbox'][2])//2
 # Off-centre opaque garment sample, avoiding tie/clipboard centre lines.
 x=x+int(r['width']*.12)
 patch=rgb[y:y+20,x:x+20]
 r['interior_patch']={'xywh':[x,y,20,20],'unique_rgb_colours':len(np.unique(patch.reshape(-1,3),axis=0))}
 r['status']='FLAGGED — retry cap reached; not production certified'
 entries.append((name,im,mask))
heights=np.array([r['height'] for r in manifest.values()]); median=float(np.median(heights))
for r in manifest.values():
 r['height_deviation_from_batch_median_percent']=round(100*(r['height']/median-1),3)
 r['checks']['height_within_5_percent_of_median']=abs(r['height']/median-1)<=.05
(ROOT/'manifest.json').write_text(json.dumps(manifest,indent=2))
pairs=similarities(entries,'batch1')
fields=['filename','selected_attempt','retries','width','height','head_top','baseline','head_ratio','head_ratio_verified','key_pixels','sealed_exact_magenta','margin','components','width_height','height_deviation_from_batch_median_percent','status']
with (ROOT/'manifest.csv').open('w',newline='') as f:
 w=csv.DictWriter(f,fields,extrasaction='ignore'); w.writeheader(); w.writerows(manifest.values())

# Preserve and measure all tool outputs, including the discarded transparent attempts.
log=json.loads((ROOT/'generation-log.json').read_text()); attempts=[]
for key,item in log.items():
 src=Path(re.search(r' as (C:\\[^\n]+?\.png) by default',item['source']).group(1))
 dest=ROOT/'attempts'/(key+'.png')
 if not dest.exists(): shutil.copyfile(src,dest)
 r,_=inspect(Image.open(dest)); r.update(attempt=key,filename=str(dest.relative_to(ROOT)))
 attempts.append(r)
(ROOT/'attempt-measurements.json').write_text(json.dumps(attempts,indent=2))

# Raw placement comparison: same canvas scale for every master; does not hide anchor differences.
font_path=Path('C:/Windows/Fonts/segoeui.ttf')
font=ImageFont.truetype(str(font_path),22) if font_path.exists() else ImageFont.load_default()
board=Image.new('RGB',(2008,1124),(235,232,221)); d=ImageDraw.Draw(board)
for i,(name,im,mask) in enumerate(entries):
 x=(i%4)*502; y=(i//4)*562
 board.paste(im.convert('RGB').resize((502,502),Image.Resampling.NEAREST),(x,y+60))
 d.text((x+12,y+5),name.replace('_',' '),font=font,fill=(20,20,20))
 r=manifest[name]; d.text((x+12,y+30),f"head {r['head_ratio_verified']*100:.1f}% | holes {r['key_pixels']} | FLAGGED",font=font,fill=(100,25,25))
board.save(ROOT/'batch1-contact-sheet.png')

office=json.loads((ROOT/'office_measurements.json').read_text()); front=[r for r in office if r['direction']=='down']
op=json.loads((ROOT/'office_pairs.json').read_text())
def summary(ps):
 vals=np.array([p['score'] for p in ps]); return {'min':float(vals.min()),'median':float(np.median(vals)),'max':float(vals.max())}
stats={'office':summary(op),'batch1':summary(pairs),'height_median':median,'height_range':[int(heights.min()),int(heights.max())],
 'height_span_percent_median':round(float(100*np.ptp(heights)/median),3),
 'head_top_range':[min(r['head_top'] for r in manifest.values()),max(r['head_top'] for r in manifest.values())],
 'baseline_range':[min(r['baseline'] for r in manifest.values()),max(r['baseline'] for r in manifest.values())]}
(ROOT/'batch1-summary.json').write_text(json.dumps(stats,indent=2))

lines=['# Save-Rite Batch 1 — review candidates',
 '**Eight masters generated and measured. All are flagged after four retries each; this is not a passing production batch. Batch 2 has not started.**',
 'The original game sprites and index.html were not changed. All selected files are1254×1254. Built-in image generation was used, one image per call (40 calls total). Generation prompts and original output paths are in generation-log.json; every attempt is preserved and measured.',
 '## Build finding',
 'The original atlas does not use one identical silhouette. In front neutral cells, Chad is29×58, Otis26×58, Doug37×57 pixels. Doug is27.6% wider than Chad; Otis is10.3% narrower. Across21 original slots, widths23–37, heights56–58. The evidence supports consistent height with varying build. These are alpha-bound silhouettes in40×64 cells, not stored seated-canvas dimensions. Width includes arms/hair; torso-band maxima independently reproduce29,26,37 for Chad/Otis/Doug. All four neutral facings per character are recorded in office_measurements.json.',
 '| Office character | Width | Height | Torso band max width |', '|---|---:|---:|---:|']
lines += [f"| {r['name']} | {r['width']} | {r['height']} | {r['torso_max_width']} |" for r in front]
lines += ['## Selected masters',
 '| File | Figure W×H | Head, verified | Key pixels | Exact sealed magenta | Margin | Components | Selected attempt / retries |',
 '|---|---:|---:|---:|---:|---:|---:|---:|']
for name,r in manifest.items():
 lines.append(f"| [{r['filename']}]({r['filename']}) | {r['width']}×{r['height']} | {100*r['head_ratio_verified']:.1f}% | {r['key_pixels']} | {r['sealed_exact_magenta']} | {r['margin']} | {r['components']} | {r['selected_attempt']} /4 |")
lines += ['## Remaining failures and limits',
 '- Every background remains off-magenta with pixel variation. Exactly0% of each border is pure #FF00FF. These backgrounds key out with the real loader, but fail the exact-background brief. No claim of exact flat colour or no anti-aliasing is made. The20×20 interior garment/clipboard samples and colour counts in manifest.json provide evidence of residual colour variation.',
 '- Danika has21 enclosed engine-key pixels near the right forearm/apron seam. They remain in the selected master. Seven others have0. Exact pure-magenta pocket count alone is insufficient: Danika’s unsafe pixels are off-magenta. All eight are one connected component and both arms are visually connected.',
 '- Margins are0 on the seven hole-free masters; Danika is−188. Margin0 survives the strict >60 rule but has no positive headroom. Exterior antialiased fringe is counted separately and is not misreported as clothing holes.',
 f"- Heights range{heights.min()}–{heights.max()}px, median{median:.1f}; span{stats['height_span_percent_median']:.2f}% of median. Head tops range{stats['head_top_range']}; baselines{stats['baseline_range']}. Anchor alignment is NOT solved. Raw placement is shown in the contact sheet, not silently normalized.",
 '- Anjali, Marguerite and Sandrine have whole-figure width/height below the narrowest front office silhouette (0.4035); measurements are in the manifest. They should not be described as fully matching the office build range.',
 '- Head ratios use a manually identified under-chin/neck boundary checked on3× nearest-neighbour coordinate grids, uncertainty±4px. The raw narrowest-row heuristic is retained separately. Merv is the clearest failure of the heuristic: it selects jaw level y488, whereas the anatomical boundary is y535, giving36.2% instead of30.3%. The audit script never alters image geometry to force a pass. Anjali is close enough to35% that the annotation uncertainty reaches the lower limit.',
 '- Garret’s centred two-hand clipboard is the explicit arms-down exception. No other pose exception was introduced. Bilateral accessory placement passes visual review; pixel-perfect symmetry is not claimed. Skin tone, age read, style match and identity distinctness still need Kyle’s judgement.',
 '## Hair identity check',
 '| Character | Hair colour | Hair silhouette |','|---|---|---|']
lines += [f"| {name.replace('_',' ')} | {r['hair_colour']} | {r['hair_silhouette']} |" for name,r in manifest.items()]
lines += ['No duplicate colour-plus-silhouette label within either department group. These labels were visually checked, not inferred from a histogram. They do not certify distinct faces.',
 '## Similarity screening',
 'Same metric for office and new masters: centre each cropped silhouette on a160×128 canvas, normalize height to128 while preserving aspect, compute silhouette IoU. Palette is an8×8×8 RGB histogram over foreground pixels, compared by histogram intersection. Combined score=(IoU+intersection)/2. Larger means more similar. No threshold triggers regeneration. Source resolution and shared uniform influence scores; this is a ranking, not an identity certificate.',
 f"Office210 pairs: min{stats['office']['min']:.3f}, median{stats['office']['median']:.3f}, max{stats['office']['max']:.3f}. Batch1’s28 pairs: min{stats['batch1']['min']:.3f}, median{stats['batch1']['median']:.3f}, max{stats['batch1']['max']:.3f}.",
 '| Batch 1 pair | Silhouette IoU | Palette intersection | Combined |','|---|---:|---:|---:|']
lines += [f"| {p['a']} / {p['b']} | {p['silhouette_iou']:.3f} | {p['palette_intersection']:.3f} | {p['score']:.3f} |" for p in pairs[:6]]
lines += ['| Office baseline pair | Silhouette IoU | Palette intersection | Combined |','|---|---:|---:|---:|']
lines += [f"| {p['a']} / {p['b']} | {p['silhouette_iou']:.3f} | {p['palette_intersection']:.3f} | {p['score']:.3f} |" for p in op[:6]]
lines += ['Full matrices: [Batch1](batch1_similarity.csv), [office](office_similarity.csv). Per-pair component scores: batch1_pairs.json and office_pairs.json.',
 '## Audit method',
 'No global colour-key deletion is used to prepare a sprite. Audit separates border-connected background from enclosed candidate pixels: exact-magenta border flood first; for these off-magenta outputs, corner-seeded colour-region growth with L1 tolerance45; then a separate border flood of engine-key candidates identifies exterior fringe. Enclosed engine-key pixels remain foreground and are counted. Component labelling uses8-connectivity; border floods use4-connectivity. Generated masters are copied byte-for-byte from tool outputs; there is no hidden recolouring or repair in the audit script.',
 'Transparent rejected attempts use border-connected alpha<128 for visible-shape diagnostics and are explicitly marked nonconforming. Office atlas metrics use original alpha. Near-key arithmetic uses signed integers, with margin=60−max(min(R−G,B−G)).',
 '## Review image', '![Batch1 raw-placement comparison](batch1-contact-sheet.png)',
 'Open each original PNG for source-resolution review; coordinate-grid neck crops are in references/. The contact sheet is for comparison, not fine-pixel certification.',
 '## Reproduce',
 'Run audit.py baseline for office records; audit.py checkpoint FILE RETRIES for a candidate; finish_report.py to rebuild full diagnostics. Python dependencies: Pillow and NumPy. No game code or original sprites are edited.']
formatted=lines[0]
for previous,current in zip(lines,lines[1:]):
 formatted+=('\n' if previous.startswith('|') and current.startswith('|') else '\n\n')+current
(ROOT/'BATCH1-REPORT.md').write_text(formatted,encoding='utf-8')
print(json.dumps({'stats':stats,'closest_batch1':pairs[:6],'manifest':[{k:r[k] for k in ['filename','height','head_ratio_verified','key_pixels','margin','components','interior_patch']} for r in manifest.values()]},indent=2))
