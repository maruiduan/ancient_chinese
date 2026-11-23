import json,numpy as np,sys
sys.path.insert(0,'scripts'); from pinyin_lib import *
S=np.load('ctc_S.npy'); B=json.load(open('ctc_B.json')); ix={k:i for i,k in enumerate(B)}
bases={k[:-1] for k in B}
TP=json.load(open('tone_proba.json'))
res={}
for s in B:
    b,t=s[:-1],int(s[-1]); pairs=[]
    for nb,why in neighbors(b,bases).items():
        for tt in [t]+[x for x in (1,2,3,4) if x!=t]:
            n=f'{nb}{tt}'
            if n in ix: pairs.append((n,why)); break
    for tt in (1,2,3,4):
        n=f'{b}{tt}'
        if tt!=t and n in ix: pairs.append((n,'tone'))
    out=[]
    for n,why in pairs:
        a,c=ix[s],ix[n]
        if S[a,a]<-1e8 or S[a,c]<-1e8: continue
        D=(S[a,a]-S[a,c])-(S[c,a]-S[c,c])
        out.append((n,why,round(float(D),2)))
    res[s]=out
fails={s:[x for x in v if x[2]<0] for s,v in res.items()}
seg_fail={s:[x for x in v if x[1]!='tone'] for s,v in fails.items()}
tone_fail={s:[x for x in v if x[1]=='tone'] for s,v in fails.items()}
npairs=sum(len(v) for v in res.values()); nf=sum(len(v) for v in fails.values())
print('pairs',npairs,'fail',nf)
# a syllable suspicious if it fails >=2 pairs or one pair with D<-3, or tone fail + tone classifier disagree
sus={}
for s,v in fails.items():
    tp=TP[s][int(s[-1])-1]
    seg=[x for x in v if x[1]!='tone']; ton=[x for x in v if x[1]=='tone']
    reasons=[]
    if len(seg)>=2 or any(x[2]<-3 for x in seg): reasons.append(('seg',seg))
    if (ton and tp<0.5) or tp<0.2: reasons.append(('tone',ton,round(tp,2)))
    if reasons: sus[s]=reasons
print('suspicious',len(sus))
for s,r in sorted(sus.items()): print(s,r)
json.dump({'pairs':res,'sus':sus},open('contrast.json','w'))
