# -*- coding: utf-8 -*-
"""从维基文库《史記》生成史记篇目。

正文是司马迁的本文和「太史公曰」，不收三家注，也不收篇末的【索隱述贊】。
一篇一页。课注在 sources/shiji/lessons/，长篇的白话分段写在 parts/。
句中读音写在 sources/shiji/readings/{id}.json。底本说明见 sources/shiji/EDITION.md。

用法：
  python3 scripts/build_shiji.py          打印解析结果，写 sources/shiji/texts.json
  python3 scripts/build_shiji.py --write  写 data/articles/s*.json 和 data/shiji.json
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

from opencc import OpenCC
from pypinyin import Style, pinyin

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "sources" / "shiji"
LESSONS = SRC / "lessons"
READINGS = SRC / "readings"
ARTICLES = ROOT / "data" / "articles"
CATALOG = ROOT / "data" / "shiji.json"
DUMP = SRC / "texts.json"
URL = "https://zh.wikisource.org/wiki/史記/卷{juan:03d}"
# 用了固定修订版的卷，出处链接指向那一版。
OLDID = {48: 2531218, 55: 2666612, 84: 1568305, 86: 2388562, 81: 8735558, 92: 1483915, 109: 1765440, 62: 7903600, 77: 367917, 130: 2609362, 61: 2621133, 124: 367994, 129: 7904128, 47: 7903609, 6: 7907969, 68: 8764712, 65: 2567048, 76: 7909284, 63: 7903601, 41: 11132202, 66: 2621138, 82: 2529471, 80: 2089316, 75: 1965692, 83: 2089252, 85: 2027911, 78: 2089016, 87: 2364605, 69: 2621145, 70: 2621148, 79: 2549307, 53: 2087971, 73: 7909285, 56: 1961615, 107: 2540571, 126: 2609358, 105: 8842726, 89: 8744143, 91: 2509940, 97: 1383195, 117: 10371549, 57: 1569360, 9: 2087062, 10: 2599229, 43: 7903603, 74: 7908177, 122: 7904124, 49: 7903610, 44: 7903606, 1: 11133934, 4: 7909147, 2: 7903612, 3: 7909145, 12: 8733061, 64: 7895410, 67: 7869003, 111: 8730225, 110: 8735645, 123: 8736799, 120: 9166127, 5: 8744286, 54: 1490182, 102: 1753957, 101: 368092, 100: 1965696, 88: 1965690, 99: 368013, 119: 7904123, 96: 8770206, 125: 2273599, 108: 1765317, 106: 405869, 112: 2089420}


def source_url(juan: int) -> str:
    if juan in OLDID:
        return f"https://zh.wikisource.org/w/index.php?oldid={OLDID[juan]}"
    return URL.format(juan=juan)

CC = OpenCC("t2s")
PUNCT = set("，。！？；、：·．…—～「」『』（）【】《》〈〉〔〕〖〗､“”‘’")
CN_NUM = "〇一二三四五六七八九十百"

# 已收的篇。以后每做一篇，在这里加卷号。
DONE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 41, 43, 44, 47, 48, 49, 53, 54, 55, 56, 57, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 91, 92, 96, 97, 99, 100, 101, 102, 105, 106, 107, 108, 109, 110, 111, 112, 117, 119, 120, 122, 123, 124, 125, 126, 129, 130]

GROUPS = [
    ("benji", "本纪", 1, 12),
    ("biao", "表", 13, 22),
    ("shu", "书", 23, 30),
    ("shijia", "世家", 31, 60),
    ("liezhuan", "列传", 61, 130),
]


def dump_json(path: Path, data, pretty: bool = False) -> None:
    if pretty:
        text = json.dumps(data, ensure_ascii=False, indent=2) + "\n"
    else:
        text = json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n"
    path.write_text(text, encoding="utf-8")


def to_simplified(text: str) -> str:
    out = []
    for i, ch in enumerate(text):
        # 史记里的「閒」都是间隔、间道、离间的间，人名涉閒、田閒也读间。OpenCC 收成「闲」，这里改作「间」。
        simp = "间" if ch == "閒" else CC.convert(ch)
        # 「齮」的类推简化字 𬺈 很多字体没有，仍用齮。
        # 类推简化出的扩展区字（𬺈、𫄬……）很多字体没有，保留原字。
        if (ord(simp) > 0xFFFF or 0x3400 <= ord(simp) <= 0x4DBF) and 0x4E00 <= ord(ch) <= 0x9FFF:
            simp = ch
        # 「夥」表多义时《通用规范汉字表》仍作夥，不简化为伙。
        if ch == "夥":
            simp = "夥"
        # 「祇」作副词（只）时简化为只，神祇保留。
        if ch == "祇" and (i == 0 or text[i - 1] != "神"):
            simp = "只"
        if len(simp) != 1:
            raise SystemExit(f"简繁不对齐：{ch} -> {simp}")
        out.append(simp)
    text = "".join(out)
    # 繁简转换的误收，逐条改回。
    text = text.replace("干坤", "乾坤")
    return text


def clean_inline(text: str) -> str:
    text = text.replace("'''", "")
    text = re.sub(r"<!--.*?-->", "", text, flags=re.S)
    text = re.sub(r"<ref>.*?</ref>", "", text, flags=re.S)
    # -{zh-hans:佣; zh-hant:庸;}- 这类繁简分写，取繁体。
    text = re.sub(r"-\{[^}]*zh-hant:([^;}]+);?[^}]*\}-", r"\1", text)
    # 嵌套的 -{-{徴}-}- 要剥到没有为止。
    while True:
        new = re.sub(r"-\{([^{}]+)\}-", r"\1", text)
        if new == text:
            break
        text = new
    text = re.sub(r"\[\[(?:[^|\]]+\|)?([^\]]+)\]\]", r"\1", text)
    # {{參|縣|校记}} 显示第一个字；{{另|熒|滎}} 是異文，取后一个（校改后的字）。
    text = re.sub(r"\{\{參\|([^|}]+)\|[^}]*\}\}", r"\1", text)
    text = re.sub(r"\{\{另\|[^|}]+\|([^|}]+)\}\}", r"\1", text)
    # {{ProperNoun|李}} 是专名线，留字。
    # 卷十二的纪年写作 {{YL|元年|前140年}}，第二个参数是公元纪年注，不是正文。
    text = re.sub(r"\{\{(?:ProperNoun|YL)\|([^|}]+)(?:\|[^}]*)?\}\}", r"\1", text)
    # 卷一用 {{專|黃帝}}（专名）、{{書|尚書}}（书名）、{{標|…}}（有校记的字句），都留字。
    # {{專|江|淮}}、{{專|帝顓頊|高陽}} 是几个专名连写，参数直接接起来。
    # 卷二有嵌套的 {{標|浮于{{專|江}}、{{專|沱}}}}，从最里层往外剥。
    while True:
        # 卷六十七的书名写作 {{WavyBookMark|孝經}}（波浪线书名号），留字。
        new = re.sub(r"\{\{(?:專|書|標|WavyBookMark)\|([^{}]+)\}\}", lambda m: m.group(1).replace("|", ""), text)
        if new == text:
            break
        text = new
    # 卷一百一十的「<u>聶翁壹</u>」是专名下划线标签，去标签留字。
    text = re.sub(r"</?u>", "", text)
    text = re.sub(r"\{\{[^}]+\}\}", "", text)
    text = re.sub(r"[ \t\u3000]+", "", text)
    return text.strip()


def emend(text: str) -> str:
    """维基文库本的个别字。每一条都记在 EDITION.md。"""
    # 维基文库照中华书局点校本标校改：圆括号里是删去的字，方括号里是补入或改正的字。
    text = re.sub(r"（[^）]*）", "", text)
    text = re.sub(r"［([^］]*)］", r"\1", text)
    # 鸿门宴范增所举是玉玦。中华书局点校本、《资治通鉴》卷九都作「玦」，维基文库作「玉珪」。
    text = text.replace("舉所佩玉珪", "舉所佩玉玦")
    # 卷六十二晏子赎越石父：维基文库漏「厄，」，误作緦。从点校本。
    text = text.replace("免子於緦何子", "免子於厄，何子")
    # 卷一百三十：游侠列传小序「救人於戹，振人不贍」误作緦；范雎蔡泽小序「能忍訽於魏齊」漏訽。从点校本、wenku 本。
    text = text.replace("救人於緦振人", "救人於戹，振人")
    # 卷四十七：「以遠方職」漏方，从点校本、wenku 本。
    text = text.replace("異姓以遠職", "異姓以遠方職")
    text = text.replace("能忍於魏齊", "能忍訽於魏齊")
    # 「烹周苛，并殺樅公」。维基文库作「井殺」，形近而误，据中华书局点校本改。
    text = text.replace("烹周苛，井殺樅公", "烹周苛，并殺樅公")
    # 维基文库漏掉的标点。
    text = text.replace("公為我獻之」張良曰", "公為我獻之。」張良曰")
    text = text.replace("沛公曰「", "沛公曰：「")
    # 高祖本纪：上文刚写「至固陵，不會。楚擊漢軍，大破之」，维基文库作「漢王敗碧陵」，据中华书局点校本改作「固陵」。
    text = text.replace("漢王敗碧陵", "漢王敗固陵")
    # 高祖本纪：同段前后都作「泗川守壯」「泗川監平」，维基文库这一处作「泗州」，据 wenku 本和点校本改。
    text = text.replace("泗州守壯敗於薛", "泗川守壯敗於薛")
    # 陈涉世家：「又閒令吳廣」，閒是暗中，维基文库误作「彊」；「守滎陽」漏滎；「董緤」误作緶。据点校本、wenku 本改。
    text = text.replace("又彊令吳廣之次所旁", "又閒令吳廣之次所旁")
    text = text.replace("足以守陽，", "足以守滎陽，")
    text = text.replace("董緶", "董緤")
    # 留侯世家：「鴻鵠高飛」维基文库作鴻鴈；「常為畫策臣」漏臣；「嘗閒從容」的閒是闲暇，写作閑以免简化成间。
    text = text.replace("鴻鴈高飛", "鴻鵠高飛")
    text = text.replace("常為畫策，時時從漢王", "常為畫策臣，時時從漢王")
    text = text.replace("良嘗間從容", "良嘗閑從容")
    # 屈原贾生列传：据点校本、wenku 本改。
    text = text.replace("一而相量", "一槩而相量")
    text = text.replace("迸固有不并兮", "古固有不並兮")
    text = text.replace("覽德惪而下之", "覽德煇而下之")
    text = text.replace("述迫之徒", "怵迫之徒")
    text = text.replace("細故遰葪", "細故慸葪")
    text = text.replace("貌甚閒暇", "貌甚閑暇")
    text = text.replace("被髪", "被髮").replace("造讬", "造託").replace("翺", "翱")
    if "□" in text:
        raise SystemExit(f"正文有 □，要先查证再补字：{text[:40]}")
    return text


# 卷八十一维基文库本混入日本新字形，另有几处录错，逐条改。每一条都记在 EDITION.md。
SHINJITAI_081 = str.maketrans({"歳": "歲", "倶": "俱", "撃": "擊", "歩": "步", "毎": "每",
                               "髙": "高", "暦": "歷", "晩": "晚", "娯": "娛", "巻": "卷"})
# 卷八十六同样混入日本字形。
SHINJITAI_086 = str.maketrans({"呉": "吳", "撃": "擊", "髙": "高", "倶": "俱", "楡": "榆", "毎": "每",
                               "戸": "戶", "呑": "吞", "涙": "淚", "徴": "徵", "鄕": "鄉"})
FIX_086 = [
    ("而大國侵魯亦甚矣", "而大國侵魯亦以甚矣"),
    ("睚眞諼", "睚眥之意"),
    ("於是韓縣之", "於是韓購縣之"),
    ("爲羽聲慨", "爲羽聲忼慨"),
]


def emend_086(text: str) -> str:
    text = text.translate(SHINJITAI_086)
    for old, new in FIX_086:
        text = text.replace(old, new)
    return text

SHINJITAI_109 = str.maketrans({"呉": "吳", "戸": "戶", "歳": "歲", "歩": "步", "髪": "髮"})
FIX_109 = [
    ("爲輕車將車", "爲輕車將軍"),
    ("謂其麾下曰；", "謂其麾下曰："),
    ("擊刀鬬", "擊刁斗"),
]


def emend_109(text: str) -> str:
    text = text.translate(SHINJITAI_109)
    for old, new in FIX_109:
        text = text.replace(old, new)
    return text

FIX_129 = [
    ("巴[蜀]寡婦", "巴蜀寡婦"),
    ("犀、瑁", "犀、瑇瑁"),
    ("烏氏倮牧", "烏氏倮畜牧"),
    ("悲歌慨", "悲歌忼慨"),
    ("竹竿萬，", "竹竿萬個，"),
    ("炧", "卮"),
]


def emend_129(text: str) -> str:
    for old, new in FIX_129:
        text = text.replace(old, new)
    return text

FIX_006 = [
    # {{YL|秦始皇元年}} 是维基文库把「元年」展开的年号链接，本文只作「元年」。
    ("秦始皇元年，將軍蒙驁", "元年，將軍蒙驁"),
    ("死而以行為謐", "死而以行為謚"),
    ("皆以戌漕轉作", "皆以戍漕轉作"),
]


def emend_006(text: str) -> str:
    for old, new in FIX_006:
        text = text.replace(old, new)
    return text


FIX_076 = [
    # 维基文库此处误作简体「饱」，点校本作「取攻於秦」。
    ("王獨取饱於秦", "王獨取攻於秦"),
]


def emend_076(text: str) -> str:
    for old, new in FIX_076:
        text = text.replace(old, new)
    return text


FIX_066 = [
    # 维基文库把「己卯……入郢」错置在「子常敗走」之前，点校本在「遂至郢」之后。
    ("擊楚將子常。己卯，楚昭王出奔。庚辰，吳王入郢。子常敗走", "擊楚將子常。子常敗走"),
    ("昭王出亡，入雲夢", "己卯，楚昭王出奔。庚辰，吳王入郢。昭王出亡，入雲夢"),
]


def emend_066(text: str) -> str:
    for old, new in FIX_066:
        text = text.replace(old, new)
    return text


# 卷四十一维基文库本混入日本字形与 OCR 误字。
SHINJITAI_041 = str.maketrans({"呉": "吳", "撃": "擊", "髙": "高", "倶": "俱", "毎": "每", "歳": "歲",
                               "鄕": "鄉", "茍": "苟", "旣": "既", "卽": "即", "産": "產", "愼": "慎",
                               "塡": "填", "虚": "虛"})
FIX_041 = [
    ("君忘會稽之蚯？", "君忘會稽之厄乎？"),
    ("既苦身力", "既苦身戮力"),
    ("盡取笔吳地", "盡取故吳地"),
]


def emend_041(text: str) -> str:
    text = text.translate(SHINJITAI_041)
    for old, new in FIX_041:
        text = text.replace(old, new)
    return text


FIX_082 = [
    # 维基文库「其由單之謂邪」，点校本作「其田單之謂邪」。
    ("其由單之謂邪", "其田單之謂邪"),
]


def emend_082(text: str) -> str:
    for old, new in FIX_082:
        text = text.replace(old, new)
    return text


# 卷七十五维基文库本混入日本字形。
SHINJITAI_075 = str.maketrans({"倶": "俱", "歳": "歲", "戸": "戶", "髙": "高", "撃": "擊", "屛": "屏",
                               "虚": "虛", "絶": "絕", "説": "說"})
FIX_075 = [("曰；「", "曰：「")]


def emend_075(text: str) -> str:
    text = text.translate(SHINJITAI_075)
    for old, new in FIX_075:
        text = text.replace(old, new)
    return text


FIX_083 = [
    # 维基文库「睗」为「節」之误（点校本作「規小節」「行小節」）。
    ("規小睗", "規小節"),
    ("行小睗", "行小節"),
    # 点校本作「勇士不怯死而滅名」，维基文库脱「怯」。
    ("勇士不死而滅名", "勇士不怯死而滅名"),
]


def emend_083(text: str) -> str:
    for old, new in FIX_083:
        text = text.replace(old, new)
    return text


FIX_078 = [
    # 维基文库漏「瑇」，据 wenku 本补。
    ("為瑁簪", "為瑇瑁簪"),
]


def emend_078(text: str) -> str:
    for old, new in FIX_078:
        text = text.replace(old, new)
    return text


FIX_069 = [
    # 标点误作分号。
    ("曰；「", "曰：「"),
]


def emend_069(text: str) -> str:
    for old, new in FIX_069:
        text = text.replace(old, new)
    return text


FIX_070 = [
    # 维基文库脱「莫」，据 wenku 本补。
    ("能弱楚者如韓", "能弱楚者莫如韓"),
]


def emend_070(text: str) -> str:
    for old, new in FIX_070:
        text = text.replace(old, new)
    return text


FIX_079 = [
    # 以下三处据 wenku 本改。
    ("稱病甐", "稱病篤"),
    ("不困緦", "不困戹"),
    ("雖義之所在", "唯義之所在"),
    # 标点误作分号。
    ("曰；「", "曰：「"),
]


def emend_079(text: str) -> str:
    for old, new in FIX_079:
        text = text.replace(old, new)
    return text


FIX_053 = [
    # 维基文库误作「原」，据 wenku 本改。
    ("原君讓封", "願君讓封"),
    # 同上。
    ("原令民", "願令民"),
]


def emend_053(text: str) -> str:
    for old, new in FIX_053:
        text = text.replace(old, new)
    return text


FIX_073 = [
    # 维基文库误作「甐」，据 wenku 本改。
    ("稱病甐", "稱病篤"),
]


def emend_073(text: str) -> str:
    for old, new in FIX_073:
        text = text.replace(old, new)
    return text


SHINJITAI_056 = str.maketrans({"爲": "為", "戸": "戶", "鄕": "鄉", "歳": "歲", "衞": "衛", "説": "說",
                               "渉": "涉", "劎": "劍", "絶": "絕", "晩": "晚", "敎": "教"})
FIX_056 = [
    # 标点误作分号。
    ("曰；「", "曰：「"),
]


def emend_056(text: str) -> str:
    text = text.translate(SHINJITAI_056)
    for old, new in FIX_056:
        text = text.replace(old, new)
    return text


FIX_107 = [
    # 维基文库脱「國」，据 wenku 本补。
    ("天下士郡諸侯", "天下士郡國諸侯"),
]


def emend_107(text: str) -> str:
    for old, new in FIX_107:
        text = text.replace(old, new)
    return text


FIX_126 = [
    # 维基文库误作「糧」，据 wenku 本改。
    ("祭以糧稻", "祭以粳稻"),
    # 维基文库误作「帶」，据 wenku 本改。
    ("以為帶，安於", "以為席，安於"),
]


def emend_126(text: str) -> str:
    for old, new in FIX_126:
        text = text.replace(old, new)
    return text


FIX_105 = [
    # 标点误作分号，改冒号。
    ("扁鵲復見，曰；「", "扁鵲復見，曰：「"),
    # 维基文库作「眢」，据 wenku 本改。
    ("是謂『易眢』", "是謂『易貿』"),
]


def emend_105(text: str) -> str:
    for old, new in FIX_105:
        text = text.replace(old, new)
    return text


SHINJITAI_089 = str.maketrans({"髙": "高", "撃": "擊", "倶": "俱", "渉": "涉", "歳": "歲", "呉": "吳", "茍": "苟",
                               "鄕": "鄉", "爲": "為", "説": "說", "脱": "脫", "絶": "絕", "鋭": "銳"})
FIX_089 = [
    # 维基文库脱「用」，据 wenku 本补。
    ("怨陳王不其筴", "怨陳王不用其筴"),
    # 维基文库误作「諸」，据 wenku 本及上文「侈爲信都侯」改。
    ("樂昌侯、信諸侯", "樂昌侯、信都侯"),
]


def emend_089(text: str) -> str:
    text = text.translate(SHINJITAI_089)
    for old, new in FIX_089:
        text = text.replace(old, new)
    return text


FIX_091 = [
    # 标点误作分号，改冒号（二处）。
    ("曰；「", "曰：「"),
    # 维基文库作「擊」，据 wenku 本改为「繫」（拘囚）。
    ("請擊赫", "請繫赫"),
]


def emend_091(text: str) -> str:
    for old, new in FIX_091:
        text = text.replace(old, new)
    return text


FIX_097 = [
    # 标点误作分号，改冒号。
    ("曰；「", "曰：「"),
    # 维基文库脱「戮」，据 wenku 本补。
    ("與項王力西面", "與項王戮力西面"),
]


def emend_097(text: str) -> str:
    for old, new in FIX_097:
        text = text.replace(old, new)
    return text


FIX_117 = [
    # 维基文库与 wenku 本都重抄了一遍，据维基文库《上林賦》（《文選》本，oldid=7908985）删。
    ("朕以覽聽餘「於是酒中樂酣，天子芒然而思，似若有亡。曰：『嗟乎，此泰奢侈！朕以覽聽餘間", "朕以覽聽餘間"),
    # 「願」误转作「原」（繁简转换错），据 wenku 本改。以下几条同。
    ("原以自娛", "願以自娛"),
    ("原為內臣妾", "願為內臣妾"),
    ("所原聞也", "所願聞也"),
    ("臣原陛下", "臣願陛下"),
    ("原得受號", "願得受號"),
    ("原陛下全之", "願陛下全之"),
    # 「復」误转作「複」，据 wenku 本改。
    ("複召為郎", "復召為郎"),
    # 「咸」误转作「鹹」，据 wenku 本改。
    ("鹹獲嘉祉", "咸獲嘉祉"),
    ("上鹹五", "上咸五"),
    # 「后」误转作「後」，据 wenku 本改。
    ("夏後氏戚之", "夏后氏戚之"),
    # 「里」误转作「裏」，据 wenku 本改。
    ("道裏遼遠", "道里遼遠"),
    # 「歷」误转作「曆」，据 wenku 本改。
    ("曆吉日", "歷吉日"),
    ("曆封巒", "歷封巒"),
    ("磧曆", "磧歷"),
    ("曆吊二世", "歷弔二世"),
    ("曆撰列辟", "歷撰列辟"),
    # 维基文库重抄一遍，据 wenku 本删。
    ("名山非唯雨之，又潤澤之；非唯濡之，氾尃濩之。萬物熙熙，懷而慕思。名山顯位", "名山顯位"),
    # 维基文库重抄一遍且脱「嘉」，据 wenku 本删补。
    ("其儀可；旼旼睦睦，君子之般般之獸，樂我君囿；白質黑章，其儀可；旼旼睦睦，君子之能", "其儀可嘉；旼旼睦睦，君子之能"),
    # 维基文库脱「覺寤黎烝」，「云」误作「雲」，据 wenku 本改。
    ("正陽顯見，於傳載之，雲受命所乘", "正陽顯見，覺寤黎烝。於傳載之，云受命所乘"),
    # 维基文库误作「乂」，据 wenku 本改。
    ("過乂鵲", "過䧴鵲"),
    # 「元」是避讳改字，据 wenku 本回改。
    ("白虎元豹", "白虎玄豹"),
    # 维基文库脱「眾」，据 wenku 本补。
    ("菴䕡軒芋，物居之", "菴䕡軒芋，眾物居之"),
    # 维基文库脱此句，据 wenku 本及中华点校本补。
    ("此與詩之風諫何異。", "此與詩之風諫何異。揚雄以為靡麗之賦，勸百風一，猶馳騁鄭衛之聲，曲終而奏雅，不已虧乎？"),
]


def emend_117(text: str) -> str:
    for old, new in FIX_117:
        text = text.replace(old, new)
    return text


FIX_057 = [
    # 维基文库脱「擊」，据 wenku 本补（下文「從高帝擊反韓王信」同例）。
    ("從高帝反者燕王臧荼", "從高帝擊反者燕王臧荼"),
    # 「里」误转作「裏」，据 wenku 本改。
    ("攻槐裏", "攻槐里"),
    # 「繫」误转作「系」，据 wenku 本改。
    ("及系急", "及繫急"),
]


def emend_057(text: str) -> str:
    for old, new in FIX_057:
        text = text.replace(old, new)
    return text


FIX_009 = [
    # 维基文库衍「受」，据 wenku 本删。
    ("以諸呂女為受后", "以諸呂女為后"),
    # 维基文库脱「將」，据 wenku 本及下文「欲歸將印」补。
    ("足下何不歸印", "足下何不歸將印"),
    # 据 wenku 本补逗号。
    ("亂功臣今齊王", "亂功臣，今齊王"),
    # 据 wenku 本补句号。
    ("毋為他人守也」", "毋為他人守也。」"),
    # 标点：补冒号。
    ("滕公曰「", "滕公曰：「"),
    # 「僕」误转作「仆」，据 wenku 本改。
    ("太仆", "太僕"),
]


def emend_009(text: str) -> str:
    for old, new in FIX_009:
        text = text.replace(old, new)
    return text


FIX_010 = [
    # 請與，據文庫本補與字
    ("臣謹請陰安侯", "臣謹請與陰安侯"),
    # 繁简混用，據文庫本
    ("徙立故琅邪王泽为燕王", "徙立故琅邪王澤為燕王"),
    # 據文庫本補歲字
    ("諸侯建國千餘，", "諸侯建國千餘歲，"),
    # 仆→僕，繁简转换误
    ("乃使太仆嬰", "乃使太僕嬰"),
    # 仆→僕，繁简转换误
    ("太仆見馬", "太僕見馬"),
    # 據文庫本乙正
    ("以給傳置", "以給置傳"),
    # 系→繫，繁简转换误
    ("逮徙系長安", "逮徙繫長安"),
    # 标点：补句号
    ("爵各一級封將軍", "爵各一級。封將軍"),
    # 标点：补句号
    ("「長當棄市」帝", "「長當棄市」。帝"),
]


def emend_010(text: str) -> str:
    for old, new in FIX_010:
        text = text.replace(old, new)
    return text


FIX_043 = [
    # 據文庫本補與
    ("公子紲太子肅侯", "公子紲與太子肅侯"),
    # 據文庫本及通行本補告
    ("使王紲公子成", "使王紲告公子成"),
    # 據文庫本補妬
    ("郎中之，故相與謀", "郎中妬之，故相與謀"),
    # 據文庫本補
    ("豈不痛乎！五年", "豈不痛乎！主父死，惠文王立，立五年"),
    # 字→子，文庫本同誤，據通行本（册府元龜卷238）
    ("公字成再拜", "公子成再拜"),
    # 文庫本同誤，據通行本及《繹史》
    ("主主開之", "主父開之"),
    # 據文庫本
    ("夫人置兒叱罅祝曰", "夫人置兒絝中，祝曰"),
    # 捨→舍，繁简转换误
    ("周捨之鄂鄂", "周舍之鄂鄂"),
    # 捨→舍，繁简转换误
    ("今王捨此", "今王舍此"),
    # 發→髮，繁简转换误
    ("夫翦發文身", "夫翦髮文身"),
    # 據文庫本
    ("系累吾民", "係累吾民"),
    # 丑→醜，繁简转换误
    ("先王丑之", "先王醜之"),
    # 丑→醜，繁简转换误
    ("鄗事之丑", "鄗事之醜"),
    # 讬→託
    ("而讬之", "而託之"),
    # 讬→託
    ("何以自讬", "何以自託"),
    # 據文庫本
    ("栗腹約驤", "栗腹約驩"),
    # 據文庫本
    ("秦取我中都及西陽", "秦取我西都及中陽"),
    # 據文庫本及通行本
    ("秦取保陽", "秦取梗陽"),
    # 筑→築
    ("筑剛平", "築剛平"),
    # 筑→築
    ("中山筑長城", "中山築長城"),
]


def emend_043(text: str) -> str:
    for old, new in FIX_043:
        text = text.replace(old, new)
    return text


FIX_074 = [
    # 筑→築，據文庫本
    ("筑碣石宮", "築碣石宮"),
    # 茍→苟，據文庫本
    ("阿世俗茍合", "阿世俗苟合"),
    # 御→禦，據文庫本
    ("善守御", "善守禦"),
]


def emend_074(text: str) -> str:
    for old, new in FIX_074:
        text = text.replace(old, new)
    return text


FIX_122 = [
    # 據文庫本補滅
    ("至則族瞯氏", "至則族滅瞯氏"),
    # 據文庫本補盜
    ("小群以百數", "小群盜以百數"),
    # ┐为乱码，據文庫本作奉
    ("九卿碌碌┐其官", "九卿碌碌奉其官"),
    # 仆→僕
    ("而楊仆以嚴酷", "而楊僕以嚴酷"),
    # 仆→僕
    ("楊仆者", "楊僕者"),
    # 仆→僕
    ("東郡彌仆", "東郡彌僕"),
    # 據文庫本補吾
    ("後爲執金時", "後爲執金吾時"),
]


def emend_122(text: str) -> str:
    for old, new in FIX_122:
        text = text.replace(old, new)
    return text


FIX_049 = [
    # 據文庫本
    ("而薄案死山陰", "而薄父死山陰"),
    # 據文庫本
    ("追尊薄案為", "追尊薄父為"),
    # 裏→里，繁简转换误
    ("王太后，槐裏人", "王太后，槐里人"),
    # 裏→里
    ("為槐裏王仲妻", "為槐里王仲妻"),
    # 裏→里
    ("葬槐裏", "葬槐里"),
    # 日→曰，文庫本同誤，據識典古籍點校本
    ("長女號日平陽", "長女號曰平陽"),
    # 鐘→鍾，據文庫本
    ("故事者鐘離生", "故事者鍾離生"),
    # 據文庫本補建元六年
    ("孝景帝六歲崩，合葬霸陵", "孝景帝六歲建元六年崩，合葬霸陵"),
]


def emend_049(text: str) -> str:
    for old, new in FIX_049:
        text = text.replace(old, new)
    return text


FIX_044 = [
    # 筑→築、裏→里，據文庫本
    ("筑臨晉元裏", "築臨晉元里"),
    # 筑→築
    ("筑雒陰", "築雒陰"),
    # 裏→里
    ("戰元裏", "戰元里"),
    # 筑→築
    ("筑長城，塞固陽", "築長城，塞固陽"),
    # 丑→醜
    ("寡人甚丑之", "寡人甚醜之"),
    # 據文庫本補以
    ("將何利吾國", "將何以利吾國"),
    # 茍→苟
    ("茍有利焉", "苟有利焉"),
    # 鄴→鄰，據文庫本
    ("與大梁鄴", "與大梁鄰"),
    # 百→由，據文庫本
    ("禍必百此", "禍必由此"),
    # 據文庫本補山
    ("道渉谷", "道涉山谷"),
    # 據文庫本
    ("右上蔡、召陵", "右蔡左召陵"),
]


def emend_044(text: str) -> str:
    for old, new in FIX_044:
        text = text.replace(old, new)
    return text


FIX_004 = [
    # 薄姑，地名。泵字误，据文库本改
    ("遷其君薄泵", "遷其君薄姑"),
    # 据文库本改
    ("蒙衣其殊玉", "蒙衣其珠玉"),
    # 檿弧，山桑木弓。据文库本改
    ("「厭弧箕服", "「檿弧箕服"),
    # 茍→苟
    ("子茍能", "子苟能"),
    # 漏園，据文库本补
    ("奪其大臣以為囿", "奪其大臣園以為囿"),
]


def emend_004(text: str) -> str:
    for old, new in FIX_004:
        text = text.replace(old, new)
    return text


FIX_003 = [
    # 鳴→嗚，据文库本
    ("鳴呼！", "嗚呼！"),
    # 筑→築
    ("筑於傅險", "築於傅險"),
]


def emend_003(text: str) -> str:
    for old, new in FIX_003:
        text = text.replace(old, new)
    return text


FIX_012 = [
    # 据文库本、卷二十八封禅书改
    ("食臣棗", "食巨棗"),
    # 与下文「地士將軍大」一致，据文库本、封禅书改
    ("地土將軍", "地士將軍"),
    # 干支无辛已；本篇上文作「其冬辛巳朔旦冬至」
    ("十一月辛已朔", "十一月辛巳朔"),
]


def emend_012(text: str) -> str:
    for old, new in FIX_012:
        text = text.replace(old, new)
    return text


FIX_067 = [
    # 鉆→鑽，繁简转换误，文库本作鑽
    ("鉆燧改火", "鑽燧改火"),
]


def emend_067(text: str) -> str:
    for old, new in FIX_067:
        text = text.replace(old, new)
    return text


FIX_111 = [
    # 筑→築，繁简转换误
    ("使建筑朔方城", "使建築朔方城"),
    # 筑→築
    ("筑受降城", "築受降城"),
    # 筑→築
    ("以將軍筑朔方", "以將軍築朔方"),
    # 系→繫，据文库本
    ("復系", "復繫"),
    # 丑→醜，据文库本
    ("執鹵獲丑", "執鹵獲醜"),
    # 梼→檮，据文库本
    ("梼余山", "檮余山"),
    # 据文库本
    ("禽為河綦侯", "禽梨為河綦侯"),
]


def emend_111(text: str) -> str:
    for old, new in FIX_111:
        text = text.replace(old, new)
    return text


FIX_110 = [
    # 騨→驒，据文库本
    ("騨騱", "驒騱"),
    # 毋→彎，形近误，据文库本
    ("士力能毋弓", "士力能彎弓"),
    # 衍一復字，据文库本
    ("又復復入", "又復入"),
    # 其→甚，据文库本
    ("殺略吏民其眾", "殺略吏民甚眾"),
    # 仆→僕，繁简转换误，据文库本
    ("遣故太仆賀", "遣故太僕賀"),
    # 据文库本
    ("單于復肴甘言", "單于復讇以甘言"),
    # 衍莖字，据文库本
    ("而務莖讇", "而務讇"),
]


def emend_110(text: str) -> str:
    for old, new in FIX_110:
        text = text.replace(old, new)
    return text


FIX_123 = [
    # 筑→築，繁简转换误
    ("始筑令居", "始築令居"),
    # 后→後，繁简转换误，据文库本
    ("其后益習", "其後益習"),
    # 后→後，繁简转换误，据文库本
    ("貳師后", "貳師後"),
]


def emend_123(text: str) -> str:
    for old, new in FIX_123:
        text = text.replace(old, new)
    return text


FIX_120 = [
    # 斑→高，据文库本
    ("取斑皇帝", "取高皇帝"),
    # 緦→戹，据文库本
    ("脫張羽於緦", "脫張羽於戹"),
    # 后→後，繁简转换误，据文库本
    ("后來者居上", "後來者居上"),
    # 人→大，据文库本
    ("翟公乃人署", "翟公乃大署"),
]


def emend_120(text: str) -> str:
    for old, new in FIX_120:
        text = text.replace(old, new)
    return text


FIX_005 = [
    # 裏→里，繁简转换误，据文库本
    ("殺裏克", "殺里克"),
    # 绖→絰，简体字混入，据文库本
    ("衰绖", "衰絰"),
    # 铚→銍，简体字混入
    ("乞食铚人", "乞食銍人"),
    # 嵤→罃，据文库本
    ("太子嵤", "太子罃"),
    # 据文库本
    ("摢裏", "㯉里"),
    # 裏→里，据文库本
    ("元裏", "元里"),
    # 筑→築，据文库本
    ("魏筑長城", "魏築長城"),
    # 筑→築，据文库本
    ("筑冀闕", "築冀闕"),
    # 据文库本断句
    ("西陽十年", "西陽。十年"),
]


def emend_005(text: str) -> str:
    for old, new in FIX_005:
        text = text.replace(old, new)
    return text


FIX_054 = [
    # 裏→里，繁简转换误，据文库本
    ("杠裏", "杠里"),
    # 軒→轘，据文库本
    ("下軒轅", "下轘轅"),
    # 窋→閒，据文库本
    ("歸，窋侍", "歸，閒侍"),
]


def emend_054(text: str) -> str:
    for old, new in FIX_054:
        text = text.replace(old, new)
    return text


FIX_102 = [
    # 衍「释之為廷尉」五字（且混入简体释），据文库本删
    ("頃之，释之為廷尉。", "頃之，"),
    # 仆→僕，繁简转换误，据文库本
    ("謁者仆射", "謁者僕射"),
    # 其→甚，据文库本
    ("所殺其眾", "所殺甚眾"),
]


def emend_102(text: str) -> str:
    for old, new in FIX_102:
        text = text.replace(old, new)
    return text


FIX_101 = [
    # 脱忼字，据文库本
    ("引大體慨", "引大體忼慨"),
    # 脱忼字，据文库本
    ("引義慨", "引義忼慨"),
    # 脱乘字，据文库本
    ("乘六傳", "乘六乘傳"),
    # 系→繫，繁简转换误，据文库本
    ("徵系清室", "徵繫清室"),
    # 仆→僕，繁简转换误，据文库本
    ("謁者仆射", "謁者僕射"),
]


def emend_101(text: str) -> str:
    for old, new in FIX_101:
        text = text.replace(old, new)
    return text


FIX_100 = [
    # 异体髙→高，据文库本
    ("髙", "高"),
    # 异体撃→擊，据文库本
    ("撃", "擊"),
    # 异体呉→吳，据文库本
    ("呉", "吳"),
    # 兪→俞，据文库本
    ("兪侯", "俞侯"),
    # 仆→僕，繁简转换误，据文库本
    ("且仆楚人", "且僕楚人"),
    # 仆→僕，据文库本
    ("仆游揚", "僕游揚"),
    # 仆→僕，据文库本
    ("距仆之深", "距僕之深"),
]


def emend_100(text: str) -> str:
    for old, new in FIX_100:
        text = text.replace(old, new)
    return text


FIX_088 = [
    # 筑→築，繁简转换误，据文库本
    ("筑長城", "築長城"),
    # 系→繫，据文库本
    ("系蒙毅", "繫蒙毅"),
    # 系→繫，据文库本
    ("囚系", "囚繫"),
]


def emend_088(text: str) -> str:
    for old, new in FIX_088:
        text = text.replace(old, new)
    return text


FIX_099 = [
    # 裏→里，繁简转换误，据文库本
    ("道裏均", "道里均"),
    # 涂→塗，据文库本
    ("肝腦涂地", "肝腦塗地"),
    # 系→繫，据文库本
    ("械系敬", "械繫敬"),
    # 筑→築，据文库本
    ("方筑武庫", "方築武庫"),
    # 筑→築，据文库本
    ("何自筑複道", "何自築複道"),
]


def emend_099(text: str) -> str:
    for old, new in FIX_099:
        text = text.replace(old, new)
    return text


FIX_119 = [
    # 异体统一为正字
    ("髙", "高"),
    # 异体统一为正字
    ("自繋", "自繫"),
    # 异体统一为正字
    ("半歳", "半歲"),
]


def emend_119(text: str) -> str:
    for old, new in FIX_119:
        text = text.replace(old, new)
    return text


FIX_096 = [
    # 系→繫，繁简转换误，据文库本
    ("吏系呂后", "吏繫呂后"),
    # 仆→僕，繁简转换误，据文库本
    ("太仆", "太僕"),
    # 底本「妯囡」为录入讹字，据文库本作「戹不得」
    ("困妯囡者", "困戹不得者"),
    # 标点误
    ("周昌笑曰；", "周昌笑曰："),
]


def emend_096(text: str) -> str:
    for old, new in FIX_096:
        text = text.replace(old, new)
    return text


FIX_125 = [
    # 后→後，繁简转换误，据文库本
    ("衣裻帶后穿", "衣裻帶後穿"),
    # 后→後，据文库本
    ("其衣后穿", "其衣後穿"),
    # 后→後，据文库本
    ("卒后", "卒後"),
    # 后→後，据文库本
    ("是之后", "是之後"),
    # 后→後，据文库本
    ("觀后人", "觀後人"),
]


def emend_125(text: str) -> str:
    for old, new in FIX_125:
        text = text.replace(old, new)
    return text


FIX_108 = [
    # 异体统一为正字
    ("呉", "吳"),
    # 异体统一为正字
    ("歳", "歲"),
    # 异体统一为正字
    ("説", "說"),
    # 异体统一为正字
    ("暦", "曆"),
    # 仆→僕，繁简转换误，据文库本
    ("太仆", "太僕"),
    # 睗为讹字，据文库本作節
    ("小睗", "小節"),
    # 异体统一为正字
    ("疎", "疏"),
    # 异体统一为正字
    ("鄕", "鄉"),
]


def emend_108(text: str) -> str:
    for old, new in FIX_108:
        text = text.replace(old, new)
    return text


FIX_106 = [
    # 系→繫，繁简转换误，据文库本
    ("劾系", "劾繫"),
    # 系→繫，据文库本
    ("輒系", "輒繫"),
    # 系→繫，据文库本
    ("漢系", "漢繫"),
    # 馕→饟，据文库本
    ("馕道", "饟道"),
    # 茍→苟，据文库本
    ("茍", "苟"),
]


def emend_106(text: str) -> str:
    for old, new in FIX_106:
        text = text.replace(old, new)
    return text


FIX_112 = [
    # 筑→築，繁简转换误，据文库本
    ("北筑", "北築"),
    # 筑→築，据文库本
    ("眾筑", "眾築"),
    # 筑→築，据文库本
    ("版筑", "版築"),
    # 系→係，据文库本
    ("殺將系虜", "殺將係虜"),
    # 仆→僕，据文库本
    ("奴仆", "奴僕"),
    # 后→後，据文库本
    ("不重肉。后母", "不重肉。後母"),
    # 后→後，据文库本
    ("天子后聞", "天子後聞"),
    # 后→後，据文库本
    ("名族之后", "名族之後"),
    # 后→後，据文库本
    ("隨其后", "隨其後"),
    # 后→後，据文库本
    ("公侯之后", "公侯之後"),
    # 后→後，据文库本
    ("嗣爵，后為", "嗣爵，後為"),
    # 后→後，据文库本
    ("服，后聖", "服，後聖"),
    # 馕→饟，据文库本
    ("糧馕", "糧饟"),
    # 芻→輓，据文库本
    ("蜚芻芻粟", "蜚芻輓粟"),
    # 删去底本方括号，据文库本
    ("尉[佗]屠睢", "尉佗屠睢"),
    # 狝→獮，繁简转换误，据文库本
    ("秋狝", "秋獮"),
]


def emend_112(text: str) -> str:
    for old, new in FIX_112:
        text = text.replace(old, new)
    return text


FIX_081 = [
    ("原以十五城請易璧", "願以十五城請易璧"),
    ("原王勿遣", "願王勿遣"),
    ("皆原一戰", "皆願一戰"),
    ("請奏盆鮓秦王", "請奉盆缻秦王"),
    ("鮓", "缻"),
    ("禦史", "御史"),
    ("道裏", "道里"),
    ("五十裏", "五十里"),
    ("「籲！", "「吁！"),
    ("舍相如廣成傳。", "舍相如廣成傳舍。"),
    ("遣秦間，卷甲而趨之", "遣秦間，乃卷甲而趨之"),
    ("今善射者去閼與", "令善射者去閼與"),
    ("扈輒於武遂，", "扈輒於武遂城，"),
    ("龐暖", "龐煖"),
]


def emend_081(text: str) -> str:
    text = text.translate(SHINJITAI_081)
    for old, new in FIX_081:
        text = text.replace(old, new)
    return text


def split_sentences(text: str) -> list[str]:
    sentences = []
    buf: list[str] = []
    i = 0
    while i < len(text):
        ch = text[i]
        buf.append(ch)
        i += 1
        if ch in "。！？":
            while i < len(text) and text[i] in "」』":
                buf.append(text[i])
                i += 1
            sentences.append("".join(buf))
            buf = []
    tail = "".join(buf).strip("，、；：")
    if tail:
        sentences.append(tail)
    return [s for s in (item.strip("，、；：") for item in sentences) if s.strip("，。！？；、：「」『』")]


def parse_index() -> list[dict]:
    raw = (SRC / "index.wikitext").read_text(encoding="utf-8")
    rows = []
    for m in re.finditer(r"^\*\[\[史記/卷(\d{3})\|[^\]]+\]\][\s　]*(.+?)\s*$", raw, flags=re.M):
        juan = int(m.group(1))
        full_t = clean_inline(m.group(2))
        title_t = re.sub(r"第[" + CN_NUM + r"]+$", "", full_t)
        rows.append({"juan": juan, "full_t": full_t, "title_t": title_t, "title_s": to_simplified(title_t)})
    if [row["juan"] for row in rows] != list(range(1, 131)):
        raise SystemExit("目录不是卷一至卷一百三十")
    return rows


def parse_juan(juan: int) -> list[list[str]]:
    raw = (SRC / f"juan{juan:03d}.wikitext").read_text(encoding="utf-8")
    body = raw.split("}}", 1)[1]
    paragraphs = []
    zan = False
    quote = False
    addendum = ""
    tags: list[str] = []
    PARA_TAGS[juan] = tags
    for line in body.splitlines():
        # 卷一百三十《论六家要指》的分段用维基缩进「:」开头。
        line = line.strip().lstrip(":")
        # 卷一百一十七的生僻字写成 {{!|𨎥|左「車」右「惠」}}，取第一个参数（字本身），先换掉，免得行末的「}}」被当成引文结束。
        line = re.sub(r"\{\{!\|([^|}]+)\|[^}]*\}\}", r"\1", line)
        # 维基文库的空行写成 <br /><br />，不是正文。
        if re.fullmatch(r"(?:<br\s*/?>)+", line):
            continue
        # 卷四十四信陵君谏魏王一段用 <blockquote> 包起来，标签单独成行，不是正文。
        if re.fullmatch(r"</?blockquote>", line) or line.startswith(("<div", "<references")):
            continue
        # 卷八十一的【索隱述贊】写成小节标题，下面一段也是司马贞的，不收。
        # 卷一篇末的「==校勘記==」是后人的校记，不是原文。
        if line.startswith(("==索隱述贊", "==校勘記")):
            break
        # 卷六十三《说难》开头一段包在 {{Quote|…}} 里，到「}}」结束。
        # 卷一百一十七的赋和书信写作小写的 {{quote|…}}，可以跨好几行。
        if line.startswith(("{{Quote|", "{{quote|")):
            line = line[len("{{Quote|"):]
            quote = True
        if quote and line.endswith("}}"):
            line = line[:-2]
            quote = False
        # 维基文库的跨语言链接（如「fr:Shiji/LXV」），不是正文。
        if re.match(r"^\[\[[a-z]{2,3}:[^\]]*\]\]$", line):
            continue
        # 卷六篇末附班固《秦纪论》（{{*|班固記秦始皇本紀後…}}），不是司马迁写的。
        # 照中华点校本收入，段落标「班固《秦纪论》」。这一行本身是维基文库的标题，不收。
        if line.startswith("{{*|"):
            addendum = "bangu"
            continue
        # 卷一百二十六的「=褚先生补=」是维基文库的小标题，不是正文；以下是褚少孙补的。
        if re.match(r"^=[^=].*[^=]=$", line):
            if "褚" in line:
                addendum = "chu"
            continue
        # 「褚先生曰」以下是褚少孙补的，照点校本收入，段落标「褚少孙补」。
        if line.startswith("褚先生曰"):
            addendum = "chu"
        # 卷一百一十二篇末附太皇太后诏和班固赞语，不是司马迁写的，照点校本收入并标出。
        if juan == 112 and line.lstrip(":").startswith("太皇太后詔"):
            addendum = "zhao"
        if juan == 112 and line.lstrip(":").startswith("班固稱曰"):
            addendum = "banzan"
        # 卷九十六「孝武時丞相多甚」以下是褚少孙补的（点校本同）。
        if juan == 96 and line.startswith("孝武時丞相多甚"):
            addendum = "chu"
        # 《秦纪论》末段以维基文库模板的「}}」收尾。
        if addendum == "bangu" and line.endswith("}}"):
            line = line[:-2]
        # 卷四十七的「==太史公曰==」是小标题，正文不再写「太史公曰」，补回来。
        if line.replace(" ", "") == "==太史公曰==":
            zan = True
            continue
        if line.startswith("{{") and not line.startswith(("{{ProperNoun|", "{{YL|", "{{專|", "{{書|", "{{標|")):
            continue
        if not line or line.startswith(("__", "}}", "==", "|", "[[Category", "[[category", "[[File", "[[分類", "</")):
            continue
        # 篇末的【索隱述贊】是司马贞写的，不是史记本文。
        if line.startswith("【"):
            continue
        text = clean_inline(line)
        if zan and not text.startswith("太史公曰"):
            text = "太史公曰：" + text
        zan = False
        if juan == 81:
            text = emend_081(text)
        if juan == 86:
            text = emend_086(text)
        if juan == 109:
            text = emend_109(text)
        if juan == 129:
            text = emend_129(text)
        if juan == 6:
            text = emend_006(text)
        if juan == 76:
            text = emend_076(text)
        if juan == 66:
            text = emend_066(text)
        if juan == 41:
            text = emend_041(text)
        if juan == 82:
            text = emend_082(text)
        if juan == 75:
            text = emend_075(text)
        if juan == 83:
            text = emend_083(text)
        if juan == 78:
            text = emend_078(text)
        if juan == 69:
            text = emend_069(text)
        if juan == 70:
            text = emend_070(text)
        if juan == 79:
            text = emend_079(text)
        if juan == 53:
            text = emend_053(text)
        if juan == 73:
            text = emend_073(text)
        if juan == 56:
            text = emend_056(text)
        if juan == 107:
            text = emend_107(text)
        if juan == 126:
            text = emend_126(text)
        if juan == 105:
            text = emend_105(text)
        if juan == 89:
            text = emend_089(text)
        if juan == 91:
            text = emend_091(text)
        if juan == 97:
            text = emend_097(text)
        if juan == 117:
            text = emend_117(text)
        if juan == 57:
            text = emend_057(text)
        if juan == 9:
            text = emend_009(text)
        if juan == 10:
            text = emend_010(text)
        if juan == 43:
            text = emend_043(text)
        if juan == 74:
            text = emend_074(text)
        if juan == 122:
            text = emend_122(text)
        if juan == 49:
            text = emend_049(text)
        if juan == 44:
            text = emend_044(text)
        if juan == 4:
            text = emend_004(text)
        if juan == 3:
            text = emend_003(text)
        if juan == 12:
            text = emend_012(text)
        if juan == 67:
            text = emend_067(text)
        if juan == 111:
            text = emend_111(text)
        if juan == 110:
            text = emend_110(text)
        if juan == 123:
            text = emend_123(text)
        if juan == 120:
            text = emend_120(text)
        if juan == 5:
            text = emend_005(text)
        if juan == 54:
            text = emend_054(text)
        if juan == 102:
            text = emend_102(text)
        if juan == 101:
            text = emend_101(text)
        if juan == 100:
            text = emend_100(text)
        if juan == 88:
            text = emend_088(text)
        if juan == 99:
            text = emend_099(text)
        if juan == 119:
            text = emend_119(text)
        if juan == 96:
            text = emend_096(text)
        if juan == 125:
            text = emend_125(text)
        if juan == 108:
            text = emend_108(text)
        if juan == 106:
            text = emend_106(text)
        if juan == 112:
            text = emend_112(text)
        text = emend(text)
        sents = split_sentences(text)
        if sents:
            paragraphs.append(sents)
            tags.append(addendum)
    return paragraphs


# 每卷每段的出处：""＝司马迁本文；"chu"＝褚少孙补；"bangu"＝班固《秦纪论》。
PARA_TAGS: dict[int, list[str]] = {}
ADDENDA = {
    "chu": {"by": "褚少孙", "label": "褚少孙补",
            "note": "以下是西汉褚少孙后来补写的，不是司马迁原文。中华书局点校本照录，这里也收入。"},
    "zhao": {"by": "后人", "label": "后人附：太皇太后诏",
             "note": "以下是后人附入的太皇太后表彰公孙弘的诏书，不是司马迁原文。中华书局点校本照录，这里也收入。"},
    "banzan": {"by": "班固", "label": "班固赞语",
               "note": "以下是东汉班固的赞语，后人附在本卷末，不是司马迁原文。中华书局点校本照录，这里也收入。"},
    "bangu": {"by": "班固", "label": "班固《秦纪论》",
              "note": "以下是东汉班固评秦始皇、秦二世的《秦纪论》，后人附在本卷末，不是司马迁原文。中华书局点校本照录，这里也收入。"},
}


def article_id(juan: int) -> str:
    return f"s{juan:03d}"


def group_for(juan: int) -> tuple[str, str]:
    for gid, label, lo, hi in GROUPS:
        if lo <= juan <= hi:
            return gid, label
    raise ValueError(juan)


def cn_juan(n: int) -> str:
    digits = "〇一二三四五六七八九"
    if n < 10:
        return digits[n]
    if n < 20:
        return "十" + (digits[n % 10] if n % 10 else "")
    if n < 100:
        return digits[n // 10] + "十" + (digits[n % 10] if n % 10 else "")
    rest = n % 100
    head = "一百"
    if rest == 0:
        return head
    if rest < 10:
        return head + "零" + digits[rest]
    return head + ("一" + cn_juan(rest) if rest < 20 else cn_juan(rest))


def load_entries() -> list[dict]:
    index = {row["juan"]: row for row in parse_index()}
    entries = []
    for juan in DONE:
        row = index[juan]
        paras_t = parse_juan(juan)
        paras_s = [[to_simplified(s) for s in p] for p in paras_t]
        entries.append({**row, "id": article_id(juan), "paragraphs_t": paras_t, "paragraphs_s": paras_s})
    return entries


def sentence_count(entry: dict) -> int:
    return sum(len(p) for p in entry["paragraphs_s"])


def load_lesson(entry: dict) -> dict:
    parts = sorted((LESSONS / "parts").glob(f"{entry['id']}-*.json"), key=lambda p: int(p.stem.rsplit("-", 1)[1]))
    lesson_path = LESSONS / f"{entry['id']}.lesson.json"
    if not parts or not lesson_path.exists():
        raise FileNotFoundError(entry["id"])
    trs: list[str] = []
    for path in parts:
        trs.extend(json.loads(path.read_text(encoding="utf-8"))["trs"])
    lesson = json.loads(lesson_path.read_text(encoding="utf-8"))
    return {"id": entry["id"], "trs": trs, "lesson": lesson["lesson"]}


def load_readings(entry: dict) -> dict:
    path = READINGS / f"{entry['id']}.json"
    if not path.exists():
        return {"defaults": [], "readings": []}
    data = json.loads(path.read_text(encoding="utf-8"))
    return {"defaults": data.get("defaults", []), "readings": data["readings"]}


def apply_readings(entry: dict, sentences: list[list[dict]], spec: dict) -> None:
    """句中读音。每条给一个上下文片段 ctx、片段里第几个字 at（从 0 起）和读音 py。

    片段在全篇简体正文里每次出现都套用；一次都没有对上就报错。
    """
    flat = []
    for sent_tokens in sentences:
        for tok in sent_tokens:
            flat.append(tok)
    text = "".join(tok["s"] for tok in flat)
    # 本篇默认读音：整篇几乎只有一种读法的多音字，先统一给字典级读音，再由下面的句中规则覆盖。
    for rule in spec["defaults"]:
        allowed = set(pinyin(rule["char"], style=Style.TONE, heteronym=True)[0])
        if rule["py"] not in allowed:
            raise SystemExit(f"{entry['id']} 默认读音不对：{rule}")
        for tok in flat:
            if tok["s"] == rule["char"]:
                tok["py"] = rule["py"]
    text_t = "".join(tok["t"] for tok in flat)
    for rule in spec["readings"]:
        ctx, at, py = rule["ctx"], rule["at"], rule["py"]
        if not ctx or len(py.split()) != 1:
            raise SystemExit(f"{entry['id']} 读音规则不对：{rule}")
        # 片段先对简体正文，再对繁体正文，最后把片段本身转成简体再对。
        hits = []
        for probe, hay in ((ctx, text), (ctx, text_t), (to_simplified(ctx), text)):
            hits = [m.start() for m in re.finditer(re.escape(probe), hay)]
            if hits:
                break
        if not hits:
            raise SystemExit(f"{entry['id']} 读音规则没对上原文：{ctx}")

        def ok(j: int) -> bool:
            tok = flat[hits[0] + j]
            if tok.get("punct"):
                return False
            chars = {rule["loan"]} if rule.get("loan") else {tok["s"], tok["t"]}
            return any(py in pinyin(c, style=Style.TONE, heteronym=True)[0] for c in chars)

        # 位置写错（越界、落在标点上、该字没有这个读音）时，就近改到片段里有这个读音的字；
        # 改不了才报错。改过的记在 AUTOPOS 里，构建结束时列出。
        if not (0 <= at < len(ctx) and ok(at)):
            cands = sorted((j for j in range(len(ctx)) if ok(j)), key=lambda j: (abs(j - at), j))
            if not cands:
                raise SystemExit(f"{entry['id']} {ctx} 里没有读 {py} 的字（at={at}）")
            if len(cands) > 1 and abs(cands[0] - at) == abs(cands[1] - at):
                raise SystemExit(f"{entry['id']} {ctx} 读 {py} 的位置不确定（at={at}，候选 {cands[:2]}）")
            AUTOPOS.append(f"{entry['id']} {ctx} at {at}→{cands[0]} {py}")
            at = cands[0]
        rule["_hits"] = len(hits)
        for start in hits:
            tok = flat[start + at]
            tok["py"] = py
            tok["level"] = "sentence"
            tok["ctx"] = rule.get("note", "")


AUTOPOS: list[str] = []


def tokens_for(trad: str, simp: str) -> list[dict]:
    rows = []
    for t_ch, s_ch in zip(trad, simp):
        if t_ch in PUNCT or s_ch in PUNCT:
            rows.append({"t": t_ch, "s": s_ch, "punct": True})
        else:
            rows.append({"t": t_ch, "s": s_ch, "py": "", "ctx": "", "pos": "", "extra": "", "level": "dict"})
    return rows


def article_for(entry: dict, lesson: dict) -> dict:
    trs = lesson["trs"]
    cursor = 0
    paragraphs = []
    token_rows = []
    tags = PARA_TAGS.get(entry["juan"], [])
    for pi, (trad_p, simp_p) in enumerate(zip(entry["paragraphs_t"], entry["paragraphs_s"])):
        sentences = []
        for trad, simp in zip(trad_p, simp_p):
            if len(trad) != len(simp):
                raise SystemExit(f"{entry['id']} 简繁长度不一致：{trad}")
            toks = tokens_for(trad, simp)
            token_rows.append(toks)
            sentences.append({"tr": trs[cursor], "tokens": toks})
            cursor += 1
        para = {"sentences": sentences}
        tag = tags[pi] if pi < len(tags) else ""
        if tag:
            para["addendum"] = ADDENDA[tag]
        paragraphs.append(para)
    apply_readings(entry, token_rows, load_readings(entry))
    gid, label = group_for(entry["juan"])
    head = f"{label} · 卷{cn_juan(entry['juan'])}"
    return {
        "id": entry["id"],
        "volume": entry["juan"],
        "volumeTitle": label,
        "volumeSubtitle": f"卷{cn_juan(entry['juan'])}",
        "index": entry["juan"],
        "title": {"t": entry["title_t"], "s": entry["title_s"]},
        "book": {"t": "史記", "s": "史记"},
        "sourceHead": {"t": f"{entry['full_t']}", "s": head},
        "author": "司马迁",
        "annotated": True,
        "paragraphs": paragraphs,
        "lesson": lesson["lesson"],
    }


def catalog_for(entries: list[dict]) -> dict:
    done = {e["juan"]: e for e in entries}
    volumes = []
    for gid, label, lo, hi in GROUPS:
        items = []
        articles = []
        for row in parse_index():
            if not lo <= row["juan"] <= hi:
                continue
            item = {"juan": row["juan"], "title": row["title_s"], "titleT": row["title_t"]}
            if row["juan"] in done:
                item["id"] = article_id(row["juan"])
                articles.append({
                    "id": item["id"], "index": row["juan"], "title": row["title_s"],
                    "titleT": row["title_t"], "date": f"卷{cn_juan(row['juan'])}", "author": "司马迁",
                })
            else:
                item["note"] = "待添加"
            items.append(item)
        volumes.append({"volume": len(volumes) + 1, "group": gid, "title": label,
                        "subtitle": f"卷{cn_juan(lo)}至卷{cn_juan(hi)}", "entries": items, "articles": articles})
    return {"title": "史记", "author": "司马迁", "articleCount": len(entries), "total": 130,
            "source": "维基文库《史記》", "volumes": volumes}


def extend_dict(entries: list[dict]) -> None:
    path = ROOT / "data" / "dict.json"
    payload = json.loads(path.read_text(encoding="utf-8"))
    chars = payload["chars"]
    need = set()
    for entry in entries:
        for para in entry["paragraphs_t"]:
            for sent in para:
                need.update(ch for ch in sent if ch not in PUNCT and ch not in chars)
    if not need:
        return
    sys.path.insert(0, str(ROOT / "scripts"))
    from build_site import build_dict

    chars.update(build_dict(need))
    path.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"dict +{len(need)}: {''.join(sorted(need))}")


def han_only(text: str) -> str:
    return "".join(ch for ch in text if "\u3400" <= ch <= "\u9fff" or ord(ch) > 0xFFFF)


# 维基文库底本保留了不少旧字形（淸、呑、値、疎、髙……），OpenCC 不转。
# 名句按通行字形写，比对时两边都折成同一字形；写进 famous.json 的仍是原句。
VARIANT_FOLD = str.maketrans({
    "淸": "清", "呑": "吞", "値": "值", "疎": "疏", "髙": "高", "倶": "俱", "歳": "岁",
    "撃": "击", "靑": "青", "毎": "每", "晩": "晚", "歩": "步", "戸": "户", "塡": "填",
    "徴": "征", "兪": "俞", "楡": "榆", "鄕": "乡", "屛": "屏", "兊": "兑", "呉": "吴",
    "絶": "绝", "卽": "即", "旣": "既", "眞": "真", "緑": "绿", "說": "说",
})


def fold(text: str) -> str:
    return to_simplified(han_only(text)).translate(VARIANT_FOLD)


def merge_famous(entries: list[dict]) -> None:
    """课注里的名句写进 data/famous.json。先去掉本书旧条目，再按篇加回。"""
    path = ROOT / "data" / "famous.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    ids = {e["id"] for e in entries}
    data["lines"] = [l for l in data["lines"] if not any(re.fullmatch(r"s\d{3}", p) for p in l.get("pieces", []))]
    for key in [k for k in data["pieces"] if re.fullmatch(r"s\d{3}", k)]:
        del data["pieces"][key]
    for entry in entries:
        famous = json.loads((LESSONS / f"{entry['id']}.lesson.json").read_text(encoding="utf-8")).get("famous", [])
        sentences = [s for p in entry["paragraphs_s"] for s in p]
        for item in famous:
            quote = fold(item["quote"])
            hits = [s for s in sentences if quote in fold(s)]
            if len(quote) < 3 or not hits:
                raise SystemExit(f"{entry['id']} 名句对不上原文：{item['quote']}")
            data["lines"].append({"pieces": [entry["id"]], "quote": item["quote"], "text": hits[0],
                                  "fame": item["fame"], "vernacular": item["vernacular"],
                                  "appreciate": item["appreciate"]})
        if famous:
            data["pieces"][entry["id"]] = {"collection": famous[0]["fame"] if any(f["fame"] != "通行名句" for f in famous) else "通行名句"}
    assert ids
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def write(entries: list[dict]) -> None:
    for entry in entries:
        lesson = load_lesson(entry)
        if len(lesson["trs"]) != sentence_count(entry):
            raise SystemExit(f"{entry['id']} 译文 {len(lesson['trs'])} 句，原文 {sentence_count(entry)} 句")
        dump_json(ARTICLES / f"{entry['id']}.json", article_for(entry, lesson))
    dump_json(CATALOG, catalog_for(entries))
    merge_famous(entries)
    extend_dict(entries)


def main() -> None:
    entries = load_entries()
    if "--write" in sys.argv:
        write(entries)
        (ROOT / "sources" / "verification" / "reading_autopos.txt").write_text(
            "".join(line + "\n" for line in AUTOPOS), encoding="utf-8")
        if AUTOPOS:
            print(f"读音位置自动改正 {len(AUTOPOS)} 条，见 sources/verification/reading_autopos.txt")
        print(f"wrote {len(entries)} articles")
        return
    dump_json(DUMP, [{"id": e["id"], "title": e["title_s"], "sentences": sentence_count(e),
                      "paragraphs": e["paragraphs_s"]} for e in entries], pretty=True)
    for e in entries:
        chars = sum(len(s) for p in e["paragraphs_s"] for s in p)
        print(e["id"], e["title_s"], "paragraphs", len(e["paragraphs_s"]), "sentences", sentence_count(e), "chars", chars)


if __name__ == "__main__":
    main()
