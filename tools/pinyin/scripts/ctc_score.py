import json,numpy as np,onnxruntime as ort,librosa,kaldi_native_fbank as knf
from pypinyin import pinyin,Style
D='models/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2024-07-17/'
sess=ort.InferenceSession(D+'model.onnx',providers=['CPUExecutionProvider'])
meta=sess.get_modelmeta().custom_metadata_map
nm=np.array([float(x) for x in meta['neg_mean'].split(',')],np.float32)
isd=np.array([float(x) for x in meta['inv_stddev'].split(',')],np.float32)
tok={l.rsplit(' ',1)[0]:int(l.rsplit(' ',1)[1]) for l in open(D+'tokens.txt',encoding='utf8')}
bank=json.load(open('tghz_syllables.json'))
B=sorted(json.load(open('bank_raw.json')))
# candidate chars: all TGHZ chars per syllable (full list), mono-reading preferred
import collections
full=collections.defaultdict(list)
for line in open('unihan/Unihan_Readings.txt',encoding='utf8'):
    if '\tkTGHZ2013\t' not in line: continue
    cp,_,val=line.rstrip('\n').split('\t'); ch=chr(int(cp[2:],16))
    import unicodedata
    for part in val.split(' '):
        for r in part.split(':')[1].split(','):
            d=unicodedata.normalize('NFD',r); t=5;o=''
            for c in d:
                if c in '\u0304\u0301\u030c\u0300': t='\u0304\u0301\u030c\u0300'.index(c)+1
                elif c=='\u0308': o=o[:-1]+'v'
                else: o+=c
            full[f'{o}{t}'].append(ch)
cand={}
for s in B:
    cs=[c for c in dict.fromkeys(full[s]) if c in tok]
    mono=[c for c in cs if len(set(pinyin(c,style=Style.TONE3,heteronym=True)[0]))==1]
    cand[s]=[tok[c] for c in (mono or cs)][:40]
def feats(path):
    y=librosa.load(path,sr=16000)[0]
    y=np.concatenate([np.zeros(3200),y,np.zeros(4800)])*32768
    o=knf.FbankOptions(); o.frame_opts.dither=0; o.frame_opts.snip_edges=True; o.frame_opts.samp_freq=16000; o.mel_opts.num_bins=80; o.frame_opts.window_type='hamming'
    fb=knf.OnlineFbank(o); fb.accept_waveform(16000,y.tolist()); fb.input_finished()
    F=np.array([fb.get_frame(i) for i in range(fb.num_frames_ready)],np.float32)
    pad=np.concatenate([np.repeat(F[:1],3,0),F]); T=(len(F)+5)//6
    L=[]
    for i in range(T):
        w=pad[i*6:i*6+7]
        if len(w)<7: w=np.concatenate([w,np.repeat(pad[-1:],7-len(w),0)])
        L.append(w.reshape(-1))
    X=(np.array(L,np.float32)+np.tile(nm,1))*np.tile(isd,1)
    return X
def logsoftmax(a): a=a-a.max(-1,keepdims=True); return a-np.log(np.exp(a).sum(-1,keepdims=True))
def ctc1(lp,c):
    # path: blank* c+ blank*
    b=lp[:,0]; x=lp[:,c]; T=len(lp)
    a0=b[0]; a1=x[0]; a2=-1e30
    for t in range(1,T):
        n0=a0+b[t]; n1=np.logaddexp(a0,a1)+x[t]; n2=np.logaddexp(a1,a2)+b[t]
        a0,a1,a2=n0,n1,n2
    return np.logaddexp(a1,a2)
out={}
for i,k in enumerate(B):
    X=feats(f'audio_wav/{k}.wav')[None]
    lg=sess.run(None,{'x':X,'x_length':np.array([X.shape[1]],np.int32),'language':np.array([3],np.int32),'text_norm':np.array([15],np.int32)})[0][0]
    lp=logsoftmax(lg[4:])
    # quick prefilter: tokens with high max posterior
    sc={}
    for s,cs in cand.items():
        if cs: sc[s]=max(ctc1(lp,c) for c in cs) if len(cs)<6 else max(ctc1(lp,c) for c in sorted(cs,key=lambda c:-lp[:,c].max())[:5])
    rank=sorted(sc,key=lambda s:-sc[s])
    out[k]={'rank':rank.index(k)+1 if k in sc else None,'top':rank[:5],'margin':float(sc.get(k,-1e9)-max(v for s,v in sc.items() if s!=k)) }
    if i%100==0: print(i,k,out[k],flush=True)
json.dump(out,open('ctc_rank.json','w'))
