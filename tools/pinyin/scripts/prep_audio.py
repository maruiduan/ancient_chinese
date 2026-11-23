import json,subprocess,librosa,numpy as np,soundfile as sf,os,tempfile,concurrent.futures as cf
bank=json.load(open('bank_final.json'))
SR=32000
def src(k): return f'commons/{k}.ogg' if k in ('ju4','ren4','gang1') else f'audio-cmn/64k/syllabs/cmn-{k}.mp3'
def proc(k):
    y,_=librosa.load(src(k),sr=SR,mono=True)
    hop=int(SR*0.005)
    rms=librosa.feature.rms(y=y,frame_length=hop*4,hop_length=hop)[0]
    db=20*np.log10(rms+1e-9); pk=db.max()
    act=np.where(db>pk-38)[0]
    s=max(0,act[0]*hop-int(0.06*SR)); e=min(len(y),act[-1]*hop+hop*4+int(0.10*SR))
    seg=y[s:e].copy()
    f=int(0.01*SR); seg[:f]*=np.linspace(0,1,f); seg[-f*3:]*=np.linspace(1,0,f*3)
    seg=np.concatenate([np.zeros(int(0.02*SR)),seg])
    # peak normalize to -1.5 dBFS then RMS-ish normalize via loudnorm in ffmpeg
    seg=seg/np.abs(seg).max()*0.84
    tmp=tempfile.mktemp(suffix='.wav'); sf.write(tmp,seg,SR)
    r=subprocess.run(['ffmpeg','-nostdin','-loglevel','error','-y','-i',tmp,'-ac','1','-codec:a','libmp3lame','-b:a','56k',f'audio_out/{k}.mp3'],capture_output=True,text=True)
    wav=f'audio_wav/{k}.wav'; sf.write(wav,seg,SR)
    os.remove(tmp)
    return k,len(seg)/SR,r.returncode
os.makedirs('audio_out',exist_ok=True); os.makedirs('audio_wav',exist_ok=True)
with cf.ProcessPoolExecutor(8) as ex: res=list(ex.map(proc,bank))
d=np.array([x[1] for x in res]); print('fail',[x for x in res if x[2]]); print('dur min/med/max',d.min(),np.median(d),d.max())
print(sorted(res,key=lambda x:x[1])[:5], sorted(res,key=lambda x:-x[1])[:5])
json.dump({k:round(t,3) for k,t,_ in res},open('durations.json','w'))
