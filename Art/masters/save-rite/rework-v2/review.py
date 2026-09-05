from pathlib import Path
import sys,json
import numpy as np
from PIL import Image,ImageDraw
HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE.parent))
from audit import inspect,component_sizes,flood_border
from style_pass import clean,process,metrics,crop,office
OUT=HERE/'game-size';OUT.mkdir(exist_ok=True)
CLEAN=HERE/'cleaned-masters';CLEAN.mkdir(exist_ok=True)
NECK=[533,560,584,605,560,603,552,617]
records=[];entries=[]
for i,p in enumerate(sorted(HERE.glob('[0-9][0-9]_*.png'))):
    im=Image.open(p);r,mask=inspect(im)
    r['name']=p.stem;r['manual_under_chin_y']=NECK[i];r['manual_head_ratio']=(NECK[i]-r['head_top'])/r['height'];r['manual_uncertainty_px']=10
    a,m,rep=clean(im);Image.fromarray(a).save(CLEAN/p.name);ar,ma,fix=process(a,m,62,1024)
    Image.fromarray(ar).save(OUT/p.name)
    signed=ar.astype('int16');k=np.minimum(signed[...,0]-signed[...,1],signed[...,2]-signed[...,1])
    r['game_size']={'canvas':[ar.shape[1],ar.shape[0]],'margin':int(60-k[ma].max()),'holes':int(((k>60)&ma).sum()),'components':len(component_sizes(ma)),**metrics(ar,ma),'repairs':rep,'post_resize_adjustments':fix}
    records.append(r);entries.append((p.stem,ar,ma))
    assert r['game_size']['margin']>=8 and r['game_size']['holes']==0 and r['game_size']['components']==1
refs=office();allentries=[refs[0]]+entries
can=Image.new('RGB',(9*180,350),'#252525');d=ImageDraw.Draw(can)
native=Image.new('RGB',(9*40,64),(255,0,255))
for i,(n,a,m) in enumerate(allentries):
    a,m=crop(a,m);a=a.copy();a[~m]=[255,0,255]
    im=Image.fromarray(a).resize((round(a.shape[1]*248/a.shape[0]),248),Image.Resampling.NEAREST)
    can.paste(im,(i*180+(180-im.width)//2,40));d.text((i*180+4,10),n.replace('_',' '))
    small=Image.fromarray(a).resize((round(a.shape[1]*57/a.shape[0]),57),Image.Resampling.NEAREST)
    native.paste(small,(40*i+(40-small.width)//2,4))
native.save(HERE/'game-preview-native.png');can.save(HERE/'review-sheet.png')
(HERE/'measurements.json').write_text(json.dumps(records,indent=2))
print(json.dumps([{'name':r['name'],'head_percent':round(r['manual_head_ratio']*100,1),'raw_holes':r['key_pixels'],'raw_margin':r['margin'],'game_size':r['game_size']} for r in records],indent=2))
