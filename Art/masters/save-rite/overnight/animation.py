"""Non-destructive checkpoint, authorized key repair/resampling, and independent audits."""
from pathlib import Path
import sys,json,shutil,datetime
import numpy as np
from PIL import Image
HERE=Path(__file__).resolve().parent;ROOT=HERE.parent;sys.path.insert(0,str(ROOT))
from corrected_baseline import measure,light
from style_pass import clean,keyed,crop
from audit import flood_border,component_sizes
RAW=HERE/'animation-raw';OUT=HERE/'animations';RAW.mkdir(exist_ok=True);OUT.mkdir(exist_ok=True)
def append(x):
    with (HERE/'outputs.jsonl').open('a',encoding='utf-8') as f:f.write(json.dumps(x)+'\n')
def atomic(path,x):
    p=path.with_suffix('.tmp');p.write_text(json.dumps(x,indent=2),encoding='utf-8');p.replace(path)
def iou(a,b):
    u=(a|b).sum();return float((a&b).sum()/u) if u else None

def remove_resample_specks(ar,ma):
    """Only remove isolated components of <=5 pixels after packing; never body parts."""
    sizes=component_sizes(ma)
    if len(sizes)<2 or min(sizes)>5:return ar,ma,0
    unseen=ma.copy();remove=[]
    for yy,xx in np.argwhere(ma):
        if not unseen[yy,xx]:continue
        todo=[(int(yy),int(xx))];unseen[yy,xx]=False;region=[]
        while todo:
            y,x=todo.pop();region.append((y,x))
            for dy in (-1,0,1):
                for dx in (-1,0,1):
                    ny,nx=y+dy,x+dx
                    if 0<=ny<ma.shape[0] and 0<=nx<ma.shape[1] and unseen[ny,nx]:unseen[ny,nx]=False;todo.append((ny,nx))
        if len(region)<=5:remove.extend(region)
    for y,x in remove:ar[y,x]=[255,0,255];ma[y,x]=False
    return ar,ma,len(remove)
def split_figures(im):
    a,m,_=clean(im);parents=[];sizes=[];runs=[];prev=[]
    def root(i):
        while parents[i]!=i:parents[i]=parents[parents[i]];i=parents[i]
        return i
    for y,row in enumerate(m):
        changes=np.diff(np.pad(row.astype('int8'),1));cur=[]
        for s,e in zip(np.where(changes==1)[0],np.where(changes==-1)[0]):
            idx=len(parents);parents.append(idx);sizes.append(int(e-s));runs.append((y,s,e,idx))
            for ps,pe,pi in prev:
                if ps>e:break
                if pe>=s:
                    aa,bb=root(idx),root(pi)
                    if aa!=bb:parents[bb]=aa;sizes[aa]+=sizes[bb]
            cur.append((s,e,idx))
        prev=cur
    roots=sorted([i for i in range(len(parents)) if root(i)==i],key=lambda i:sizes[i],reverse=True)
    if len(roots)<3:raise ValueError('Fewer than three connected figures; raw checkpoint retained')
    mains=roots[:3];labels=np.full(m.shape,-1,dtype='int32')
    for y,s,e,i in runs:labels[y,s:e]=root(i)
    centres={i:float(np.where(labels==i)[1].mean()) for i in mains};groups={i:[i] for i in mains}
    for i in roots[3:]:
        if sizes[i]<5:continue
        x=float(np.where(labels==i)[1].mean());near=min(mains,key=lambda r:abs(centres[r]-x));groups[near].append(i)
    result=[]
    for i in sorted(mains,key=lambda r:centres[r]):
        mask=np.isin(labels,groups[i]);ar=a.copy();ar[~mask]=[255,0,255];ar,mask=crop(ar,mask);result.append(Image.fromarray(ar))
    return result
def alternation(arr):
    w=arr.shape[1]//3;ms=[~flood_border(keyed(arr[:,f*w:(f+1)*w])) for f in range(3)];out={}
    for band,(lo,hi) in {'arms':(.38,.62),'legs':(.60,1.)}.items():
        a=ms[0][16+round(262*lo):16+round(262*hi)];b=ms[2][16+round(262*lo):16+round(262*hi)]
        same=iou(a,b);flip=iou(a,b[:,::-1]);out[band]={'same':same,'flipped':flip,'delta':None if same is None or flip is None else flip-same,'pass':same is not None and flip is not None and flip>same}
    return out
def colour_seeds(name):
    paths=json.loads((HERE/'cast-paths.json').read_text());a=np.array(Image.open(paths[name]).convert('RGB'));m=~flood_border(keyed(a));a,m=crop(a,m);h,w=m.shape
    skin=a[int(h*.20):int(h*.31),int(w*.41):int(w*.59)].reshape(-1,3);s=skin.astype('int16');good=(s[:,0]>s[:,1]+8)&(s[:,1]>s[:,2]+5);skin=skin[good]
    hair=a[int(h*.04):int(h*.13),int(w*.35):int(w*.65)].reshape(-1,3);hair=hair[~keyed(hair[None,...])[0]]
    # Lorne's low hairline made the generic patch sample forehead. A visually
    # verified upper-centre grey-hair patch supplies the actual material seed.
    if name.startswith(('22','07')):
        hair=a[int(h*.02):int(h*.04),int(w*.45):int(w*.55)].reshape(-1,3)
    if name.startswith('08'):
        original=np.array(Image.open(paths[name]).convert('RGB'))
        hair=original[30:68,76:93].reshape(-1,3)
        hs=hair.astype('int16');hair=hair[(hs.max(axis=1)-hs.min(axis=1)<45)&(hs.mean(axis=1)>75)]
    return np.median(skin,axis=0) if len(skin) else None,np.median(hair,axis=0) if len(hair) else None
def facing(a,name,direction):
    if direction not in ['left','right']:return {'status':'not_profile','method':'front/back inspected from full-resolution output; profile centroid applies to side views'}
    if int(name[:2])==16:return {'status':'inconclusive_hairnet','method':'close-shaved scalp under white hairnet; generic hair patch sampled scalp skin, so skin/hair centroid is invalid; full-resolution profiles face left, rights are exact mirrors'}
    if int(name[:2]) in [21,23,26]:return {'status':'inconclusive_bald','method':'skin/hair centroid unavailable with insufficient distinct scalp hair; no fabricated pass'}
    skin,hair=colour_seeds(name)
    if skin is None or hair is None or np.linalg.norm(skin-hair)<25:return {'status':'inconclusive_seeds'}
    w=a.shape[1]//3;rs=[]
    for f in range(3):
        ar=a[:,f*w:(f+1)*w];m=~flood_border(keyed(ar));hd=ar[16:16+round(262*.38)].astype('float32');hm=m[16:16+round(262*.38)];sd=np.linalg.norm(hd-skin,axis=2);hdist=np.linalg.norm(hd-hair,axis=2)
        sm=hm&(sd+10<hdist)&(sd<95);ha=hm&(hdist+10<sd)&(hdist<95)
        if sm.sum()<10 or ha.sum()<10:rs.append({'status':'inconclusive_pixels'});continue
        sx=float(np.where(sm)[1].mean());hx=float(np.where(ha)[1].mean());delta=sx-hx
        rs.append({'skin_x':sx,'hair_x':hx,'skin_minus_hair_x':delta,'skin_pixels':int(sm.sum()),'hair_pixels':int(ha.sum()),'pass':bool(delta<0 if direction=='left' else delta>0)})
    return {'method':'nearest master skin/hair colour seeds in upper38percent; distance<95 and10-unit separation; inconclusive when inseparable','skin_seed':skin.tolist(),'hair_seed':hair.tolist(),'frames':rs,'pass':all(r.get('pass',False) for r in rs)}
def normalize_walk(im):
    a,m,rep=clean(im);sizes=component_sizes(m);removed_warning=sum(sorted(sizes,reverse=True)[1:])>max(10,int(m.sum()*.002))
    a,m=light(a,m,h=262);a,m=crop(a,m);w=a.shape[1];fit=1.
    if w>182:
        fit=182/w;a=np.array(Image.fromarray(a).resize((182,262),Image.Resampling.NEAREST));w=182
    can=np.full((295,184,3),[255,0,255],dtype='uint8');x=(184-w)//2;can[16:278,x:x+w]=a
    return can,dict(repairs=rep,source_component_sizes=sorted(sizes,reverse=True),detached_anatomy_warning=removed_warning,horizontal_fit=fit)
def pack_heads(frames,info):
    centres=[];extent=0
    for ar in frames:
        ma=~flood_border(keyed(ar));hy,hx=np.where(ma[16:16+round(262*.34)]);cx=(hx.min()+hx.max())/2;centres.append(float(cx));y,x=np.where(ma);extent=max(extent,cx-x.min(),x.max()-cx)
    factor=min(1.,90.5/max(1,extent));out=[]
    for ar,cx,rec in zip(frames,centres,info):
        # One common horizontal factor for all three poses; inverse nearest sampling avoids holes.
        sx=np.rint((np.arange(184)-91.5)/factor+cx).astype(int);valid=(sx>=0)&(sx<184);can=np.full_like(ar,[255,0,255]);can[:,valid]=ar[:,sx[valid]];out.append(can);rec['shared_head_horizontal_factor']=factor;rec['head_source_x']=cx
    return out
def strip_tones(a,name):
    # Temporary profile leg tones are neutral grey. Recolour both leg identities to ONE trouser fill.
    # Do not touch the head, arms, apron, outlines, coloured shoes, or background.
    paths=json.loads((HERE/'cast-paths.json').read_text());master=np.array(Image.open(paths[name]).convert('RGB'));mm=~flood_border(keyed(master));master,mm=crop(master,mm);h,w=mm.shape
    patch=master[int(h*.82):int(h*.89),int(w*.33):int(w*.43)];target=np.median(patch.reshape(-1,3),axis=0).astype('uint8')
    b=a.copy();s=b.astype('int16');v=s.mean(axis=2);grey=(s.max(axis=2)-s.min(axis=2)<20)&(v>30)&(v<215);band=np.zeros(grey.shape,bool);band[16+round(262*.60):16+round(262*.96)]=True
    if int(name[:2]) in [25,32]:
        skin,_=colour_seeds(name);target=np.array(skin if skin is not None else [185,139,90],dtype='uint8');grey=(s[...,0]>s[...,1]+8)&(s[...,1]>s[...,2]+5)&(s[...,0]>70);band[:16+round(262*.80)]=False
    fix=grey&band&~keyed(b);b[fix]=target
    return b,{'target_rgb':target.tolist(),'pixels':int(fix.sum()),'method':'temporary neutral trouser fills in60–96percent height -> one sampled master trouser colour; skirt wearers instead unify warm calf tones below80percent; black outlines/coloured shoes retained; raw toned source kept'}
def run(name,kind,direction,source,attempt=0):
    stem=f'{kind}_{name}_{direction}';raw=RAW/f'{stem}.attempt{attempt}.png';shutil.copyfile(source,raw);append({'stage':'raw_saved','name':name,'kind':kind,'direction':direction,'attempt':attempt,'raw':str(raw),'source':source})
    im=Image.open(raw).convert('RGB');extra={};info=[]
    raw_a=np.array(im);border=np.concatenate([raw_a[0],raw_a[-1],raw_a[:,0],raw_a[:,-1]])
    border_key_fraction=float(keyed(border[None,...])[0].mean())
    extra['source_border_key_fraction']=border_key_fraction
    if kind=='walk':
        frames=[]
        for figure in split_figures(im):
            ar,r=normalize_walk(figure);frames.append(ar);info.append(r)
        frames=pack_heads(frames,info);a=np.concatenate(frames,axis=1);extra['toned_alternation']=alternation(a)
        if direction=='left':
            Image.fromarray(a).save(OUT/f'{stem}.toned.png');a,extra['tone_removal']=strip_tones(a,name)
        repaired=[];extra['final_key_sweep']=[]
        for f in range(3):
            ar,ma,rp=clean(Image.fromarray(a[:,184*f:184*(f+1)]))
            ar,ma,rp['isolated_resample_pixels_removed']=remove_resample_specks(ar,ma)
            yy=np.where(ma)[0];lo,hi=int(yy.min()),int(yy.max())+1
            if (lo,hi)!=(16,278):
                fixed=np.full_like(ar,[255,0,255]);fixed[16:278]=np.array(Image.fromarray(ar[lo:hi]).resize((184,262),Image.Resampling.NEAREST));ar=fixed
                rp['post_cleanup_vertical_anchor_fix']=[lo,hi]
            repaired.append(ar);extra['final_key_sweep'].append(rp)
        a=np.concatenate(repaired,axis=1)
        path=OUT/f'{stem}.png';Image.fromarray(a).save(path)
        # Read saved RGB anew; source masks are not accepted as output evidence.
        a=np.array(Image.open(path).convert('RGB'));metrics=[]
        for f in range(3):
            ar=a[:,f*184:(f+1)*184];m=~flood_border(keyed(ar));metrics.append(measure(ar,m))
        extra.update(frames=metrics,alternation=alternation(a),facing=facing(a,name,direction),anchors_pass=all(r['bbox'][1]==16 and r['bbox'][3]==278 for r in metrics),key_pass=all(r['holes']==0 and r['margin']>=8 and r['components']==1 for r in metrics))
        if direction=='left':
            right=np.concatenate([a[:,f*184:(f+1)*184][:,::-1] for f in range(3)],axis=1);rp=OUT/f'walk_{name}_right.png';Image.fromarray(right).save(rp);append({'stage':'mirror_saved','name':name,'path':str(rp),'source':str(path),'differing_pixels':0});extra['right_path']=str(rp);extra['right_facing']=facing(right,name,'right')
    else:
        a,m,rep=clean(im);seat_h={'down':360,'up':323,'left':295}[direction];a,m=light(a,m,h=seat_h);a,m=crop(a,m)
        # Preserve measured Kyle source ratios for the current renderer's side1.15/up0.80 knobs.
        can=np.full((416,416,3),[255,0,255],dtype='uint8');w=a.shape[1]
        if w>400:a=np.array(Image.fromarray(a).resize((400,seat_h),Image.Resampling.NEAREST));w=400
        can[388-seat_h:388,(416-w)//2:(416-w)//2+w]=a;path=OUT/f'{stem}.png';Image.fromarray(can).save(path);ar=np.array(Image.open(path));extra['measurement']=measure(ar,~flood_border(keyed(ar)));extra['repairs']=rep;extra['reference_ratio']='Kyle: down797, up715, side653; normalized360/323/295'
        if direction=='left':
            rp=OUT/f'sit_{name}_right.png';Image.fromarray(can[:,::-1]).save(rp);append({'stage':'mirror_saved','name':name,'path':str(rp),'source':str(path),'differing_pixels':0});extra['right_path']=str(rp)
    record=dict(name=name,kind=kind,direction=direction,attempt=attempt,raw=str(raw),output=str(path),normalization=info,**extra)
    manifest=HERE/'animation-manifest.json';data=json.loads(manifest.read_text()) if manifest.exists() else {};data[stem]=record;atomic(manifest,data);append({'stage':'measured','record':record})
    print(json.dumps({'name':name,'kind':kind,'dir':direction,'attempt':attempt,'key':extra.get('key_pass',extra.get('measurement')),'anchors':extra.get('anchors_pass'),'alternation':extra.get('alternation'),'facing':extra.get('facing'),'detached':[r['detached_anatomy_warning'] for r in info]}))
if __name__=='__main__':run(sys.argv[1],sys.argv[2],sys.argv[3],sys.argv[4],int(sys.argv[5]) if len(sys.argv)>5 else 0)
