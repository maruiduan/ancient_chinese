#!/usr/bin/env python3
"""给篇题、卷名、书名逐字标读音，写 data/titles.json。

标题上不显示拼音，只用于点字查：弹层里的读音按题意标注。
顺序：OVERRIDES（专名、古音、词牌） > 正文已审定的多字词读音 > pypinyin 词组读音。
有争议的读音（月氏、伍员等）不在这里改，沿用正文现行读法。
"""
import collections, glob, json, os, re, sys
from pypinyin import pinyin, Style

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HASHED = re.compile(r"\.[0-9a-f]{12}\.json$")
HAN = re.compile(r"[\u3400-\u9fff\U00020000-\U0002ffff]")
TONED = re.compile(r"[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜńňǹḿ]")

# 简体词 -> 逐字读音。只收标题里 pypinyin 会读错的。
OVERRIDES = {
    "乐书": "yuè shū", "乐毅": "yuè yì", "乐羊": "yuè yáng", "乐府": "yuè fǔ",
    "燕召公": "yān shào gōng", "召公": "shào gōng", "召南": "shào nán",
    "田单": "tián dān", "郦生": "lì shēng", "郦食其": "lì yì jī", "大宛": "dà yuān",
    "龟策": "guī cè", "龟兹": "qiū cí", "平准": "píng zhǔn", "将相": "jiàng xiàng",
    "李将军": "lǐ jiāng jūn", "将军": "jiāng jūn", "将兵": "jiàng bīng",
    "老子": "lǎo zǐ", "子胥": "zǐ xū", "伍子胥": "wǔ zǐ xū", "孙子": "sūn zǐ",
    "朝鲜": "cháo xiǎn", "单于": "chán yú", "句践": "gōu jiàn", "勾践": "gōu jiàn",
    "冒顿": "mò dú", "番禺": "pān yú", "金日磾": "jīn mì dī", "身毒": "juān dú",
    "会稽": "kuài jī", "皋陶": "gāo yáo", "樊於期": "fán wū jī", "朝歌": "zhāo gē",
    "蔺相如": "lìn xiàng rú", "相如": "xiàng rú", "万石": "wàn shí",
    "叶公": "shè gōng", "阿房": "ē páng", "阿房宫": "ē páng gōng", "天姥": "tiān mǔ",
    "丰乐": "fēng lè", "清平乐": "qīng píng yuè", "夜半乐": "yè bàn yuè", "齐天乐": "qí tiān yuè",
    "永遇乐": "yǒng yù lè", "观周乐": "guān zhōu yuè", "吕相": "lǚ xiàng", "蜀相": "shǔ xiàng",
    "相州": "xiàng zhōu", "唐雎说": "táng jū shuì", "连横说": "lián héng shuì", "范雎说": "fàn jū shuì",
    "触詟说": "chù zhé shuì", "颜斶说": "yán chù shuì", "应天长": "yìng tiān cháng",
    "公冶长": "gōng yě cháng", "文长": "wén cháng", "少游": "shào yóu", "少尹": "shào yǐn",
    "小重山": "xiǎo chóng shān", "重送": "chóng sòng", "重别": "chóng bié", "重耳": "chóng ěr",
    "单子": "shàn zǐ", "曾子": "zēng zǐ", "和韵": "hè yùn", "奉和": "fèng hè", "和晋": "hè jìn",
    "和贾": "hè jiǎ", "君难": "jūn nàn", "不为": "bù wéi", "为最": "wéi zuì", "为秋": "wéi qiū",
    "何为": "hé wéi", "廉颇": "lián pō", "长干": "cháng gān", "长相思": "cháng xiāng sī",
    "长信": "cháng xìn", "长孺": "cháng rú", "魏其": "wèi jī", "踏莎": "tà suō",
    "传序": "zhuàn xù", "传论": "zhuàn lùn", "生传": "shēng zhuàn", "福传": "fú zhuàn",
    "子传": "zǐ zhuàn", "人传": "rén zhuàn", "驼传": "tuó zhuàn", "文长传": "wén cháng zhuàn",
    "君传": "jūn zhuàn", "列传": "liè zhuàn",
}
FALLBACK_CHAR = {"子": "zǐ", "么": "me"}
# 单字统一标本调，不标变调。
FIXED_CHAR = {"一": "yī", "不": "bù", "卷": "juàn"}


def load(path):
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def data_files():
    for f in sorted(glob.glob(os.path.join(ROOT, "data", "*.json")) + glob.glob(os.path.join(ROOT, "data", "articles", "*.json"))):
        if HASHED.search(f) or os.path.basename(f) in ("titles.json", "dict.json"):
            continue
        yield f


def body_index():
    """正文里逐句审定过读音的多字词：简体词 -> 最常见读音。"""
    seen = collections.defaultdict(collections.Counter)

    def walk(o):
        if isinstance(o, dict):
            toks = o.get("tokens")
            if isinstance(toks, list):
                for tok in toks:
                    if not isinstance(tok, dict) or tok.get("punct"):
                        continue
                    t, py = tok.get("t") or "", (tok.get("py") or "").split()
                    if len(t) >= 2 and len(py) == len(t) and tok.get("level") == "sentence":
                        seen[tok.get("s") or t][" ".join(py).lower()] += 1
            for v in o.values():
                walk(v)
        elif isinstance(o, list):
            for v in o:
                walk(v)

    for f in data_files():
        walk(load(f))
    return {w: c.most_common(1)[0][0].split() for w, c in seen.items()}


def collect_titles():
    pairs = set()

    def add(s, t):
        if isinstance(s, str) and HAN.search(s):
            t = t if isinstance(t, str) and len(t) == len(s) else s
            pairs.add((s, t))

    def walk(o):
        if isinstance(o, dict):
            ti = o.get("title")
            if isinstance(ti, dict):
                add(ti.get("s"), ti.get("t"))
            elif isinstance(ti, str):
                add(ti, o.get("titleT"))
            for key in ("subtitle", "volumeTitle", "volumeSubtitle"):
                if isinstance(o.get(key), str):
                    add(o[key], None)
            for v in o.values():
                if isinstance(v, (dict, list)):
                    walk(v)
        elif isinstance(o, list):
            for v in o:
                walk(v)

    for f in data_files():
        data = load(f)
        if os.sep + "articles" + os.sep in f:
            data = {k: data.get(k) for k in ("title", "volumeTitle", "volumeSubtitle")}
        walk(data)
    return sorted(pairs)


def read_title(s, table, longest):
    chars = list(s)
    out = [None] * len(chars)
    base = [p[0] for p in pinyin(s, style=Style.TONE, errors=lambda x: [""] * len(x))]
    if len(base) != len(chars):
        base = [pinyin(c, style=Style.TONE, errors=lambda x: [""])[0][0] for c in chars]
    i = 0
    while i < len(chars):
        hit = None
        for n in range(min(longest, len(chars) - i), 1, -1):
            w = s[i:i + n]
            if w in table and len(table[w]) == n:
                hit = table[w]
                break
        if hit:
            out[i:i + len(hit)] = hit
            i += len(hit)
        else:
            i += 1
    for i, ch in enumerate(chars):
        if out[i] is None:
            py = base[i] if HAN.match(ch) else ""
            if py and not TONED.search(py):
                py = FALLBACK_CHAR.get(ch, py)
            out[i] = py
        if ch in FIXED_CHAR and not (ch == "不" and out[i] == "fǒu"):
            out[i] = FIXED_CHAR[ch]
    return [p.lower() for p in out]


def trad_of(s, t, dict_chars, cc):
    """补出繁体：原数据缺繁体或繁体字不在字表里时，逐字用 OpenCC 转。"""
    conv = cc.convert(s)
    if len(conv) != len(s):
        return t
    return "".join(a if a in dict_chars or not HAN.match(a) else (b if b in dict_chars else a) for a, b in zip(t, conv))


def main():
    from opencc import OpenCC
    cc = OpenCC("s2t")
    dict_chars = load(os.path.join(ROOT, "data", "dict.json")).get("chars", {})
    table = body_index()
    for w, py in OVERRIDES.items():
        table[w] = py.split()
    longest = max(len(w) for w in table)
    titles = {}
    for s, t in collect_titles():
        t = trad_of(s, t, dict_chars, cc)
        py = " ".join(p or "-" for p in read_title(s, table, longest))
        rec = [t, py] if t != s else [py]
        titles[s] = rec
        if t != s:
            titles.setdefault(t, rec)
    # 简体字 -> 繁体字：标题拆不出来时，至少能查到字表。
    chars = {}
    for s_, rec in list(titles.items()):
        if len(rec) == 2:
            for a, b in zip(s_, rec[0]):
                if a != b and HAN.match(a) and b in dict_chars:
                    chars.setdefault(a, b)
    for a in sorted(set("".join(titles))):
        if HAN.match(a) and a not in dict_chars and a not in chars:
            b = cc.convert(a)
            if len(b) == 1 and b in dict_chars:
                chars[a] = b
    out = os.path.join(ROOT, "data", "titles.json")
    with open(out, "w", encoding="utf-8") as fh:
        json.dump({"note": "标题 -> [繁体, 逐字读音]（简繁同形时只有读音，- 表示标点）。供点字查询，不在页面上显示。",
                   "titles": titles, "chars": chars}, fh, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
        fh.write("\n")
    print(len(titles), "titles ->", out, file=sys.stderr)


if __name__ == "__main__":
    main()
