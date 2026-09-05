from pathlib import Path
import sys,json
import numpy as np
from PIL import Image,ImageDraw
from animation import HERE,OUT,append,atomic,measure,keyed,flood_border,alternation,facing
SEATS={2,3,4,5,6,8,12,16,20,21,22,23}
def run(name):
    data=json.loads((HERE/'animation-manifest.json').read_text());r={'name':name,'walks':{},'seats':{},'flags':[]};g=[]
    for direction in ['down','up','left','right']:
        path=OUT/f'walk_{name}_{direction}.png'
        if not path.exists():r['flags'].append('missing walk '+direction);continue
        a=np.array(Image.open(path));rows=[]
        for f in range(3):
            ar=a[:,184*f:184*(f+1)];rows.append(measure(ar,~flood_border(keyed(ar))))
        alt=alternation(a);face=facing(a,name,direction);r['walks'][direction]={'path':str(path),'frames':rows,'alternation':alt,'facing':face}
        if any(x['holes'] or x['margin']<8 or x['components']!=1 for x in rows):r['flags'].append(direction+' key/connectivity')
        if any(x['bbox'][1]!=16 or x['bbox'][3]!=278 for x in rows):r['flags'].append(direction+' anchors')
        for b,v in alt.items():
            if not v['pass']:r['flags'].append(direction+' '+b+' silhouette IoU fails')
        if direction in ['left','right'] and not face.get('pass',False):r['flags'].append(direction+' facing centroid inconclusive/failed')
        source=data.get(f'walk_{name}_{direction}',data.get(f'walk_{name}_left',{}))
        if any(x.get('detached_anatomy_warning') for x in source.get('normalization',[])):r['flags'].append(direction+' detached source anatomy')
        r['walks'][direction]['source_attempt']=source.get('attempt')
    if int(name[:2]) in SEATS:
        for d in ['down','up','left','right']:
            path=OUT/f'sit_{name}_{d}.png'
            if path.exists():
                a=np.array(Image.open(path));r['seats'][d]={'path':str(path),'measurement':measure(a,~flood_border(keyed(a)))}
            else:r['flags'].append('missing seated '+d)
    elif int(name[:2])<25:r['flags'].append('seated requirement unresolved: character absent from live CREW')
    if len(r['walks'])==4:
        for f in [0,1,2,1]:
            can=Image.new('RGB',(184*4,315),'#252525');dr=ImageDraw.Draw(can)
            for i,d in enumerate(['down','up','left','right']):
                im=Image.open(OUT/f'walk_{name}_{d}.png').crop((184*f,0,184*(f+1),295));can.paste(im,(184*i,20));dr.text((184*i+4,4),d)
            g.append(can.resize((1472,630),Image.Resampling.NEAREST))
        g[0].save(OUT/f'{name}-walk-preview.gif',save_all=True,append_images=g[1:],duration=180,loop=0,disposal=2)
        r['preview']=str(OUT/f'{name}-walk-preview.gif')
        for d in ['down','up','left','right']:
            im=Image.open(OUT/f'walk_{name}_{d}.png');im.resize((1656,885),Image.Resampling.NEAREST).save(OUT/f'walk_{name}_{d}.3x.png')
    r['status']='complete_with_flags' if r['flags'] else 'complete'
    mp=HERE/'character-status.json';md=json.loads(mp.read_text()) if mp.exists() else {};md[name]=r;atomic(mp,md);append({'stage':'character_checkpoint','record':r});print(json.dumps({'name':name,'walks':len(r['walks']),'seats':len(r['seats']),'flags':r['flags']}))
if __name__=='__main__':run(sys.argv[1])
