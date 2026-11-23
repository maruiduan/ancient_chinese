import json,re
from pypinyin import pinyin, Style
def readings(ch):
    if re.match(r'[a-z]',ch): return set()
    r=pinyin(ch,style=Style.TONE3,heteronym=True,neutral_tone_with_five=True)
    return {x.replace('ü','v') for x in r[0]} if r else set()
def judge(k,t):
    t=t.strip('。，？！ ').lower()
    b=k[:-1]
    lat=re.sub(r'[^a-z]','',t)
    if lat and lat in (b,b.replace('v','u'),b+k[-1]): return 'base'
    rs=set()
    for ch in t[:2]: rs|=readings(ch)
    if k in rs: return 'tone'
    if b in {r[:-1] for r in rs}: return 'base'
    return 'no'
res={}
for name in ['sv','pf']:
    a=json.load(open(f'asr_{name}.json'))
    res[name]={k:(judge(k,t),t) for k,t in a.items()}
ks=sorted(res['sv'])
both_no=[k for k in ks if res['sv'][k][0]=='no' and res['pf'][k][0]=='no']
any_base=[k for k in ks if 'no'!=res['sv'][k][0] or 'no'!=res['pf'][k][0]]
any_tone=[k for k in ks if 'tone' in (res['sv'][k][0],res['pf'][k][0])]
print('pf base',sum(v[0]!='no' for v in res['pf'].values()),'any base',len(any_base),'any tone',len(any_tone),'both no',len(both_no))
print([(k,res['sv'][k][1],res['pf'][k][1]) for k in both_no])
json.dump({k:{'sv':res['sv'][k],'pf':res['pf'][k]} for k in ks},open('asr_judge.json','w'),ensure_ascii=False)
