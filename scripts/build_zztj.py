# -*- coding: utf-8 -*-
"""从维基文库《资治通鉴》生成周纪、秦纪、汉纪篇目（卷一至 LAST_JUAN）。

正文是司马光的纪事。标明「增补」或「据近人考证移入」的段落不收。
课注在 sources/zztj/lessons/。底本说明见 sources/zztj/EDITION.md。
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

from opencc import OpenCC

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "sources" / "zztj"
LESSONS = SRC / "lessons"
ARTICLES = ROOT / "data" / "articles"
CATALOG = ROOT / "data" / "zztj.json"
DUMP = SRC / "years.json"

from prose_readings import fix_tokens as fix_readings  # noqa: E402

CC = OpenCC("t2s")
# 维基文库底本混入的日文新字体，一并回正。
VARIANTS = str.maketrans({"髙": "高", "籐": "藤", "鄕": "乡", **dict(zip("毎歳説撃呉倶絶戸徴呑楡歴髪虚歩", "每歲說擊吳俱絕戶徵吞榆歷髮虛步"))})
PUNCT = set("，。！？；、：·．…—～「」『』（）【】《》〈〉〔〕〖〗､“”‘’")
CN_DIGIT = "〇一二三四五六七八九零○"
YEAR_RE = re.compile(r"^(.+?)([元一二三四五六七八九十百]+)年(.*)$")
RESTORE_MARK = ("章校", "十二行本")
SUPPLEMENT_MARK = ("增补", "增補", "移入", "移往", "近人")
HEADING_RE = re.compile(r"^(=+)\s*(.+?)\s*\1\s*$")
STOP_RE = re.compile(r"校刊|校記|校记|校改")

JUAN_ERA = {
    1: "zhou",
    2: "zhou",
    3: "zhou",
    4: "zhou",
    5: "zhou",
    6: "qin",
    7: "qin",
    8: "qin",
    9: "han",
    10: "han",
    11: "han",
    12: "han",
    13: "han",
    14: "han",
    15: "han",
    16: "han",
    17: "han",
    18: "han",
    19: "han",
    20: "han",
    21: "han",
    22: "han",
    23: "han",
    24: "han",
    25: "han",
    26: "han",
    27: "han",
    28: "han",
    29: "han",
    30: "han",
    31: "han",
    32: "han",
    33: "han",
    34: "han",
    35: "han",
    36: "han",
    37: "han",
    38: "han",
    39: "han",
    40: "han",
}
LAST_JUAN = max(JUAN_ERA)

LATER_ERAS = [
    {"id": "han", "title": "汉纪", "juan": "卷四十一起", "note": "陆续添加"},
    {"id": "wei", "title": "魏纪", "juan": "卷六十九起", "note": "待添加"},
    {"id": "jin", "title": "晋纪", "juan": "卷七十九起", "note": "待添加"},
    {"id": "song", "title": "宋纪", "juan": "卷一百一十九起", "note": "待添加"},
    {"id": "qi", "title": "齐纪", "juan": "卷一百三十五起", "note": "待添加"},
    {"id": "liang", "title": "梁纪", "juan": "卷一百四十五起", "note": "待添加"},
    {"id": "chen", "title": "陈纪", "juan": "卷一百六十七起", "note": "待添加"},
    {"id": "sui", "title": "隋纪", "juan": "卷一百七十七起", "note": "待添加"},
    {"id": "tang", "title": "唐纪", "juan": "卷一百八十五起", "note": "待添加"},
    {"id": "houliang", "title": "后梁纪", "juan": "卷二百六十六起", "note": "待添加"},
    {"id": "houtang", "title": "后唐纪", "juan": "卷二百七十二起", "note": "待添加"},
    {"id": "houjin", "title": "后晋纪", "juan": "卷二百八十起", "note": "待添加"},
    {"id": "houhan", "title": "后汉纪", "juan": "卷二百八十六起", "note": "待添加"},
    {"id": "houzhou", "title": "后周纪", "juan": "卷二百九十起", "note": "待添加"},
]


def dump_json(path: Path, data, pretty: bool = False) -> None:
    if pretty:
        text = json.dumps(data, ensure_ascii=False, indent=2) + "\n"
    else:
        text = json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n"
    path.write_text(text, encoding="utf-8")


def to_simplified(text: str) -> str:
    out = []
    for ch in text:
        simp = CC.convert(ch)
        if len(simp) != 1:
            raise SystemExit(f"简繁不对齐：{ch} -> {simp}")
        out.append(simp)
    text = "".join(out)
    # OpenCC 把卦名「乾」收成「干」。乾坤不是干湿的干。
    text = text.replace("干坤", "乾坤")
    # 人名樊於期的於不是介词于。单独称「於期」也要留下。
    text = text.replace("樊于期", "樊於期").replace("于期太息", "於期太息")
    # 维基文库这一句没有顿号。代与光狼城是两处，取字管两者。
    return text.replace("取代光狼城", "取代、光狼城")


def clean_inline(text: str) -> str:
    text = text.replace("'''", "")
    text = re.sub(r"<!--.*?-->", "", text, flags=re.S)
    text = re.sub(r"-\{([^}]+)\}-", r"\1", text)
    text = re.sub(r"\[\[(?:[^|\]]+\|)?([^\]]+)\]\]", r"\1", text)
    text = re.sub(r"\{\{\*\|(.*?)\}\}", r"（\1）", text)
    text = re.sub(r"\{\{[^}]+\}\}", "", text)
    text = text.translate(VARIANTS)
    return text


def classify_ref(ref: str) -> str:
    if any(mark in ref for mark in RESTORE_MARK):
        return "restore"
    if any(mark in ref for mark in SUPPLEMENT_MARK):
        return "supplement"
    if re.search(r"增[。．]?$", ref.strip()):
        return "supplement"
    if "补" in ref or "補" in ref:
        return "supplement"
    return "emend"


def transform_segment(segment: str, kind: str) -> str:
    if kind == "supplement":
        # 增补、移入的〔〕不是司马光原文；括号里留着的才是要删改前的字。
        segment = re.sub(r"〔[^〕]*〕", "", segment)
        segment = re.sub(r"\(([^)]*)\)", r"\1", segment)
        return segment
    segment = re.sub(r"〔([^〕]*)〕\(([^)]*)\)", r"\1", segment)
    segment = re.sub(r"\([^)]{1,16}\)", "", segment)
    segment = re.sub(r"〔([^〕]*)〕", r"\1", segment)
    return segment


def tidy_text(text: str) -> str:
    text = re.sub(r"[ \t\u3000]+", "", text)
    text = text.replace("。」。", "。」")
    text = text.replace("！」！", "！」")
    text = text.replace("？」？", "？」")
    text = re.sub(r"，{2,}", "，", text)
    text = re.sub(r"。{2,}", "。", text)
    # 删掉增补的名单之后，顿号会贴在逗号或句号前面。
    text = text.replace("、，", "，").replace("、。", "。")
    # 代与光狼城是两处。维基文库这一句没有顿号，繁简都补上，避免对不齐。
    text = text.replace("取代光狼城", "取代、光狼城")
    # 维基文库用「□+部件」拼不出的字。按《史记》同段文字补成单字。
    # 卷九韩信对策：维基文库误点作「何所不誅以？天下城邑」，「以」属下句。
    text = text.replace("何所不誅以？天下城邑", "何所不誅！以天下城邑")
    # 卷十一：维基文库误字、误标点。臧荼、滕公、「予之亦可」依《史记》，「糠秕」依《法言》。
    for wrong, right in (("虜藏荼", "虜臧荼"), ("陳平、降侯曰", "陳平、絳侯曰"), ("穎陰侯", "潁陰侯"), ("穎陰懿侯", "潁陰懿侯"), ("紵絮昔斮", "紵絮斮"), ("先諭都", "先諭教"), ("離南□", "離南畝"), ("百□", "百畝"), ("魏□", "魏遬"), ("詔日；「朕", "詔曰：「朕"), ("不記逃", "不亡逃"), ("阜陵安為", "阜陵侯安為"), ("臣侯日", "臣候日"), ("都尉曰；「", "都尉曰：「"), ("已亥，帝", "己亥，帝"), ("歸夫以下", "歸夫人以下"), ("誘天豪傑；白頭舉事、此", "誘天下豪傑；白頭舉事，此"), ("故相誘以亂」錯曰", "故相誘以亂。」錯曰"), ("從穎川來", "從潁川來"), ("；南王非為江都", "；汝南王非為江都"), ("上書；「願", "上書：「願"), ("王鱣長太子", "王適長太子"), ("丞相議之。上", "丞相議之。」上"), ("加這以", "加之以"), ("呂委主", "呂季主"), ("趙涉庶說", "趙涉遮說"), ("宜夫清道", "且夫清道"), ("開東閤", "開東閣"), ("對。對奇焉", "對。上奇焉"), ("倉癐", "倉廥"), ("曹瓤", "曹襄"), ("佈告下天", "佈告天下"), ("去事,驃騎", "去事驃騎"), ("私人視亦", "私入視亦"), ("相穎陰灌夫", "相潁陰灌夫"), ("橫穎川", "橫潁川"), ("魏人信陵", "魏有信陵"), ("綱紀馳廢", "綱紀弛廢"), ("繼金幣帛", "齎金幣帛"), ("圍抱罕", "圍枹罕"), ("恐，清臣置吏", "恐，請臣置吏"), ("地神衹", "地神祇"), ("不也言擅賦", "不敢言擅賦"), ("萬數，繼糧", "萬數，齎糧"), ("癸己，禪", "癸巳，禪"), ("不足憂也」上嘗", "不足憂也。」上嘗"), ("狐鹿孤單于", "狐鹿姑單于"), ("賜量謚", "賜旦謚"), ("宜春敬侯王訴", "宜春敬侯王訢"), ("朗有上書言", "郎有上書言"), ("，徒右將軍安世", "，徙右將軍安世"), ("勝為示夭言", "勝為妖言"), ("謂城胡組", "渭城胡組"), ("聯甚悼", "朕甚悼"), ("以為主可", "以為不可"), ("穎川太守趙廣漢", "潁川太守趙廣漢"), ("穎川俗", "潁川俗"), ("附肋之，為其後", "附助之，為其後"), ("李竟民善", "李竟所善"), ("持鍺、鉤", "持鉏、鉤"), ("送大苑諸國", "送大宛諸國"), ("使護善阜善以西", "使護鄯善以西"), ("穎川太守黃霸使", "潁川太守黃霸使"), ("復歸穎川", "復歸潁川"), ("其辭日", "其辭曰："), ("蜉蝤出以陰", "蜉蝣出以陰"), ("尚方待詔，初，", "尚方待詔。初，"), ("懈馳，望見", "懈弛，望見"), ("充國漢曰", "充國歎曰"), ("治隍陿中", "治湟陿中"), ("延壽為穎川太守，穎川承", "延壽為潁川太守，潁川承"), ("代延壽居穎川", "代延壽居潁川"), ("延行改更", "延壽改更"), ("穎川太守黃霸在郡", "潁川太守黃霸在郡"), ("郡國，穎川尤多", "郡國，潁川尤多"), ("「穎川太守霸", "「潁川太守霸"), ("而穎川孝、弟", "而潁川孝、弟"), ("此德之盛之", "此德之盛也"), ("以外屬民侍中", "以外屬舊恩侍中"), ("解馳，枹", "解弛，枹"), ("翼州部", "冀州部"), ("傷薄欲化", "傷化薄俗"), ("原奉國珍", "願奉國珍"), ("博陸候", "博陸侯"), ("己巳、建", "己巳，建"), ("上帝稱制臨決", "上親稱制臨決"), ("為世縕皇孫", "為世適皇孫"), ("陽平候", "陽平侯"), ("虛已問", "虛己問"), ("禹之智足不以知", "禹之智不足以知"), ("飲鳩", "飲鴆"), ("議是，」", "議是。」"), ("百宮各省", "百官各省"), ("鄉化末醇", "鄉化未醇"), ("丁末，貢禹", "丁未，貢禹"), ("丁已，長信", "丁巳，長信"), ("前江乃無", "前江乃始無"), ("周幽，厲", "周幽、厲"), ("侍中，衛尉", "侍中、衛尉"), ("不可轉也，言", "不可轉也。』言"), ("群小，』", "群小。』"), ("傳相汲引", "轉相汲引"), ("便是非炳然", "使是非炳然"), ("「興，捐之", "「興、捐之"), ("穎川水流", "潁川水流"), ("以田□分為比", "以田蚡為比"), ("至禹弟，辟", "至禹第，辟"), ("狡猾不閫", "狡猾不道"), ("囂其敬重", "囂甚敬重"), ("邯鄣將帥", "邯鄲將帥"), ("已阜人秦豐", "邔人秦豐"), ("攻得已阜、", "攻得邔、"), ("孫人及謀", "孫伋謀"), ("七月，人及以其謀", "七月，伋以其謀"), ("帶++足惲", "帶足惲"), ("逆戰於南□", "逆戰於南䜌"), ("使生繼以詣寵", "使生齎以詣寵"), ("宜秋，褲縯", "宜秋，縯"), ("持其印、□、節", "持其印、韍、節"), ("非讙、乾肉", "非糒、乾肉"), ("多繼珍寶", "多齎珍寶"), ("約繼輕糧", "約齎輕糧"), ("當自繼食", "當自齎食"), ("多繼釜鍑", "多齎釜鍑"), ("不繼斗糧", "不齎斗糧"), ("旬阜", "郇"), ("奉符命，繼印綬", "奉符命，齎印綬"), ("背負敝鳥鳥之毛", "背負鷩鳥之毛"), ("南出都隃", "南出者隃"), ("奉上璽□", "奉上璽韍"), ("用□十八斛", "用糒十八斛"), ("食□飲水", "食糒飲水"), ("太官繼□", "太官齎糒"), ("獻者封侯，』", "獻者封侯。』"), ("聖人之言，』臣", "聖人之言。』臣"), ("予甚示氐畏", "予甚祗畏"), ("太保、後備、承", "太保、後承、承"), ("天下耳」太后", "天下耳。」太后"), ("尚書令穎川", "尚書令潁川"), ("理。穎川太守陵", "理。潁川太守陵"), ("吾哀穎川", "吾哀潁川"), ("何並為穎川", "何並為潁川"), ("臨印□及", "臨印韍及"), ("天子□冕", "天子韍冕"), ("流漸積畏", "流漸積猥"), ("無病而死，』", "無病而死。』"), ("覆公餗，』", "覆公餗。』"), ("太后下詔；「", "太后下詔：「"), ("當日：「吾居", "當曰：「吾居"), ("遺使持節赦", "遣使持節赦"), ("誠翼有益", "誠冀有益"), ("既尊後。尤驕", "既尊後，尤驕"), ("譚穎川", "譚潁川"), ("宜不廷尉治", "宜下廷尉治"), ("客復特詔記", "客復持詔記"), ("念雖末有皇子", "念雖未有皇子"), ("至對及冠議", "至對衣冠議"), ("何不白也」？", "何不白也？」"), ("郭舜上言；「", "郭舜上言：「"), ("使其言是，一可誅", "使其言是，不可誅"), ("其言非，因當容之", "其言非，固當容之"), ("穎川鐵官", "潁川鐵官"), ("處之不漸恧", "處之不慚恧"), ("五百畝叟", "五百艘"), ("而近已出之女", "而近己出之女"), ("根C090地中", "根臿地中"), ("；剌史復", "；刺史復"), ("乃辛已", "乃辛巳"), ("車師戊已校尉", "車師戊己校尉"), ("讞後不為失", "讞者不為失"), ("曰簠簋", "曰『簠簋"), ("上曰；「朕既", "上曰：「朕既"), ("何得不厥", "何得不蹶"), ("易子上咬", "易子而咬"), ("緣南晦", "緣南畝"), ("隴晦", "隴畝"), ("糠枇", "糠秕"), ("左右諫曰；", "左右諫曰："), ("徒代王如意", "徙代王如意"), ("罷穎川郡", "罷潁川郡"), ("燕王藏荼", "燕王臧荼"), ("令上病，屬任", "今上病，屬任"), ("之數未可行也", "之數未可知也"), ("聞田死", "聞田橫死"), ("見籐公", "見滕公"), ("見藤公", "見滕公"), ("冒頓日；", "冒頓曰："),
                         ("予之亦乎，", "予之亦可，"), ("心乎?", "心乎？"), ("賢哉?", "賢哉？"), ("也非邪？」", "也非邪？』")):
        text = text.replace(wrong, right)
    # 卷十广武君对策：维基文库把「褕」拆写成「衣俞」，依《史记·淮阴侯列传》作「褕衣甘食」。
    text = text.replace("衣俞衣甘食", "褕衣甘食")
    # 卷十广武对峙：维基文库「乃為高祖」误，依《史记·项羽本纪》作「高俎」。
    text = text.replace("乃為高祖，置太公", "乃為高俎，置太公")
    # 卷十「笑謝曰；」冒号误作分号。
    text = text.replace("笑謝曰；", "笑謝曰：")
    text = text.replace("□厄", "阨").replace("□夬", "玦").replace("韓□", "韓玘")
    text = re.sub(r"^，+", "", text)
    text = re.sub(r"，。", "。", text)
    text = re.sub(r"。，", "。", text)
    return text


def apply_emendations(text: str) -> str:
    parts = re.split(r"<ref>(.*?)</ref>", text, flags=re.S)
    chunks = []
    for i, part in enumerate(parts):
        if i % 2 == 1:
            continue
        ref = parts[i + 1] if i + 1 < len(parts) else ""
        if ref:
            part = transform_segment(part, classify_ref(ref))
        chunks.append(part)
    text = "".join(chunks)
    text = transform_segment(text, "emend")
    return tidy_text(text)


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
    cleaned = []
    for item in sentences:
        item = item.strip("，、；：")
        if item.strip("，。！？；、：「」『』"):
            cleaned.append(item)
    return cleaned


def paragraph_from_line(raw: str) -> str:
    line = raw.strip()
    if (
        not line
        or line.startswith(("{{", "[[", "|"))
        or line in {"}}", "}}", "footer"}
        or re.fullmatch(r"-{2,}", line)
    ):
        return ""
    line = re.sub(r"^:+", "", line).strip()
    line = re.sub(r"^'''\d+'''", "", line).strip()
    line = clean_inline(line)
    line = apply_emendations(line)
    line = line.strip("，、；： ")
    if not line or line in {"。", "，"}:
        return ""
    if re.fullmatch(r"[，。！？；、：\s]*", line):
        return ""
    return line


def cn_int(text: str) -> int | None:
    text = text.strip()
    if not text:
        return None
    if text.isdigit():
        return int(text)
    if any(ch not in CN_DIGIT for ch in text):
        return None
    value = 0
    for ch in text:
        if ch in "〇○零":
            value *= 10
        else:
            value = value * 10 + "一二三四五六七八九".index(ch) + 1
    return value


def parse_heading(raw: str, last_king: str) -> tuple[str, dict | None]:
    heading = clean_inline(raw).strip()
    heading = re.sub(r"\s+", "", heading)
    if not heading or STOP_RE.search(heading):
        return last_king, None
    matched = YEAR_RE.match(heading)
    if not matched:
        king = re.sub(r"[上中下]$", "", heading)
        king = re.sub(r"^秦(?=昭襄|孝文|庄襄|莊襄|始皇)", "", king)
        if king and "纪" not in king and "紀" not in king and len(king) <= 6:
            return king, None
        return last_king, None
    king, num, rest = matched.group(1), matched.group(2), matched.group(3)
    if king in {"", "王"} and last_king:
        king = last_king
        heading = king + num + "年" + rest
    elif king:
        last_king = king
    title = f"{king}{num}年"
    date = ""
    ganzhi = ""
    inner = rest.strip("（）()")
    if inner:
        bits = re.split(r"[，,]", inner)
        if bits:
            ganzhi = bits[0].strip()
        year_bit = inner
        m = re.search(r"(?:西元)?前([〇○零一二三四五六七八九\d]+)年?", year_bit)
        if m:
            year = cn_int(m.group(1))
            if year:
                date = f"前{year}"
    return last_king, {
        "title_t": title,
        "date": date,
        "ganzhi": ganzhi,
        "heading_t": heading,
    }


def parse_juan(juan: int, text: str) -> tuple[str, list[dict]]:
    span = ""
    years: list[dict] = []
    last_king = ""
    current: dict | None = None
    stopped = False
    for raw in text.splitlines():
        heading_match = HEADING_RE.match(raw.strip())
        if heading_match:
            level = len(heading_match.group(1))
            title_raw = heading_match.group(2)
            if STOP_RE.search(clean_inline(title_raw)):
                stopped = True
                current = None
                continue
            if level == 1 and ("纪" in title_raw or "紀" in title_raw):
                current = None
                continue
            last_king, meta = parse_heading(title_raw, last_king)
            current = None
            if meta:
                meta["paragraphs_t"] = []
                years.append(meta)
                current = meta
            continue
        if stopped:
            continue
        stripped = raw.strip()
        if stripped.startswith("'''起") and not span:
            span = apply_emendations(clean_inline(stripped))
            continue
        if current is None:
            continue
        # 卷三十三：维基文库在建平元年标题前多出一行帝号「孝哀皇帝上」，不是正文。
        if re.fullmatch(r"(?:孝.皇帝|王莽)[上中下]", stripped):
            continue
        paragraph = paragraph_from_line(raw)
        if paragraph:
            current["paragraphs_t"].append(paragraph)
    kept = []
    for year in years:
        paragraphs = []
        for paragraph in year["paragraphs_t"]:
            sentences = split_sentences(paragraph)
            if sentences:
                paragraphs.append(sentences)
        if not paragraphs:
            continue
        year["paragraphs_t"] = paragraphs
        kept.append(year)
    return span, kept


def tokens_for(trad: str, simp: str) -> list[dict]:
    rows = []
    for t_ch, s_ch in zip(trad, simp):
        if t_ch in PUNCT or s_ch in PUNCT:
            rows.append({"t": t_ch, "s": s_ch, "punct": True})
        else:
            rows.append({"t": t_ch, "s": s_ch, "py": "", "ctx": "", "pos": "", "extra": "", "level": "dict"})
    fix_readings(rows)
    return rows


def load_years() -> list[dict]:
    entries = []
    for juan in range(1, LAST_JUAN + 1):
        path = SRC / f"juan{juan:02d}.wikitext"
        span, years = parse_juan(juan, path.read_text(encoding="utf-8"))
        for index, year in enumerate(years, 1):
            paragraphs_s = []
            for paragraph in year["paragraphs_t"]:
                paragraphs_s.append([to_simplified(sent) for sent in paragraph])
            title_s = to_simplified(year["title_t"])
            entries.append({
                "id": f"z{juan:02d}-{index:02d}",
                "juan": juan,
                "era": JUAN_ERA[juan],
                "index": index,
                "title_t": year["title_t"],
                "title_s": title_s,
                "date": year["date"],
                "ganzhi": to_simplified(year["ganzhi"]),
                "span": to_simplified(span),
                "paragraphs_t": year["paragraphs_t"],
                "paragraphs_s": paragraphs_s,
            })
    return entries


def sentence_count(entry: dict) -> int:
    return sum(len(paragraph) for paragraph in entry["paragraphs_s"])


def article_for(entry: dict, lesson: dict | None) -> dict:
    trs = list(lesson["trs"]) if lesson else []
    cursor = 0
    paragraphs = []
    for trad_p, simp_p in zip(entry["paragraphs_t"], entry["paragraphs_s"]):
        sentences = []
        for trad, simp in zip(trad_p, simp_p):
            if len(trad) != len(simp):
                raise SystemExit(f"{entry['id']} 简繁长度不一致：{trad} / {simp}")
            tr = trs[cursor] if cursor < len(trs) else ""
            cursor += 1
            sentences.append({"tr": tr, "tokens": tokens_for(trad, simp)})
        paragraphs.append({"sentences": sentences})
    art = {
        "id": entry["id"],
        "volume": entry["juan"],
        "volumeTitle": volume_title(entry),
        "volumeSubtitle": entry["date"] or "",
        "index": entry["index"],
        "title": {"t": entry["title_t"], "s": entry["title_s"]},
        "book": {"t": "資治通鑑", "s": "资治通鉴"},
        "sourceHead": {"t": source_head(entry, trad=True), "s": source_head(entry, trad=False)},
        "author": "司马光",
        "annotated": bool(lesson),
        "paragraphs": paragraphs,
    }
    if lesson:
        art["lesson"] = lesson["lesson"]
    return art


def volume_title(entry: dict) -> str:
    names = {
        1: "周纪一",
        2: "周纪二",
        3: "周纪三",
        4: "周纪四",
        5: "周纪五",
        6: "秦纪一",
        7: "秦纪二",
        8: "秦纪三",
        9: "汉纪一",
        10: "汉纪二",
        11: "汉纪三",
        12: "汉纪四",
        13: "汉纪五",
        14: "汉纪六",
        15: "汉纪七",
        16: "汉纪八",
        17: "汉纪九",
        18: "汉纪十",
        19: "汉纪十一",
        20: "汉纪十二",
        21: "汉纪十三",
        22: "汉纪十四",
        23: "汉纪十五",
        24: "汉纪十六",
        25: "汉纪十七",
        26: "汉纪十八",
        27: "汉纪十九",
        28: "汉纪二十",
        29: "汉纪二十一",
        30: "汉纪二十二",
        31: "汉纪二十三",
        32: "汉纪二十四",
        33: "汉纪二十五",
        34: "汉纪二十六",
        35: "汉纪二十七",
        36: "汉纪二十八",
        37: "汉纪二十九",
        38: "汉纪三十",
        39: "汉纪三十一",
        40: "汉纪三十二",
    }
    return names[entry["juan"]]


def source_head(entry: dict, trad: bool) -> str:
    title = volume_title(entry)
    date = entry["date"]
    ganzhi = entry["ganzhi"]
    bits = [title]
    if date:
        bits.append(date)
    if ganzhi:
        bits.append(ganzhi)
    text = " · ".join(bits)
    return text if not trad else to_traditional_head(text)


def to_traditional_head(text: str) -> str:
    table = str.maketrans({
        "周": "周",
        "纪": "紀",
        "秦": "秦",
        "一": "一",
        "二": "二",
        "三": "三",
        "四": "四",
        "五": "五",
        "前": "前",
        "汉": "漢",
        "九": "九",
        "十": "十",
    })
    return text.translate(table)


def catalog_for(entries: list[dict]) -> dict:
    volumes = []
    for juan in range(1, LAST_JUAN + 1):
        group = [item for item in entries if item["juan"] == juan]
        if not group:
            continue
        articles = []
        for item in group:
            articles.append({
                "id": item["id"],
                "index": item["index"],
                "title": item["title_s"],
                "titleT": item["title_t"],
                "date": item["date"],
                "author": "司马光",
            })
        volumes.append({
            "volume": juan,
            "era": JUAN_ERA[juan],
            "title": volume_title(group[0]),
            "subtitle": f"{group[0]['title_s']}至{group[-1]['title_s']}",
            "span": group[0]["span"],
            "articles": articles,
        })
    return {
        "title": "资治通鉴",
        "author": "司马光",
        "articleCount": len(entries),
        "scope": "周纪、秦纪、汉纪（卷一至卷四十）",
        "volumes": volumes,
        "later": LATER_ERAS,
    }


def load_lesson(entry: dict) -> dict:
    direct = LESSONS / f"{entry['id']}.json"
    if direct.exists():
        return json.loads(direct.read_text(encoding="utf-8"))
    parts = sorted((LESSONS / "parts").glob(f"{entry['id']}-*.json"))
    lesson_path = LESSONS / f"{entry['id']}.lesson.json"
    if not parts or not lesson_path.exists():
        raise FileNotFoundError(entry["id"])
    trs: list[str] = []
    for path in parts:
        data = json.loads(path.read_text(encoding="utf-8"))
        trs.extend(data["trs"])
    lesson = json.loads(lesson_path.read_text(encoding="utf-8"))
    body = lesson.get("lesson") if isinstance(lesson.get("lesson"), dict) else lesson
    return {"id": entry["id"], "trs": trs, "lesson": body}


def keep_glosses(old: dict, new: dict) -> None:
    """名句标注写在已发布的文章里。正文没变的字，保留原来的句中义。"""
    for p_old, p_new in zip(old.get("paragraphs", []), new["paragraphs"]):
        for s_old, s_new in zip(p_old.get("sentences", []), p_new["sentences"]):
            if len(s_old.get("tokens", [])) != len(s_new["tokens"]):
                continue
            for t_old, t_new in zip(s_old["tokens"], s_new["tokens"]):
                if t_new.get("punct") or t_old.get("t") != t_new["t"]:
                    continue
                for key in ("py", "ctx", "pos", "extra", "level"):
                    if key in t_old:
                        t_new[key] = t_old[key]


def write_articles(entries: list[dict]) -> None:
    missing = []
    for entry in entries:
        try:
            load_lesson(entry)
        except FileNotFoundError:
            missing.append(entry["id"])
    if missing:
        raise SystemExit(f"缺课注 {len(missing)} 篇，例如 {', '.join(missing[:8])}")
    ARTICLES.mkdir(parents=True, exist_ok=True)
    for entry in entries:
        lesson = load_lesson(entry)
        expected = sentence_count(entry)
        if lesson.get("id") != entry["id"]:
            raise SystemExit(f"{entry['id']} 课注 id 不符")
        if len(lesson.get("trs") or []) != expected:
            raise SystemExit(f"{entry['id']} 译文 {len(lesson.get('trs') or [])} 句，原文 {expected} 句")
        path = ARTICLES / f"{entry['id']}.json"
        art = article_for(entry, lesson)
        if path.exists():
            keep_glosses(json.loads(path.read_text(encoding="utf-8")), art)
        dump_json(path, art)
    dump_json(CATALOG, catalog_for(entries))
    extend_dict(entries)


def extend_dict(entries: list[dict]) -> None:
    """新卷用到、字典里还没有的字，从《说文》补进 data/dict.json。已有条目不动。"""
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


def write_dump(entries: list[dict]) -> None:
    payload = []
    for entry in entries:
        payload.append({
            "id": entry["id"],
            "juan": entry["juan"],
            "index": entry["index"],
            "title": entry["title_s"],
            "date": entry["date"],
            "sentences": sentence_count(entry),
            "paragraphs": entry["paragraphs_s"],
        })
    dump_json(DUMP, payload, pretty=True)


def report(entries: list[dict]) -> None:
    print(f"years {len(entries)} sentences {sum(sentence_count(item) for item in entries)}")
    for juan in range(1, LAST_JUAN + 1):
        group = [item for item in entries if item["juan"] == juan]
        chars = sum(len(sent) for item in group for para in item["paragraphs_s"] for sent in para)
        print(f"  juan {juan} {volume_title(group[0]) if group else '?'} years {len(group)} chars {chars}")
    first = entries[0]
    print("FIRST", first["id"], first["title_s"], first["date"])
    print(first["paragraphs_s"][0][0][:80])
    dirty = []
    for entry in entries:
        blob = "".join(sent for para in entry["paragraphs_s"] for sent in para)
        if any(mark in blob for mark in ("□", "〔", "〕", "<", ">", "{", "}", "'''", "==")):
            dirty.append(entry["id"])
    print("dirty", dirty[:12], "count", len(dirty))


def main() -> None:
    entries = load_years()
    if "--write" in sys.argv:
        write_articles(entries)
        print(f"wrote {len(entries)} articles")
        return
    if "--catalog" in sys.argv:
        dump_json(CATALOG, catalog_for(entries))
        print(f"catalog {len(entries)}")
        return
    write_dump(entries)
    report(entries)


if __name__ == "__main__":
    main()
