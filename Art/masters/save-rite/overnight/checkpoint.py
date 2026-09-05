from pathlib import Path
import sys,json,shutil,hashlib
import numpy as np
from PIL import Image
HERE=Path(__file__).resolve().parent;ROOT=HERE.parent;sys.path.insert(0,str(ROOT))
from corrected_baseline import measure,light
from style_pass import clean,keyed
from audit import flood_border
def atomic(path,data):
    tmp=path.with_suffix('.tmp');tmp.write_text(json.dumps(data,indent=2),encoding='utf-8');tmp.replace(path)
def master(name,source,attempt=0):
    rawdir=HERE/'masters-raw';rawdir.mkdir(exist_ok=True);dest=rawdir/(name+('.attempt'+str(attempt) if attempt else '')+'.png');shutil.copyfile(source,dest)
    journal=HERE/'outputs.jsonl'
    with journal.open('a',encoding='utf-8') as f:f.write(json.dumps({'event':'raw_saved','name':name,'path':str(dest),'source':source,'attempt':attempt})+'\n')
    im=Image.open(dest);a=np.array(im.convert('RGB'));m=~flood_border(keyed(a));r=measure(a,m);r.update(name=name,source=source,raw=str(dest),attempt=attempt,anatomical_head_ratio=None,head_check='pending manual annotation')
    ca,cm,rep=clean(im);ar,ma=light(ca,cm);outdir=HERE/'masters-light';outdir.mkdir(exist_ok=True);out=outdir/(name+'.png');Image.fromarray(ar).save(out)
    # Reopen saved output, rather than trust the construction mask.
    aa=np.array(Image.open(out).convert('RGB'));mm=~flood_border(keyed(aa));r['light']=measure(aa,mm);r['repairs']=rep;r['output']=str(out)
    manifest=HERE/'master-manifest.json';data=json.loads(manifest.read_text()) if manifest.exists() else {};data[name]=r;atomic(manifest,data)
    with journal.open('a',encoding='utf-8') as f:f.write(json.dumps({'event':'measured','name':name,'attempt':attempt,'light':r['light']})+'\n')
    print(json.dumps({'name':name,'raw_bbox':r['bbox'],'width_height':r['width_height'],'light':r['light']}))
if __name__=='__main__':master(sys.argv[1],sys.argv[2],int(sys.argv[3]) if len(sys.argv)>3 else 0)
