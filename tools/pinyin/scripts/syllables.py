import re, json, unicodedata, collections, os
TONE = {'\u0304':1,'\u0301':2,'\u030c':3,'\u0300':4}
def parse(s):
    d = unicodedata.normalize('NFD', s)
    tone = 5; out=''
    for ch in d:
        if ch in TONE: tone = TONE[ch]
        elif ch == '\u0308': out = out[:-1]+'v'  # ü
        else: out += ch
    return out, tone
U = 'unihan/Unihan_Readings.txt'
tg = collections.defaultdict(set); freq = {}
for line in open(U, encoding='utf8'):
    if line.startswith('#') or not line.strip(): continue
    cp, field, val = line.rstrip('\n').split('\t')
    ch = chr(int(cp[2:],16))
    if field == 'kTGHZ2013':
        for part in val.split(' '):
            for r in part.split(':')[1].split(','):
                tg[ch].add(r)
    elif field == 'kHanyuPinlu':
        for m in re.finditer(r'([^\s(]+)\((\d+)\)', val):
            freq[(ch, m.group(1))] = int(m.group(2))
syl = collections.defaultdict(list)
for ch, rs in tg.items():
    for r in rs:
        base, t = parse(r)
        syl[(base,t)].append((freq.get((ch,r),0), ch))
print('chars', len(tg), 'toned', len(syl), 'base', len({b for b,_ in syl}))
print('tone5', sorted(b for b,t in syl if t==5))
json.dump({f'{b}{t}': [c for f,c in sorted(v, reverse=True)[:6]] for (b,t),v in syl.items()}, open('tghz_syllables.json','w'), ensure_ascii=False)
audio = {f[4:-4] for f in os.listdir('audio-cmn/64k/syllabs')}
missing = sorted(k for k in (f'{b}{t}' for b,t in syl if t!=5) if k not in audio)
print('missing audio', len(missing), missing)
