import hashlib,os,shutil,glob
out='site/pinyin'
for f in glob.glob(out+'/app.*')+glob.glob(out+'/data.*')+glob.glob(out+'/chars.*')+[out+'/index.html']:
    if os.path.exists(f): os.remove(f)
def put(name,data,ext):
    h=hashlib.sha256(data).hexdigest()[:12]; fn=f'{name}.{h}.{ext}'
    open(f'{out}/{fn}','wb').write(data); return fn
css=put('app',open('src/app.css','rb').read(),'css')
js=put('app',open('src/app.js','rb').read(),'js')
data=put('data',open('build_data.js','rb').read(),'js')
charsf=put('chars',open('chars_data.js','rb').read(),'js')
# 像素字体：Fusion Pixel Font（OFL），只保留界面用到的字，改名 LuccaPixel
from fontTools.ttLib import TTFont
from fontTools import subset
import io
chars=set(chr(c) for c in range(32,127))|set('×·…—“”‘’！？，。：；（）《》、　←→')
for f in glob.glob('src/*.html')+glob.glob('src/*.js'):
    chars|=set(open(f,encoding='utf-8').read())
for f in glob.glob(out+'/fonts/pixel.*.woff2'): os.remove(f)
ft=TTFont('fusion/fusion-pixel-12px-proportional-zh_hans.ttf.woff2')
opt=subset.Options(); opt.flavor='woff2'; opt.layout_features=['*']; opt.name_IDs=['*']
sub=subset.Subsetter(opt); sub.populate(text=''.join(sorted(chars))); sub.subset(ft)
for rec in ft['name'].names:
    if rec.nameID in (1,4,16): rec.string='LuccaPixel'
    elif rec.nameID==6: rec.string='LuccaPixel-Regular'
ft.flavor='woff2'; b=io.BytesIO(); ft.save(b)
pixel='fonts/'+put('fonts/pixel',b.getvalue(),'woff2').split('/')[-1]
shutil.copy('fusion/OFL.txt',out+'/fonts/OFL-fusion.txt')
html=open('src/index.html').read().replace('{{PIXEL}}',pixel).replace('{{CSS}}',css).replace('{{JS}}',js).replace('{{DATA}}',data).replace('{{CHARS}}',charsf)
open(f'{out}/index.html','w').write(html)
# 字体也用哈希名，长缓存
print(css,js,data,pixel)
