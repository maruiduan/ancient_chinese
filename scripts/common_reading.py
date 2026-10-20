# -*- coding: utf-8 -*-
"""字头默认读音：取现代通用的首读，而不是《说文》数据里的古音或又音。

《说文》数据的 pinyin 常是罕用读音（不 fǒu、便 pián、數 shǔ、間 jiàn……），
站内没有逐句注音的字会直接显示这个读音。这里改用 pypinyin 单字表的首个读音
（按现代使用频率排列，与《通用规范汉字表》主读基本一致）。说文读音另存 pySw。
"""

from __future__ import annotations

import unicodedata

from opencc import OpenCC
from pypinyin import Style, pinyin

_T2S = OpenCC("t2s")

# 古文里明显更常见、而 pypinyin 首读偏向现代口语或轻声的字。
OVERRIDES = {
    "为": "wéi", "爲": "wéi", "為": "wéi",
    "子": "zǐ", "了": "liǎo", "什": "shí", "似": "sì",
    "著": "zhù", "那": "nà", "么": "me", "麼": "me",
    # pypinyin 首读不是常用音、或古文里另一读远为常见的字
    "乾": "gān", "长": "cháng", "長": "cháng", "薄": "bó", "差": "chā",
    "都": "dū", "没": "mò", "沒": "mò", "更": "gēng", "斗": "dǒu",
    "彊": "qiáng", "颇": "pō", "頗": "pō", "给": "jǐ", "給": "jǐ",
    "鹄": "hú", "鵠": "hú", "俟": "sì", "貉": "hé", "勒": "lè",
    "揣": "chuǎi", "琢": "zhuó", "嫚": "màn", "髮": "fà", "发": "fā",
    "甸": "diàn", "倒": "dǎo", "掖": "yè", "缝": "féng", "縫": "féng",
    "啜": "chuò", "塞": "sài", "扛": "gāng", "繰": "zǎo", "楯": "shǔn", "茸": "róng", "干": "gān", "阿": "ē", "逮": "dài", "辟": "bì",
    "贾": "gǔ", "賈": "gǔ", "率": "shuài", "累": "lěi", "燕": "yān",
}


def norm(py: str) -> str:
    return (py or "").replace("\u0261", "g").replace("\u014b", "ng").strip()


def _valid(py: str) -> bool:
    base = unicodedata.normalize("NFD", py)
    return bool(py) and all(c.isascii() and c.isalpha() or unicodedata.combining(c) for c in base)


def _toned(py: str) -> bool:
    return any(unicodedata.combining(c) for c in unicodedata.normalize("NFD", py))


def candidates(ch: str) -> list[str]:
    out: list[str] = []
    for form in (ch, _T2S.convert(ch)):
        got = pinyin(form, style=Style.TONE, heteronym=True, errors="ignore")
        for py in (got[0] if got else []):
            if _valid(py) and py not in out:
                out.append(py)
    return out


def common_py(ch: str, shuowen_py: str = "") -> str:
    """返回该字的常用读音；查不到时退回说文读音。"""
    if ch in OVERRIDES:
        return OVERRIDES[ch]
    s = _T2S.convert(ch)
    if s in OVERRIDES:
        return OVERRIDES[s]
    sw = norm(shuowen_py)
    # 简体形的首读优先（繁体字形在 pypinyin 里常只收古音）
    first = ""
    for form in (s, ch):
        got = pinyin(form, style=Style.TONE, heteronym=True, errors="ignore")
        for py in (got[0] if got else []):
            if _valid(py) and _toned(py):
                first = py
                break
        if first:
            break
    return first or sw
