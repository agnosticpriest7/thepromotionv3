"""Read-only sprite measurements and reproducible audit artifacts. Never repairs pixels."""
from pathlib import Path
import json, csv, sys
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
SPRITES = ROOT.parents[1] / 'sprites'
NAMES = ['intern','sterling','brenda','marla','peggy','marcus','priya','chad','dana','otis','wren','sana','gil','ramesh','vera','doug','ravinder','hank','zora','hire_blazer','dale']

def flood_border(candidate):
    a=np.pad(candidate.astype('uint8'),1,constant_values=1)
    im=Image.fromarray(a).copy(); ImageDraw.floodfill(im,(0,0),2)
    return np.array(im)[1:-1,1:-1]==2

def component_sizes(mask):
    parents=[]; sizes=[]; prev=[]
    def root(i):
      while parents[i]!=i: parents[i]=parents[parents[i]]; i=parents[i]
      return i
    for row in mask:
      changes=np.diff(np.pad(row.astype('int8'),1)); starts=np.where(changes==1)[0]; ends=np.where(changes==-1)[0]
      cur=[]
      for s,e in zip(starts,ends):
        idx=len(parents); parents.append(idx); sizes.append(int(e-s))
        for ps,pe,pi in prev:
          if ps>e: break
          if pe>=s:
            a,b=root(idx),root(pi)
            if a!=b: parents[b]=a; sizes[a]+=sizes[b]
        cur.append((s,e,idx))
      prev=cur
    return [sizes[i] for i in range(len(parents)) if root(i)==i]

def inspect(im, alpha=False):
    a=np.array(im.convert('RGBA')); rgb=a[:,:,:3].astype(np.int16)
    key=np.minimum(rgb[:,:,0]-rgb[:,:,1],rgb[:,:,2]-rgb[:,:,1])
    # Only exact background-colour pixels connected to the border are background.
    # Engine key is diagnostic, never used to erase or define the figure.
    exact=np.all(rgb==[255,0,255],axis=2)
    bg=flood_border(exact | (a[:,:,3]==0)) if not alpha else a[:,:,3]==0
    background_method='alpha' if alpha else 'exact-magenta border flood'
    if not alpha and np.mean(exact)<.1:
      if (a[:,:,3]<128).mean()>.2:
        bg=flood_border(a[:,:,3]<128); background_method='border-connected alpha <128; nonconforming transparent source'
      else:
        # Border-seeded region growth around sampled corner colour, not global key deletion.
        flood=Image.fromarray(a[:,:,:3]).copy(); ImageDraw.floodfill(flood,(0,0),(0,255,0),thresh=45)
        bg=np.all(np.array(flood)==[0,255,0],axis=2); background_method='corner-seeded flood with L1 tolerance 45; non-flat source'
    # Track engine-removable EXTERIOR fringe separately. Flood connectivity is essential:
    # enclosed keyed garment pixels are retained and reported as failures, never erased.
    exterior_key=flood_border((key>60)&(a[:,:,3]>0))
    fringe=exterior_key & ~bg
    bg=bg|exterior_key
    mask=~bg
    ys,xs=np.where(mask)
    if not len(xs): raise ValueError('Empty image')
    x0,x1,y0,y1=int(xs.min()),int(xs.max())+1,int(ys.min()),int(ys.max())+1
    crop=mask[y0:y1,x0:x1]; h,w=crop.shape
    sizes=component_sizes(mask); n=len(sizes)
    widths=np.array([np.ptp(np.flatnonzero(row))+1 if row.any() else 0 for row in crop])
    lo,hi=int(.15*h),int(.50*h)
    neck_candidates=np.flatnonzero(widths[lo:hi]==widths[lo:hi].min())+lo
    neck=int(neck_candidates[len(neck_candidates)//2])
    m=int(key[mask].max())
    enclosed=int((exact & ~bg).sum())
    return dict(canvas=list(im.size),bbox=[x0,y0,x1,y1],width=w,height=h,width_height=round(w/h,5),
        head_top=y0,baseline=y1-1,neck_row=neck,head_ratio=round(neck/h,5),
        neck_candidate_range=[int(neck_candidates.min()),int(neck_candidates.max())],
        torso_max_width=int(widths[int(.40*h):int(.70*h)].max()),
        key_pixels=int(((key>60)&mask).sum()),sealed_exact_magenta=enclosed,margin=60-m,exterior_key_fringe=int(fringe.sum()),
        components=int(n),component_sizes=sorted(map(int,sizes),reverse=True),background_method=background_method,
        border_exact_magenta_fraction=round(float(np.concatenate([exact[0],exact[-1],exact[:,0],exact[:,-1]]).mean()),6)), mask

def features(im, mask):
    ys,xs=np.where(mask); box=(xs.min(),ys.min(),xs.max()+1,ys.max()+1)
    cut=Image.fromarray(mask[box[1]:box[3],box[0]:box[2]].astype('uint8')*255)
    # Keep aspect ratio: fit height to 128, centre on 160-wide canvas.
    tw=round(cut.width*128/cut.height); cut=cut.resize((tw,128),Image.Resampling.NEAREST)
    can=Image.new('L',(160,128)); can.paste(cut,((160-tw)//2,0))
    rgb=np.array(im.convert('RGB'))[mask]
    hist=np.histogramdd(rgb,bins=(8,8,8),range=((0,256),)*3)[0].ravel(); hist/=hist.sum()
    return np.array(can)>0,hist

def similarities(entries, stem):
    pairs=[]; matrix=np.eye(len(entries))
    for i,(name,im,mask) in enumerate(entries):
      sa,ha=features(im,mask)
      for j in range(i+1,len(entries)):
        sb,hb=features(entries[j][1],entries[j][2])
        iou=float((sa&sb).sum()/(sa|sb).sum()); hist=float(np.minimum(ha,hb).sum()); score=(iou+hist)/2
        matrix[i,j]=matrix[j,i]=score
        pairs.append(dict(a=name,b=entries[j][0],silhouette_iou=round(iou,5),palette_intersection=round(hist,5),score=round(score,5)))
    with (ROOT/(stem+'_similarity.csv')).open('w',newline='') as f:
      wr=csv.writer(f); wr.writerow(['name']+[e[0] for e in entries]); [wr.writerow([e[0]]+[f'{v:.5f}' for v in matrix[i]]) for i,e in enumerate(entries)]
    pairs.sort(key=lambda p:p['score'],reverse=True)
    (ROOT/(stem+'_pairs.json')).write_text(json.dumps(pairs,indent=2))
    return pairs

def baseline():
    atlas=Image.open(SPRITES/'chars.png'); entries=[]; records=[]
    refs=ROOT/'references'; refs.mkdir(exist_ok=True)
    for i,name in enumerate(NAMES):
      for d,direction in enumerate(['down','up','left','right']):
        im=atlas.crop((i*120+40,d*64,i*120+80,d*64+64))
        rec,mask=inspect(im,alpha=True); rec.update(name=name,direction=direction); records.append(rec)
        if d==0:
          entries.append((name,im,mask))
          im.resize((240,384),Image.Resampling.NEAREST).save(refs/(name+'_neutral_6x.png'))
    (ROOT/'office_measurements.json').write_text(json.dumps(records,indent=2))
    pairs=similarities(entries,'office')
    print(json.dumps({'front_dimensions':[{k:r[k] for k in ['name','width','height','torso_max_width','head_ratio']} for r in records if r['direction']=='down'],'closest_pairs':pairs[:10]},indent=2))

def measure(path):
    im=Image.open(path); r,m=inspect(im); print(json.dumps(r,indent=2)); return r,m

def checkpoint(path,retries):
    path=Path(path); im=Image.open(path); r,m=inspect(im)
    r.update(filename=path.name,retries=int(retries),status='review',checks={
      'min_long_edge':max(im.size)>=1024,'key_holes':r['key_pixels']==0,
      'sealed_pockets':r['sealed_exact_magenta']==0,'one_component':r['components']==1,
      'head_ratio_raw':.35<=r['head_ratio']<=.43,
      'pure_magenta_border':r['border_exact_magenta_fraction']==1})
    p=ROOT/'manifest.json'; manifest=json.loads(p.read_text()) if p.exists() else {}
    manifest[path.stem]=r; p.write_text(json.dumps(manifest,indent=2))
    print(json.dumps(r,indent=2))

if __name__=='__main__':
    if sys.argv[1]=='baseline': baseline()
    elif sys.argv[1]=='measure': measure(sys.argv[2])
    elif sys.argv[1]=='checkpoint': checkpoint(sys.argv[2],sys.argv[3])
