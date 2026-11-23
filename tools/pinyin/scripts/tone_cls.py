import json,numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import cross_val_predict
F=json.load(open('f0.json'))
allf=np.concatenate([np.array([np.nan if x is None else x for x in v],float) for v in F.values()]); med=np.nanmedian(allf)
X=[];y=[];K=[]
for k,v in F.items():
    f=np.array([np.nan if x is None else x for x in v],float); idx=np.where(~np.isnan(f))[0]
    if len(idx)<5: print('few voiced',k,len(idx)); continue
    # longest voiced run
    runs=np.split(idx,np.where(np.diff(idx)>3)[0]+1); r=max(runs,key=len)
    seg=f[r[0]:r[-1]+1].copy(); mm=np.nanmedian(seg)
    for _ in range(2):
        seg=np.where(seg>mm*1.7,seg/2,seg); seg=np.where(seg<mm/1.7,seg*2,seg)
    f=f.copy(); f[r[0]:r[-1]+1]=seg
    st=12*np.log2(f[r[0]:r[-1]+1]/med); st=np.interp(np.arange(len(st)),np.where(~np.isnan(st))[0],st[~np.isnan(st)])
    c=np.interp(np.linspace(0,len(st)-1,12),np.arange(len(st)),st)
    feat=list(c)+[c[-1]-c[0],c.min(),np.argmin(c)/11,c.max()-c.min(),len(st)*0.01, c[:4].mean()-c[4:8].mean(), c[8:].mean()-c[4:8].mean()]
    X.append(feat);y.append(int(k[-1]));K.append(k)
X=np.array(X);y=np.array(y)
clf=RandomForestClassifier(500,random_state=0,min_samples_leaf=2)
P=cross_val_predict(clf,X,y,cv=10,method='predict_proba')
pred=P.argmax(1)+1
acc=(pred==y).mean(); print('cv acc',acc,len(y))
from collections import Counter
print(Counter(zip(y,pred)))
flag=[(K[i],int(y[i]),int(pred[i]),round(float(P[i,y[i]-1]),2)) for i in range(len(y)) if P[i,y[i]-1]<0.25]
print('flag',len(flag),flag)
json.dump({K[i]:[float(p) for p in P[i]] for i in range(len(y))},open('tone_proba.json','w'))
