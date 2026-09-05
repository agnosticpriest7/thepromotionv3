from animation import *
out={}
for n in ['jax','karl','kyle','nwh','raelee','rod','stacie']:
    im=Image.open(ROOT.parents[1]/'sprites'/f'walk_{n}_left.png');w=im.width//3;frames=[];info=[]
    for f in range(3):
        a,r=normalize_walk(im.crop((f*w,0,(f+1)*w,im.height)));frames.append(a);info.append(r)
    out[n]=alternation(np.concatenate(pack_heads(frames,info),axis=1))
(HERE/'reference-profile-iou-current-method.json').write_text(json.dumps(out,indent=2));print(json.dumps(out))
