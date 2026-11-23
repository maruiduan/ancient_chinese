import json,sherpa_onnx,librosa,numpy as np,sys
D='models/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2024-07-17/'
rec=sherpa_onnx.OfflineRecognizer.from_sense_voice(model=D+'model.int8.onnx',tokens=D+'tokens.txt',language='zh',use_itn=False,num_threads=4)
bank=sorted(json.load(open('bank_raw.json')))
if len(sys.argv)>1: bank=bank[:int(sys.argv[1])]
out={}
for k in bank:
    y=librosa.load(f'audio_wav/{k}.wav',sr=16000)[0].astype(np.float32)
    y=np.concatenate([np.zeros(3200,np.float32),y,np.zeros(6400,np.float32)])
    s=rec.create_stream(); s.accept_waveform(16000,y); rec.decode_stream(s)
    out[k]=s.result.text
json.dump(out,open('asr_sv.json','w'),ensure_ascii=False)
print(list(out.items())[:40])
