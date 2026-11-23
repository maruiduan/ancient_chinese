import hashlib,os,shutil,glob
out='site/pinyin'
for f in glob.glob(out+'/app.*')+glob.glob(out+'/data.*')+[out+'/index.html']:
    if os.path.exists(f): os.remove(f)
def put(name,data,ext):
    h=hashlib.sha256(data).hexdigest()[:12]; fn=f'{name}.{h}.{ext}'
    open(f'{out}/{fn}','wb').write(data); return fn
css=put('app',open('src/app.css','rb').read(),'css')
js=put('app',open('src/app.js','rb').read(),'js')
data=put('data',open('build_data.js','rb').read(),'js')
html=open('src/index.html').read().replace('{{CSS}}',css).replace('{{JS}}',js).replace('{{DATA}}',data)
open(f'{out}/index.html','w').write(html)
# 字体也用哈希名，长缓存
print(css,js,data)
