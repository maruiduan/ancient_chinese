# 拼音闯关（www.lucca.top/pinyin/index.html）

源文件在 `src/`，生成的静态页在 `www/pinyin/`，由 `.github/workflows/publish-pinyin.yml` 上传到 `lucca-www/pinyin/`。

## 题库
- 音节表：Unihan `kTGHZ2013`（《通用规范汉字字典》，覆盖 8105 字），共 1296 个带调音节（409 个音节）。
- 题库收 1242 个带调音节、401 个音节。没收：34 个轻声、ê/m/n/ng 叹词音节、无录音的 yō，以及 `excluded_verify.json` 里核对没通过的 10 个。

## 玩法（第二版）
- **拼音认字**：挖开矿石，露出一个多半还不认识的常用字和它的拼音，孩子自己读出来；可以点音符听录音对照（录音只是参考），再点绿勾或红叉自评。从露出到第一次操作（点喇叭或判对错）的时间算反应时间；先听了录音再判对的不算「快」。每局前两题是只有拼音的热身。
- **按音找字**：看拼音、自动播读音，从 4 个字里点出对的。干扰字是读音相近（声调、前后鼻音、平翘舌、b/d 等）或同声旁的字，答完再播一遍读音。
- **气球闯关**：只出按音找字题。小人挂在气球上慢慢往下飘、气球慢慢瘪，时间到前点中对的字的气球就跳上去；点错这个气球会破、扣一颗心（同一题只扣一次，还能接着找），超时小人撑伞落地。每关 6 题，一关比一关快（10 秒到 4.2 秒），3 颗心，一次最多约 4.5 分钟。
- 三种玩法都写进同一套掌握度（石头→铁→金→钻石）和间隔复习，爸爸抽查读错会退回铁。存档 key 仍是 `lucca-pinyin-v1`，`v:2`；第一版「听音选拼音」的记录换算不了，原样移到 `legacy` 字段。

## 字库（scripts/build_chars.py → chars_data.js）
- 读音：Unihan `kTGHZ2013`。只有一个规范读音的字直接用；多音字只在 `kHanyuPinlu` 里这个读音占八成（认字）或九成（找字）以上时才用。
- 范围：`kTGH` 一级字（3500 常用字）。认字用孩子课本字表（人教版一年级、二年级上册，见 child-literacy 的 char_lists）以外的字；找字的正确答案只用课本里学过的字，干扰字优先也用学过的字。
- 干扰字一律排除任何读音里含目标音节的字（多音字不会出现两个对的答案）；同声旁的「字形相近」干扰字依据 `kPhonetic`，且要和目标音节同声母或同韵母。
- 覆盖：886 个带调音节有认字用字，668 个有找字题，169 个只能做纯拼音热身。

## 读音核对（scripts/）
1. `prep_audio.py`：裁静音、统一音量。
2. `asr_sv.py`、`asr_pf.py`、`score_asr.py`：SenseVoice 和 Paraformer 两套识别，看识别出的字能不能读成目标音节。
3. `ctc_score2.py`、`contrast.py`：同一朗读者的易混对（b/d、z/zh、n/l、an/ang、声调等）做 CTC 对比，目标录音应比对方录音更像目标。
4. `f0_praat.py`、`tone_cls.py`：Praat 声调曲线加交叉验证分类，和标注声调对比；不一致的逐个看了曲线。
结果见 `verification_report.json`。

## 重新生成
在工作目录准备好 audio-cmn 的 `64k/syllabs`、Unihan、Commons 替换录音后，依次运行 `syllables.py`、`prep_audio.py`、`build_data.py`、`build_chars.py`、`build_site.py`，再把 `site/pinyin/` 复制到 `www/pinyin/`。
