"""Publish selected art only; never edit game code or remove source attempts."""
from pathlib import Path
import json, shutil, hashlib
from animation import HERE, OUT

def run():
    art=HERE.parents[2]
    dest=art/'sprites'/'save-rite'
    dest.mkdir(parents=True,exist_ok=True)
    cast=json.loads((HERE/'cast-paths.json').read_text())
    audit=json.loads((HERE/'delivery-audit.json').read_text())
    seated={2,3,4,5,6,8,12,16,20,21,22,23}
    rows=[]; count=0
    for name,master in sorted(cast.items()):
        n=int(name[:2]); row={'id':n,'art_name':name,'master':str(Path(master).relative_to(art)).replace('\\','/'),'walks':{},'seats':{},'flags':audit[name]['flags'],'technical_failures':audit[name]['technical_failures']}
        row['seated_requirement']='live CREW eligible for rotating break chairs' if n in seated else ('customer; excluded from worker seating' if n>=25 else 'unresolved: absent from live CREW; walk-only supplied')
        if n==2:row['integration_note']='Art calls this character Anjali Raval; live CREW calls the intended slot Priya Raval. Resolve mapping explicitly.'
        for kind,key in [('walk','walks'),('sit','seats')]:
            for d in ['down','up','left','right']:
                src=OUT/f'{kind}_{name}_{d}.png'
                if not src.exists():continue
                target=dest/src.name
                if target.exists() and target.read_bytes()!=src.read_bytes():
                    raise RuntimeError('Existing differing delivery file; inspect before replacing: '+str(target))
                if not target.exists():shutil.copy2(src,target)
                digest=hashlib.sha256(target.read_bytes()).hexdigest()
                row[key][d]={'path':'sprites/save-rite/'+target.name,'sha256':digest}
                count+=1
        rows.append(row)
    result={'status':'placeholder art; flagged measurements retained; not integrated into game','generated_with':'built-in image_gen','walk_format':{'sheet':[552,295],'cell':[184,295],'order':['stride','neutral','opposite stride'],'idle_index':1,'cycle':[0,1,2,1],'figure_top':16,'figure_bottom_exclusive':278,'right':'per-frame mirror of left; frame order preserved'},'seated_format':{'canvas':[416,416],'bottom_exclusive':388,'figure_heights':{'down':360,'up':323,'left':295,'right':295},'person_only':True,'renderer_scaling_note':'Existing side multiplier1.15/up0.80 and down-content-height normalization still require chair integration review'},'colour_key':{'remove_when':'red-green >60 AND blue-green >60','enforced_margin':8,'margin_formula':'60 - max(min(red-green, blue-green)) over surviving figure pixels'},'character_count':len(rows),'png_count':count,'characters':rows}
    (dest/'manifest.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
    readme='''# Save-Rite placeholder animation handoff

Read the flags before registering these assets. The PNGs are selected deliverables, not a claim that every style or gait check passed. Exact failures and scores are in ../../masters/save-rite/overnight/MORNING-REPORT.md and STRIP-AUDIT.md.

manifest.json maps all characters and facings, records source master paths, SHA-256 hashes, the colour-key rule, frame geometry and seating requirements. No game code was changed. Art remains named Anjali Raval while live CREW says Priya Raval; resolve this mapping explicitly.

Walks contain three 184×295 cells: stride, neutral, opposite stride. Idle is index1; play [0,1,2,1]. Right images mirror each left frame without reordering. Seated images contain only the person and use the existing renderer's approximate facing ratios; test actual chair placement when integrating.

Review the full cast and motion using ../../masters/save-rite/overnight/all-34-v-five-baselines.png and CAST-PREVIEW.html. Browser automation could not open the local HTML under its security policy, so interactive UI verification is pending. The PNG audits do not depend on the viewer.

Raw generations, every retry, exact prompts, cleanup scripts and checkpoints remain in ../../masters/save-rite/overnight/. Built-in image generation was used. Approved Batch1 Light and Batch2 source masters were preserved.
'''
    (dest/'README.md').write_text(readme,encoding='utf-8')
    print(json.dumps({'destination':str(dest),'characters':len(rows),'pngs':count}))

if __name__=='__main__':run()
