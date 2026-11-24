/* LuccaPinyinRules — spelling marks, 整体认读 / 三拼 / 虚词 tags.
 * Small data module only. Does not include question banks or progress.
 */
(function (root) {
'use strict';
var MARKS = { a: 'āáǎà', e: 'ēéěè', i: 'īíǐì', o: 'ōóǒò', u: 'ūúǔù', 'ü': 'ǖǘǚǜ' };
function mark(b, t) {
  var s = String(b || '').replace(/v/g, 'ü'), idx;
  if (s.indexOf('a') >= 0) idx = s.indexOf('a');
  else if (s.indexOf('e') >= 0) idx = s.indexOf('e');
  else if (s.indexOf('ou') >= 0) idx = s.indexOf('o');
  else { idx = -1; for (var i = 0; i < s.length; i++) if ('aeiouü'.indexOf(s[i]) >= 0) idx = i; }
  if (idx < 0 || !t) return s;
  return s.slice(0, idx) + MARKS[s[idx]][t - 1] + s.slice(idx + 1);
}
var WHOLE = 'zhi chi shi ri zi ci si yi wu yu ye yue yuan yin yun ying'.split(' ');
var THREE = ['ia', 'ua', 'uo', 'iao', 'uai', 'ian', 'uan', 'van', 'iang', 'uang', 'iong'];
var FUNC = '啊呀呢吧吗嘛哦哇的地得了着过这那哪谁什么怎就都还也才又再把被给跟和从向对在不没很太最比因为所以但可如果';
var FW_SYL = ["a1", "ba3", "bei4", "bi3", "bu4", "cai2", "cong2", "dan4", "de2", "di4", "dou1", "dui4", "gei3", "gen1", "guo3", "guo4", "hai2", "he2", "hen3", "jiu4", "ke3", "mei2", "na3", "na4", "ru2", "shen2", "shui2", "suo3", "tai4", "wa1", "xiang4", "ya1", "ye3", "yi3", "yin1", "you4", "zai4", "zen3", "zhe4", "zui4"];
var CAT_NAME = { zt: '整体认读', sp: '三拼音节', nasal: '前后鼻韵母', fu: '复韵母', dan: '单韵母两拼', fw: '虚词小词' };
var INI = ['zh', 'ch', 'sh', 'b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'q', 'x', 'r', 'z', 'c', 's', 'y', 'w'];
function split(base) {
  var b = String(base || '');
  for (var i = 0; i < INI.length; i++) if (b.indexOf(INI[i]) === 0 && b.length > INI[i].length) return { i: INI[i], f: b.slice(INI[i].length) };
  return { i: '', f: b };
}
function isWhole(base) { return WHOLE.indexOf(base) >= 0; }
function isSanpin(initial, final) {
  return THREE.indexOf(final) >= 0 && initial && initial !== 'y' && initial !== 'w';
}
function isFunctionSyllable(key) { return FW_SYL.indexOf(key) >= 0; }
function isFunctionChar(c) { return FUNC.indexOf(c) >= 0; }
function cat(base, initial, final) {
  var s = split(base); initial = initial || s.i; final = final || s.f;
  if (isWhole(base)) return 'zt';
  if (isSanpin(initial, final)) return 'sp';
  if (/n$|ng$/.test(final)) return 'nasal';
  if (THREE.indexOf(final) >= 0 || ['ai', 'ei', 'ui', 'ao', 'ou', 'iu', 'ie', 've', 'er'].indexOf(final) >= 0) return 'fu';
  return 'dan';
}
function tags(info) {
  info = info || {};
  var base = info.base || (info.audioKey ? String(info.audioKey).replace(/[1-5]$/, '') : '');
  var initial = info.initial, final = info.final, key = info.audioKey || (base && info.tone != null ? base + info.tone : '');
  var out = [];
  if (isWhole(base)) out.push({ id: 'zt', name: CAT_NAME.zt });
  if (isSanpin(initial || split(base).i, final || split(base).f)) out.push({ id: 'sp', name: CAT_NAME.sp });
  if (key && isFunctionSyllable(key)) out.push({ id: 'fw', name: CAT_NAME.fw });
  else if (info.hanzi && String(info.hanzi).split('').some(isFunctionChar)) out.push({ id: 'fw', name: CAT_NAME.fw });
  return out;
}
root.LuccaPinyinRules = {
  version: 1,
  mark: mark,
  WHOLE: WHOLE,
  THREE: THREE,
  FUNC: FUNC,
  FW_SYL: FW_SYL,
  CAT_NAME: CAT_NAME,
  split: split,
  isWhole: isWhole,
  isSanpin: isSanpin,
  isFunctionSyllable: isFunctionSyllable,
  isFunctionChar: isFunctionChar,
  cat: cat,
  tags: tags
};
})(typeof window !== 'undefined' ? window : this);
