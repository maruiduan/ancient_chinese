import parselmouth,numpy as np,json
B=sorted(json.load(open('bank_raw.json'))); out={}
for k in B:
    s=parselmouth.Sound(f'audio_wav/{k}.wav'); p=s.to_pitch_ac(time_step=0.01,pitch_floor=75,pitch_ceiling=600,octave_jump_cost=0.6,voicing_threshold=0.35)
    f=p.selected_array['frequency'].astype(float); f[f==0]=np.nan
    out[k]=[None if np.isnan(x) else float(x) for x in f]
json.dump(out,open('f0.json','w'))
