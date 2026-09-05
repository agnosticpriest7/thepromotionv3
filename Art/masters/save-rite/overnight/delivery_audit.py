from pathlib import Path
import json, shutil, hashlib
import numpy as np
from PIL import Image, ImageDraw
from animation import HERE, OUT, measure, keyed, flood_border, alternation, facing

def run():
    cast=json.loads((HERE/'cast-paths.json').read_text())
    manifest=json.loads((HERE/'animation-manifest.json').read_text())
    records={}; lines=['# Morning report — Save-Rite placeholder cast','','## Flags and integration limits','',
    'The generated artwork is a placeholder library. Literal failures are retained below rather than labelled approved. Game code and asset registrations were not changed. Read REVIEW-NOTES.md and ANIMATION-REQUIREMENTS.md alongside this report.','',
    '- The named baseline has manually measured head ratios 35.74–42.59%, not the brief’s 34–36%. New master failures against the literal target remain listed in MASTERS.md.',
    '- Exact figure colour counts are often below the reference range. Counts were not padded with artificial noise.',
    '- Anjali/Priya Raval naming differs between art and live CREW. Twelve live workers need break-chair poses; twelve other staff have unresolved seated requirements because they are absent from CREW. Shoppers need no seats.',
    '- Clipboard arm-swing and bald-character centroid exceptions remain visible. The two-band IoU test does not prove correct gait coordination; six of seven shipped profile sets fail it with the same measurement method.',
    '- Seated chair placement and all registrations require an actual game integration test by Claude Code.','',
    '## Asset audit','', '| Character | Walks | Seats | Key / components / anchors | Mirror differences | Other flags |','|---|---:|---:|---|---:|---|']
    expected_seats={2,3,4,5,6,8,12,16,20,21,22,23}
    detailed=['# Per-strip measured audit','','Every PNG is reopened independently. IoU deltas are flipped minus unflipped; positive passes. Width and colour limits are literal targets; width is strongly pose-dependent.','', '| Character / direction | Arms delta | Legs delta | Neutral W/H | Pixel range | Colour range at 192h | Facing |','|---|---:|---:|---:|---|---|---|']
    for name in sorted(cast):
        rec={'walks':{},'seats':{},'flags':[]}; technical=[]
        for d in ['down','up','left','right']:
            p=OUT/f'walk_{name}_{d}.png'
            if not p.exists():rec['flags'].append('missing '+d+' walk');continue
            ar=np.array(Image.open(p).convert('RGB'))
            if ar.shape!=(295,552,3):technical.append(d+' dimensions');continue
            frames=[measure(a,~flood_border(keyed(a))) for a in np.split(ar,3,axis=1)]
            alt=alternation(ar);face=facing(ar,name,d)
            for i,v in enumerate(frames):
                if v['holes'] or v['margin']<8 or v['components']!=1:technical.append(f'{d} frame{i} key/connectivity')
                if v['bbox'][1]!=16 or v['bbox'][3]!=278:technical.append(f'{d} frame{i} anchors')
            for band,v in alt.items():
                if not v['pass']:rec['flags'].append(d+' '+band+' IoU'+(' (clipboard exception)' if name.startswith('21') and band=='arms' else ''))
            if d in ['left','right'] and not face.get('pass',False):rec['flags'].append(d+' centroid inconclusive/failed')
            pixel=[x['effective_pixel_size_per_1000h'] for x in frames];colors=[x['colours_at_192h'] for x in frames]
            if not all(3.97*.85<=x<=3.97*1.15 for x in pixel):rec['flags'].append(d+' pixel density')
            if not all(7224<=x<=10389 for x in colors):rec['flags'].append(d+' colour count')
            if not .41<=frames[1]['width_height']<=.49:rec['flags'].append(d+' neutral W/H')
            source=manifest.get(f'walk_{name}_{d}',manifest.get(f'walk_{name}_left',{}))
            if any(x.get('detached_anatomy_warning') for x in source.get('normalization',[])):
                technical.append(d+' raw detached anatomy warning (cleanup is not evidence of anatomical continuity)')
            raw_path=Path(source.get('raw','missing'))
            if raw_path.is_file():
                raw=np.array(Image.open(raw_path).convert('RGB'));edge=np.concatenate([raw[0],raw[-1],raw[:,0],raw[:,-1]])
                if keyed(edge[None,...])[0].mean()<.95:technical.append(d+' source background is not keyed')
            rec['walks'][d]={'path':str(p),'frames':frames,'alternation':alt,'facing':face,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
            detailed.append(f"| {name} / {d} | {alt['arms']['delta']:+.6f} | {alt['legs']['delta']:+.6f} | {frames[1]['width_height']:.3f} | {min(pixel):.3f}–{max(pixel):.3f} | {min(colors)}–{max(colors)} | {face.get('status',face.get('pass'))} |")
        mirror=None
        if 'left' in rec['walks'] and 'right' in rec['walks']:
            left=np.array(Image.open(OUT/f'walk_{name}_left.png'));right=np.array(Image.open(OUT/f'walk_{name}_right.png'))
            expected=np.concatenate([a[:,::-1] for a in np.split(left,3,axis=1)],axis=1)
            mirror=int(np.any(expected!=right,axis=2).sum())
            if mirror:technical.append('right mirror')
        for d in ['down','up','left','right']:
            p=OUT/f'sit_{name}_{d}.png'
            if p.exists():
                a=np.array(Image.open(p).convert('RGB'));v=measure(a,~flood_border(keyed(a)));rec['seats'][d]={'path':str(p),'measurement':v}
                if v['holes'] or v['margin']<8 or v['components']!=1:technical.append('seat '+d+' key/connectivity')
                expected_h={'down':360,'up':323,'left':295,'right':295}[d]
                if a.shape!=(416,416,3) or v['bbox'][3]!=388 or v['bbox'][3]-v['bbox'][1]!=expected_h:technical.append('seat '+d+' dimensions/anchors')
                source=manifest.get(f'sit_{name}_{d}',manifest.get(f'sit_{name}_left',{}));raw_path=Path(source.get('raw','missing'))
                if raw_path.is_file():
                    raw=np.array(Image.open(raw_path).convert('RGB'));edge=np.concatenate([raw[0],raw[-1],raw[:,0],raw[:,-1]])
                    if keyed(edge[None,...])[0].mean()<.95:technical.append('seat '+d+' source background is not keyed')
            elif int(name[:2]) in expected_seats:rec['flags'].append('missing '+d+' seat')
        if 'left' in rec['seats'] and 'right' in rec['seats']:
            sl=np.array(Image.open(OUT/f'sit_{name}_left.png'));sr=np.array(Image.open(OUT/f'sit_{name}_right.png'))
            rec['seat_mirror_differing_pixels']=int(np.any(sl[:,::-1]!=sr,axis=2).sum())
            if rec['seat_mirror_differing_pixels']:technical.append('seat right mirror')
        if int(name[:2])<25 and int(name[:2]) not in expected_seats:rec['flags'].append('seated requirement unresolved')
        rec['technical_failures']=technical;rec['mirror_differing_pixels']=mirror;records[name]=rec
        lines.append(f"| {name} | {len(rec['walks'])}/4 | {len(rec['seats'])} | {'; '.join(technical) or 'pass for existing walks/seats'} | {mirror} | {'; '.join(rec['flags']) or 'none'} |")
    (HERE/'delivery-audit.json').write_text(json.dumps(records,indent=2))
    (HERE/'STRIP-AUDIT.md').write_text('\n'.join(detailed),encoding='utf-8')
    profile_fails=[]
    for name,rec in records.items():
        profile=rec['walks'].get('left',{})
        for band,v in profile.get('alternation',{}).items():
            if not v['pass']:profile_fails.append(f"{name} {band} {v['delta']:+.6f}"+(' (clipboard exception)' if name.startswith('21') and band=='arms' else ''))
    margin_values=[f['margin'] for rec in records.values() for w in rec['walks'].values() for f in w['frames']]+[s['measurement']['margin'] for rec in records.values() for s in rec['seats'].values()]
    summary=['## Completion and retained failures','',f"Selected files present: **{sum(len(r['walks']) for r in records.values())}/136 walk strips**, **{sum(len(r['seats']) for r in records.values())}/48 seated poses**. Technical failures: **{sum(len(r['technical_failures']) for r in records.values())}**. Minimum reopened key margin: **{min(margin_values) if margin_values else 'unavailable'}**.",'', 'Retained profile-band failures: '+('; '.join(profile_fails) or 'none among existing profiles')+'.','', 'Visual limitations remain even on numerical passes: some exaggerated stepping, imperfect leg-tone removal and uncertain near/far limb identity. See REVIEW-NOTES.md. Exact per-strip values are in STRIP-AUDIT.md; every per-frame metric is in delivery-audit.json.','']
    pos=lines.index('## Asset audit');lines[pos:pos]=summary
    lines+=['','## Masters and cast comparison','','See MASTERS.md for all 18 new master W/H, anatomical head ratios, pixel sizes, colours and flags. Both #25 lavender and #32 dusty rose have independently reopened margin **8**, no holes and one component. Deli and Bakery use flat neck-loop bib aprons with waist ties; they read as aprons rather than trouser-leg dungarees.','','![All 34 with five named baselines](all-34-v-five-baselines.png)','','## Similarity screening','','Closest master pairs: Sam Whitecalf / Gita Mahal **0.83869**; Aleks Petrov / Denise Fung **0.83110**; Tyson Beck / Marguerite Dubois **0.82808**. The five named baseline’s closest pair is Jax / Kyle **0.76381**. This is a review ranking, not certification or a regeneration trigger; uniforms dominate some comparisons. Complete rankings are in all34_pairs.json and current-five_pairs.json.','','## Format and handoff','','Walk PNGs: 552×295, three 184×295 cells, stride / neutral / opposite stride; idle index 1, cycle [0,1,2,1]. New normalized figures have top y16 and last content row y277. Right strips mirror each left frame without reversing frame order. Seated PNGs are person-only, 416×416; content bottom edge 388, heights down360/up323/side295. See ANIMATION-REQUIREMENTS.md for renderer scaling and per-character code evidence.','','Built-in image generation was used. Exact per-output prompts and references are in prompts/. Raw generations and retries are retained in animation-raw/ and masters-raw/. outputs.jsonl checkpoints each output. The approved Batch 1 Light and Batch 2 masters were preserved.']
    (HERE/'MORNING-REPORT.md').write_text('\n'.join(lines),encoding='utf-8')
    print(json.dumps({'characters':len(records),'walks':sum(len(x['walks']) for x in records.values()),'seats':sum(len(x['seats']) for x in records.values()),'technical_failures':sum(len(x['technical_failures']) for x in records.values())}))

if __name__=='__main__':run()
