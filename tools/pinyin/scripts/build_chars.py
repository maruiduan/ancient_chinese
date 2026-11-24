"""字库：给每个带调音节配上常用字。
u = 拼音认字用（多半还不认识的一级常用字），z = 按音找字的正确答案（已学过的字），
d = 找字时当干扰项用的字，s = 字形相近（同声旁）的干扰字。R = 每个字的全部读音，用来排除多音字。"""
import re, json, unicodedata, collections, glob
TONE = {'\u0304':1,'\u0301':2,'\u030c':3,'\u0300':4}
def key(s):
    d = unicodedata.normalize('NFD', s); t = 5; o = ''
    for ch in d:
        if ch in TONE: t = TONE[ch]
        elif ch == '\u0308': o = o[:-1] + 'v'
        else: o += ch
    return o + str(t)
bank = set(json.load(open('bank_final.json')))
tg = collections.defaultdict(set); pin = collections.defaultdict(dict); mand = {}; tgh = {}; phon = collections.defaultdict(set)
for line in open('unihan/Unihan_Readings.txt', encoding='utf8'):
    if line.startswith('#') or not line.strip(): continue
    cp, f, v = line.rstrip('\n').split('\t'); ch = chr(int(cp[2:], 16))
    if f == 'kTGHZ2013':
        for part in v.split(' '):
            for r in part.split(':')[1].split(','): tg[ch].add(key(r))
    elif f == 'kHanyuPinlu':
        for m in re.finditer(r'([^\s(]+)\((\d+)\)', v): pin[ch][key(m.group(1))] = int(m.group(2))
    elif f == 'kMandarin': mand[ch] = key(v.split()[0])
for line in open('unihan/Unihan_OtherMappings.txt', encoding='utf8'):
    if '\tkTGH\t' in line:
        cp, f, v = line.rstrip('\n').split('\t'); tgh[chr(int(cp[2:], 16))] = int(v.split(':')[1])
for line in open('unihan/Unihan_DictionaryLikeData.txt', encoding='utf8'):
    if '\tkPhonetic\t' in line:
        cp, f, v = line.rstrip('\n').split('\t')
        for g in v.split(): phon[re.sub(r'[^0-9]', '', g)].add(chr(int(cp[2:], 16)))
gp = collections.defaultdict(set)
for g, cs in phon.items():
    for c in cs: gp[c].add(g)
known = set()
for f in ['pep_tongbian_g1_g2a.txt', 'everyday_g2a.txt']:
    known |= set(open('/workspace/child-literacy/game-tips/char_lists/' + f, encoding='utf8').read().strip())
# 很常用的虚词和小词：他认识，找字题可以当答案和干扰项
FUNC = set('啊呀呢吧吗嘛哦哇的地得了着过这那哪谁什么怎就都还也才又再把被给跟和从向对在不没很太最比因为所以但可如果')
textbook = set(known)
known |= FUNC
def readings(c): return tg.get(c, set()) | set(pin.get(c, {})) | ({mand[c]} if c in mand else set())
def dominant(c, share):
    """这个字的主要读音（多音字只取占比够高的常用读音），没有就返回 None"""
    rs = tg.get(c, set())
    if not rs: return None
    if len(rs) == 1: return next(iter(rs))  # 规范字典只收一个读音（轻声用法不算）
    p = pin.get(c, {}); tot = sum(p.values())
    if not tot: return None
    top = max(p, key=p.get)
    return top if top in rs and p[top] / tot >= share else None
INI = ['zh', 'ch', 'sh', 'b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'q', 'x', 'r', 'z', 'c', 's', 'y', 'w']
def split(k):
    b = k[:-1]
    for i in INI:
        if b.startswith(i): return i, b[len(i):]
    return '', b
def near(a, b):
    (i1, f1), (i2, f2) = split(a), split(b)
    return i1 == i2 or f1 == f2 or f1.rstrip('g') == f2.rstrip('g')
def fq(c, k): return pin.get(c, {}).get(k, 0)
chars = [c for c in tgh]
# 认字只用最常用的 1000 个字（按 kHanyuPinlu 总频次排序，只算《通用规范汉字表》里的字）
TOP_N = 1000
TOP = set(sorted((c for c in chars if pin.get(c)), key=lambda c: -sum(pin[c].values()))[:TOP_N])
def func_reading(c):
    """虚词：主要读音是轻声（没录音）时，用最常见的非轻声读音——它在非轻声里要占七成、在全部用法里至少占两成"""
    p = {r: n for r, n in pin.get(c, {}).items() if r in tg.get(c, set())}
    full = {r: n for r, n in p.items() if not r.endswith('5')}
    if not full: return None
    top = max(full, key=full.get); tot = sum(pin[c].values())
    return top if full[top] / sum(full.values()) >= .7 and full[top] / tot >= .2 else None
U = collections.defaultdict(list); Z = collections.defaultdict(list)
for c in chars:
    k1 = dominant(c, .8)
    # 认字：最常用的 1000 个字里课本没学过的，加上课本外的常用虚词
    if k1 in bank and c not in textbook and (c in TOP or c in FUNC): U[k1].append((-fq(c, k1), tgh[c], c))
    k2 = dominant(c, .9)
    if k2 not in bank and c in FUNC: k2 = func_reading(c)
    if k2 in bank and c in known: Z[k2].append((0 if c in FUNC else 1, -fq(c, k2), c))
PAIRS = {frozenset(x) for x in [('z', 'zh'), ('c', 'ch'), ('s', 'sh'), ('b', 'd'), ('p', 'q'), ('n', 'l'), ('f', 'h'), ('l', 'r'), ('b', 'p'), ('d', 't'), ('g', 'k'), ('j', 'q'), ('j', 'zh'), ('q', 'ch'), ('x', 'sh')]}
NASAL = lambda f: f[:-1] if f.endswith('ng') else f + 'g' if f.endswith('n') else None
def score(k, r):
    """读音 r 和目标 k 有多容易混：同音节不同调、前后鼻音、平翘舌和 b/d 之类、同声母或同韵母"""
    (i1, f1), (i2, f2) = split(k), split(r[:-1] + '0'); t1, t2 = k[-1], r[-1]
    f2 = split(r)[1]
    if i1 == i2 and f1 == f2: return 6 if t1 != t2 else -99
    if i1 == i2 and NASAL(f1) == f2: return 5 + (t1 == t2)
    if f1 == f2 and frozenset((i1, i2)) in PAIRS: return 5 + (t1 == t2)
    if f1 == f2: return 3 + (t1 == t2) * .5
    if i1 == i2: return 2 + (t1 == t2) * .5
    return 0
pool = [c for c in known if c in tg]
dom = {c: (dominant(c, .9) or (max(pin[c], key=pin[c].get) if pin.get(c) else sorted(tg[c])[0])) for c in pool}
freq = {c: sum(pin.get(c, {}).values()) for c in pool}
out = {}; R = {}
for k in sorted(bank):
    u = [x[2] for x in sorted(U[k])][:5]; z = [x[2] for x in sorted(Z[k])][:6]
    x = []
    if z:
        comp = set().union(*(gp[c] for c in z))
        cand = []
        for c in pool:
            if c in z or k in readings(c): continue  # 任何读音含目标音节的字都不能当干扰项
            sc = score(k, dom[c]) + (2 if gp[c] & comp else 0)
            if sc > -50: cand.append((-sc, -freq[c], c))
        cand.sort(); x = [[c, dom[c]] for _, _, c in cand[:12]]
    e = {}
    if u: e['u'] = ''.join(u)
    if z: e['z'] = ''.join(z)
    if x: e['x'] = x
    fw = ''.join(c for c in z if c in FUNC)
    if fw: e['fw'] = fw
    out[k] = e
    for c in set(u + z + [y[0] for y in x]): R[c] = sorted(readings(c))
st = dict(u=sum(1 for v in out.values() if 'u' in v), uchars=len({c for v in out.values() for c in v.get('u', '')}), z=sum(1 for v in out.values() if 'z' in v),
          zchars=sum(len(v.get('z', '')) for v in out.values()), warm=sum(1 for v in out.values() if 'u' not in v and 'z' not in v), chars=len(R),
          func_new=len(FUNC - textbook), fw_syl=sum(1 for v in out.values() if 'fw' in v), func_z=sorted(c for c in FUNC if any(c in v.get('z', '') for v in out.values())), func_u=sorted(c for c in FUNC if any(c in v.get('u', '') for v in out.values())))
print(st)
json.dump({'syl': out, 'R': {c: ','.join(r) for c, r in R.items()}, 'known': sorted(known), 'stats': st}, open('chars.json', 'w'), ensure_ascii=False, separators=(',', ':'))
open('chars_data.js', 'w').write('window.PYC=' + json.dumps({'syl': out, 'R': {c: ','.join(r) for c, r in R.items()}}, ensure_ascii=False, separators=(',', ':')) + ';')

# ===== 我的世界词语（看图选拼音）：词、带调拼音、图、类别 =====
# 只收不带轻声的词（轻声没有录音）；每个字的读音都要在 Unihan 读音里、整词读音要和 pypinyin 词典一致
WORDS = [
 ('村民', 'cūn mín', 'villager', 'm'), ('末影龙', 'mò yǐng lóng', 'dragon', 'm'), ('苦力怕', 'kǔ lì pà', 'creeper', 'm'), ('僵尸', 'jiāng shī', 'zombie', 'm'),
 ('骷髅', 'kū lóu', 'skeleton', 'm'), ('蜘蛛', 'zhī zhū', 'spider', 'm'), ('末影人', 'mò yǐng rén', 'enderman', 'm'), ('史莱姆', 'shǐ lái mǔ', 'slime', 'm'),
 ('蝙蝠', 'biān fú', 'bat', 'm'), ('牛', 'niú', 'cow', 'a'), ('猪', 'zhū', 'pig', 'a'), ('羊', 'yáng', 'sheep', 'a'), ('鸡', 'jī', 'chicken', 'a'),
 ('马', 'mǎ', 'horse', 'a'), ('狼', 'láng', 'wolf', 'a'), ('猫', 'māo', 'cat', 'a'), ('鱼', 'yú', 'fish', 'a'), ('蜜蜂', 'mì fēng', 'bee', 'a'), ('熊猫', 'xióng māo', 'panda', 'a'),
 ('钻石', 'zuàn shí', 'gem', 'i'), ('绿宝石', 'lǜ bǎo shí', 'emerald', 'i'), ('红石', 'hóng shí', 'redstone', 'i'), ('剑', 'jiàn', 'sword', 'i'), ('镐', 'gǎo', 'pickaxe', 'i'),
 ('铁斧', 'tiě fǔ', 'axe', 'i'), ('弓', 'gōng', 'bow', 'i'), ('箭', 'jiàn', 'arrowi', 'i'), ('铁', 'tiě', 'ingot', 'i'), ('金', 'jīn', 'goldi', 'i'), ('煤', 'méi', 'coal', 'i'),
 ('地图', 'dì tú', 'mapi', 'i'), ('时钟', 'shí zhōng', 'clock', 'i'), ('矿车', 'kuàng chē', 'minecart', 'i'),
 ('圆石', 'yuán shí', 'cobble', 'b'), ('原木', 'yuán mù', 'log', 'b'), ('草方块', 'cǎo fāng kuài', 'grassb', 'b'), ('仙人掌', 'xiān rén zhǎng', 'cactus', 'b'),
 ('树', 'shù', 'tree', 'b'), ('花', 'huā', 'flower', 'b'), ('岩浆', 'yán jiāng', 'lava', 'b'), ('火把', 'huǒ bǎ', 'torch', 'b'), ('床', 'chuáng', 'bed', 'b'),
 ('门', 'mén', 'door', 'b'), ('宝箱', 'bǎo xiāng', 'chest', 'b'), ('工作台', 'gōng zuò tái', 'table', 'b'), ('熔炉', 'róng lú', 'furnace', 'b'),
 ('炸药', 'zhà yào', 'tnt', 'b'), ('传送门', 'chuán sòng mén', 'portal', 'b'), ('小屋', 'xiǎo wū', 'house', 'b'),
 ('苹果', 'píng guǒ', 'apple', 'f'), ('面包', 'miàn bāo', 'bread', 'f'), ('蛋糕', 'dàn gāo', 'cake', 'f'), ('西瓜', 'xī guā', 'melon', 'f'),
 ('南瓜', 'nán guā', 'pumpkin', 'f'), ('鸡蛋', 'jī dàn', 'eggw', 'f'), ('牛奶', 'niú nǎi', 'milk', 'f'),
]
from pypinyin import pinyin as _pp, Style as _St
W = []
for w, py, pic, cat in WORDS:
    ks = [key(s) for s in py.split()]
    assert len(ks) == len(w), w
    assert [key(x[0]) for x in _pp(w, style=_St.TONE)] == ks, (w, 'pypinyin', _pp(w, style=_St.TONE))
    for c, k in zip(w, ks):
        assert k in bank, (w, k, 'no audio')
        assert k in readings(c), (w, c, k, sorted(readings(c)))
    W.append([w, ' '.join(ks), pic, cat, [','.join(sorted(readings(c))) for c in w]])
poly = [(w[0], w[4]) for w in W if any(',' in r for r in w[4])]
print('words', len(W), 'polyphone words', poly)
d = json.load(open('chars.json')); d['W'] = W; d['stats']['words'] = len(W)
json.dump(d, open('chars.json', 'w'), ensure_ascii=False, separators=(',', ':'))
js = open('chars_data.js').read()
open('chars_data.js', 'w').write(js[:-1] + ';window.PYC.W=' + json.dumps(W, ensure_ascii=False, separators=(',', ':')) + ';')
