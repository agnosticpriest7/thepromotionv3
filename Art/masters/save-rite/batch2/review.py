from pathlib import Path
import sys,json,numpy as np
from PIL import Image,ImageDraw
HERE=Path(__file__).resolve().parent;sys.path.insert(0,str(HERE.parent))
from corrected_baseline import references,measure,light,sheet,OUT
from style_pass import clean,keyed,crop
from audit import flood_border
CHINS={'05_curtis_lam':475,'06_bekah_thorne':388,'07_ade_okonkwo':443,'08_russ_pelletier':529,'09_joon_ho_bae':455,'10_sam_whitecalf':442,'11_cheryl_novak':467,'12_gita_mahal':505}
def run():
    base=json.loads((OUT/'baseline.json').read_text());target=float(np.median([r['effective_pixel_size_per_1000h'] for r in base]));cr=[r['colours_at_192h'] for r in base]
    processed=HERE/'light';processed.mkdir(exist_ok=True);cleaned=HERE/'cleaned-masters';cleaned.mkdir(exist_ok=True);records=[];entries=[]
    for p in sorted(HERE.glob('[0-9][0-9]_*.png')):
        if '-attempt' in p.stem:continue
        im=Image.open(p);a=np.array(im.convert('RGB'));m=~flood_border(keyed(a));r=measure(a,m);r.update(name=p.stem,under_chin_y=CHINS[p.stem],manual_uncertainty_px=8,head_ratio=(CHINS[p.stem]-r['bbox'][1])/r['height'])
        ca,cm,rep=clean(im);Image.fromarray(ca).save(cleaned/p.name);la,lm=light(ca,cm);Image.fromarray(la).save(processed/p.name);r['light']=measure(la,lm);r['repairs']=rep
        lr=r['light'];r['checks']={'pixel_size':abs(lr['effective_pixel_size_per_1000h']/target-1)<=.15,'width_height':.41<=r['width_height']<=.49,'head_ratio':.34<=r['head_ratio']<=.36,'figure_colours':min(cr)<=lr['colours_at_192h']<=max(cr),'holes':lr['holes']==0,'margin':lr['margin']>=8,'components':lr['components']==1,'anchors':lr['bbox'][1]==16 and lr['height']==280}
        r['checks']={k:bool(v) for k,v in r['checks'].items()};records.append(r);entries.append((p.stem,la,lm))
    (HERE/'measurements.json').write_text(json.dumps(records,indent=2))
    blank=[('',np.full((1,1,3),255,dtype='uint8'),np.ones((1,1),bool))]*3
    sheet(references()+blank+entries,HERE/'batch2-v-current.png')
    approved=[]
    for p in sorted((HERE.parent/'rework-v2'/'cleaned-masters').glob('*.png')):
        a=np.array(Image.open(p).convert('RGB'));m=~flood_border(keyed(a));approved.append((p.stem,a,m))
    sheet(approved+entries,HERE/'batch2-v-approved-batch1.png')
    print(json.dumps([{'name':r['name'],'width':r['width_height'],'head':round(100*r['head_ratio'],2),'light':r['light'],'checks':r['checks']} for r in records],indent=2))
if __name__=='__main__':run()
