import json,re,collections,hashlib,os,shutil,sys
sys.path.insert(0,'scripts'); from pinyin_lib import *
bank=json.load(open('bank_final.json'))
# frequency from kHanyuPinlu
import unicodedata
def parse(s):
    d=unicodedata.normalize('NFD',s); t=5;o=''
    for c in d:
        if c in '\u0304\u0301\u030c\u0300': t='\u0304\u0301\u030c\u0300'.index(c)+1
        elif c=='\u0308': o=o[:-1]+'v'
        else: o+=c
    return f'{o}{t}'
fq=collections.Counter()
for line in open('unihan/Unihan_Readings.txt',encoding='utf8'):
    if '\tkHanyuPinlu\t' in line:
        val=line.rstrip('\n').split('\t')[2]
        for m in re.finditer(r'([^\s(]+)\((\d+)\)',val): fq[parse(m.group(1))]+=int(m.group(2))
INI_ORDER=['b','p','m','f','d','t','n','l','g','k','h','j','q','x','zh','ch','sh','r','z','c','s','y','w','']
FIN_ORDER=['a','o','e','i','u','v','ai','ei','ui','ao','ou','iu','ie','ve','er','an','en','in','un','vn','ang','eng','ing','ong','ia','io','ua','uo','uai','iao','ian','iang','uan','van','uang','iong','ueng']
bases=sorted({k[:-1] for k in bank})
def bkey(b):
    i,_=split(b); f=phon_final(b)
    return (INI_ORDER.index(i), FIN_ORDER.index(f) if f in FIN_ORDER else 99, b)
for b in bases:
    if phon_final(b) not in FIN_ORDER: print('unknown final',b,phon_final(b))
bases.sort(key=bkey)
# audio hashing
out='site/pinyin'; os.makedirs(out+'/audio',exist_ok=True)
for f in os.listdir(out+'/audio'): os.remove(out+'/audio/'+f)
A={}
for k in bank:
    data=open(f'audio_out/{k}.mp3','rb').read(); h=hashlib.sha256(data).hexdigest()[:12]
    fn=f'{k}.{h}.mp3'; open(f'{out}/audio/{fn}','wb').write(data); A[k]=h
ranks={k:i for i,k in enumerate(sorted(bank,key=lambda k:-fq[k]))}
B=[]
for b in bases:
    i,_=split(b)
    tones=[t for t in (1,2,3,4) if f'{b}{t}' in bank]
    B.append({'b':b,'i':i,'f':phon_final(b),'w':1 if b in WHOLE else 0,'t':tones,
              'n':{t:neighbors(b,set(bases)) for t in [0]}[0],
              'h':{t:A[f'{b}{t}'] for t in tones},'r':{t:ranks[f'{b}{t}'] for t in tones},
              'c':{t:''.join(bank[f'{b}{t}'][:3]) for t in tones}})
excl=json.load(open('excluded_verify.json'))
data={'bases':B,'count':len(bank),'excludedVerify':excl}
js='window.PY='+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';'
open('build_data.js','w').write(js)
print(len(B),len(bank),len(js))
