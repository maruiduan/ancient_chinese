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
OLDID = {48: 2531218, 55: 2666612, 84: 1568305, 86: 2388562, 81: 8735558, 92: 1483915, 109: 1765440, 62: 7903600, 77: 367917, 130: 2609362, 61: 2621133, 124: 367994, 129: 7904128, 47: 7903609, 6: 7907969, 68: 8764712, 65: 2567048, 76: 7909284, 63: 7903601, 41: 11132202, 66: 2621138, 82: 2529471, 80: 2089316, 75: 1965692, 83: 2089252, 85: 2027911, 78: 2089016, 87: 2364605, 69: 2621145, 70: 2621148, 79: 2549307, 53: 2087971, 73: 7909285, 56: 1961615, 107: 2540571, 126: 2609358, 105: 8842726, 89: 8744143, 91: 2509940, 97: 1383195, 117: 10371549, 57: 1569360, 9: 2087062, 10: 2599229, 43: 7903603, 74: 7908177, 122: 7904124, 49: 7903610, 44: 7903606, 1: 11133934, 4: 7909147, 2: 7903612, 3: 7909145, 12: 8733061, 64: 7895410, 67: 7869003, 111: 8730225, 110: 8735645, 123: 8736799, 120: 9166127, 5: 8744286, 54: 1490182, 102: 1753957, 101: 368092, 100: 1965696, 88: 1965690, 99: 368013, 119: 7904123, 96: 8770206, 125: 2273599, 108: 1765317, 106: 405869, 112: 2089420, 118: 7904122, 11: 2520527, 42: 2016409, 45: 7903607, 50: 8737728, 51: 2380315, 46: 2560838, 52: 5977113, 58: 8735555, 59: 2621125, 60: 7909290, 71: 2621152, 72: 367921, 90: 376055, 93: 368019, 94: 2171897, 95: 2298709, 98: 1490318, 103: 2096814, 104: 8739534, 113: 8735632, 114: 8735633, 115: 439220, 116: 7903636, 121: 8735621, 127: 2609359, 128: 7904127, 23: 2607039, 29: 1513337, 24: 2607042, 25: 366037, 30: 8730259, 26: 2637674, 28: 8738543, 27: 366041, 16: 2607007, 13: 2606991, 14: 2607001, 15: 2607002, 17: 2607010, 18: 9484995, 19: 6359260, 20: 2607036, 21: 2607037, 22: 2607038, 31: 7909287, 32: 11135732, 33: 7909289, 34: 2559287, 35: 8737302, 36: 2588525, 37: 5977124, 38: 8737306, 39: 2588534}


def source_url(juan: int) -> str:
    if juan in OLDID:
        return f"https://zh.wikisource.org/w/index.php?oldid={OLDID[juan]}"
    return URL.format(juan=juan)

CC = OpenCC("t2s")
PUNCT = set("，。！？；、：·．…—～「」『』（）【】《》〈〉〔〕〖〗､“”‘’")
CN_NUM = "〇一二三四五六七八九十百"

# 已收的篇。以后每做一篇，在这里加卷号。
DONE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130]

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
    text = text.replace("干谿", "乾谿")
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


def strip_star_notes(text: str) -> str:
    out, i = [], 0
    while True:
        j = text.find("{{*|", i)
        if j < 0:
            out.append(text[i:])
            return "".join(out)
        out.append(text[i:j])
        depth, k = 0, j
        while k < len(text):
            if text.startswith("{{", k):
                depth += 1
                k += 2
            elif text.startswith("}}", k):
                depth -= 1
                k += 2
                if depth == 0:
                    break
            else:
                k += 1
        i = k


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
# 全书核查：维基文库底本混入的日文新字体、异写，全书统一换回正字（wenku 本同）。
SHINJITAI_ALL = str.maketrans({"毎": "每", "歳": "歲", "説": "說", "撃": "擊", "呉": "吳", "倶": "俱", "髙": "高",
                               "絶": "絕", "戸": "戶", "徴": "徵", "呑": "吞", "楡": "榆", "歴": "歷", "髪": "髮",
                               "虚": "虛", "歩": "步"})
# 全书核查：待核异文里古诗文网本与文库本相同、而维基文库底本不同且显误的，据两本改。
AUDIT_FIX = {
    9: [("永卷中", "永巷中")],
    27: [("羽小，飾詐", "弱小，飾詐")],
    45: [("潁州郡", "潁川郡")],
    46: [("齊國之政卒歸", "齊國之政其卒歸")],
    71: [("學百家之說", "學百家之術")],
    85: [("陰闕桐輪", "陰關桐輪")],
    116: [("秦滅諸候", "秦滅諸侯")],
    119: [("徐贄", "徐摯")],
    126: [("宦者署", "宦署")],
}


def audit_fix(juan: int, text: str) -> str:
    for old, new in AUDIT_FIX.get(juan, []):
        text = text.replace(old, new)
    return text


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


FIX_118 = [
    # 筑→築，繁简转换误，据文库本
    ("為筑外宮", "為築外宮"),
    # 筑→築，据文库本
    ("縣為筑蓋", "縣為築蓋"),
    # 筑→築，据文库本
    ("蒙恬筑", "蒙恬築"),
    # 异体统一为正字（文库本同）
    ("繋", "繫"),
    # 後→后，据文库本
    ("呂後殺之", "呂后殺之"),
    # 后→後，据文库本
    ("禁后", "禁後"),
    # 后→後，据文库本
    ("削地之后", "削地之後"),
    # 干→幹，据文库本
    ("材干", "材幹"),
    # 茍→苟，据文库本
    ("茍", "苟"),
    # 釠为讹字，据文库本作鐖
    ("釠鑿", "鐖鑿"),
]


def emend_118(text: str) -> str:
    for old, new in FIX_118:
        text = text.replace(old, new)
    return text


FIX_011 = [
    # 系→係，据文库本
    ("蕭何孫系", "蕭何孫係"),
    # 维基文库本脱「立皇子方乘」至「軍東都門外」一段，据文库本、点校本补
    ("皆封為列侯。", "皆封為列侯。立皇子方乘為清河王。三月，彗星出西北。丞相周亞夫免，以御史大夫桃侯劉舍為丞相。四月，地動。九月戊戌晦，日食。軍東都門外。"),
]


def emend_011(text: str) -> str:
    for old, new in FIX_011:
        text = text.replace(old, new)
    return text


FIX_042 = [
    # 异体统一为正字
    ("髙", "高"),
    # 异体统一为正字
    ("歳", "歲"),
    # 异体统一为正字
    ("説", "說"),
    # 异体统一为正字
    ("撃", "擊"),
    # 异体统一为正字
    ("呉", "吳"),
    # 异体统一为正字
    ("倶", "俱"),
    # 异体统一为正字
    ("卽", "即"),
    # 异体统一为正字
    ("内", "內"),
    # 异体统一为正字
    ("愼", "慎"),
    # 异体统一为正字
    ("絶", "絕"),
    # 异体统一为正字
    ("疎", "疏"),
    # 异体统一为正字（文库本作弦高）
    ("絃", "弦"),
    # 假→瑕，据文库本
    ("甫假", "甫瑕"),
    # 假→瑕，据文库本
    ("假曰", "瑕曰"),
    # 假→瑕，据文库本
    ("假殺", "瑕殺"),
    # 裏→里，据文库本
    ("裏克", "里克"),
    # 维基文库本脱「文公十七年」一句，据文库本、点校本补
    ("二十四年，文公之賤妾", "文公十七年，齊桓公以兵破蔡，遂伐楚，至召陵。二十四年，文公之賤妾"),
    # 维基文库本脱「二十二年，鄭繆公卒」一句，据文库本、点校本补
    ("晉使趙穿以兵伐鄭。", "晉使趙穿以兵伐鄭。二十二年，鄭繆公卒，子夷立，是為靈公。"),
]


def emend_042(text: str) -> str:
    for old, new in FIX_042:
        text = text.replace(old, new)
    return text


FIX_045 = [
    # 异体统一为正字
    ("髙", "高"),
    # 异体统一为正字
    ("歳", "歲"),
    # 异体统一为正字
    ("説", "說"),
    # 异体统一为正字
    ("撃", "擊"),
    # 异体统一为正字
    ("倶", "俱"),
    # 异体统一为正字
    ("絶", "絕"),
    # 异体统一为正字
    ("内", "內"),
    # 异体统一为正字
    ("虚", "虛"),
    # 筑→築，据文库本
    ("楚王筑", "楚王築"),
]


def emend_045(text: str) -> str:
    for old, new in FIX_045:
        text = text.replace(old, new)
    return text


FIX_051 = [
    # 文庫本作邸第
    ("邸弟", "邸第"),
    # 字形規範（正字）
    ("瑯", "琅"),
]


def emend_051(text: str) -> str:
    for old, new in FIX_051:
        text = text.replace(old, new)
    return text


FIX_046 = [
    # 文庫本作居朞年
    ("居朞，封", "居朞年，封"),
    # 文庫本有肦字（人名）
    ("吾臣有子者", "吾臣有肦子者"),
    # 繁簡轉換誤，文庫本作僕
    ("面其仆", "面其僕"),
    # 字形規範（正字）
    ("髙", "高"),
    # 字形規範
    ("撃", "擊"),
    # 字形規範
    ("呉", "吳"),
    # 字形規範
    ("歳", "歲"),
    # 字形規範
    ("説", "說"),
    # 字形規範
    ("絶", "絕"),
    # 字形規範
    ("旣", "既"),
    # 字形規範
    ("愼", "慎"),
    # 字形規範
    ("毎", "每"),
    # 字形規範
    ("卽", "即"),
    # 字形規範
    ("倶", "俱"),
    # 字形規範
    ("内", "內"),
    # 字形規範
    ("戸", "戶"),
    # 字形規範
    ("晩", "晚"),
    # 字形規範
    ("爲", "為"),
    # 簡體混入，文庫本作故
    ("笔周太史", "故周太史"),
    # 簡體混入，文庫本作稱
    ("秦惠王称王", "秦惠王稱王"),
    # 字形規範
    ("閲", "閱"),
    # 字形規範
    ("歴", "歷"),
    # 字形規範
    ("鋭", "銳"),
    # 字形規範
    ("温", "溫"),
    # 字形規範
    ("淸", "清"),
    # 字形規範
    ("疎", "疏"),
]


def emend_046(text: str) -> str:
    for old, new in FIX_046:
        text = text.replace(old, new)
    return text


FIX_052 = [
    # 繁簡轉換誤，文庫本作僕
    ("太仆嬰", "太僕嬰"),
    # 字形規範（正字）
    ("瑯", "琅"),
]


def emend_052(text: str) -> str:
    for old, new in FIX_052:
        text = text.replace(old, new)
    return text


FIX_058 = [
    # 繁簡轉換誤，文庫本作築
    ("孝王筑東苑", "孝王築東苑"),
    # 繁簡轉換誤，文庫本作後
    ("然后得釋", "然後得釋"),
    # 標點，文庫本作逗號
    ("殷道。太子死", "殷道，太子死"),
]


def emend_058(text: str) -> str:
    for old, new in FIX_058:
        text = text.replace(old, new)
    return text


FIX_059 = [
    # 簡體混入，文庫本作故
    ("取笔江都", "取故江都"),
    # 繁簡轉換誤，文庫本作王后
    ("王後修", "王后修"),
]


def emend_059(text: str) -> str:
    for old, new in FIX_059:
        text = text.replace(old, new)
    return text


FIX_060 = [
    # 文庫本作天子
    ("以承天于", "以承天子"),
    # 文庫本作俷，與下文褚補「無俷德」合
    ("毋卹德", "毋俷德"),
    # 文庫本作恭，與下文褚補「恭朕之詔」合
    ("抱朕之詔", "恭朕之詔"),
    # 文庫本作俷
    ("無作怨，無修德", "無作怨，無俷德"),
    # 繁簡轉換誤，文庫本作僕
    ("太仆", "太僕"),
]


def emend_060(text: str) -> str:
    for old, new in FIX_060:
        text = text.replace(old, new)
    return text


FIX_071 = [
    # 繁簡轉換誤，文庫本作苟
    ("茍", "苟"),
    # 繁簡轉換誤，與篇中樗里一致
    ("樗裏", "樗里"),
]


def emend_071(text: str) -> str:
    for old, new in FIX_071:
        text = text.replace(old, new)
    return text


FIX_072 = [
    # 形近誤，文庫本作割
    ("邦晉國", "割晉國"),
]


def emend_072(text: str) -> str:
    for old, new in FIX_072:
        text = text.replace(old, new)
    return text


FIX_090 = [
    # 繁簡轉換誤，文庫本作後
    ("十餘人后", "十餘人後"),
    # 繁簡轉換誤，文庫本作僕
    ("太仆", "太僕"),
    # 形近誤，文庫本作已
    ("反形己具", "反形已具"),
    # 文庫本作固陵
    ("所敗碧陵", "所敗固陵"),
]


def emend_090(text: str) -> str:
    for old, new in FIX_090:
        text = text.replace(old, new)
    return text


FIX_093 = [
    # 形近誤，文庫本作使
    ("匈奴仗左右", "匈奴使左右"),
    # 文庫本作厄，並補句號
    ("兩主不相緱」居七日", "兩主不相厄。」居七日"),
    # 文庫本作迺（即乃）
    ("豨私令匈奴", "乃私令匈奴"),
    # 繁簡轉換誤，文庫本作僕
    ("仆", "僕"),
    # 文庫本作高后，與上文會高后病合
    ("高祖竟崩，不得見", "高后竟崩，不得見"),
    # 形近誤，篇中皆作盧綰
    ("立虜綰為燕王", "立盧綰為燕王"),
    # 形近誤，篇中皆作臧荼
    ("臧茶子", "臧荼子"),
]


def emend_093(text: str) -> str:
    for old, new in FIX_093:
        text = text.replace(old, new)
    return text


FIX_094 = [
    # 文庫本作迺
    ("閒肯出兵", "乃肯出兵"),
    # 簡體混入，文庫本作齕
    ("齮龁", "齮齕"),
]


def emend_094(text: str) -> str:
    for old, new in FIX_094:
        text = text.replace(old, new)
    return text


FIX_095 = [
    # 形近誤，文庫本作噲
    ("樊噌", "樊噲"),
    # 地名用里，文庫本同
    ("槐裏", "槐里"),
    # 簡體混入
    ("太仆解福", "太僕解福"),
    # 簡體混入，文庫本作繫
    ("坐高祖系", "坐高祖繫"),
    # 地名用里，文庫本作扛里
    ("扛裏", "扛里"),
    # 形近誤，文庫本作潁
    ("穎陰", "潁陰"),
    # 文庫本作卬
    ("綦毋卹", "綦毋卬"),
]


def emend_095(text: str) -> str:
    for old, new in FIX_095:
        text = text.replace(old, new)
    return text


FIX_098 = [
    # 簡體混入
    ("横陽", "橫陽"),
    # 簡體混入
    ("户", "戶"),
    # 簡體混入
    ("哙", "噲"),
    # 簡體混入
    ("荥", "滎"),
    # 簡體混入
    ("鲁下", "魯下"),
    # 簡體混入
    ("缯", "繒"),
    # 簡體混入
    ("蕲", "蘄"),
    # 簡體混入
    ("敖仓", "敖倉"),
    # 簡體混入
    ("邯郸", "邯鄲"),
    # 簡體混入
    ("韩信", "韓信"),
    # 簡體混入
    ("夺侯", "奪侯"),
    # 簡體混入
    ("肃侯", "肅侯"),
    # 簡體混入
    ("贞侯", "貞侯"),
    # 簡體混入
    ("伤心", "傷心"),
    # 簡體混入
    ("可谓笃厚", "可謂篤厚"),
    # 簡體混入
    ("别", "別"),
    # 正字
    ("河内", "河內"),
    # 引號統一
    ("“", "「"),
    # 引號統一
    ("”", "」"),
]


def emend_098(text: str) -> str:
    for old, new in FIX_098:
        text = text.replace(old, new)
    return text


FIX_103 = [
    # 斷句誤，文庫本作凡六劔，不敢奉詔
    ("凡六，劍不敢奉詔", "凡六劍，不敢奉詔"),
    # 文庫本作篤
    ("老病甐", "老病篤"),
    # 斷句，文庫本同
    ("周文處讇君子譏之", "周文處讇，君子譏之"),
    # 正字
    ("陵裏", "陵里"),
    # 異體
    ("髙", "高"),
    # 異體
    ("撃", "擊"),
    # 異體
    ("歳", "歲"),
    # 異體
    ("呉", "吳"),
    # 異體
    ("毎", "每"),
    # 異體
    ("屛", "屏"),
    # 異體
    ("愼", "慎"),
    # 異體
    ("淸", "清"),
    # 異體
    ("説", "說"),
    # 異體
    ("倶", "俱"),
    # 簡體混入
    ("太仆", "太僕"),
    # 簡體混入
    ("僮仆", "僮僕"),
]


def emend_103(text: str) -> str:
    for old, new in FIX_103:
        text = text.replace(old, new)
    return text


FIX_104 = [
    # 全书核查第二轮：古诗文网本（据点校本）无「家於武功」，撤回 #184 的补字；「蜀剗道」据古诗文网本、文库本补「剗」
    ("蜀道近山", "蜀剗道近山"),
    # 文庫本作入，上文言虜大入塞
    ("虜曾一人", "虜曾一入"),
    # 文庫本作富，上文言取舍人中富給者
    ("盎人子", "富人子"),
    # 文庫本作鞍馬新，上文言具鞌馬絳衣
    ("具樾象絳衣", "具鞍馬新絳衣"),
    # 標點
    ("對曰；", "對曰："),
    # 簡體混入
    ("就系", "就繫"),
    # 簡體混入
    ("捕系", "捕繫"),
]


def emend_104(text: str) -> str:
    for old, new in FIX_104:
        text = text.replace(old, new)
    return text


FIX_113 = [
    # 簡體混入，文庫本作后
    ("高後", "高后"),
    # 簡體混入，文庫本作后
    ("太後", "太后"),
    # 簡體混入
    ("楊仆", "楊僕"),
    # 簡體混入
    ("僮仆", "僮僕"),
]


def emend_113(text: str) -> str:
    for old, new in FIX_113:
        text = text.replace(old, new)
    return text


FIX_114 = [
    # 文庫本作後
    ("后來益多", "後來益多"),
    # 簡體混入
    ("楊仆", "楊僕"),
]


def emend_114(text: str) -> str:
    for old, new in FIX_114:
        text = text.replace(old, new)
    return text


FIX_115 = [
    # 簡體混入
    ("楊仆", "楊僕"),
    # 簡體混入
    ("筑鄣塞", "築鄣塞"),
]


def emend_115(text: str) -> str:
    for old, new in FIX_115:
        text = text.replace(old, new)
    return text


FIX_116 = [
    # 簡體混入，文庫本作髮
    ("編發", "編髮"),
    # 簡體混入，文庫本作饟
    ("戍轉相馕", "戍轉相饟"),
    # 簡體混入
    ("方筑朔方", "方築朔方"),
    # 文庫本作後
    ("西夷后揃", "西夷後揃"),
]


def emend_116(text: str) -> str:
    for old, new in FIX_116:
        text = text.replace(old, new)
    return text


FIX_121 = [
    # 形近誤
    ("茍有用我", "苟有用我"),
    # 文庫本作後
    ("后陵遲", "後陵遲"),
    # 文庫本作鬱
    ("郁滯", "鬱滯"),
    # 文庫本作後
    ("自是之后", "自是之後"),
    # 文庫本作後
    ("張湯死后", "張湯死後"),
    # 文庫本作第
    ("其高弟", "其高第"),
    # 下文「膠西王素聞董仲舒有行」
    ("相繆西王", "相膠西王"),
]


def emend_121(text: str) -> str:
    for old, new in FIX_121:
        text = text.replace(old, new)
    return text


FIX_127 = [
    # 文庫本作後
    ("乃后入家", "乃後入家"),
    # 文庫本作後
    ("凶，后乃有之", "凶，後乃有之"),
    # 異體
    ("而讬官位", "而託官位"),
    # 異體
    ("歳穀", "歲穀"),
    # 異體
    ("以説人志", "以說人志"),
    # 異體
    ("一言説人", "一言說人"),
    # 異體
    ("行歩", "行步"),
    # 異體
    ("當鄕人", "當鄉人"),
    # 異體
    ("務華絶根", "務華絕根"),
    # 異體
    ("高世絶人", "高世絕人"),
    # 文庫本作苟
    ("好含茍生", "好含苟生"),
]


def emend_127(text: str) -> str:
    for old, new in FIX_127:
        text = text.replace(old, new)
    return text


FIX_128 = [
    # 簡體混入，文庫本作故
    ("笔玉處於山", "故玉處於山"),
    ("笔龜可不敬與", "故龜可不敬與"),
    # 繁簡轉換誤，文庫本作後
    ("后事覺姦窮", "後事覺姦窮"),
    ("殺之后，", "殺之後，"),
    ("必后無功", "必後無功"),
    ("以徵后龜", "以徵後龜"),
    # 繁簡轉換誤，文庫本作鑽
    ("鉆", "鑽"),
    # 文庫本作甚
    ("病甐死", "病甚死"),
]


def emend_128(text: str) -> str:
    for old, new in FIX_128:
        text = text.replace(old, new)
    return text


FIX_023 = [
    # 繁簡轉換誤，文庫本作禘
    ("褅自既灌", "禘自既灌"),
    # 繁簡轉換誤，文庫本作苟
    ("茍", "苟"),
    # 繁簡轉換誤，文庫本作鑽
    ("鉆如蜂蠆", "鑽如蜂蠆"),
]


def emend_023(text: str) -> str:
    for old, new in FIX_023:
        text = text.replace(old, new)
    return text


FIX_029 = [
    # 文庫本作「乃厮二渠」，维基文库漏厮
    ("乃二渠以引其河", "乃厮二渠以引其河"),
    # 標點，「入于勃海」句終，文庫本同
    ("入于勃海九川既疏", "入于勃海。九川既疏"),
    # 繁簡轉換誤，文庫本作築
    ("筑宮其上", "築宮其上"),
]


def emend_029(text: str) -> str:
    for old, new in FIX_029:
        text = text.replace(old, new)
    return text


FIX_024 = [
    # 文庫本作政，與下文「審樂以知政」合
    ("其正和", "其政和"),
    # 文庫本作政
    ("其正乖", "其政乖"),
    # 文庫本作政
    ("與正通矣", "與政通矣"),
    # 文庫本作述，與「作」相對
    ("能術。", "能述。"),
    # 文庫本作述
    ("術者之謂明", "述者之謂明"),
    # 文庫本作述
    ("術作之謂也", "述作之謂也"),
]


def emend_024(text: str) -> str:
    for old, new in FIX_024:
        text = text.replace(old, new)
    return text


FIX_025 = [
    # 簡體混入，文庫本作故
    ("笔教笞", "故教笞"),
    # 文庫本作丑，并有「丑者，紐也」二句，维基文库作醜且漏
    ("其於十二子為醜。", "其於十二子為丑。丑者，紐也。言陽氣在上，未條萬物，厄紐未敢出。"),
    # 文庫本作七分八
    ("南呂長四寸七十分八", "南呂長四寸七分八"),
]


def emend_025(text: str) -> str:
    for old, new in FIX_025:
        text = text.replace(old, new)
    return text


FIX_030 = [
    # 繁簡轉換誤，文庫本作饟
    ("糧饢", "糧饟"),
    # 繁簡轉換誤，文庫本作築
    ("筑朔方", "築朔方"),
    # 繁簡轉換誤，文庫本作築
    ("筑衛朔方", "築衛朔方"),
    # 繁簡轉換誤，文庫本作築
    ("筑令居", "築令居"),
    # 繁簡轉換誤，文庫本作苟
    ("茍如此", "苟如此"),
    # 繁簡轉換誤，文庫本作僕
    ("太仆", "太僕"),
]


def emend_030(text: str) -> str:
    for old, new in FIX_030:
        text = text.replace(old, new)
    return text


FIX_026 = [
    # 標點，「元平元年」句終缺句號，按例補
    ("焉逢涒灘元平元年", "焉逢涒灘元平元年。"),
]


def emend_026(text: str) -> str:
    for old, new in FIX_026:
        text = text.replace(old, new)
    return text


FIX_028 = [
    # 文庫本作「其傳在勃海中」，形近誤
    ("其傅在勃海中", "其傳在勃海中"),
    # 文庫本作「公玉帶」
    ("公玊帶", "公玉帶"),
    # 繁簡轉換誤，文庫本作苟
    ("茍合", "苟合"),
]


def emend_028(text: str) -> str:
    for old, new in FIX_028:
        text = text.replace(old, new)
    return text


FIX_027 = [
    # 文庫本作「旗中四星曰天市」，底本脫「曰」
    ("旗中四星天市", "旗中四星曰天市"),
    # 文庫本作「所墮及炎火」，底本脫「炎火」
    ("所墮及，望之", "所墮及炎火，望之"),
    # 底本補「［枯槁］」而未圈刪原「槁枯」，致重出；文庫本作「枯稾」
    ("閨臬［枯槁］槁枯", "閨臬［枯槁］"),
    # 文庫本作「下黑上青」，底本「下青」誤
    ("氣下黑下青", "氣下黑上青"),
]


def emend_027(text: str) -> str:
    for old, new in FIX_027:
        text = text.replace(old, new)
    return text


FIX_016 = [
    # 文庫本作「其後乃放弒」
    ("其后乃放弒", "其後乃放弒"),
]


def emend_016(text: str) -> str:
    for old, new in FIX_016:
        text = text.replace(old, new)
    return text


FIX_013 = [
    # 文庫本作「分為魏國」
    ("分爲衞國", "分爲魏國"),
]


def emend_013(text: str) -> str:
    for old, new in FIX_013:
        text = text.replace(old, new)
    return text


FIX_014 = [
    # 鳴呼→嗚呼
    ("鳴呼", "嗚呼"),
]


def emend_014(text: str) -> str:
    for old, new in FIX_014:
        text = text.replace(old, new)
    return text


FIX_017 = [
    # 前后→前後（简繁误）
    ("前后諸侯", "前後諸侯"),
    # 补「吳」（文库本）
    ("為梁、楚、淮南、長沙國", "為梁、楚、吳、淮南、長沙國"),
]


def emend_017(text: str) -> str:
    for old, new in FIX_017:
        text = text.replace(old, new)
    return text


FIX_019 = [
    # 长江→长沙、删重复「禪五世」、意→竟（文库本）
    ("唯獨長江全，禪五世，禪五世，以無嗣絕，意無過", "唯獨長沙全，禪五世，以無嗣絕，竟無過"),
]


def emend_019(text: str) -> str:
    for old, new in FIX_019:
        text = text.replace(old, new)
    return text


FIX_020 = [
    # 删句中衍「太史公曰：」（文库本无）
    ("是徵」，太史公曰：齊桓", "是徵」，齊桓"),
]


def emend_020(text: str) -> str:
    for old, new in FIX_020:
        text = text.replace(old, new)
    return text


FIX_031 = [
    # 文庫本作「遷而不淫」
    ("遠而不攜，而遷不淫", "遠而不攜，遷而不淫"),
    # 文庫本作「六月戊子」，底本脫「戊」
    ("六月子，越王", "六月戊子，越王"),
    # 日本字形
    ("暦", "歷"),
    # 日本字形
    ("巣", "巢"),
]


def emend_031(text: str) -> str:
    for old, new in FIX_031:
        text = text.replace(old, new)
    return text


FIX_032 = [
    # 文庫本作「薄姑」，底本誤作「泵」
    ("薄泵", "薄姑"),
]


def emend_032(text: str) -> str:
    for old, new in FIX_032:
        text = text.replace(old, new)
    return text


FIX_033 = [
    # 文庫本作「不侮鰥寡」，底本脫「鰥」
    ("不侮寡，故祖甲", "不侮鰥寡，故祖甲"),
    # 文庫本有「三十年，真公卒，弟敖立，是爲武公」，底本脫
    ("二十九年，周宣王即位。", "二十九年，周宣王即位。三十年，真公卒，弟敖立，是爲武公。"),
    # 文庫本有「八年」
    ("吳爲鄒伐魯，至城下", "八年，吳爲鄒伐魯，至城下"),
    # 文庫本有「十一年」
    ("齊伐魯。季氏用冉有", "十一年，齊伐魯。季氏用冉有"),
    # 文庫本有「十四年」
    ("孔子自衛歸魯。齊田常", "孔子自衛歸魯。十四年，齊田常"),
    # 文庫本作「故昔」，底本誤作「笔」
    ("笔昔在殷王", "故昔在殷王"),
    # 文庫本作「於鞌，齊復歸」，底本誤
    ("於砹齊復歸", "於鞌，齊復歸"),
]


def emend_033(text: str) -> str:
    for old, new in FIX_033:
        text = text.replace(old, new)
    return text


FIX_034 = [
    # 底本此段混入简体字，改回繁体（文库本同）
    ("惠王为太子时，与乐毅有隙；及即位，疑毅，使骑劫代将。乐毅亡走赵。齐田单以即墨击败燕军，骑劫死，燕兵引归，齐悉复得其故城。闵王死于莒，乃立其子为襄王。", "惠王爲太子時，與樂毅有隙；及即位，疑毅，使騎劫代將。樂毅亡走趙。齊田單以即墨擊敗燕軍，騎劫死，燕兵引歸，齊悉復得其故城。閔王死于莒，乃立其子爲襄王。"),
    # 文庫本作「甘棠」，底本誤
    ("笆棠", "甘棠"),
    # 文庫本作「弔死問孤」，底本誤作「噲」
    ("燕王噲死問孤", "燕王弔死問孤"),
]


def emend_034(text: str) -> str:
    for old, new in FIX_034:
        text = text.replace(old, new)
    return text


FIX_037 = [
    # 文庫本有靈公五年至三十九年一段，底本脫
    ("四十二年春，靈公游", "靈公五年，朝晉昭公。六年，楚公子棄疾弒靈王自立，爲平王。十一年，火。三十八年，孔子來，祿之如魯。後有隙，孔子去。後復來。三十九年，太子蒯聵與靈公夫人南子有惡，欲殺南子。蒯聵與其徒戲陽遬謀，朝，使殺夫人。戲陽後悔，不果。蒯聵數目之，夫人覺之，懼，呼曰：「太子欲殺我！」靈公怒，太子蒯聵犇宋，已而之晉趙氏。四十二年春，靈公游"),
    # 形近误字
    ("茍", "苟"),
]


def emend_037(text: str) -> str:
    for old, new in FIX_037:
        text = text.replace(old, new)
    return text


FIX_038 = [
    # 文庫本作「毋侮鰥寡」，底本脫「鰥」
    ("毋侮寡而畏", "毋侮鰥寡而畏"),
]


def emend_038(text: str) -> str:
    for old, new in FIX_038:
        text = text.replace(old, new)
    return text


FIX_039 = [
    # 文庫本作「子鱓代桓叔」，底本誤
    ("子胛桓叔，是爲", "子鱓代桓叔，是爲"),
    # 文庫本作「里克」，底本繁简误转
    ("裏克", "里克"),
    # 文庫本作「鞌」，底本 OCR 误
    ("戰於砹傷困", "戰於鞌，傷困"),
]


def emend_039(text: str) -> str:
    for old, new in FIX_039:
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


# 十表（卷十三至卷二十二）：维基文库把表格写成 {| … |}。表格单独解析成行列，
# 正文里只留一个占位，记下表格排在第几段之前；序、表间的说明文字照常分句。
BIAO = range(13, 23)
BIAO_TABLES: dict[int, list[dict]] = {}


def _biao_cell(raw: str, head: bool) -> dict:
    attrs = {}
    text = raw
    m = re.match(r'^\s*((?:(?:colspan|rowspan|style|align|class)\s*=\s*"?[^"|]*"?\s*)+)\|(?!\|)(.*)$', raw)
    if m:
        for k, v in re.findall(r'(colspan|rowspan)\s*=\s*"?(\d+)"?', m.group(1)):
            attrs["c" if k == "colspan" else "r"] = int(v)
        text = m.group(2)
    text = re.sub(r"\{\{!\|([^|}]+)\|[^}]*\}\}", r"\1", text)
    text = re.sub(r"<br\s*/?>", " ", text)
    text = re.sub(r"。{2,}", "。", clean_inline(text).strip())  # 底本表格重复句号
    cell = {"x": text}
    if head:
        cell["h"] = 1
    cell.update(attrs)
    return cell


def parse_biao_table(block: str) -> list[list[dict]]:
    rows: list[list[dict]] = []
    cur: list[dict] | None = None
    for line in block.splitlines()[1:]:
        line = line.strip()
        if not line or line.startswith("|}") or line.startswith("|+"):
            continue
        if line.startswith("|-"):
            cur = []
            rows.append(cur)
            continue
        if cur is None:
            cur = []
            rows.append(cur)
        if line.startswith("!"):
            for part in line[1:].split("!!"):
                cur.append(_biao_cell(part, True))
        elif line.startswith("|"):
            for part in line[1:].split("||"):
                cur.append(_biao_cell(part, False))
        elif cur:
            # 单元格跨行续写
            cur[-1]["x"] += clean_inline(line)
    return [r for r in rows if r]


def extract_biao(juan: int, raw: str) -> str:
    tables: list[dict] = []

    def repl(m):
        tables.append({"rows": parse_biao_table(m.group(0))})
        return f"\n@@BIAO{len(tables) - 1}@@\n"

    raw = re.sub(r"^\{\|.*?^\|\}", repl, raw, flags=re.S | re.M)
    BIAO_TABLES[juan] = tables
    return raw


def parse_juan(juan: int) -> list[list[str]]:
    raw = (SRC / f"juan{juan:03d}.wikitext").read_text(encoding="utf-8")
    if juan in BIAO:
        raw = extract_biao(juan, raw)
    body = raw.split("}}", 1)[1]
    section = ""
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
        # 十表：表格占位，记下排在第几段之前、所属小节和是否褚少孙补。
        mb = re.fullmatch(r"@@BIAO(\d+)@@", line)
        if mb:
            tb = BIAO_TABLES[juan][int(mb.group(1))]
            tb["at"] = len(paragraphs)
            tb["name"] = section
            tb["addendum"] = addendum
            continue
        if juan in BIAO and line.startswith("=="):
            section = line.strip("= ")
        if juan in BIAO and line.startswith("</onlyinclude>"):
            break
        # 卷三十三、三十八的 <onlyinclude> 标记不是正文。
        if line.startswith("<onlyinclude>") or line.startswith("</onlyinclude>"):
            continue
        if juan in BIAO and (line.startswith("張夫子問褚先生") or line.startswith("後進好事儒者褚先生")):
            addendum = "chu"
        # 维基文库的空行写成 <br /><br />，不是正文。
        if re.fullmatch(r"(?:<br\s*/?>)+", line):
            continue
        # 卷四十四信陵君谏魏王一段用 <blockquote> 包起来，标签单独成行，不是正文。
        if re.fullmatch(r"</?blockquote>", line) or line.startswith(("<div", "<references")):
            continue
        # 卷八十一的【索隱述贊】写成小节标题，下面一段也是司马贞的，不收。
        # 卷一篇末的「==校勘記==」是后人的校记，不是原文。
        # 卷一百二十七写成「== 索隱述贊 ==」，标题两边有空格。
        if line.replace(" ", "").startswith(("==索隱述贊", "==校勘記", "==索隐述赞", "==斠勘")):
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
        # 卷二十七的维基文库本夹有三家注（{{*|【索隱】…}}，内含嵌套模板），整段按括号配对剥掉。
        if juan == 27:
            line = strip_star_notes(line)
        text = audit_fix(juan, clean_inline(line).translate(SHINJITAI_ALL))
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
        if juan == 118:
            text = emend_118(text)
        if juan == 11:
            text = emend_011(text)
        if juan == 42:
            text = emend_042(text)
        if juan == 45:
            text = emend_045(text)
        if juan == 51:
            text = emend_051(text)
        if juan == 46:
            text = emend_046(text)
        if juan == 52:
            text = emend_052(text)
        if juan == 58:
            text = emend_058(text)
        if juan == 59:
            text = emend_059(text)
        if juan == 60:
            text = emend_060(text)
        if juan == 71:
            text = emend_071(text)
        if juan == 72:
            text = emend_072(text)
        if juan == 90:
            text = emend_090(text)
        if juan == 93:
            text = emend_093(text)
        if juan == 94:
            text = emend_094(text)
        if juan == 95:
            text = emend_095(text)
        if juan == 98:
            text = emend_098(text)
        if juan == 103:
            text = emend_103(text)
        if juan == 104:
            text = emend_104(text)
        if juan == 113:
            text = emend_113(text)
        if juan == 114:
            text = emend_114(text)
        if juan == 115:
            text = emend_115(text)
        if juan == 116:
            text = emend_116(text)
        if juan == 121:
            text = emend_121(text)
        if juan == 127:
            text = emend_127(text)
        if juan == 128:
            text = emend_128(text)
        if juan == 23:
            text = emend_023(text)
        if juan == 29:
            text = emend_029(text)
        if juan == 24:
            text = emend_024(text)
        if juan == 25:
            text = emend_025(text)
        if juan == 30:
            text = emend_030(text)
        if juan == 26:
            text = emend_026(text)
        if juan == 28:
            text = emend_028(text)
        if juan == 27:
            text = emend_027(text)
        if juan == 16:
            text = emend_016(text)
        if juan == 13:
            text = emend_013(text)
        if juan == 14:
            text = emend_014(text)
        if juan == 17:
            text = emend_017(text)
        if juan == 19:
            text = emend_019(text)
        if juan == 20:
            text = emend_020(text)
        if juan == 31:
            text = emend_031(text)
        if juan == 32:
            text = emend_032(text)
        if juan == 33:
            text = emend_033(text)
        if juan == 34:
            text = emend_034(text)
        if juan == 37:
            text = emend_037(text)
        if juan == 38:
            text = emend_038(text)
        if juan == 39:
            text = emend_039(text)
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
        **biao_for(entry["juan"]),
    }


def biao_for(juan: int) -> dict:
    tables = BIAO_TABLES.get(juan)
    if not tables:
        return {}
    out = []
    for tb in tables:
        rows_t = [[dict(c, x=emend(c["x"])) for c in row] for row in tb["rows"]]
        if juan in BIAO_FIX:
            rows_t = BIAO_FIX[juan](rows_t)
        rows_s = [[dict(c, x=to_simplified(c["x"])) for c in row] for row in rows_t]
        item = {"at": tb.get("at", 0), "name": {"t": tb.get("name", ""), "s": to_simplified(tb.get("name", ""))},
                "rows": {"t": rows_t, "s": rows_s}}
        if tb.get("addendum"):
            item["addendum"] = ADDENDA[tb["addendum"]]
        out.append(item)
    return {"biao": out}


def _biao016(rows: list[list[dict]]) -> list[list[dict]]:
    """卷十六：月份写在秦（前一表）或汉（后一表）那一栏的开头，挪到首栏，和年份一起固定在左边。"""
    if not rows or not rows[0] or rows[0][0]["x"] != "公元前":
        return rows
    head = rows[0]
    names = [c["x"] for c in head]
    col = 1 if names[1] == "秦" else sum(c.get("c", 1) for c in head[: names.index("漢")])
    out = [[dict(head[0], x="年月")] + head[1:]]
    era = ""
    for row in rows[1:]:
        cells = [dict(c) for c in row]
        year = cells[0]["x"]
        m = re.match(r"^(.*?)((?:後|閏|端)?[正一二三四五六七八九十]*月)[。\s]*(.*)$", cells[col]["x"]) if col < len(cells) else None
        label = f"前{year}" if year else ""
        if m:
            if m.group(1).strip():
                era = m.group(1).strip()
            label = "\n".join(x for x in (label, era if year else "", m.group(2)) if x)
            cells[col]["x"] = m.group(3)
        cells[0] = dict(cells[0], x=label, h=1)
        out.append(cells)
    return out


BIAO_FIX = {16: _biao016}


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
