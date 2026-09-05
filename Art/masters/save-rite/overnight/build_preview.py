from pathlib import Path
import json,base64
from animation import HERE,OUT

def run():
    rows=[]
    for name,master in sorted(json.loads((HERE/'cast-paths.json').read_text()).items()):
        row={'name':name,'walks':{},'seats':{}}
        for kind,key in [('walk','walks'),('sit','seats')]:
            for d in ['down','up','left','right']:
                p=OUT/f'{kind}_{name}_{d}.png'
                if p.exists():row[key][d]='data:image/png;base64,'+base64.b64encode(p.read_bytes()).decode()
        rows.append(row)
    html='''<!doctype html><meta charset="utf-8"><title>Save-Rite cast review</title>
<style>body{margin:24px;background:#202526;color:#e8e8e3;font:16px system-ui}header{max-width:950px}select,button{font:inherit;padding:8px;margin:6px}main{display:flex;gap:16px;flex-wrap:wrap}article{background:#333b39;padding:12px;border-radius:8px}canvas{image-rendering:pixelated;max-width:100%;display:block}p{max-width:850px;color:#c1c8c3}h2{font-size:18px}</style>
<header><h1>Save-Rite placeholder cast</h1><p>Inspect the actual delivered PNGs with the game's colour key applied. Walk order is stride → neutral → opposite stride → neutral. Technical and visual flags are in MORNING-REPORT.md; this viewer is not an in-game integration test.</p>
<select id="person"></select><button id="play">Pause</button><button id="step">Next frame</button><select id="scale"><option value="1">1×</option><option value="2">2×</option><option selected value="3">3×</option></select><span id="frame"></span></header><main id="walks"></main><h2>Seated facings, where required</h2><main id="seats"></main>
<script>const cast=DATA;let ix=0,tick=0,playing=true,images=[];const cycle=[0,1,2,1];
function surface(im){let c=document.createElement('canvas');c.width=im.width;c.height=im.height;let x=c.getContext('2d');x.drawImage(im,0,0);let p=x.getImageData(0,0,c.width,c.height);for(let i=0;i<p.data.length;i+=4){let r=p.data[i],g=p.data[i+1],b=p.data[i+2];if(r-g>60&&b-g>60)p.data[i+3]=0}x.putImageData(p,0,0);return c}
function draw(){let scale=Number(document.querySelector('#scale').value);for(let r of images){let x=r.canvas.getContext('2d');x.clearRect(0,0,r.canvas.width,r.canvas.height);if(r.kind==='walk')x.drawImage(r.source,cycle[tick]*184,0,184,295,0,0,184,295);else x.drawImage(r.source,0,0);r.canvas.style.width=r.canvas.width*(r.kind==='walk'?scale:1)+'px'}document.querySelector('#frame').textContent='Cell '+cycle[tick]+' (zero-based)'}
async function select(){images=[];document.querySelector('#walks').replaceChildren();document.querySelector('#seats').replaceChildren();let row=cast[ix];for(let [key,kind]of [['walks','walk'],['seats','sit']])for(let [d,src]of Object.entries(row[key])){let im=new Image;im.src=src;await im.decode();let article=document.createElement('article'),h=document.createElement('h2'),c=document.createElement('canvas');h.textContent=d;c.width=kind==='walk'?184:416;c.height=kind==='walk'?295:416;article.append(h,c);document.querySelector('#'+key).append(article);images.push({source:surface(im),canvas:c,kind})}draw()}
cast.forEach((x,i)=>{let o=document.createElement('option');o.value=i;o.textContent=x.name.replaceAll('_',' ');person.append(o)});person.onchange=()=>{ix=Number(person.value);select()};play.onclick=()=>{playing=!playing;play.textContent=playing?'Pause':'Play'};step.onclick=()=>{playing=false;play.textContent='Play';tick=(tick+1)%4;draw()};scale.onchange=draw;setInterval(()=>{if(playing){tick=(tick+1)%4;draw()}},180);select();</script>'''.replace('DATA',json.dumps(rows))
    (HERE/'CAST-PREVIEW.html').write_text(html,encoding='utf-8');print('Saved CAST-PREVIEW.html')
if __name__=='__main__':run()
