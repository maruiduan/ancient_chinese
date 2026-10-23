"""古文观止、资治通鉴、人间词话：多音字按上下文定音（2026-10 全站核查）。

这三部书的字音原本只用字典默认音（夫一律 fū、还一律 hái、朝一律 cháo……）。
这里按前后字逐条判定：rule(L, R) 里 L 是本字前的简体串（含标点），R 是本字后的串。
只改没有手工读音（py 为空）的字；手工标过的读音不动。
"""
from __future__ import annotations

import re

P = "，。；：！？、「」『』（）《》—…·" + ",.;:!?"


def start(L):
    return not L or L[-1] in P


def end(R):
    return not R or R[0] in P


KINGS = ("秦王", "赵王", "齐王", "魏王", "楚王", "韩王", "燕王", "吴王", "越王", "汉王", "梁王", "卫君", "秦", "齐", "楚", "赵", "魏", "韩", "燕", "上曰", "人主", "诸侯")


def after(R, *ws):
    return any(R.startswith(w) for w in ws)


def before(L, *ws):
    return any(L.endswith(w) for w in ws)


def r_fu(L, R):
    if after(R, "人", "子", "妇", "妻", "差", "君", "家"):
        return None
    if start(L):
        return "fú"
    if end(R) and before(L, "也", "矣", "哉", "悲", "嗟", "善", "已", "乎", "是", "者"):
        return "fú"
    if before(L, "且", "若", "今", "故", "嗟", "悲", "噫", "也", "矣", "哉", "惜", "已", "然则", "盖", "彼"):
        return "fú"
    return None


def r_huan(L, R):
    if after(R, "是", "有"):
        return None
    return "huán"


def r_shuo(L, R):
    if (before(L, "大", "不", "心", "喜", "悦", "说")) and (end(R) or after(R, "之", "而", "其", "乎")) and not before(L, "小"):
        return "yuè"
    if before(L, "游", "往", "使", "求", "说客", "以") and after(R, *KINGS):
        return "shuì"
    if before(L, "游"):
        return "shuì"
    return None


def r_yue_le(L, R):
    if before(L, "知者", "智者", "仁者") and after(R, "山", "水"):
        return "yào"
    if before(L, "礼", "音", "鼓", "作", "奏", "声", "雅", "女", "伎", "管", "丝竹"):
        return "yuè"
    if after(R, "府", "工", "师", "章", "器", "律", "曲", "舞", "正", "官", "声"):
        return "yuè"
    return None


def r_hao(L, R):
    if after(R, "学", "色", "酒", "士", "客", "利", "古", "读", "事", "奇", "善", "义", "勇", "谋", "游", "饮", "音", "文", "贤", "胜", "为", "问", "名", "货", "乐"):
        return "hào"
    if before(L, "所", "爱", "嗜", "雅", "癖") or after(R, "恶"):
        return "hào"
    return None


def r_e(L, R):
    if after(R, "乎", "能", "得", "在", "知", "足", "可", "用", "识", "有") and (start(L) or before(L, "且", "则", "又", "而", "将")):
        return "wū"
    if before(L, "所", "好", "憎", "厌", "可", "深", "甚", "皆", "共", "众", "人", "不") and not before(L, "为"):
        return "wù"
    if after(R, "之", "其", "死", "闻", "人之") and not before(L, "罪", "美", "善", "首", "何", "丑", "凶", "邪", "大", "积", "作", "诸", "为"):
        return "wù"
    return None


def r_shao(L, R):
    if after(R, "年", "时", "壮", "子", "主", "府", "师", "傅", "长", "小", "卿", "君", "女", "妇", "保", "游", "孤", "贱"):
        return "shào"
    if before(L, "年", "老", "幼", "及", "自"):
        return "shào"
    return None


def r_zhang(L, R):
    if after(R, "子", "者", "老", "吏", "幼", "官", "大", "兄", "孙", "女", "史", "君", "公主", "安"):
        return None if after(R, "史", "安") else "zhǎng"
    if before(L, "君") and after(R, "有"):
        return None
    if before(L, "年", "君", "兄", "家", "增", "成", "滋", "师", "里", "亭", "尊", "县", "首", "酋", "稍", "渐", "已"):
        return "zhǎng"
    return None


def r_xiang(L, R):
    if before(L, "宰", "丞", "将", "卿", "拜", "为", "入", "出", "辅", "贤", "名", "良", "其", "王", "故", "齐", "楚", "秦", "魏", "赵", "韩", "燕") and not after(R, "与", "见", "逢", "识", "知", "从", "去", "望", "随", "对", "视", "持", "得", "传", "继", "顾", "谓", "语", "告", "近", "距"):
        if before(L, "宰", "丞", "将", "卿", "拜", "入", "出", "辅", "贤", "名", "良"):
            return "xiàng"
    if after(R, "国", "君", "府", "印", "位", "邦"):
        return "xiàng"
    return None


def r_jian_mid(L, R):
    if after(R, "者") and not start(L):
        return None
    if after(R, "道", "行", "谍", "者", "隙", "出", "其") and not before(L, "人", "世", "中", "之", "其", "此", "林", "山", "田", "日"):
        return "jiàn"
    if before(L, "反", "离", "用", "行"):
        return "jiàn"
    return None


def r_nan(L, R):
    if before(L, "发", "患", "危", "祸", "作", "赴", "死", "国", "靖", "避", "苦", "遇", "蒙", "急", "大", "解", "排", "多", "兵") and not after(R, "以", "得", "矣", "也", "乎", "于", "知", "言", "为", "哉", "者"):
        return "nàn"
    if after(R, "作"):
        return "nàn"
    return None


def r_chao(L, R):
    if before(L, "明", "临", "视", "听", "入", "来", "上", "大采") or after(R, "于"):
        return None
    if after(R, "夕", "暮", "露", "发", "闻", "晖", "霞", "气", "菌", "而往"):
        return "zhāo"
    if before(L, "今", "一", "终", "崇", "诘", "旦", "花") and not after(R, "廷", "臣", "天子", "见", "觐", "服"):
        return "zhāo"
    return None


def r_xiang_jiang(L, R):
    if before(L, "投", "请", "来", "乞", "受", "招", "归", "迎", "出", "纳", "诈", "皆", "遂", "不", "已", "使", "约") or after(R, "卒", "将", "虏", "者", "兵"):
        if before(L, "下", "升", "天", "霜", "雨", "露"):
            return None
        return "xiáng"
    return None


def r_chong(L, R):
    if after(R, "复", "叠", "阳", "围", "修", "来", "峦", "门", "茵", "译", "逢", "游", "见", "过"):
        return "chóng"
    if before(L, "万", "九", "千", "几", "数", "一", "两", "三"):
        return "chóng"
    return None


def r_zhuan(L, R):
    if before(L, "左", "列", "经", "自", "外", "本", "公羊", "穀梁", "谷梁", "史", "小", "别") or after(R, "曰", "记", "舍", "云"):
        return "zhuàn"
    return None


def r_guan(L, R):
    if before(L, "弱", "加", "既", "而") or after(R, "者", "军", "绝", "礼", "冕而"):
        return "guàn"
    return None


def r_yi_yi(L, R):  # 衣 yì
    if after(R, "以", "之", "其", "锦", "帛", "褐", "裘", "绣", "被") and not before(L, "布", "白", "单", "解", "其", "之", "缟", "朝", "锦", "寒", "征", "罗", "黑", "青", "紫", "绿", "红", "素", "褐", "缁", "皂"):
        return "yì"
    return None


def r_yu_yu(L, R):  # 予
    if before(L, "弗", "宰", "辄", "推") or (before(L, "则") and end(R)) or (R[:1] and R[0] in "一二三四五六七八九十百千万车金城璧秦卒魏张守季"):
        return None
    if after(R, "之", "其", "人", "以", "我", "民", "夺") or before(L, "赐", "授", "付", "给", "取", "夺", "赏", "与", "不", "所", "以", "当", "宜", "多", "厚"):
        return None
    return "yú"


def r_ceng(L, R):
    if after(R, "孙", "祖", "子", "参", "巩", "国藩", "不", "何", "是", "无", "莫", "未"):
        return "zēng"
    if start(L) and after(R, "皙"):
        return "zēng"
    return None


def r_bei(L, R):
    if before(L, "寇"):
        return None
    if after(R, "发", "坚", "甲", "褐", "裘", "衣"):
        return "pī"
    return None


def r_qiang(L, R):
    if before(L, "争", "富", "最", "自", "国", "兵", "盛", "甚"):
        return None
    if before(L, "勉", "力") or after(R, "起", "饭", "谏", "为", "之", "颜", "求", "使", "自"):
        return "qiǎng"
    return None


def r_guan_guan(L, R):
    if before(L, "楼", "道", "台", "宫", "寺", "玄都"):
        return "guàn"
    return None


def r_hao_hao(L, R):  # 号 háo
    if after(R, "呼", "哭", "泣", "叫", "啕", "咷") or before(L, "悲", "哀", "怒", "呼", "啼", "长"):
        return "háo"
    return None


def r_hua(L, R):
    if after(R, "山", "阴", "岳"):
        return "huà"
    return None


def r_zhong(L, R):
    if before(L, "射", "命", "不", "言", "切", "屡") and after(R, "", "的", "之", "其", "矢", "鹄") and not after(R, "国", "原", "山", "流"):
        if before(L, "不") and not after(R, "的", "矢", "鹄", "节", "规", "绳", "度", "程", "式"):
            return None
        return "zhòng"
    if after(R, "矢", "流矢", "毒", "伤", "风", "暑", "的", "节", "肯", "选", "绳"):
        return "zhòng"
    return None


def r_shu(L, R):
    if after(R, "罟"):
        return "cù"
    if before(L, "胜", "可", "历", "不可胜", "屈指", "悉") and (end(R) or after(R, "也", "矣", "之")):
        return "shǔ"
    if after(R, "有所"):
        return None
    if after(R, "被", "见", "谏", "言", "请", "使", "犯", "败", "战", "过", "挑", "有", "至", "召", "称") and not before(L, "无", "其", "之", "多", "少", "计", "术", "命", "天", "礼", "度", "算", "常", "定", "岁", "年", "日", "月"):
        return "shuò"
    return None


def r_duo(L, R):
    if before(L, "节", "制", "法", "大", "态", "气", "风", "用", "尺", "长", "高", "程", "限", "年", "无", "调", "国", "宏", "器"):
        return None
    if after(R, "德", "其", "之", "己", "长短", "情", "势", "地") or before(L, "揣", "忖", "审", "量", "测", "自", "臆"):
        return "duó"
    return None


def r_xiu(L, R):
    if before(L, "星", "列", "八", "辰"):
        return "xiù"
    return None


def r_she(L, R):
    if after(R, "人", "于", "弟", "馆"):
        return "shè"
    if before(L, "客", "传", "馆", "宿", "三", "田", "庐", "邻", "精", "旅", "屋", "房", "寒", "学", "官", "茅", "村", "邸", "所", "就", "止", "郡", "庐"):
        return "shè"
    return None


def r_ying(L, R):
    if after(R, "声", "之", "对", "答", "接", "时", "召", "试", "诏", "募", "手", "门", "命", "曰", "天", "弦", "物", "变", "节", "和", "酬", "制") or before(L, "响", "报", "呼", "相", "感", "供", "反", "答", "因", "顺", "照", "策", "内", "不"):
        if before(L, "不") and not after(R, "声", "之", "对", "答", "召", "命", "诏"):
            return None
        return "yìng"
    return None


def r_zhong_zhong(L, R):  # 种 zhòng
    if after(R, "树", "植", "田", "豆", "瓜", "菊", "桃", "竹", "柳", "花", "麦", "禾", "桑") or before(L, "耕", "播", "栽", "手", "亲", "移", "新"):
        return "zhòng"
    return None


def r_ji(L, R):  # 几 jī
    if after(R, "乎", "希", "微", "殆", "于", "及", "危") or before(L, "庶", "知", "见"):
        return "jī"
    return None


def r_zang(L, R):
    if before(L, "宝", "大", "西", "府", "五", "道", "经", "三", "库") and not after(R, "于", "之", "其", "身"):
        return "zàng"
    return None


def r_tiao(L, R):
    if after(R, "和", "理", "琴", "笑", "弄", "素", "护", "养", "停", "鼎", "味", "饪", "治", "剂", "适", "息", "戏", "谐", "燮") or before(L, "协", "燮"):
        return "tiáo"
    return None


def r_zhi(L, R):  # 识 zhì
    if before(L, "默而", "强", "博闻强", "标", "款", "志", "谨", "多", "表") or (after(R, "之") and before(L, "而", "默")):
        return "zhì"
    return None


def r_geng(L, R):
    if before(L, "三", "五", "二", "四", "初", "残", "深", "变", "一", "迭", "少", "不可"):
        return None
    if after(R, "加", "上", "进", "无", "有", "是", "欲", "觉", "多", "深", "难", "能", "不", "胜", "在", "须", "复", "自", "何", "谁", "莫", "绝", "非", "当", "隔"):
        return "gèng"
    return None


def r_xu(L, R):  # 畜 xù
    if after(R, "妻", "养", "牧", "其", "鸡") or before(L, "以", "仁", "可"):
        return "xù"
    return None


def r_jiao(L, R):
    if before(L, "睡", "一", "午", "梦", "晓") and not after(R, "悟", "察", "得", "其", "知", "者"):
        return "jiào"
    return None


def r_yu_yu2(L, R):  # 与 yù / yú
    if after(R, "闻", "焉", "于其", "政") or before(L, "参", "相") and after(R, "焉"):
        return "yù"
    if after(R, "？", "！", "?", "!") and not before(L, "相", "授", "赐", "给", "交", "参", "孰", "所", "不", "宁", "将", "其", "弗", "愿"):
        return "yú"
    return None


def r_wei(L, R):  # 为 wèi
    if before(L, "以", "自", "所", "何", "可", "不可", "能", "孰", "是", "化", "又", "作", "难", "易", "之", "其", "名", "号", "谓", "者", "必", "将", "当", "宜", "乃", "则", "实", "皆", "即", "当", "为", "尚", "终", "竟", "犹", "遂", "或", "虽", "曾"):
        return None
    if after(R, "我", "吾", "汝", "尔", "子孙", "天下所", "人谋", "民请", "之动", "之变", "之泣", "之流", "之谋", "之请", "之辞", "之语", "之言", "之说", "之计", "之传", "之歌", "之赋", "之记", "之一", "之色", "之下", "之泪", "之叹", "之惜", "之惧", "之喜", "之忧", "之悲", "之哭", "之怒", "之奈何", "其", "了") and not after(R, "其所", "其人", "其国", "其君", "我所", "汝家", "吾家", "尔宰", "之下", "其徒", "子孙业"):
        if after(R, "之奈何"):
            return None
        if after(R, "我", "吾", "汝", "尔") and len(R) > 1 and R[1] in "者之所，。！？":
            return None
        return "wèi"
    return None


def r_jiang(L, R):  # 将 jiàng
    if after(R, "军") and not before(L, "大", "为", "上", "偏", "裨", "骠骑", "车骑", "前", "后", "左", "右"):
        return None
    if before(L, "为", "大", "诸", "裨", "名", "良", "上", "偏", "别", "骁", "副", "主", "故", "宿", "老", "猛", "勇", "部", "败", "斩", "降", "其", "之", "武", "守", "边", "虎", "战", "爱", "拜", "遣", "选", "命", "乃", "将", "宁") and after(R, "军", "领", "士", "帅", "兵", "，", "。", "；", "也", "者", "之", "相", "率", "吏", "校", "卒", "曰", "皆", "数", "以"):
        if before(L, "乃", "宁") and not after(R, "兵", "军"):
            return None
        if before(L, "其", "之") and not after(R, "军", "士", "帅", "兵", "吏", "卒", "校"):
            return None
        return "jiàng"
    if after(R, "兵", "帅", "士", "校", "领", "相", "卒", "吏") and not before(L, "必", "又", "且", "日", "终", "犹", "亦", "乃", "相"):
        if after(R, "相") and not before(L, "入", "出", "为", "拜"):
            return None
        return "jiàng"
    return None


def r_sheng(L, R):  # 乘 shèng
    if before(L, "百", "千", "万", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "两", "数", "之", "大") and not after(R, "车", "舟", "马", "船", "风", "势", "胜", "间", "其", "之", "传", "坚", "城", "肥", "云", "龙", "鹤", "月", "兴", "醉", "凉"):
        if before(L, "之", "大") and not after(R, "之", "，", "。"):
            return None
        if before(L, "之", "大") and not before(L, "万乘之", "千乘之", "百乘之"):
            return None
        return "shèng"
    if after(R, "之国", "之君", "之主", "之家", "之尊") and before(L, "万", "千", "百"):
        return "shèng"
    return None


def r_wang(L, R):
    if after(R, "天下", "关中", "诸侯", "其地", "于天下", "者") and before(L, "而", "以", "欲", "可", "能", "将", "不", "得", "必", "遂", "乃"):
        return "wàng"
    return None


def r_ling(L, R):
    if after(R, "狐"):
        return "líng"
    return None


def r_hang(L, R):
    if after(R, "伍", "列", "阵") or before(L, "雁", "成", "数", "一", "两", "行"):
        if before(L, "行"):
            return "háng" if after(R, "，", "。") else None
        return "háng"
    return None


def r_chu(L, R):  # 处 chǔ
    if after(R, "士", "之", "于", "其", "事", "置", "死", "世") or before(L, "相", "出", "居", "安", "所以", "共", "独", "久", "身"):
        if before(L, "何", "其", "此", "彼", "无", "深", "高", "到", "去", "归", "住", "好", "妙", "绝", "佳", "险", "胜", "长", "短", "多", "少", "一", "二", "三", "两", "几", "妙", "难", "易", "所"):
            return None
        return "chǔ"
    return None


RULES = {
    "夫": r_fu, "还": r_huan, "说": r_shuo, "乐": r_yue_le, "好": r_hao, "恶": r_e, "少": r_shao, "长": r_zhang,
    "相": r_xiang, "间": r_jian_mid, "难": r_nan, "朝": r_chao, "降": r_xiang_jiang, "重": r_chong, "传": r_zhuan,
    "冠": r_guan, "衣": r_yi_yi, "予": r_yu_yu, "曾": r_ceng, "被": r_bei, "强": r_qiang, "观": r_guan_guan,
    "号": r_hao_hao, "华": r_hua, "中": r_zhong, "数": r_shu, "度": r_duo, "宿": r_xiu, "舍": r_she, "应": r_ying,
    "种": r_zhong_zhong, "几": r_ji, "藏": r_zang, "调": r_tiao, "识": r_zhi, "更": r_geng, "畜": r_xu, "觉": r_jiao,
    "与": r_yu_yu2, "为": r_wei, "将": r_jiang, "乘": r_sheng, "王": r_wang, "令": r_ling, "行": r_hang, "处": r_chu,
}

# 个别篇目逐条定音：（篇 id 前缀或 "*"，上下文片段，片段中第几字，读音）
SPOT = [
    ("*", "智者乐也", 2, "yào"),
    ("*", "仁者乐也", 2, "yào"),
]
try:
    from prose_spot_review import SPOT_REVIEW
except ImportError:
    from scripts.prose_spot_review import SPOT_REVIEW
SPOT += SPOT_REVIEW


SKIP = ["夫问其故"]


def fix_tokens(tokens: list[dict], log: list | None = None) -> int:
    """按上下文给 py 为空的字定音。tokens 每个只含一个字（标点 punct=True）。"""
    seq = "".join(t.get("s", t["t"]) for t in tokens)
    n = 0
    pos = 0
    for t in tokens:
        s = t.get("s", t["t"])
        if not t.get("punct") and len(s) == 1 and not t.get("py"):
            fn = RULES.get(s)
            if fn and any(seq.find(k, max(0, pos - len(k) + 1)) in range(max(0, pos - len(k) + 1), pos + 1) for k in SKIP if s in k):
                fn = None
            if fn:
                py = fn(seq[max(0, pos - 6):pos], seq[pos + 1:pos + 7])
                if py:
                    t["py"] = py
                    n += 1
                    if log is not None:
                        log.append((seq[max(0, pos - 6):pos], s, seq[pos + 1:pos + 7], py))
        pos += len(s)
    for _, ctx, at, py in SPOT:
        start = 0
        while (i := seq.find(ctx, start)) >= 0:
            j = i + at
            p = 0
            for t in tokens:
                ln = len(t.get("s", t["t"]))
                if p == j and ln == 1 and t.get("py") != py:
                    t["py"] = py
                    n += 1
                    if log is not None:
                        log.append((seq[max(0, j - 6):j], t.get("s"), seq[j + 1:j + 7], py))
                p += ln
            start = i + 1
    return n
