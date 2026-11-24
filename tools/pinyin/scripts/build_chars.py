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
U = collections.defaultdict(list); Z = collections.defaultdict(list); D = collections.defaultdict(list)
for c in chars:
    lvl = 1 if tgh[c] <= 3500 else 2 if tgh[c] <= 6500 else 3
    k1 = dominant(c, .8)
    if k1 in bank and c not in known and c in TOP: U[k1].append((1, -fq(c, k1), tgh[c], c))
    k2 = dominant(c, .9)
    if k2 in bank:
        if c in known: Z[k2].append((-fq(c, k2), c))
        if c in known or (lvl == 1 and fq(c, k2) >= 100): D[k2].append((0 if c in known else 1, -fq(c, k2), c))
import os
LOCK = json.load(open('find_lock.json')) if os.path.exists('find_lock.json') else None
out = {}; R = {}
for k in sorted(bank):
    u = [x[3] for x in sorted(U[k])]
    if u and min(x[0] for x in U[k]) == 1: u = [x[3] for x in sorted(U[k]) if x[0] == 1]
    u = u[:5]; z = [x[1] for x in sorted(Z[k])][:4]; d = [x[2] for x in sorted(D[k]) if x[0] == 0][:4] or [x[2] for x in sorted(D[k])][:2]
    s = []
    if z:
        for g in sorted(gp[z[0]]):
            for c in sorted(phon[g], key=lambda c: (c not in known, -sum(pin.get(c, {}).values()))):
                kk = dominant(c, .9)
                if c != z[0] and kk in bank and near(k, kk) and k not in readings(c) and (c in known or tgh.get(c, 9999) <= 3500) and c not in [x[0] for x in s]: s.append([c, kk])
        s = s[:3]
    if LOCK is not None:  # 找字题沿用已上线的字（find_lock.json），只换认字字库
        lk = LOCK.get(k, {}); z = list(lk.get('z', '')); d = list(lk.get('d', '')); s = lk.get('s', [])
    e = {}
    if u: e['u'] = ''.join(u)
    if z: e['z'] = ''.join(z)
    if d: e['d'] = ''.join(d)
    if s: e['s'] = s
    out[k] = e
    for c in set(u + z + d + [x[0] for x in s]): R[c] = sorted(readings(c))
st = dict(u=sum(1 for v in out.values() if 'u' in v), z=sum(1 for v in out.values() if 'z' in v), s=sum(1 for v in out.values() if 's' in v), none=sum(1 for v in out.values() if not v), chars=len(R))
print(st)
json.dump({'syl': out, 'R': {c: ','.join(r) for c, r in R.items()}, 'known': len(known)}, open('chars.json', 'w'), ensure_ascii=False, separators=(',', ':'))
open('chars_data.js', 'w').write('window.PYC=' + json.dumps({'syl': out, 'R': {c: ','.join(r) for c, r in R.items()}}, ensure_ascii=False, separators=(',', ':')) + ';')
