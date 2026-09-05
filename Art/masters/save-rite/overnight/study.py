from pathlib import Path
import sys,json
import numpy as np
from PIL import Image,ImageDraw
HERE=Path(__file__).resolve().parent;ROOT=HERE.parent;sys.path.insert(0,str(ROOT))
from style_pass import keyed
from audit import flood_border
from corrected_baseline import measure
SPR=ROOT.parents[1]/'sprites'
out=[]
for name in ['jax','karl','kyle','nwh','raelee','rod','stacie']:
    imgs={d:Image.open(SPR/f'walk_{name}_{d}.png').convert('RGB') for d in ['down','up','left','right']}
    for d,im in imgs.items():
        w=im.width//3;frames=[]
        for f in range(3):
            a=np.array(im.crop((f*w,0,(f+1)*w,im.height)));m=~flood_border(keyed(a));frames.append(measure(a,m))
        out.append(dict(name=name,direction=d,canvas=list(im.size),frame_size=[w,im.height],frames=frames))
    l=np.array(imgs['left']);r=np.array(imgs['right']);w=l.shape[1]//3
    mir=np.concatenate([l[:,f*w:(f+1)*w][:,::-1] for f in range(3)],axis=1)
    diff=int(np.any(mir!=r,axis=2).sum()) if mir.shape==r.shape else -1
    for q in out[-4:]:q['right_mirror_pixel_differences']=diff
    # Full native-pixel reference enlarged 3x, all facings: inspected independently from metric tables.
    cw=max(x.width for x in imgs.values());ch=max(x.height for x in imgs.values())
    can=Image.new('RGB',(cw*3,(ch+20)*4*3),'#242424');dr=ImageDraw.Draw(can)
    for i,(d,im) in enumerate(imgs.items()):
        can.paste(im.resize((im.width*3,im.height*3),Image.Resampling.NEAREST),(0,(ch+20)*i*3+30));dr.text((4,(ch+20)*i*3+4),name+' '+d)
    can.save(HERE/f'reference-walk-{name}-3x.png')
(HERE/'reference-walk-audit.json').write_text(json.dumps(out,indent=2))
sits=[]
for p in sorted(SPR.glob('sit_*.png')):
    im=Image.open(p);a=np.array(im.convert('RGB'));m=~flood_border(keyed(a));y,x=np.where(m)
    sits.append(dict(file=p.name,canvas=list(im.size),bbox=[int(x.min()),int(y.min()),int(x.max()+1),int(y.max()+1)]))
(HERE/'reference-seat-audit.json').write_text(json.dumps(sits,indent=2))
for name in ['kyle','raelee','karl']:
    ims=[Image.open(SPR/f'sit_{name}_{d}.png').convert('RGB') for d in ['down','up','left','right']]
    cw=500;can=Image.new('RGB',(cw*4,550),'#242424');dr=ImageDraw.Draw(can)
    for i,(im,d) in enumerate(zip(ims,['down','up','left','right'])):
        im.thumbnail((480,510));can.paste(im,(i*cw,30));dr.text((i*cw,5),name+' '+d)
    can.save(HERE/f'reference-seat-{name}.png')
print(json.dumps({'walks':len(out),'seats':len(sits),'walk_summary':[{'name':n,'top_range':[min(q['bbox'][1] for r in out if r['name']==n for q in r['frames']),max(q['bbox'][1] for r in out if r['name']==n for q in r['frames'])],'bottom_range':[min(q['bbox'][3]-1 for r in out if r['name']==n for q in r['frames']),max(q['bbox'][3]-1 for r in out if r['name']==n for q in r['frames'])],'mirror_diff':next(r['right_mirror_pixel_differences'] for r in out if r['name']==n)} for n in imgs.keys()] if False else []}))
