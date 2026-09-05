from pathlib import Path
import json,sys,csv
import numpy as np
from PIL import Image,ImageDraw
from audit import ROOT,inspect,flood_border,component_sizes
from style_pass import clean,process,metrics,crop,keyed
OUT=ROOT/'current-cast';OUT.mkdir(exist_ok=True)
REFS=['jax','karl','kyle','raelee','rod']
CHINS={'jax':123,'karl':128,'kyle':128,'raelee':110,'rod':122}
def references():
    out=[]
    for n in REFS:
        p=ROOT.parents[1]/'sprites'/('walk_'+n+'_down.png');im=Image.open(p);w=im.width//3
        im=im.crop((w,0,w*2,im.height));a=np.array(im.convert('RGB'));m=~flood_border(keyed(a))
        out.append((n,a,m));im.save(OUT/(n+'-neutral.png'))
    return out
def measure(a,m):
    y,x=np.where(m);return dict(**metrics(a,m),bbox=[int(x.min()),int(y.min()),int(x.max()+1),int(y.max()+1)],width_height=round((x.max()-x.min()+1)/(y.max()-y.min()+1),5),height=int(y.max()-y.min()+1),margin=int(60-np.minimum(a.astype('int16')[...,0]-a[...,1],a.astype('int16')[...,2]-a[...,1])[m].max()),holes=int((keyed(a)&m).sum()),components=len(component_sizes(m)))
def baseline():
    entries=references();rows=[];can=Image.new('RGB',(5*368,450),'#252525');d=ImageDraw.Draw(can)
    for i,(n,a,m) in enumerate(entries):
        if not n:continue
        r=measure(a,m);r['file']='walk_'+n+'_down.png';r['under_chin_y']=CHINS[n];r['head_ratio']=(CHINS[n]-r['bbox'][1])/r['height'];r['chin_uncertainty_px']=2;rows.append(r)
        im=Image.fromarray(a[:150]).resize((368,300),Image.Resampling.NEAREST);can.paste(im,(i*368,30));d.text((i*368+4,5),n)
        for y in range(80,141,5):d.line((i*368,30+y*2,(i+1)*368-1,30+y*2),fill='cyan');d.text((i*368+4,31+y*2),str(y))
        d.line((i*368,30+CHINS[n]*2,(i+1)*368-1,30+CHINS[n]*2),fill='yellow',width=2)
    can.save(OUT/'head-grid.png');(OUT/'baseline.json').write_text(json.dumps(rows,indent=2));print(json.dumps(rows,indent=2))
def light(a,m,h=280):
    # Detached generator flecks are not anatomy. Retain the largest 8-connected figure.
    def largest(ar,ma):
        if len(component_sizes(ma))<=1:return ar,ma
        unseen=ma.copy();best=[]
        for yy,xx in np.argwhere(ma):
            if not unseen[yy,xx]:continue
            stack=[(int(yy),int(xx))];unseen[yy,xx]=False;region=[]
            while stack:
                y,x=stack.pop();region.append((y,x))
                for dy in (-1,0,1):
                    for dx in (-1,0,1):
                        ny,nx=y+dy,x+dx
                        if 0<=ny<ma.shape[0] and 0<=nx<ma.shape[1] and unseen[ny,nx]:unseen[ny,nx]=False;stack.append((ny,nx))
            if len(region)>len(best):best=region
        keep=np.zeros_like(ma);ys,xs=zip(*best);keep[ys,xs]=True;ar=ar.copy();ar[~keep]=[255,0,255]
        return ar,keep
    a,m=largest(a,m)
    a,m=crop(a,m);w=round(a.shape[1]*h/a.shape[0]);ar=np.array(Image.fromarray(a).resize((w,h),Image.Resampling.LANCZOS));ma=np.array(Image.fromarray(m).resize((w,h),Image.Resampling.NEAREST))
    ar[~ma]=[255,0,255];s=ar.astype('int16');ex=np.minimum(s[...,0]-s[...,1],s[...,2]-s[...,1])-52;fix=ma&(ex>0);ar[...,1][fix]=(s[...,1][fix]+ex[fix]).astype('uint8')
    # Resampling can close a gap around exterior magenta. Re-flood the ACTUAL output.
    ar,ma,_=clean(Image.fromarray(ar));ar,ma=largest(ar,ma);ar,ma=crop(ar,ma)
    if ar.shape[0]!=h:
        w=round(ar.shape[1]*h/ar.shape[0]);ar=np.array(Image.fromarray(ar).resize((w,h),Image.Resampling.NEAREST));ma=np.array(Image.fromarray(ma).resize((w,h),Image.Resampling.NEAREST))
    else:w=ar.shape[1]
    out=np.full((h+32,round(h*.8)+32,3),[255,0,255],dtype='uint8');mask=np.zeros(out.shape[:2],bool);x=(out.shape[1]-w)//2
    out[16:16+h,x:x+w]=ar;mask[16:16+h,x:x+w]=ma
    return out,mask
def sheet(entries,path,cols=8,fh=240):
    cw=190;rh=fh+50;can=Image.new('RGB',(cols*cw,((len(entries)+cols-1)//cols)*rh),'#252525');d=ImageDraw.Draw(can)
    for i,(n,a,m) in enumerate(entries):
        if not n:continue
        x=i%cols*cw;y=i//cols*rh;a,m=crop(a,m);a=a.copy();a[~m]=[255,0,255];im=Image.fromarray(a).resize((round(a.shape[1]*fh/a.shape[0]),fh),Image.Resampling.NEAREST);can.paste(im,(x+(cw-im.width)//2,y+30));d.text((x+3,y+8),n)
    can.save(path)
def part_a():
    baseline();refs=references();orig=json.loads((ROOT/'manifest.json').read_text());records=[];raws=[];processed=[];approved=[];lightdir=OUT/'batch1-light';lightdir.mkdir(exist_ok=True)
    for p in sorted(ROOT.glob('[0-9][0-9]_*.png')):
        im=Image.open(p);a=np.array(im.convert('RGB'));m=~flood_border(keyed(a));r=measure(a,m);r['name']=p.stem;r['head_ratio']=orig[p.stem]['head_ratio_verified'];raws.append((p.stem,a,m))
        ca,cm,rep=clean(im);la,lm=light(ca,cm);Image.fromarray(la).save(lightdir/p.name);r['light']=measure(la,lm);r['repairs']=rep;records.append(r);processed.append((p.stem,la,lm))
        va=np.array(Image.open(ROOT/'rework-v2'/'cleaned-masters'/p.name).convert('RGB'));vm=~flood_border(keyed(va));approved.append((p.stem,va,vm))
    (OUT/'batch1.json').write_text(json.dumps(records,indent=2))
    blanks=[('',np.full((1,1,3),255,dtype='uint8'),np.ones((1,1),bool))]*3
    sheet(refs+blanks+raws,OUT/'batch1-raw-v-current.png');sheet(refs+blanks+processed,OUT/'batch1-light-v-current.png');sheet(refs+blanks+approved,OUT/'approved-v2-v-current.png')
    print(json.dumps(records,indent=2))
if __name__=='__main__':
    if len(sys.argv)>1 and sys.argv[1]=='part-a':part_a()
    else:baseline()
