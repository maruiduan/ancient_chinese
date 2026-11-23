# 拼音闯关（www.lucca.top/pinyin/）

源文件在 `src/`，生成的静态页在 `www/pinyin/`，由 `.github/workflows/publish-pinyin.yml` 上传到 `lucca-www/pinyin/`。

## 题库
- 音节表：Unihan `kTGHZ2013`（《通用规范汉字字典》，覆盖 8105 字），共 1296 个带调音节（409 个音节）。
- 题库收 1242 个带调音节、401 个音节。没收：34 个轻声、ê/m/n/ng 叹词音节、无录音的 yō，以及 `excluded_verify.json` 里核对没通过的 10 个。

## 读音核对（scripts/）
1. `prep_audio.py`：裁静音、统一音量。
2. `asr_sv.py`、`asr_pf.py`、`score_asr.py`：SenseVoice 和 Paraformer 两套识别，看识别出的字能不能读成目标音节。
3. `ctc_score2.py`、`contrast.py`：同一朗读者的易混对（b/d、z/zh、n/l、an/ang、声调等）做 CTC 对比，目标录音应比对方录音更像目标。
4. `f0_praat.py`、`tone_cls.py`：Praat 声调曲线加交叉验证分类，和标注声调对比；不一致的逐个看了曲线。
结果见 `verification_report.json`。

## 重新生成
在工作目录准备好 audio-cmn 的 `64k/syllabs`、Unihan、Commons 替换录音后，依次运行 `syllables.py`、`prep_audio.py`、`build_data.py`、`build_site.py`，再把 `site/pinyin/` 复制到 `www/pinyin/`。
