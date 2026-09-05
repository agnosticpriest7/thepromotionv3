"""Explicitly requested deterministic style pass. Originals are never overwritten."""
from pathlib import Path
import json,csv
import heapq
import numpy as np
from PIL import Image,ImageDraw,ImageFont
from audit import ROOT,NAMES,flood_border,component_sizes
OUT=ROOT/'pixelated'; OUT.mkdir(exist_ok=True)
KEY=np.array([255,0,255],dtype=np.uint8)
def keyed(a):
    s=a.astype('int16'); return np.minimum(s[...,0]-s[...,1],s[...,2]-s[...,1])>60
def clean(im):
    a=np.array(im.convert('RGB')).copy()
    # Spatial border fill ONLY: enclosed magenta is retained for explicit repair.
    bg=flood_border(keyed(a)); mask=~bg
    bad=keyed(a)&mask; count=int(bad.sum())
    # Each enclosed region gets median of its immediate surviving 8-neighbour ring.
    while bad.any():
        y,x=np.argwhere(bad)[0]; todo=[(int(y),int(x))]; region=set(todo); ring=set()
        while todo:
            yy,xx=todo.pop()
            for dy in (-1,0,1):
                for dx in (-1,0,1):
                    ny,nx=yy+dy,xx+dx
                    if not(0<=ny<a.shape[0] and 0<=nx<a.shape[1]): continue
                    if bad[ny,nx] and (ny,nx) not in region: region.add((ny,nx)); todo.append((ny,nx))
                    elif mask[ny,nx] and not bad[ny,nx]: ring.add((ny,nx))
        vals=np.array([a[y,x] for y,x in ring]); med=np.median(vals,axis=0)
        # Median can itself cross the key boundary; nearest safe ring colour fallback.
        c=med.astype('uint8')
        if keyed(c): c=vals[np.argmin(((vals.astype(float)-med)**2).sum(axis=1))]
        for y,x in region: a[y,x]=c; bad[y,x]=False
    # Sweep surviving near-key rim: pull green upward to provide 8 units of headroom.
    s=a.astype('int16'); excess=np.minimum(s[...,0]-s[...,1],s[...,2]-s[...,1])-52
    rim=mask&(excess>0); a[...,1][rim]=np.minimum(255,s[...,1][rim]+excess[rim]).astype('uint8')
    a[bg]=KEY
    return a,mask,{'enclosed_key_pixels_filled':count,'near_key_rim_pixels_adjusted':int(rim.sum())}
def crop(a,m):
    y,x=np.where(m); return a[y.min():y.max()+1,x.min():x.max()+1],m[y.min():y.max()+1,x.min():x.max()+1]
def metrics(a,m):
    a,m=crop(a,m); h=len(m)
    # Mean exact-RGB constant run length, within foreground, both axes.
    edges=0; total=0
    for b,k in ((a,m),(a.transpose(1,0,2),m.T)):
        same=np.all(b[:,1:]==b[:,:-1],axis=2)&k[:,1:]&k[:,:-1]
        edges+=int(same.sum()); total+=int(k.sum())
    runs=total-edges
    # Colour comparison uses identical 192px figure-height nearest-neighbour sampling.
    size=(round(a.shape[1]*192/h),192)
    aa=np.array(Image.fromarray(a).resize(size,Image.Resampling.NEAREST))
    mm=np.array(Image.fromarray(m).resize(size,Image.Resampling.NEAREST))
    return {'effective_pixel_size_per_1000h':round(total/runs/h*1000,3),
            'colours_at_192h':len(np.unique(aa[mm],axis=0)),
            'native_colours':len(np.unique(a[m],axis=0))}
def process(a,m,height,colours):
    a,m=crop(a,m); w=round(a.shape[1]*height/a.shape[0])
    im=Image.fromarray(a).resize((w,height),Image.Resampling.LANCZOS)
    # Geometry mask resampled separately; never globally delete a colour in the figure.
    mm=np.array(Image.fromarray(m).resize((w,height),Image.Resampling.NEAREST))
    arr=np.array(im); arr[~mm]=KEY
    # Reserve magenta outside the palette calculation, preventing background dominance.
    vals=arr[mm]; strip=Image.fromarray(vals.reshape(1,-1,3))
    if colours<=256:
        quant=strip.quantize(colors=colours,method=Image.Quantize.MEDIANCUT,dither=Image.Dither.NONE).convert('RGB')
        arr[mm]=np.array(quant).reshape(-1,3)
    else:
        # RGB median cut, not an indexed PNG: Pillow's P-mode has a 256-colour ceiling.
        # Repeatedly split the widest-range box at population median; no dithering.
        heap=[]; serial=0
        def push(ids):
            nonlocal serial
            spread=np.ptp(vals[ids].astype('int16'),axis=0)
            heapq.heappush(heap,(-int(spread.max()),serial,ids,int(spread.argmax()))); serial+=1
        push(np.arange(len(vals)))
        while len(heap)<colours and -heap[0][0]>0:
            _,_,ids,axis=heapq.heappop(heap)
            ids=ids[np.argsort(vals[ids,axis],kind='stable')]; cut=len(ids)//2
            push(ids[:cut]); push(ids[cut:])
        mapped=np.empty_like(vals)
        for _,_,ids,_ in heap: mapped[ids]=np.round(vals[ids].mean(axis=0)).astype('uint8')
        arr[mm]=mapped
    # Lanczos edge contamination is repaired spatially on the retained silhouette.
    ss=arr.astype('int16'); excess=np.minimum(ss[...,0]-ss[...,1],ss[...,2]-ss[...,1])-52
    fix=mm&(excess>0); arr[...,1][fix]=np.minimum(255,ss[...,1][fix]+excess[fix]).astype('uint8')
    canvas=np.full((height+16,round(height*.75)+16,3),KEY,dtype='uint8'); mask=np.zeros(canvas.shape[:2],bool)
    x=(canvas.shape[1]-w)//2; canvas[8:8+height,x:x+w]=arr; mask[8:8+height,x:x+w]=mm
    return canvas,mask,int(fix.sum())
def office():
    atlas=Image.open(ROOT.parents[1]/'sprites'/'chars.png'); result=[]
    for i,name in enumerate(NAMES):
        im=atlas.crop((120*i+40,0,120*i+80,64)); a=np.array(im); m=a[...,3]>0
        result.append((name,a[...,:3],m))
    return result
def prepare():
    result=[]
    for p in sorted(ROOT.glob('[0-9][0-9]_*.png')):
        a,m,rep=clean(Image.open(p)); result.append((p.stem,a,m,rep))
    return result
def sweep():
    refs=office(); base=[dict(name=n,**metrics(a,m)) for n,a,m in refs]
    (OUT/'office-style-baseline.json').write_text(json.dumps(base,indent=2))
    data=prepare(); rows=[]
    for h in (56,60,64,68,72):
        for c in (768,1024,1280):
            vals=[metrics(*process(a,m,h,c)[:2]) for n,a,m,r in data]
            rows.append({'height':h,'colours':c,'pixel_min':min(v['effective_pixel_size_per_1000h'] for v in vals),'pixel_max':max(v['effective_pixel_size_per_1000h'] for v in vals),'colour_min':min(v['colours_at_192h'] for v in vals),'colour_max':max(v['colours_at_192h'] for v in vals),'pixel_median':float(np.median([v['effective_pixel_size_per_1000h'] for v in vals]))})
    (OUT/'parameter-sweep.json').write_text(json.dumps(rows,indent=2))
    print(json.dumps({'office':base,'sweep':rows},indent=2))
def grid():
    can=Image.new('RGB',(7*300,3*540),'#252525'); d=ImageDraw.Draw(can)
    for i,(n,a,m) in enumerate(office()):
        x=i%7*300;y=i//7*540; a[~m]=KEY; im=Image.fromarray(a).resize((280,448),Image.Resampling.NEAREST); can.paste(im,(x,y+30));d.text((x+4,y+4),n)
        for yy in range(12,38,2):
            d.line((x,y+30+yy*7,x+279,y+30+yy*7),fill=(100,160,190),width=1); d.text((x+2,y+31+yy*7),str(yy),fill='white')
    can.save(OUT/'office-anatomy-grid.png')
def chins():
    can=Image.new('RGB',(1470,630),'#252525'); d=ImageDraw.Draw(can)
    neck=[32,26,28,30,29,28,25,27,28,25,30,28,28,30,29,27,28,28,28,29,32]
    rows=[]
    for i,(n,a,m) in enumerate(office()):
        x=i%7*210;y=i//7*210; a[~m]=KEY
        can.paste(Image.fromarray(a[12:36,6:34]).resize((196,168),Image.Resampling.NEAREST),(x,y+22))
        d.text((x+2,y+2),n+' y='+str(neck[i]));d.line((x,y+22+(neck[i]-12)*7,x+195,y+22+(neck[i]-12)*7),fill='cyan',width=1)
        yy=np.where(m)[0]; top=int(yy.min()); h=int(yy.max()-yy.min()+1)
        rows.append({'name':n,'top_y':top,'height':h,'under_chin_y':neck[i],'uncertainty_px':1,'head_ratio':round((neck[i]-top)/h,5)})
    can.save(OUT/'office-chin-review.png');(OUT/'office-anatomical-heads.json').write_text(json.dumps(rows,indent=2))
def finish():
    refs=office(); data=prepare(); records=[]; entries=[]
    base=[metrics(a,m) for n,a,m in refs]; median=float(np.median([r['effective_pixel_size_per_1000h'] for r in base]))
    clo=min(r['colours_at_192h'] for r in base);chi=max(r['colours_at_192h'] for r in base)
    for n,a,m,repair in data:
        raw=np.array(Image.open(ROOT/(n+'.png')).convert('RGB'))
        out,mask,fix=process(a,m,62,1024); after=metrics(out,mask);before=metrics(raw,m)
        s=out.astype('int16');margin=int(60-np.minimum(s[...,0]-s[...,1],s[...,2]-s[...,1])[mask].max())
        yy,xx=np.where(mask)
        rec=dict(name=n,before=before,after=after,repairs=repair,post_quantization_rim_pixels=fix,margin=margin,
                 key_holes=int((keyed(out)&mask).sum()),components=len(component_sizes(mask)),
                 canvas=[out.shape[1],out.shape[0]],top=int(yy.min()),baseline=int(yy.max()),height=int(yy.max()-yy.min()+1),
                 pixel_deviation_percent=round(100*(after['effective_pixel_size_per_1000h']/median-1),2),
                 checks={'effective_pixel_size':abs(after['effective_pixel_size_per_1000h']/median-1)<=.15,'figure_colour_count':clo<=after['colours_at_192h']<=chi,
                         'key_holes':not bool((keyed(out)&mask).any()),'margin':margin>=8,'one_component':len(component_sizes(mask))==1})
        Image.fromarray(out).save(OUT/(n+'.png')); records.append(rec);entries.append((n,out,mask))
    (OUT/'manifest.json').write_text(json.dumps(records,indent=2))
    with (OUT/'manifest.csv').open('w',newline='') as f:
        w=csv.writer(f);w.writerow(['name','before_pixel_size','after_pixel_size','before_colours_192h','after_colours_192h','margin','key_holes','components','height','top','baseline'])
        for r in records:w.writerow([r['name'],r['before']['effective_pixel_size_per_1000h'],r['after']['effective_pixel_size_per_1000h'],r['before']['colours_at_192h'],r['after']['colours_at_192h'],r['margin'],r['key_holes'],r['components'],r['height'],r['top'],r['baseline']])
    # Enlarged review: office Intern first, all eight, same displayed figure height.
    display=[refs[0]]+entries
    can=Image.new('RGB',(9*190,370),'#242424');d=ImageDraw.Draw(can)
    for i,(n,a,m) in enumerate(display):
        a,m=crop(a,m);a=a.copy();a[~m]=KEY
        im=Image.fromarray(a).resize((round(a.shape[1]*248/a.shape[0]),248),Image.Resampling.NEAREST)
        can.paste(im,(i*190+(190-im.width)//2,44));d.text((i*190+4,12),n.replace('_',' '));d.text((i*190+4,310),'Office reference' if i==0 else '62h / 1024 max colours')
    can.save(OUT/'style-review.png')
    # Actual 40x64 game cells and 6x magnified cells, figure height 57 throughout.
    cells=Image.new('RGB',(40*9,64),tuple(KEY)); compare=Image.new('RGB',(40*9*5,64*5+100),'#242424');d=ImageDraw.Draw(compare)
    for i,(n,a,m) in enumerate(display):
        a,m=crop(a,m);a=a.copy();a[~m]=KEY
        im=Image.fromarray(a).resize((round(a.shape[1]*57/a.shape[0]),57),Image.Resampling.NEAREST)
        cells.paste(im,(i*40+(40-im.width)//2,4));d.text((i*200+4,350),n.replace('_',' '))
    cells.save(OUT/'game-cells-native.png');compare.paste(cells.resize((1800,320),Image.Resampling.NEAREST),(0,10));compare.save(OUT/'game-cells-5x.png')
    chins();print(json.dumps(records,indent=2))
if __name__=='__main__':
    import sys
    if sys.argv[1]=='sweep': sweep()
    if sys.argv[1]=='grid': grid()
    if sys.argv[1]=='chins': chins()
    if sys.argv[1]=='finish': finish()
