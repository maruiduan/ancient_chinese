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
    41: "han",
    42: "han",
    43: "han",
    44: "han",
    45: "han",
    46: "han",
    47: "han",
    48: "han",
    49: "han",
    50: "han",
    51: "han",
    52: "han",
    53: "han",
    54: "han",
    55: "han",
    56: "han",
}
LAST_JUAN = max(JUAN_ERA)

LATER_ERAS = [
    {"id": "han", "title": "汉纪", "juan": "卷五十七起", "note": "陆续添加"},
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
    text = text.replace("干刚", "乾刚")
    text = text.replace("干位", "乾位")
    text = text.replace("干象", "乾象")
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
    for wrong, right in (("虜藏荼", "虜臧荼"), ("陳平、降侯曰", "陳平、絳侯曰"), ("穎陰侯", "潁陰侯"), ("穎陰懿侯", "潁陰懿侯"), ("紵絮昔斮", "紵絮斮"), ("先諭都", "先諭教"), ("離南□", "離南畝"), ("百□", "百畝"), ("魏□", "魏遬"), ("詔日；「朕", "詔曰：「朕"), ("不記逃", "不亡逃"), ("阜陵安為", "阜陵侯安為"), ("臣侯日", "臣候日"), ("都尉曰；「", "都尉曰：「"), ("已亥，帝", "己亥，帝"), ("歸夫以下", "歸夫人以下"), ("誘天豪傑；白頭舉事、此", "誘天下豪傑；白頭舉事，此"), ("故相誘以亂」錯曰", "故相誘以亂。」錯曰"), ("從穎川來", "從潁川來"), ("；南王非為江都", "；汝南王非為江都"), ("上書；「願", "上書：「願"), ("王鱣長太子", "王適長太子"), ("丞相議之。上", "丞相議之。」上"), ("加這以", "加之以"), ("呂委主", "呂季主"), ("趙涉庶說", "趙涉遮說"), ("宜夫清道", "且夫清道"), ("開東閤", "開東閣"), ("對。對奇焉", "對。上奇焉"), ("倉癐", "倉廥"), ("曹瓤", "曹襄"), ("佈告下天", "佈告天下"), ("去事,驃騎", "去事驃騎"), ("私人視亦", "私入視亦"), ("相穎陰灌夫", "相潁陰灌夫"), ("橫穎川", "橫潁川"), ("魏人信陵", "魏有信陵"), ("綱紀馳廢", "綱紀弛廢"), ("繼金幣帛", "齎金幣帛"), ("圍抱罕", "圍枹罕"), ("恐，清臣置吏", "恐，請臣置吏"), ("地神衹", "地神祇"), ("不也言擅賦", "不敢言擅賦"), ("萬數，繼糧", "萬數，齎糧"), ("癸己，禪", "癸巳，禪"), ("不足憂也」上嘗", "不足憂也。」上嘗"), ("狐鹿孤單于", "狐鹿姑單于"), ("賜量謚", "賜旦謚"), ("宜春敬侯王訴", "宜春敬侯王訢"), ("朗有上書言", "郎有上書言"), ("，徒右將軍安世", "，徙右將軍安世"), ("勝為示夭言", "勝為妖言"), ("謂城胡組", "渭城胡組"), ("聯甚悼", "朕甚悼"), ("以為主可", "以為不可"), ("穎川太守趙廣漢", "潁川太守趙廣漢"), ("穎川俗", "潁川俗"), ("附肋之，為其後", "附助之，為其後"), ("李竟民善", "李竟所善"), ("持鍺、鉤", "持鉏、鉤"), ("送大苑諸國", "送大宛諸國"), ("使護善阜善以西", "使護鄯善以西"), ("穎川太守黃霸使", "潁川太守黃霸使"), ("復歸穎川", "復歸潁川"), ("其辭日", "其辭曰："), ("蜉蝤出以陰", "蜉蝣出以陰"), ("尚方待詔，初，", "尚方待詔。初，"), ("懈馳，望見", "懈弛，望見"), ("充國漢曰", "充國歎曰"), ("治隍陿中", "治湟陿中"), ("延壽為穎川太守，穎川承", "延壽為潁川太守，潁川承"), ("代延壽居穎川", "代延壽居潁川"), ("延行改更", "延壽改更"), ("穎川太守黃霸在郡", "潁川太守黃霸在郡"), ("郡國，穎川尤多", "郡國，潁川尤多"), ("「穎川太守霸", "「潁川太守霸"), ("而穎川孝、弟", "而潁川孝、弟"), ("此德之盛之", "此德之盛也"), ("以外屬民侍中", "以外屬舊恩侍中"), ("解馳，枹", "解弛，枹"), ("翼州部", "冀州部"), ("傷薄欲化", "傷化薄俗"), ("原奉國珍", "願奉國珍"), ("博陸候", "博陸侯"), ("己巳、建", "己巳，建"), ("上帝稱制臨決", "上親稱制臨決"), ("為世縕皇孫", "為世適皇孫"), ("陽平候", "陽平侯"), ("虛已問", "虛己問"), ("禹之智足不以知", "禹之智不足以知"), ("飲鳩", "飲鴆"), ("議是，」", "議是。」"), ("百宮各省", "百官各省"), ("鄉化末醇", "鄉化未醇"), ("丁末，貢禹", "丁未，貢禹"), ("丁已，長信", "丁巳，長信"), ("前江乃無", "前江乃始無"), ("周幽，厲", "周幽、厲"), ("侍中，衛尉", "侍中、衛尉"), ("不可轉也，言", "不可轉也。』言"), ("群小，』", "群小。』"), ("傳相汲引", "轉相汲引"), ("便是非炳然", "使是非炳然"), ("「興，捐之", "「興、捐之"), ("穎川水流", "潁川水流"), ("以田□分為比", "以田蚡為比"), ("至禹弟，辟", "至禹第，辟"), ("狡猾不閫", "狡猾不道"), ("正是漢與述戰", "自是漢與述戰"), ("復攻撥繁", "復攻拔繁"), ("與呈漢會", "與吳漢會"), ("述又騁巴郡", "述又聘巴郡"), ("土多不修檢操", "士多不修檢操"), ("河南尹張人及", "河南尹張伋"), ("以劫業，：", "以劫業曰："), ("交趾剌史", "交趾刺史"), ("於長奉街上", "於長壽街上"), ("幸蒲板", "幸蒲坂"), ("五宮中郎將", "五官中郎將"), ("將線純", "將張純"), ("且通西哉", "且通西域"), ("太尉趙、司徒李言斤免", "太尉趙憙、司徒李訢免"), ("李言斤", "李訢"), ("薁□建", "薁鞬"), ("明主□農", "明主醲"), ("米□二萬", "米糒二萬"), ("為□盆僮", "為醢僮"), ("扦御", "扞御"), ("遂遣授率", "遂遣援率"), ("萬望還書", "萬里還書"), ("聞關險難", "間關險難"), ("眾遮未聞", "眾庶未聞"), ("怖心栗", "怖慄"), ("悚心栗", "悚慄"), ("清試守", "請試守"), ("屏君小", "屏羣小"), ("守寨諸羌", "守塞諸羌"), ("八俏", "八佾"), ("好畦", "好畤"), ("光琥", "光武"), ("讓還爵士", "讓還爵土"), ("數干詔", "數下詔"), ("慶時澍雨", "應時澍雨"), ("剌史", "刺史"), ("今繼雜繒", "今齎雜繒"), ("故未以繼", "故未以齎"), ("遣使繼璽書", "遣使齎璽書"), ("壁雍", "辟雍"), ("堅金覃", "堅鐔"), ("復光方面", "復少方面"), ("舉下下之半", "舉天下之半"), ("══范曄論曰", "范曄論曰"), ("沛太后郭后薨", "沛太后郭氏薨"), ("』」聞悉納從之", "』」帝悉納從之"), ("會昌符》曰；", "會昌符》曰："), ("有以禹為太傅", "其以禹為太傅"), ("馬武第二將軍", "馬武等二將軍"), ("辣然兢懼", "竦然兢懼"), ("奏請誅刑", "奏請誅荊"), ("帝怒曰；", "帝怒曰："), ("讓之曰；", "讓之曰："), ("超曰；", "超曰："), ("辛乙，帝行幸", "辛巳，帝行幸"), ("善阜善", "鄯善"), ("有□咼馬", "有騧馬"), ("白狼王唐取", "白狼王唐菆"), ("又聯臘日", "又聞臘日"), ("崔□因", "崔駰"), ("。□因詣吏", "。駰詣吏"), ("飽昱皆以為", "鮑昱皆以為"), ("山陽、山平地震", "山陽、東平地震"), ("祖檷之深思", "祖禰之深思"), ("無香蕃之飾", "無香薰之飾"), ("破環大體", "破壞大體"), ("草故饒衍", "草牧饒衍"), ("將馳刑及義從", "將弛刑及義從"), ("鑽金贊之屬", "鑽鑽之屬"), ("王女沘公主", "王女沘陽公主"), ("請奪泌水公主", "請奪沁水公主"), ("防為穎陽侯", "防為潁陽侯"), ("以捧檄而入", "義捧檄而入"), ("淮陽、穎陽", "淮陽、潁陽"), ("戒之曰；", "戒之曰："), ("《傳》曰：吳王好劍客", "《傳》曰：『吳王好劍客"), ("假於祖檷", "假於祖禰"), ("收弘印緩", "收弘印綬"), ("弘自詣延尉", "弘自詣廷尉"), ("收太姬璽緩", "收太姬璽綬"), ("超召將校乃於窴王", "超召將校及於窴王"), ("門生繼書", "門生齎書"), ("遣騎繼金銀", "遣騎齎金銀"), ("何敝上疏", "何敞上疏"), ("鄧鴻出□固陽塞", "鄧鴻出稒陽塞"), ("誅戳無罪", "誅戮無罪"), ("帝以穎川郭躬", "帝以潁川郭躬"), ("尚書穎川韓稜", "尚書潁川韓稜"), ("編訢、本梵等", "編訢、李梵等"), ("其各冠覆", "其各冠履"), ("辛丑，耕於；", "辛丑，耕於懷；"), ("恩家隆深", "恩愛隆深"), ("忍怒還忿", "忍怒含忿"), ("秋，十月，乙卯，竇憲出屯", "秋，七月，乙卯，竇憲出屯"), ("鄰戶三萬四千", "領戶三萬四千"), ("建策之要地", "建策之要也"), ("險急負執", "險急負勢"), ("為此單于，欲輔", "為北單于，欲輔"), ("帝感共言", "帝感其言"), ("吳防侯", "吳房侯"), ("從兄示但", "從兄䄠"), ("妻A148", "妻嫕"), ("引見A148", "引見嫕"), ("領尚或屯", "領尚營屯"), ("人皆繼三歲糧", "人皆齎三歲糧"), ("東師後部", "車師後部"), ("凱猶不出", "愷猶不出"), ("其兄防子侯章", "其兄房子侯章"), ("巢刀鄉侯", "鄛鄉侯"), ("選儒之恩", "選懦之恩"), ("設般木案", "設槃案"), ("九月，壬年，車駕", "九月，壬午，車駕"), ("══華嶠論曰", "華嶠論曰"), ("愚虜伏發，士窣窸走", "遇虜伏發，士卒悉走"), ("稻梁米不得", "稻粱米不得"), ("儲峙米□", "儲峙米糒"), ("布在廓廟", "布在廊廟"), ("以穎川太守張敏", "以潁川太守張敏"), ("南陽、穎川、汝南", "南陽、潁川、汝南"), ("光祿勳穎川李修", "光祿勳潁川李修"), ("各遺入質", "各遣入質"), ("上林池御", "上林池籞"), ("遺准使冀州", "遣准使冀州"), ("羌舉士內屬", "羌舉土內屬"), ("水潦不沐", "水潦不休"), ("安土重還", "安土重遷"), ("獨未爭甲", "獨未解甲"), ("征詣延尉", "征詣廷尉"), ("隴西徒襄武", "隴西徙襄武"), ("海郡張伯路", "海賊張伯路"), ("尚己得解", "尚已得解"), ("══仲長統昌言曰", "仲長統昌言曰"), ("四郡羌，胡五千騎", "四郡羌、胡五千騎"),  ("秋，九月，午，太尉", "秋，九月，庚午，太尉"), ("驅氏、羌以為", "驅氐、羌以為"), ("初遣申郎將", "初遣中郎將"), ("盧匆心、忍良", "盧怱、忍良"), ("召盧匆++心", "召盧怱"), ("為上議曰", "勇上議曰"), ("譴歸河間", "遣歸河間"), ("履謙祐", "履謙之祐"), ("翟瑰上疏", "翟酺上疏"), ("淑辣然", "淑竦然"), ("穎川杜根", "潁川杜根"), ("穎川荀淑", "潁川荀淑"), ("夜，遺使者", "夜，遣使者"), ("芻蕘輿論人之言", "芻蕘輿人之言"), ("自致延尉", "自致廷尉"), ("幾陽亭", "夕陽亭"),
 ("勇對曰；「今中國", "勇對曰：「今中國"),
 ("河間王子冀美容儀", "河間王子翼美容儀"), ("追怒，今有司奏", "追怒，令有司奏"),
 ("秋，七月，己卿，改元", "秋，七月，己卯，改元"),
 ("躬身菲薄", "躬自菲薄"), ("不肯去。帝不怒", "不肯去。帝大怒"), ("陛下始與臥等", "陛下始與臣等"), ("生得單于人兄", "生得單于從兄"), ("呼銜王亡走", "呼衍王亡走"), ("尚書偵射", "尚書僕射"), ("因遺十九侯", "因遣十九侯"), ("促期發遺", "促期發遣"), ("年乖強仁", "年乖強仕"), ("宜過災顧之運", "宜過災戹之運"), ("動有癢序", "動有庠序"), ("有堤坊。堤坊完全", "有堤防。堤防完全"), ("程等於亂悖逆", "程等干亂悖逆"), ("陷於壺山", "隱於壺山"), ("謙大自專", "謙不自專"), ("以為可事之時", "以為可仕之時"), ("定穎侯", "定潁侯"), ("後感穎考叔", "後感潁考叔"), ("穎川李膺", "潁川李膺"), ("時江京、劉發及", "時江京、劉安及"),  ("十二月，巳卯", "十二月，乙卯"), ("太尉寵參", "太尉龐參"), ("於詩三期", "於時三期"), ("亡秦奢移之欲", "亡秦奢侈之欲"), ("《易‧傳》曰：『陽惑天", "《易傳》曰：『陽感天"), ("用國舉之言", "用周舉之言"), ("像林蠻", "象林蠻"), ("纖微感概", "纖微感慨"), ("而宦言忌其寵", "而宦官忌其寵"), ("宜早訖章", "宜早訖竟"), ("遺侍中河內杜喬", "遣侍中河內杜喬"), ("杜喬至冶金兗州", "杜喬至兗州"), ("乃主太守為設", "乃請太守為設"), ("參絲", "參䜌"), ("遇羌伏後", "遇羌伏兵"), ("《韭露之歌》", "《薤露之歌》"), ("為河南伊", "為河南尹"), ("乙己，以大司農黃尚", "乙巳，以大司農黃尚"), ("五月，戊胡，封", "五月，戊辰，封"), ("帝若煩甚", "帝苦煩甚"), ("東攝萬機", "秉攝萬機"), ("參勸講援", "參勸講授"), ("平原王冀既貶", "平原王翼既貶"), ("不疑為穎陽侯", "不疑為潁陽侯"), ("舉汜宮為尚書", "舉泛宮為尚書"), ("唐衡、左心官", "唐衡、左悺"), ("鈇鍎", "鈇鑕"), ("詣厥上書", "詣闕上書"), ("穎陰令", "潁陰令"), ("錘皓", "鍾皓"), ("連日繼夜以聘娛", "連日繼夜以騁娛"), ("手旁掠割剝", "搒掠割剝"), ("遣客繼書詣京兆", "遣客齎書詣京兆"), ("守謁不疑", "過謁不疑"), ("臣聞天下言語", "臣聞天不言語"), ("北匈奴呼銜王", "北匈奴呼衍王"), ("莫適所以；", "莫適所從；"), ("補衣定決壞", "補綻決壞"), ("拘文牽占", "拘文牽古"), ("雖合聖德，輒見", "雖合聖聽，輒見"), ("逄計見效", "算計見效"), ("請節奏哉", "調節奏哉"), ("══臣光曰", "臣光曰"), ("太常羊浦", "太常羊溥"), ("與三會絕席", "與三公絕席"), ("所奏禮簿", "所奏禮薄"), ("書生穎川劉陶", "書生潁川劉陶"), ("封乳母馬惠子初為列候", "封乳母馬惠子初為列侯"), ("窟於鏖場", "窟於麑場"), ("掾穎川韓韶", "掾潁川韓韶"), ("「穎川四長", "「潁川四長"), ("詐繼璽書", "詐齎璽書"), ("使怨之民響應", "使愁怨之民響應"), ("甲戊晦", "甲戌晦"), ("土地□脊□角", "土地塉埆"), ("簡練文下", "簡練文武"), ("吏民繼貨", "吏民齎貨"), ("中都官稱檄", "中都官移檄"), ("遂誅下家", "遂誅武家"), ("因輿梓奏書", "因輿櫬奏書"), ("韋著，穎川李曇", "韋著，潁川李曇"), ("衛尉穎川許栩", "衛尉潁川許栩"), ("故舊恩敵", "故舊恩私"), ("帝欲不謗", "帝欲不諦"), ("以為大有敬", "以為大不敬"), ("校尉段穎", "校尉段熲"), ("皮氏長京兆岐", "皮氏長京兆趙岐"), ("人繼百錢", "人齎百錢"), ("黃門史左心官", "黃門史左悺"), ("超、心官入室", "超、悺入室"), ("具瑗、左心官、唐衡", "具瑗、左悺、唐衡"), ("仍以心官、衡", "仍以悺、衡"), ("徐璜、左心官欲", "徐璜、左悺欲"), ("左心官兄勝", "左悺兄勝"), ("光祿勳袁□於持節", "光祿勳袁盱持節"), ("上下□葉黷", "上下媟黷"), ("稷、伊、呂之佐", "稷、卨、伊、呂之佐"), ("因中常侍王甫就", "使中常侍王甫就"), ("巴部言黃龍", "巴郡言黃龍"), ("劉鰷", "劉鯈"), ("歸葬穎川", "歸葬潁川"), ("但聰明，作元后", "亶聰明，作元后"), ("雲臣兵『累見折衄，又言『", "雲臣兵『累見折衄』，又言『"), ("時年十二。孝靈皇帝上之上", "時年十二。"), ("路無險所", "路無險折"), ("繼十五日糧", "齎十五日糧"), ("上佔天心", "上占天心"), ("以手椎席", "以手推席"), ("太后□豫", "太后冘豫"), ("其難量", "其禍難量"), ("祝□", "祝瑨"), ("杜宻", "杜密"), ("黨錮之鍋", "黨錮之禍"), ("虎狼之屬", "虎狼之尾"), ("戊己司馬曹寬", "戊己校尉曹寬"), ("討疏，攻楨中", "討疏勒，攻楨中"),  ("大夫遺門生旦暮", "大夫遣門生旦暮"), ("中常侍左心官之苦縣", "中常侍左悺之苦縣"), ("刑邴蜀阜之父", "刑邴𨞕之父"), ("乃弦大木為方", "乃弦大木為弓"), ("膺獨特風裁", "膺獨持風裁"), ("□、□質竟死", "瑨、瓆竟死"), ("□、□質素剛直", "瑨、瓆素剛直"), ("□質", "瓆"), ("成□", "成瑨"), ("請□、瓆", "請瑨、瓆"), ("郭泰及穎川", "郭泰及潁川"), ("太僕穎川杜密", "太僕潁川杜密"), ("賂遺中宮，以此", "賂遺中官，以此"), ("其法侵盛", "其法浸盛"), ("以太史大夫陳蕃", "以太中大夫陳蕃"), ("霜雪，遂臣者窮人途", "霜雪，逐臣者窮人途"),       ("無尺十之柄", "無尺土之柄"), ("質素囂曰", "質責囂曰"), ("猶如三考", "猶加三考"), ("忸心犬小利", "狃忕小利"), ("義手從族", "叉手從族"), ("今還復民伍", "令還復民伍"), ("郭人及可大司", "郭伋可大司"), ("旁令領職", "芳令領職"), ("以節廝殺", "以節檛殺"), ("「穎川迫近", "「潁川迫近"), ("穎川盜賊群起", "潁川盜賊群起"), ("「穎川聞陛", "「潁川聞陛"), ("南征，穎川盜賊", "南征，潁川盜賊"), ("還自穎川", "還自潁川"), ("正月，穎陽成侯", "正月，潁陽成侯"), ("帝其傷之", "帝甚傷之"), ("並蒙爵士", "並蒙爵土"), ("塞外氏、羌", "塞外氐、羌"), ("郭人及為潁川", "郭伋為潁川"), ("。人及招降山賊", "。伋招降山賊"), ("聞人及威信", "聞伋威信"), ("郭人及為并州", "郭伋為并州"), ("得失，人及曰", "得失，伋曰"), ("故人及言及之", "故伋言及之"), ("上回溪孤", "上回溪阪"), ("春陵節候", "春陵節侯"), ("不俗強相服", "不欲強相服"), ("人庸中佼佼", "傭中佼佼"), ("任良據雩阜", "任良據鄠"), ("弩力而已", "努力而已"), ("ㄠ麼", "幺麼"), ("暗奸天位者呼", "暗奸天位者乎"), ("抿守建陽", "拒守建陽"), ("必驚攏", "必驚擾"), ("而徒興捨", "而徙興捨"), ("增秩徒捨", "增秩徙捨"), ("囂其敬重", "囂甚敬重"), ("邯鄣將帥", "邯鄲將帥"), ("已阜人秦豐", "邔人秦豐"), ("攻得已阜、", "攻得邔、"), ("孫人及謀", "孫伋謀"), ("七月，人及以其謀", "七月，伋以其謀"), ("帶++足惲", "帶足惲"), ("逆戰於南□", "逆戰於南䜌"), ("使生繼以詣寵", "使生齎以詣寵"), ("宜秋，褲縯", "宜秋，縯"), ("持其印、□、節", "持其印、韍、節"), ("非讙、乾肉", "非糒、乾肉"), ("多繼珍寶", "多齎珍寶"), ("約繼輕糧", "約齎輕糧"), ("當自繼食", "當自齎食"), ("多繼釜鍑", "多齎釜鍑"), ("不繼斗糧", "不齎斗糧"), ("旬阜", "郇"), ("奉符命，繼印綬", "奉符命，齎印綬"), ("背負敝鳥鳥之毛", "背負鷩鳥之毛"), ("南出都隃", "南出者隃"), ("奉上璽□", "奉上璽韍"), ("用□十八斛", "用糒十八斛"), ("食□飲水", "食糒飲水"), ("太官繼□", "太官齎糒"), ("獻者封侯，』", "獻者封侯。』"), ("聖人之言，』臣", "聖人之言。』臣"), ("予甚示氐畏", "予甚祗畏"), ("太保、後備、承", "太保、後承、承"), ("天下耳」太后", "天下耳。」太后"), ("尚書令穎川", "尚書令潁川"), ("理。穎川太守陵", "理。潁川太守陵"), ("吾哀穎川", "吾哀潁川"), ("何並為穎川", "何並為潁川"), ("臨印□及", "臨印韍及"), ("天子□冕", "天子韍冕"), ("流漸積畏", "流漸積猥"), ("無病而死，』", "無病而死。』"), ("覆公餗，』", "覆公餗。』"), ("太后下詔；「", "太后下詔：「"), ("當日：「吾居", "當曰：「吾居"), ("遺使持節赦", "遣使持節赦"), ("誠翼有益", "誠冀有益"), ("既尊後。尤驕", "既尊後，尤驕"), ("譚穎川", "譚潁川"), ("宜不廷尉治", "宜下廷尉治"), ("客復特詔記", "客復持詔記"), ("念雖末有皇子", "念雖未有皇子"), ("至對及冠議", "至對衣冠議"), ("何不白也」？", "何不白也？」"), ("郭舜上言；「", "郭舜上言：「"), ("使其言是，一可誅", "使其言是，不可誅"), ("其言非，因當容之", "其言非，固當容之"), ("穎川鐵官", "潁川鐵官"), ("處之不漸恧", "處之不慚恧"), ("五百畝叟", "五百艘"), ("而近已出之女", "而近己出之女"), ("根C090地中", "根臿地中"), ("；剌史復", "；刺史復"), ("乃辛已", "乃辛巳"), ("車師戊已校尉", "車師戊己校尉"), ("讞後不為失", "讞者不為失"), ("曰簠簋", "曰『簠簋"), ("上曰；「朕既", "上曰：「朕既"), ("何得不厥", "何得不蹶"), ("易子上咬", "易子而咬"), ("緣南晦", "緣南畝"), ("隴晦", "隴畝"), ("糠枇", "糠秕"), ("左右諫曰；", "左右諫曰："), ("徒代王如意", "徙代王如意"), ("罷穎川郡", "罷潁川郡"), ("燕王藏荼", "燕王臧荼"), ("令上病，屬任", "今上病，屬任"), ("之數未可行也", "之數未可知也"), ("聞田死", "聞田橫死"), ("見籐公", "見滕公"), ("見藤公", "見滕公"), ("冒頓日；", "冒頓曰："),
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
    # 卷四十四起维基文库把庙号帝号写进年份标题，如「世祖光武皇帝下建武二十三年」。
    heading = re.sub(r"^(?:世祖光武|顯宗孝明|显宗孝明|肅宗孝章|肃宗孝章|孝和|孝殤|孝安|孝順|孝顺|孝質|孝质|孝桓|孝靈|孝灵)皇帝(?:[上中下]之[上中下]|[上中下])?(?=.+年)", "", heading)
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


# 繁体转写误字（裡/捨/後）只按卷、按上下文校正：繁体中「捨」（舍弃）与「舍」（屋舍）、
# 「裡」（里面）与「里」（乡里、地名）、「後」（先后）与「后」（君后）本是不同的字，不能全书通改。
# 每条都已对照胡注本同卷原文核过，且须在该卷恰好出现所列次数。
JUAN_TRAD_FIXES: dict[int, list[tuple[str, str, int]]] = {
    24: [("內所居傳捨", "內所居傳舍", 1)],
    25: [("得槐裡公乘", "得槐里公乘", 1)],
    29: [("坐與槐裡令", "坐與槐里令", 1)],
    35: [("罷歸田裡", "罷歸田里", 1)],
    36: [("槐裡男子", "槐里男子", 1), ("圉、槐裡、盩", "圉、槐里、盩", 1)],
    37: [("移至傳捨", "移至傳舍", 1)],
    38: [("盜賊歸田裡", "盜賊歸田里", 1)],
    39: [("入傳捨，傳", "入傳舍，傳", 1)],
    40: [("止傳捨", "止傳舍", 1)],
    46: [("遣歸田裡", "遣歸田里", 1), ("進幸槐裡", "進幸槐里", 1)],
    50: [("免官歸田裡", "免官歸田里", 1)],
    54: [("乞骸骨歸田裡", "乞骸骨歸田里", 1), ("免歸田裡", "免歸田里", 1)],
    55: [("封槐裡侯", "封槐里侯", 1)],
    56: [
        ("槐裡侯印綬", "槐里侯印綬", 1), ("皆歸田裡", "皆歸田里", 1),
        ("坐傳捨責", "坐傳舍責", 1), ("閉傳捨", "閉傳舍", 1), ("保納捨藏", "保納舍藏", 1),
        ("竇後既立", "竇后既立", 1), ("後素忌忍", "后素忌忍", 1),
        ("為孝元後，", "為孝元后，", 1), ("皇后，後，執金吾", "皇后，后，執金吾", 1),
    ],
}


def parse_juan(juan: int, text: str) -> tuple[str, list[dict]]:
    # 卷四十五维基文库把「斬首數百級」断在两段之间。
    text = text.replace("往赴之，斬\n\n首數百級", "往赴之，斬首數百級")
    # 卷五十维基文库年份标题漏「延光」。
    text = text.replace("孝安皇帝三年（甲子，公元一二四）", "孝安皇帝延光三年（甲子，公元一二四）")
    # 卷五十二维基文库段间夹有单独的 <BR> 行，另混入残缺帝号行「漢孝皇帝」（应为孝沖皇帝题名）。
    text = re.sub(r"^(?:<BR>|漢孝皇帝)[ \t]*$", "", text, flags=re.M)
    # 卷五十六维基文库：「以司空橋玄為司徒」段末误作分号；「帝以竇太后有援立之功，」与下段「冬，十月」本是一句，被拆成两段。
    text = text.replace("以司空橋玄為司徒；\n", "以司空橋玄為司徒。\n")
    text = text.replace("援立之功，\n\n冬，十月，戊子朔，", "援立之功，冬，十月，戊子朔，")
    for old, new, count in JUAN_TRAD_FIXES.get(juan, []):
        assert text.count(old) == count, (juan, old, text.count(old))
        text = text.replace(old, new)
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
        # 卷四十四正文中夹着一行帝号小标题「顯宗孝明皇帝上」，不是正文。
        if re.fullmatch(r"(?:漢)?(?:世祖光武|顯宗孝明|肅宗孝章|孝和|孝殤|孝安|孝順|孝顺|孝質|孝桓|孝靈|孝灵)皇帝(?:[上中下]之[上中下]|[上中下]+)", stripped):
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
        41: "汉纪三十三",
        42: "汉纪三十四",
        43: "汉纪三十五",
        44: "汉纪三十六",
        45: "汉纪三十七",
        46: "汉纪三十八",
        47: "汉纪三十九",
        48: "汉纪四十",
        49: "汉纪四十一",
        50: "汉纪四十二",
        51: "汉纪四十三",
        52: "汉纪四十四",
        53: "汉纪四十五",
        54: "汉纪四十六",
        55: "汉纪四十七",
        56: "汉纪四十八",
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
        "scope": "周纪、秦纪、汉纪（卷一至卷五十六）",
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
