import json,sherpa_onnx,librosa,numpy as np
D='models/sherpa-onnx-paraformer-zh-2024-03-09/'
rec=sherpa_onnx.OfflineRecognizer.from_paraformer(paraformer=D+'model.int8.onnx',tokens=D+'tokens.txt',num_threads=6)
bank=sorted(json.load(open('bank_raw.json')))
out={}
for k in bank:
    y=librosa.load(f'audio_wav/{k}.wav',sr=16000)[0].astype(np.float32)
    y=np.concatenate([np.zeros(3200,np.float32),y,np.zeros(6400,np.float32)])
    s=rec.create_stream(); s.accept_waveform(16000,y); rec.decode_stream(s)
    out[k]=s.result.text
json.dump(out,open('asr_pf.json','w'),ensure_ascii=False)
