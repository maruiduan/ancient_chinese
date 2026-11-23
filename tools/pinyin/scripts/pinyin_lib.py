INITIALS=['zh','ch','sh','b','p','m','f','d','t','n','l','g','k','h','j','q','x','r','z','c','s','y','w']
def split(b):
    for i in INITIALS:
        if b.startswith(i) and len(b)>len(i): return i,b[len(i):]
    return '',b
def phon_final(b):
    i,f=split(b)
    if i in 'jqxy' and i and f.startswith('u'): f='v'+f[1:]
    if i=='y':
        m={'i':'i','a':'ia','e':'ie','ao':'iao','ou':'iu','an':'ian','in':'in','ang':'iang','ing':'ing','ong':'iong','v':'v','ve':'ve','van':'van','vn':'vn','o':'io'}
        return m.get(f,f)
    if i=='w':
        m={'u':'u','a':'ua','o':'uo','ai':'uai','ei':'ui','an':'uan','en':'un','ang':'uang','eng':'ueng'}
        return m.get(f,f)
    if f=='uei': f='ui'
    return f
WHOLE={'zhi','chi','shi','ri','zi','ci','si','yi','wu','yu','ye','yue','yuan','yin','yun','ying'}
def mark(b,t):
    s=b.replace('v','ü')
    if t not in (1,2,3,4): return s
    M={'a':'āáǎà','e':'ēéěè','i':'īíǐì','o':'ōóǒò','u':'ūúǔù','ü':'ǖǘǚǜ'}
    if 'a' in s: idx=s.index('a')
    elif 'e' in s: idx=s.index('e')
    elif 'ou' in s: idx=s.index('o')
    else:
        idx=max(i for i,c in enumerate(s) if c in 'aeiouü')
    return s[:idx]+M[s[idx]][t-1]+s[idx+1:]
INI_SWAP=[('b','d'),('p','q'),('b','p'),('d','t'),('g','k'),('n','l'),('z','zh'),('c','ch'),('s','sh'),('f','h'),('j','q'),('q','x'),('j','x'),('zh','ch'),('ch','sh'),('zh','j'),('ch','q'),('sh','x'),('r','l'),('m','n'),('h','k')]
FIN_SWAP=[('an','ang'),('en','eng'),('in','ing'),('ian','iang'),('uan','uang'),('ai','ei'),('ao','ou'),('ou','uo'),('iu','ui'),('ie','ve'),('u','v'),('i','v'),('o','e'),('un','ong'),('uo','o'),('ia','ie'),('an','en'),('ang','eng'),('ing','iong'),('eng','ong'),('iao','iu'),('ua','uo'),('ei','ui'),('ou','iu')]
def to_int(b):
    i,f=split(b)
    if i in ('j','q','x','y') and f.startswith('u'): f='v'+f[1:]
    return i,f
def respell(i,f):
    if i in ('j','q','x','y') and f.startswith('v'): f='u'+f[1:]
    return i+f
YW={('yu','yi'),('yu','wu'),('yue','ye'),('yin','ying'),('yun','yin'),('yuan','yan'),('yi','ye'),('wu','wo'),('you','yao'),('wei','wai'),('wen','weng'),('wan','wang'),('yan','yang'),('yong','ying')}
def neighbors(b,bases):
    i,f=to_int(b); out={}
    for A,B in YW:
        for x,y in ((A,B),(B,A)):
            if b==x and y in bases: out[y]='yw:'+x+'/'+y
    for A,B in INI_SWAP:
        for x,y in ((A,B),(B,A)):
            if i==x:
                c=respell(y,f)
                if c in bases and c!=b: out[c]='i:'+x+'/'+y
    # finals on spelled form; handle j/q/x/y u==ü
    for A,B in FIN_SWAP:
        for x,y in ((A,B),(B,A)):
            if f==x:
                c=respell(i,y)
                if c in bases and c!=b: out.setdefault(c,'f:'+x+'/'+y)
    return out
