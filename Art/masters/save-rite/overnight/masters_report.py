from pathlib import Path
import sys,json,csv
import numpy as np
from PIL import Image,ImageDraw
HERE=Path(__file__).resolve().parent;ROOT=HERE.parent;sys.path.insert(0,str(ROOT))
from corrected_baseline import measure,references,sheet
from style_pass import keyed
from audit import flood_border,similarities
CHINS={13:438,14:401,15:439,16:403,17:370,18:451,19:434,20:459,25:485,26:474,27:438,28:470,29:451,30:449,31:420,32:442,33:520,34:451}
def run():
    data=json.loads((HERE/'master-manifest.json').read_text());base=json.loads((ROOT/'current-cast/baseline.json').read_text());cmin=min(r['colours_at_192h'] for r in base);cmax=max(r['colours_at_192h'] for r in base)
    lines=['# New master measurements','','Flags are literal brief failures, not concealed approvals. Anatomical boundaries were placed manually under the chin; uncertainty is +/- 8 source pixels. Hair/caps count in figure and head height. Uniform colours are not artificially padded to increase exact-RGB counts.','','| Character | W/H light | Head % raw | Pixel size | Colours at 192h | Margin | Flags |','|---|---:|---:|---:|---:|---:|---|']
    can=Image.new('RGB',(6*360,3*570),'#252525');d=ImageDraw.Draw(can)
    for i,(n,r) in enumerate(sorted(data.items())):
        chin=CHINS[int(n[:2])];r['under_chin_y']=chin;r['manual_uncertainty_px']=8;r['anatomical_head_ratio']=(chin-r['bbox'][1])/r['height'];r['head_check']='manual under-chin, includes hair/cap, not neck or narrowest-row heuristic'
        a=np.array(Image.open(r['output']).convert('RGB'));m=~flood_border(keyed(a));lr=measure(a,m);r['light']=lr
        r['checks']={k:bool(v) for k,v in {'width':.41<=lr['width_height']<=.49,'head':.34<=r['anatomical_head_ratio']<=.36,'pixel':3.97*.85<=lr['effective_pixel_size_per_1000h']<=3.97*1.15,'colours':cmin<=lr['colours_at_192h']<=cmax,'margin':lr['margin']>=8,'holes':lr['holes']==0,'components':lr['components']==1}.items()}
        flags=', '.join(k for k,v in r['checks'].items() if not v) or 'none'
        lines.append(f"| {n} | {lr['width_height']:.3f} | {r['anatomical_head_ratio']*100:.1f} | {lr['effective_pixel_size_per_1000h']:.3f} | {lr['colours_at_192h']} | {lr['margin']} | {flags} |")
        im=Image.open(r['raw']).convert('RGB');b=r['bbox'];im=im.crop((b[0],b[1],b[2],int(b[1]+r['height']*.52)));scale=min(340/im.width,500/im.height);im=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.NEAREST);x=i%6*360+(360-im.width)//2;y=i//6*570+35;can.paste(im,(x,y));yy=round(y+(chin-b[1])*scale);d.line((x,yy,x+im.width,yy),fill='cyan',width=2);d.text((i%6*360+3,i//6*570+8),n);d.text((i%6*360+3,i//6*570+550),f'chin y={chin}; head={r["anatomical_head_ratio"]*100:.1f}%')
    (HERE/'master-manifest.json').write_text(json.dumps(data,indent=2));can.save(HERE/'manual-chin-review.png');(HERE/'MASTERS.md').write_text('\n'.join(lines),encoding='utf-8')
    entries=[];paths=[]
    for directory in [ROOT/'current-cast/batch1-light',ROOT/'batch2/light',HERE/'masters-light']:
        for p in directory.glob('[0-9][0-9]_*.png'):paths.append(p)
    for p in sorted(paths,key=lambda p:p.name):
        a=np.array(Image.open(p).convert('RGB'));m=~flood_border(keyed(a));entries.append((p.stem,a,m))
    refs=references();blank=[('',np.full((1,1,3),255,dtype='uint8'),np.ones((1,1),bool))]*3
    sheet(refs+blank+entries,HERE/'all-34-v-five-baselines.png',cols=8,fh=262)
    sheet(refs,HERE/'five-named-baselines.png',cols=5,fh=262)
    pairs=similarities([(n,Image.fromarray(a),m) for n,a,m in entries],'overnight/all34')
    bp=similarities([(n,Image.fromarray(a),m) for n,a,m in refs],'overnight/current-five')
    (HERE/'cast-paths.json').write_text(json.dumps({p.stem:str(p) for p in sorted(paths,key=lambda p:p.name)},indent=2))
    print(json.dumps({'masters':len(data),'all_cast':len(entries),'nearest':pairs[:3],'baseline_nearest':bp[:1]}))
if __name__=='__main__':run()
