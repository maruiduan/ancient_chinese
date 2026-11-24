(function () {
'use strict';
/* ========== 基础 ========== */
var $ = function (s, r) { return (r || document).querySelector(s); };
var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
function rnd(n) { return Math.floor(Math.random() * n); }
function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function pick(a) { return a[rnd(a.length)]; }
function dayNum(d) { d = d || new Date(); return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000); }
function dayStr(n) { var d = new Date(n * 86400000); return (d.getUTCMonth() + 1) + '/' + d.getUTCDate(); }
var FAST_MS = 3000, STREAK = 3; // 看到题目后 3 秒内答对算「熟练」

/* ========== 音节数据 ========== */
var BASES = window.PY.bases, SYL = {}, KEYS = [], BASE = {};
BASES.forEach(function (b) {
  BASE[b.b] = b;
  b.t.forEach(function (t) {
    var k = b.b + t;
    SYL[k] = { k: k, b: b.b, t: t, i: b.i, f: b.f, w: b.w, h: b.h[t], r: b.r[t], c: b.c[t] };
    KEYS.push(k);
  });
});
var TOTAL = KEYS.length;
var MARKS = { a: 'āáǎà', e: 'ēéěè', i: 'īíǐì', o: 'ōóǒò', u: 'ūúǔù', 'ü': 'ǖǘǚǜ' };
function mark(b, t) {
  var s = b.replace(/v/g, 'ü'), idx;
  if (s.indexOf('a') >= 0) idx = s.indexOf('a');
  else if (s.indexOf('e') >= 0) idx = s.indexOf('e');
  else if (s.indexOf('ou') >= 0) idx = s.indexOf('o');
  else { idx = -1; for (var i = 0; i < s.length; i++) if ('aeiouü'.indexOf(s[i]) >= 0) idx = i; }
  if (idx < 0 || !t) return s;
  return s.slice(0, idx) + MARKS[s[idx]][t - 1] + s.slice(idx + 1);
}
function label(k) { var s = SYL[k]; return mark(s.b, s.t); }
var FIN_NAME = { v: 'ü', ve: 'üe', vn: 'ün', van: 'üan' };
function finName(f) { return FIN_NAME[f] || f; }
var TONE_NAME = ['', '一声', '二声', '三声', '四声'];

/* ========== 像素贴图（全部由程序画，16×16） ========== */
function seeded(seed) { var s = (seed >>> 0) || 1; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function makeCanvas(w, h) { var c = document.createElement('canvas'); c.width = w || 16; c.height = h || w || 16; return c; }
function px(g, x, y, col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); }
function wpick(rand, pal) { var r = rand(), a = 0; for (var i = 0; i < pal.length; i++) { a += pal[i][1]; if (r < a) return pal[i][0]; } return pal[0][0]; }
var STONE = [['#808080', .46], ['#747474', .2], ['#8c8c8c', .17], ['#6a6a6a', .1], ['#999999', .07]];
function stoneTex(g, rand, pal, w, h) {
  w = w || 16; h = h || 16; pal = pal || STONE;
  for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) px(g, x, y, wpick(rand, pal));
  // 几道浅浅的裂纹和亮斑，让石头有层次
  for (var n = 0; n < 6; n++) {
    var x0 = Math.floor(rand() * w), y0 = Math.floor(rand() * h), len = 2 + Math.floor(rand() * 3), dark = n % 2;
    for (var i = 0; i < len; i++) px(g, (x0 + i) % w, y0, dark ? 'rgba(70,70,70,.55)' : 'rgba(170,170,170,.45)');
  }
}
var ORES = {
  diamond: ['#d8fffb', '#5decf5', '#1aaebd', '#0d6f78'], gold: ['#fffbd0', '#fce34b', '#d9a90a', '#8a6a05'], emerald: ['#d8ffe6', '#41f384', '#11a947', '#08632a'],
  redstone: ['#ffd0c8', '#ff3a26', '#b50f04', '#6a0702'], lapis: ['#cdd9ff', '#3d6bea', '#1b3a9a', '#0e2060'], iron: ['#fff1e2', '#e6c3a2', '#b88a62', '#6e5038'], copper: ['#ffe0cc', '#e7864f', '#ad5124', '#6b3115']
};
var ORE_NAMES = ['diamond', 'gold', 'emerald', 'redstone', 'lapis', 'iron', 'copper'];
var BLOBS = [['.xx', 'xxx', 'xx.'], ['xx.', 'xxx', '.x.'], ['.x.', 'xxx', '.xx'], ['xx', 'xx'], ['.xx.', 'xxxx', '.xx.']];
var texCache = {};
function oreTex(name, seed) {
  var key = name + seed; if (texCache[key]) return texCache[key];
  var c = makeCanvas(), g = c.getContext('2d'), rand = seeded(seed * 7919 + name.length * 131);
  stoneTex(g, rand);
  var col = ORES[name], spots = [[2, 2], [9, 1], [1, 9], [10, 8], [5, 12], [6, 5], [12, 12]];
  for (var i = spots.length - 1; i > 0; i--) { var j = Math.floor(rand() * (i + 1)), t = spots[i]; spots[i] = spots[j]; spots[j] = t; }
  spots.slice(0, 5).forEach(function (s, n) {
    var b = BLOBS[Math.floor(rand() * BLOBS.length)], ox = s[0] + Math.floor(rand() * 2), oy = s[1] + Math.floor(rand() * 2);
    b.forEach(function (row, y) { for (var x = 0; x < row.length; x++) if (row[x] === 'x') {
      var X = ox + x, Y = oy + y; if (X > 15 || Y > 15) continue;
      var tone = (x + y === 0 || (y === 0 && x === 1)) ? 0 : (y === b.length - 1 || x === row.length - 1) ? 2 : 1;
      px(g, X, Y, col[tone]);
      if (Y + 1 < 16 && (y === b.length - 1 || b[y + 1][x] !== 'x')) px(g, X, Y + 1, col[3]);
    } });
  });
  return (texCache[key] = c.toDataURL());
}
function solidTex(key, base, hi, lo, edge) {
  if (texCache[key]) return texCache[key];
  var c = makeCanvas(), g = c.getContext('2d'), rand = seeded(key.length * 977);
  stoneTex(g, rand, base);
  g.fillStyle = hi; g.fillRect(0, 0, 16, 1); g.fillRect(0, 0, 1, 16);
  g.fillStyle = lo; g.fillRect(0, 15, 16, 1); g.fillRect(15, 0, 1, 16);
  if (edge) { g.fillStyle = edge; g.fillRect(2, 2, 12, 1); g.fillRect(2, 2, 1, 12); g.fillStyle = lo; g.fillRect(3, 13, 11, 1); g.fillRect(13, 3, 1, 11); }
  return (texCache[key] = c.toDataURL());
}
function blockTex(level) {
  if (level === 0) { if (texCache.lv0) return texCache.lv0; var c = makeCanvas(), g = c.getContext('2d'); stoneTex(g, seeded(97)); return (texCache.lv0 = c.toDataURL()); }
  if (level === 1) return solidTex('lv1', [['#dcdcdc', .5], ['#cfcfcf', .25], ['#e8e8e8', .2], ['#bdbdbd', .05]], '#ffffff', '#8f8f8f', '#f4f4f4');
  if (level === 2) return solidTex('lv2', [['#fadb3c', .5], ['#f2c623', .25], ['#ffec7a', .2], ['#dcae12', .05]], '#fff8b8', '#a77e00', '#fff19a');
  return solidTex('lv3', [['#5ee9df', .5], ['#45d6cc', .25], ['#8ff6ef', .2], ['#2fb8ae', .05]], '#d8fffb', '#16857e', '#b5fff9');
}
function grassTex() {
  if (texCache.grass) return texCache.grass;
  var c = makeCanvas(), g = c.getContext('2d'), rand = seeded(41);
  stoneTex(g, rand, [['#8b6340', .45], ['#7a5436', .25], ['#9c7350', .2], ['#5f402a', .1]]);
  var drip = [3, 4, 3, 5, 4, 3, 4, 6, 3, 4, 5, 3, 4, 3, 5, 4];
  for (var x = 0; x < 16; x++) for (var y = 0; y < drip[x]; y++) px(g, x, y, wpick(rand, [['#6fb83f', .45], ['#5da332', .3], ['#86cc52', .2], ['#4d8a28', .05]]));
  return (texCache.grass = c.toDataURL());
}
function dirtTex() {
  if (texCache.dirt) return texCache.dirt;
  var c = makeCanvas(), g = c.getContext('2d'); stoneTex(g, seeded(43), [['#8b6340', .45], ['#7a5436', .25], ['#9c7350', .2], ['#5f402a', .1]]);
  return (texCache.dirt = c.toDataURL());
}
function plankTex() {
  if (texCache.plank) return texCache.plank;
  var c = makeCanvas(), g = c.getContext('2d'), rand = seeded(59);
  stoneTex(g, rand, [['#c29d62', .5], ['#b48f56', .3], ['#cfab70', .2]]);
  g.fillStyle = '#8f6c3b';
  [3, 7, 11, 15].forEach(function (y) { g.fillRect(0, y, 16, 1); });
  [[5, 0], [12, 4], [2, 8], [9, 12]].forEach(function (p) { g.fillRect(p[0], p[1], 1, 3); });
  return (texCache.plank = c.toDataURL());
}
var SPR = {
  pickaxe: ['................', '....kkkkkk......', '...kcccccCk.....', '....kkkkkCCk....', '........kdCk....', '.......khkdCk...',
    '......khk.kdk...', '.....khk...kk...', '....khk.........', '...khk..........', '..khk...........', '.khk............', 'khk.............', 'kk..............', '................', '................'],
  diamond: ['................', '......kkkk......', '....kkwcccCk....', '...kwwcccccCk...', '..kwcccccccCCk..', '.kcccccccccCCCk.', 'kccccccccccCCCCk', 'kCcccccccccCCCdk',
    '.kCccccccccCCdk.', '..kCcccccccCdk..', '...kCcccccCdk...', '....kCcccCdk....', '.....kCccdk.....', '......kCdk......', '.......kk.......', '................'],
  heart: ['................', '..kkk....kkk....', '.krrrk..krrrk...', 'krwrrrkkrrrrrk..', 'krwrrrrrrrrrrk..', 'krrrrrrrrrrrRk..', '.krrrrrrrrrRk...', '..krrrrrrrRk....', '...krrrrrRk.....', '....krrrRk......', '.....krRk.......', '......kk........'],
  house: ['................', '.......kk.......', '......krrk......', '.....krrrrk.....', '....krrrrrrk....', '...krrrrrrrrk...', '..kkkkkkkkkkkk..', '...kppppppppk...', '...kpwwpppddk...', '...kpwwpppddk...', '...kppppppddk...', '...kppppppddk...', '...kkkkkkkkkk...'],
  map: ['................', '..kkkkkkkkkkkk..', '..kpppppppppPk..', '..kpgggpppbbPk..', '..kpggpppbbbPk..', '..kppprrpbbpPk..', '..kpppprrppppk..', '..kpbbpprrpppk..', '..kpbbbppprrPk..', '..kppbppppprPk..', '..kpppppgggpPk..', '..kPPPPPPPPPPk..', '..kkkkkkkkkkkk..'],
  talk: ['................', '...kkkkkkkkkk...', '..kwwwwwwwwwwk..', '.kwwwwwwwwwwwwk.', '.kwwkkwwkkwwkwk.', '.kwwwwwwwwwwwwk.', '.kwwkkkkkkwwwwk.', '..kwwwwwwwwwwk..', '...kkkwwkkkkk...', '.....kwwk.......', '....kwk.........', '....kk..........'],
  book: ['................', '..kkkkkkkkkkk...', '..kRrrrrrrrrrk..', '..kRrwwwwwwrrk..', '..kRrrrrrrrrrk..', '..kRrwwwwwrrrk..', '..kRrrrrrrrrrk..', '..kRrrrrrrrrrk..', '..kRrrrrrrrrrk..', '..kRpppppppppk..', '..kRPPPPPPPPPk..', '..kkkkkkkkkkk...'],
  back: ['................', '................', '.....kk.........', '....kwk.........', '...kwwkkkkkkkk..', '..kwwwwwwwwwwk..', '.kwwwwwwwwwwwk..', '..kwwwwwwwwwwk..', '...kwwkkkkkkkk..', '....kwk.........', '.....kk.........'],
  check: ['................', '.............kk.', '............kgk.', '...........kggk.', '..kk......kggk..', '.kggk....kggk...', '.kgggk..kggk....', '..kgggkkggk.....', '...kggggggk.....', '....kggggk......', '.....kggk.......', '......kk........'],
  cross: ['................', '.kk.........kk..', 'kwwk.......kwwk.', '.kwwk.....kwwk..', '..kwwk...kwwk...', '...kwwk.kwwk....', '....kwwkwwk.....', '.....kwwwk......', '....kwwkwwk.....', '...kwwk.kwwk....', '..kwwk...kwwk...', '.kwwk.....kwwk..', 'kwwk.......kwwk.', '.kk.........kk..'],
  note: ['................', '......kkkkkkk...', '......kwwwwwk...', '......kwkkkwk...', '......kwk.kwk...', '......kwk.kwk...', '......kwk.kwk...', '...kkkkwk.kwk...', '..kwwwwwkkkwk...', '..kwwwwwkwwwk...', '...kkkkkwwwwk...', '........kkkk....'],
  pick: null,
  balloon: ['.....kkkkkk.....', '...kkbbbbbbkk...', '..kbwwbbbbbbbk..', '.kbwwbbbbbbbbBk.', '.kbwbbbbbbbbbBk.', 'kbbbbbbbbbbbbBBk', 'kbbbbbbbbbbbbBBk', 'kbbbbbbbbbbbBBBk',
    'kbbbbbbbbbbbBBBk', '.kbbbbbbbbbBBBk.', '.kBbbbbbbbBBBBk.', '..kBBbbbBBBBBk..', '...kkBBBBBBkk...', '.....kkBBkk.....', '......kbBk......', '.......kk.......'],
  hero: ['.........kk.....', '........kssk....', '........ktTk....', '...kkkkkktTk....', '..knnnnnnktk....', '.knnnnnnnnkk....', '.knnssssnnk.....', '.kssesseessk....',
    '.ksssssssssk....', '..kssmmsssk.....', '..kkttttttkk....', '.kstttttttTsk...', '.kk.ktttTTk.kk..', '....kjjjjjk.....', '....kjjkjjk.....', '....kookook.....'],
  help: ['................', '.....kkkkkk.....', '....kwwwwwwk....', '...kwwkkkkwwk...', '...kkk....kwwk..', '.........kwwk...', '........kwwk....', '.......kwwk.....', '.......kwwk.....', '.......kkkk.....', '................', '.......kwwk.....', '.......kwwk.....', '.......kkkk.....']
};
var SPR_COL = { n: '#5b3a1e', s: '#f1c27d', e: '#27306b', m: '#b5553c', t: '#3fb6c9', T: '#2a8796', j: '#3d4fa3', o: '#4a4a4a', B: '#2f6fbf', k: '#1d1d1d', c: '#5decf5', C: '#2bb9c6', d: '#137c86', w: '#ffffff', h: '#9c6b34', r: '#e0463c', R: '#9b2620', p: '#efe3c8', P: '#c9b38a', g: '#57c23a', b: '#4a8fe0' };
SPR.pick = SPR.pickaxe;
function drawStr(g, rows) { rows.forEach(function (r, y) { for (var x = 0; x < r.length; x++) { var col = SPR_COL[r[x]]; if (r[x] === 'h' && (x + y) % 3 === 0) col = '#6d4720'; if (col) px(g, x, y, col); } }); }
var SPRITES = {
  pickaxe: function (g) { drawStr(g, SPR.pickaxe); },
  diamond: function (g) { drawStr(g, SPR.diamond); },
  noteblock: function (g) {
    stoneTex(g, seeded(5), [['#7b4a2a', .4], ['#8a5532', .3], ['#6c3f22', .2], ['#955f39', .1]]);
    g.fillStyle = '#3a2210'; g.fillRect(0, 0, 16, 1); g.fillRect(0, 15, 16, 1); g.fillRect(0, 0, 1, 16); g.fillRect(15, 0, 1, 16);
    g.fillStyle = '#1b1008'; g.fillRect(5, 3, 1, 8); g.fillRect(5, 3, 6, 1); g.fillRect(10, 3, 1, 7); g.fillRect(3, 10, 3, 2); g.fillRect(8, 9, 3, 2);
  },
  tree: function (g) { // 16×32：树冠 + 树干
    var rand = seeded(77);
    for (var y = 0; y < 18; y++) for (var x = 0; x < 16; x++) {
      var edge = (y < 2 && (x < 3 || x > 12)) || (y > 15 && (x < 2 || x > 13));
      if (!edge) px(g, x, y, wpick(rand, [['#4f9a2c', .4], ['#3f8424', .3], ['#62b23a', .2], ['#2f6a1a', .1]]));
    }
    for (y = 18; y < 32; y++) for (x = 6; x < 10; x++) px(g, x, y, (x === 6 || (y % 4 === 0 && x === 8)) ? '#5a3c1e' : wpick(rand, [['#8a6236', .5], ['#74502b', .5]]));
  }
};
function drawSprites(root) {
  $$('canvas[data-sprite]', root).forEach(function (c) { var g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height); SPRITES[c.dataset.sprite](g); });
}
function spriteURL(name, scale) {
  var k = 'sp' + name + (scale || 1); if (texCache[k]) return texCache[k];
  var s = scale || 1, c = makeCanvas(16 * s), g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.scale(s, s);
  if (SPRITES[name]) SPRITES[name](g); else drawStr(g, SPR[name]);
  return (texCache[k] = c.toDataURL());
}
function drawIcons(root) { $$('.ic[data-ic]', root).forEach(function (e) { e.style.backgroundImage = 'url(' + spriteURL(e.dataset.ic) + ')'; }); }
function drawCrack(c, stage) {
  var g = c.getContext('2d'); g.clearRect(0, 0, 16, 16); g.fillStyle = 'rgba(15,15,15,.8)';
  var lines = [[[7, 7], [8, 7], [8, 8], [7, 9], [9, 6], [6, 6]], [[5, 5], [10, 10], [4, 10], [11, 4], [3, 8], [12, 8], [8, 3], [8, 12], [5, 9], [10, 6]],
    [[2, 2], [13, 13], [2, 13], [13, 2], [1, 7], [14, 7], [6, 1], [9, 14], [3, 5], [12, 11], [1, 11], [14, 4], [11, 1], [4, 14]]];
  for (var s = 0; s <= stage; s++) lines[s].forEach(function (p) { g.fillRect(p[0], p[1], 1, 1); g.fillRect(p[0] + (p[0] < 8 ? 1 : -1), p[1] + (p[1] < 8 ? 1 : 0), 1, 1); });
}
function pickCursor() {
  var u = spriteURL('pickaxe', 2), st = document.createElement('style');
  st.textContent = '.ore,.mc-btn,.cell,.speaker,.site-link{cursor:url(' + u + ') 2 2, pointer}';
  document.head.appendChild(st);
}
function paintWorld() {
  var r = document.documentElement.style;
  r.setProperty('--tex-grass', 'url(' + grassTex() + ')');
  r.setProperty('--tex-dirt', 'url(' + dirtTex() + ')');
  r.setProperty('--tex-plank', 'url(' + plankTex() + ')');
  r.setProperty('--pick-url', 'url(' + spriteURL('pickaxe', 2) + ')');
  r.setProperty('--tex-stone', 'url(' + blockTex(0) + ')');
  r.setProperty('--tex-gold', 'url(' + blockTex(2) + ')');
  r.setProperty('--tex-dia', 'url(' + blockTex(3) + ')');
}

/* ========== 声音 ========== */
var AC = null, bufs = {}, loading = {};
function ctx() { if (!AC) { var C = window.AudioContext || window.webkitAudioContext; AC = new C(); } if (AC.state === 'suspended') AC.resume(); return AC; }
function audioURL(k) { return 'audio/' + k + '.' + SYL[k].h + '.mp3'; }
function loadBuf(k) {
  if (bufs[k]) return Promise.resolve(bufs[k]);
  if (loading[k]) return loading[k];
  loading[k] = fetch(audioURL(k)).then(function (r) { if (!r.ok) throw new Error('audio ' + r.status); return r.arrayBuffer(); })
    .then(function (ab) { return new Promise(function (res, rej) { ctx().decodeAudioData(ab, res, rej); }); })
    .then(function (b) { bufs[k] = b; delete loading[k]; return b; }, function (e) { delete loading[k]; throw e; });
  return loading[k];
}
var speaking = null;
function speak(k) {
  return loadBuf(k).then(function (b) {
    var a = ctx(); if (speaking) { try { speaking.stop(); } catch (e) {} }
    var src = a.createBufferSource(), gn = a.createGain(); gn.gain.value = 1; src.buffer = b; src.connect(gn); gn.connect(a.destination);
    var sp = $$('.speaker'); sp.forEach(function (e) { e.classList.add('playing'); });
    src.onended = function () { if (speaking === src) { speaking = null; sp.forEach(function (e) { e.classList.remove('playing'); }); } };
    speaking = src; src.start();
    return { start: performance.now(), dur: b.duration * 1000 };
  });
}
function tone(freq, dur, type, vol, when, slide) {
  var a = ctx(), o = a.createOscillator(), g = a.createGain(), t = a.currentTime + (when || 0);
  o.type = type || 'square'; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
  g.gain.setValueAtTime(vol || .08, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + .02);
}
function noise(dur, vol, when, hp) {
  var a = ctx(), n = Math.floor(a.sampleRate * dur), b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0);
  for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  var s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(); s.buffer = b; f.type = 'bandpass'; f.frequency.value = hp || 900; g.gain.value = vol || .25;
  s.connect(f); f.connect(g); g.connect(a.destination); s.start(a.currentTime + (when || 0));
}
var SFX = {
  hit: function () { noise(.06, .3, 0, 700); },
  brk: function () { noise(.22, .45, 0, 420); tone(180, .15, 'triangle', .1, 0, 60); },
  gem: function () { tone(988, .09, 'square', .05, .05); tone(1319, .14, 'square', .05, .13); },
  bonk: function () { tone(150, .22, 'square', .07, 0, 90); },
  up: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, .16, 'square', .045, i * .09); }); },
  pop: function () { noise(.08, .35, 0, 1800); tone(620, .12, 'square', .05, 0, 240); },
  combo: function () { [784, 988, 1175].forEach(function (f, i) { tone(f, .1, 'triangle', .07, i * .06); }); }
};

/* ========== 存档 ========== */
var KEY = 'lucca-pinyin-v1', S;
function blank() { return { v: 2, chars: {}, arcade: { best: 0, runs: 0 }, items: {}, gems: 0, place: null, weak: null, days: {}, conf: {}, oral: {}, settings: { size: 10 } }; }
function load() {
  try { S = JSON.parse(localStorage.getItem(KEY)) || blank(); } catch (e) { S = blank(); }
  if (!S.settings) S.settings = { size: 10 };
  ['items', 'days', 'conf', 'oral', 'chars'].forEach(function (k) { S[k] = S[k] || {}; });
  if ((S.v || 1) < 2) { // 第一版是「听音选拼音」，掌握度换成「看拼音读、按音找字」后重新算；旧记录原样留在 legacy 里
    if (Object.keys(S.items).length || S.place) S.legacy = { items: S.items, place: S.place, weak: S.weak, conf: S.conf, gems: S.gems };
    S.items = {}; S.place = null; S.weak = null; S.conf = {}; S.v = 2;
  }
  S.arcade = S.arcade || { best: 0, runs: 0 };
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('进度没存上：浏览器存储已满或被禁用'); } }
function it(k) { return S.items[k] || (S.items[k] = { n: 0, c: 0, st: 0, lv: 0, rt: [] }); }
function lv(k) { var x = S.items[k]; return x ? x.lv : 0; }
function today() { var d = dayNum(); var r = S.days[d] || (S.days[d] = { sec: 0, q: 0, c: 0, oq: 0, oc: 0 }); return r; }

/* 掌握度：石头 0 → 铁 1（答对过）→ 金 2（连续 3 次又快又对）→ 钻石 3（隔天仍答对） */
function record(k, ok, rtMs, fast) {
  var x = it(k), d = dayNum(), before = x.lv;
  x.n++; x.last = Date.now();
  if (ok) {
    x.c++; x.rt.push(Math.round(rtMs)); if (x.rt.length > 6) x.rt.shift();
    x.st = fast ? x.st + 1 : 0;
    if (x.lv < 1) x.lv = 1;
    if (x.lv === 1 && x.st >= STREAK) { x.lv = 2; x.gd = d; }
    else if (x.lv === 2 && d > x.gd) { x.lv = 3; x.iv = 3; x.due = d + 3; }
    else if (x.lv === 3 && d >= (x.due || 0)) { x.iv = Math.min(Math.round((x.iv || 3) * 2.2), 60); x.due = d + x.iv; }
  } else {
    x.st = 0; x.w = (x.w || 0) + 1; x.lw = Date.now();
    if (x.lv >= 2) { x.lv = 1; delete x.gd; delete x.due; }
  }
  var t = today(); t.q++; if (ok) t.c++;
  return { before: before, after: x.lv };
}

/* ========== 出题 ========== */
var INI_ALL = ['b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'q', 'x', 'zh', 'ch', 'sh', 'r', 'z', 'c', 's', 'y', 'w', ''];
function priority(k) {
  var s = SYL[k], w = S.weak, p = 0;
  if (w) { if (w.i.indexOf(s.i) >= 0) p += 2; if (w.f.indexOf(s.f) >= 0) p += 2; if (w.t.indexOf(s.t) >= 0) p += 1; }
  return p;
}
var newOrder = null;
function newList() {
  if (!newOrder) newOrder = KEYS.slice().sort(function (a, b) { return (priority(b) - priority(a)) || (SYL[a].r - SYL[b].r); });
  return newOrder.filter(function (k) { return !S.items[k] || S.items[k].n === 0; });
}
function spaced(list) {
  // 让同一个音节之间至少隔一题
  for (var tries = 0; tries < 30; tries++) {
    shuffle(list); var ok = true;
    for (var i = 1; i < list.length; i++) if (list[i] === list[i - 1]) { ok = false; break; }
    if (ok) return list;
  }
  return list;
}
function buildRound() {
  var size = S.settings.size || 10, d = dayNum(), all = KEYS;
  var next = all.filter(function (k) { var x = S.items[k]; return x && x.lv === 2 && x.gd < d; })
    .sort(function (a, b) { return S.items[a].gd - S.items[b].gd; });
  var spot = all.filter(function (k) { var x = S.items[k]; return x && x.lv === 3 && x.due <= d; })
    .sort(function (a, b) { return S.items[a].due - S.items[b].due; });
  var rev = next.concat(spot).slice(0, Math.min(4, Math.ceil(size * .4)));
  var learning = all.filter(function (k) { var x = S.items[k]; return x && x.n > 0 && x.lv <= 1; })
    .sort(function (a, b) {
      var A = S.items[a], B = S.items[b];
      return (B.st - A.st) || ((A.last || 0) - (B.last || 0));
    });
  var work = learning.slice(0, 6), news = newList(), added = 0;
  while (work.length < 6 && news.length && added < 4) { work.push(news.shift()); added++; }
  var slots = size - rev.length, seq = [];
  if (work.length) {
    var reps = Math.max(1, Math.ceil(slots / work.length));
    for (var r = 0; r < reps; r++) seq = seq.concat(shuffle(work.slice()));
    seq = seq.slice(0, slots);
  }
  if (!seq.length && !rev.length) {
    // 全部练过且没到复查日：从钻石里抽查
    rev = shuffle(all.filter(function (k) { return lv(k) === 3; })).slice(0, size);
  }
  var out = spaced(seq.concat(rev));
  return out.length ? out : shuffle(KEYS.slice()).slice(0, size);
}
var PLACE_N = 60, PLACE_SEG = 10;
function buildPlacement() {
  var pool = KEYS.slice().sort(function (a, b) { return SYL[a].r - SYL[b].r; }).slice(0, 700);
  shuffle(pool);
  var needI = {}, needF = {}, needW = {}, needT = { 1: 12, 2: 12, 3: 12, 4: 12 };
  INI_ALL.forEach(function (i) { if (i) needI[i] = 2; });
  BASES.forEach(function (b) { needF[b.f] = 1; if (b.w) needW[b.b] = 1; });
  var chosen = [], used = {};
  function gain(k) { var s = SYL[k]; return (needI[s.i] > 0 ? 3 : 0) + (needF[s.f] > 0 ? 3 : 0) + (needW[s.b] > 0 ? 3 : 0) + (needT[s.t] > 0 ? 1 : 0) - (used[s.b] ? 5 : 0); }
  function take(k) { var s = SYL[k]; chosen.push(k); used[s.b] = 1; if (needI[s.i]) needI[s.i]--; if (needF[s.f]) needF[s.f]--; if (needW[s.b]) needW[s.b]--; if (needT[s.t]) needT[s.t]--; }
  var full = KEYS.slice();
  while (chosen.length < PLACE_N) {
    var best = null, bg = 0, src = pool;
    for (var i = 0; i < src.length; i++) { if (chosen.indexOf(src[i]) >= 0) continue; var g = gain(src[i]); if (g > bg) { bg = g; best = src[i]; } }
    if (!best) { // 常用池里找不到时，到全表里补（比如少见韵母）
      for (var j = 0; j < full.length; j++) { if (chosen.indexOf(full[j]) >= 0) continue; var g2 = gain(full[j]); if (g2 > bg) { bg = g2; best = full[j]; } }
    }
    if (!best) { best = pool.filter(function (k) { return chosen.indexOf(k) < 0; })[0]; if (!best) break; }
    take(best);
  }
  return shuffle(chosen);
}
function variants(base, t) {
  var b = BASE[base]; if (!b) return null;
  if (b.t.indexOf(t) >= 0) return base + t;
  return base + pick(b.t);
}
function distractors(k) {
  var s = SYL[k], b = BASE[s.b], out = [], labels = {}; labels[label(k)] = 1;
  function add(key, lab) { lab = lab || label(key); if (labels[lab] || out.length >= 3) return; labels[lab] = 1; out.push({ k: key, l: lab }); }
  var toneAlts = shuffle(b.t.filter(function (t) { return t !== s.t; }).map(function (t) { return s.b + t; }));
  var seg = shuffle(Object.keys(b.n).map(function (nb) { return variants(nb, s.t); }).filter(Boolean));
  var fake = null;
  if ('jqxy'.indexOf(s.i) >= 0 && s.i && s.f.charAt(0) === 'v') fake = mark(s.i + 'v' + s.b.slice(s.i.length + 1), s.t);
  var nTone = seg.length ? (Math.random() < .5 ? 1 : 2) : 3;
  if (fake && Math.random() < .35) add(null, fake);
  toneAlts.slice(0, nTone).forEach(function (x) { add(x); });
  seg.forEach(function (x) { add(x); });
  toneAlts.forEach(function (x) { add(x); });
  if (out.length < 3) {
    var near = shuffle(KEYS.filter(function (x) { var y = SYL[x]; return x !== k && (y.i === s.i || y.f === s.f) && y.t === s.t; }));
    near.forEach(function (x) { add(x); });
  }
  while (out.length < 3) add(pick(KEYS));
  return out;
}

/* ========== 画面切换 ========== */
var cur = 'home';
function show(id) {
  $$('.screen').forEach(function (s) { s.hidden = s.id !== id; }); cur = id; window.scrollTo(0, 0);
  if (id === 'home') renderHome(); if (id === 'map') renderMap(); if (id === 'parent') renderParent();
}
function toast(msg) { var t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.h); toast.h = setTimeout(function () { t.hidden = true; }, 2600); }
function modal(html) { $('#modalBody').innerHTML = ''; if (typeof html === 'string') $('#modalBody').innerHTML = html; else $('#modalBody').appendChild(html); $('#modal').hidden = false; }
function closeModal() { $('#modal').hidden = true; }
function counts() { var c = [0, 0, 0, 0]; KEYS.forEach(function (k) { c[lv(k)]++; }); return c; }
function slotHTML(tex, n, cls) { return '<span class="slot ' + (cls || '') + '"><i style="background-image:url(' + tex + ')"></i>' + (n != null ? '<b>' + n + '</b>' : '') + '</span>'; }
function renderHome() {
  var c = counts(), h = $('#homeHint'), lbl = $('#btnPlay .lbl');
  if (!S.place || !S.place.done) { lbl.textContent = S.place ? '继续摸底' : '开始练习'; h.innerHTML = S.place ? segDots(Math.floor(S.place.idx / PLACE_SEG), Math.ceil(S.place.list.length / PLACE_SEG)) : ''; }
  else { lbl.textContent = '开始练习'; h.textContent = ''; }
  var pc = Math.round(1000 * c[3] / TOTAL) / 10;
  $('#homeStats').innerHTML = '<div class="hs-slots">' + slotHTML(blockTex(3), c[3]) + slotHTML(blockTex(2), c[2]) + slotHTML(blockTex(1), c[1]) + '</div>' +
    '<div class="xp home-xp" title="钻石 ' + c[3] + ' / ' + TOTAL + '"><i style="width:' + Math.max(pc, c[3] ? 1 : 0) + '%"></i></div>';
}

/* ========== 字库（拼音认字、按音找字） ========== */
var PYC = window.PYC || { syl: {}, R: {} };
function chInfo(k) { return PYC.syl[k] || {}; }
function hasReading(c, k) { var r = PYC.R[c]; return r ? r.split(',').indexOf(k) >= 0 : false; }
// 拼音认字：挑一个多半还不认识的常用字，见得少的优先
function newChar(k) {
  var u = chInfo(k).u; if (!u) return null;
  var seen = S.chars || {}, arr = u.split('');
  arr.sort(function (a, b) { return ((seen[a] && seen[a].n) || 0) - ((seen[b] && seen[b].n) || 0); });
  return arr[0];
}
// 按音找字：正确的字 + 3 个读音相近（声调、前后鼻音、平翘舌……）或字形相近的字
function findTask(k) {
  var z = chInfo(k).z; if (!z) return null;
  var target = pick(z.split('')), used = {}, out = []; used[target] = 1;
  function add(c, ck) { if (!c || used[c] || out.length >= 3 || hasReading(c, k)) return false; used[c] = 1; out.push({ c: c, k: ck }); return true; }
  function fromSyl(k2) { var d = chInfo(k2).d; if (!d) return; var cs = shuffle(d.split('')); for (var i = 0; i < cs.length; i++) if (add(cs[i], k2)) return; }
  var s = chInfo(k).s; if (s && Math.random() < .6) { var p = pick(s); add(p[0], p[1]); }
  distractors(k).forEach(function (o) { if (o.k) fromSyl(o.k); });
  if (out.length < 3) {
    var me = SYL[k], near = shuffle(KEYS.filter(function (x) { var y = SYL[x]; return x !== k && (y.b === me.b || y.i === me.i || y.f === me.f); }));
    for (var i = 0; i < near.length && out.length < 3; i++) fromSyl(near[i]);
  }
  if (out.length < 3) return null;
  return shuffle([{ c: target, k: k, right: true }].concat(out));
}
function noteChar(c, k, ok) { if (!c) return; S.chars = S.chars || {}; var x = S.chars[c] || (S.chars[c] = { k: k, n: 0, c: 0 }); x.n++; if (ok) x.c++; x.last = Date.now(); }

/* ========== 练习：拼音认字 + 按音找字 ========== */
var G = null; // 当前一局
function speakerHTML(id) { return '<button id="' + id + '" class="speaker" type="button" aria-label="听一听"><span class="waves"><i></i><i></i><i></i></span><canvas width="16" height="16" data-sprite="noteblock"></canvas></button>'; }
function startRound(mode) {
  ctx();
  var q;
  if (mode === 'place') {
    if (!S.place || S.place.done) S.place = { list: buildPlacement(), idx: 0, done: false, res: [] };
    q = S.place.list.slice(S.place.idx, S.place.idx + PLACE_SEG); // 每段 10 题，做完就休息
  } else q = buildRound();
  G = { startIdx: mode === 'place' ? S.place.idx : 0, mode: mode, queue: q, pos: 0, total: q.length, ups: [], extra: 0, marks: [], ok: 0, learned: [], lastT: null };
  lastGame = 'practice'; show('play');
  renderProgress(); nextQ();
}
var MARK_TEX = { done: function () { return spriteURL('diamond'); }, ok: function () { return blockTex(1); }, miss: function () { return blockTex(0); } };
function renderProgress() {
  var hb = $('#hotbar');
  if (G.mode === 'place') $('#modeTag').innerHTML = segDots(Math.floor(G.startIdx / PLACE_SEG), Math.ceil(S.place.list.length / PLACE_SEG));
  else $('#modeTag').innerHTML = '';
  $('#xpFill').style.width = (100 * G.marks.length / G.total).toFixed(1) + '%';
  var html = '';
  for (var i = 0; i < G.total; i++) {
    var m = G.marks[i];
    html += '<span class="slot' + (i === G.marks.length ? ' now' : '') + (m ? ' got' : '') + '">' + (m ? '<i style="background-image:url(' + MARK_TEX[m]() + ')"></i>' : '') + '</span>';
  }
  hb.innerHTML = html;
}
function segDots(seg, segs) { var h = '<span class="seg-dots" title="摸底第 ' + (seg + 1) + ' / ' + segs + ' 段">'; for (var i = 0; i < segs; i++) h += '<i class="' + (i < seg ? 'done' : i === seg ? 'now' : '') + '"></i>'; return h + '</span>'; }
function taskFor(k) {
  if (G.mode === 'srs' && G.pos < 2 && G.pos < G.total - 4) return { t: 'w' }; // 热身：只读拼音
  var f = findTask(k), c = newChar(k);
  if (f && c) return (G.lastT === 'f' ? Math.random() < .75 : Math.random() < .25) ? { t: 'r', c: c } : { t: 'f', opts: f };
  if (f) return { t: 'f', opts: f };
  if (c) return { t: 'r', c: c };
  return { t: 'w' };
}
function nextQ() {
  if (G.pos >= G.queue.length) return endRound();
  var k = G.queue[G.pos], T = taskFor(k); G.lastT = T.t;
  var q = G.q = { k: k, t: T.t, c: T.c || null, opts: T.opts || null, t0: null, first: null, heard: false, done: false, wrong: false, shown: performance.now() };
  var st = $('#stage'); st.className = 'stage task-' + (T.t === 'f' ? 'find' : 'read');
  if (T.t === 'f') renderFind(q, st); else renderRead(q, st);
  drawSprites(st); drawIcons(st);
  if (G.queue[G.pos + 1]) loadBuf(G.queue[G.pos + 1]).catch(function () {});
  loadBuf(k).catch(function () {});
}
function renderRead(q, st) {
  var ore = pick(ORE_NAMES);
  st.innerHTML = '<div class="read-wrap"><button id="mine" class="mine" type="button" aria-label="挖开"><span class="face" style="background-image:url(' + oreTex(ore, rnd(1e6)) + ')"></span></button>' +
    '<div id="card" class="card' + (q.c ? '' : ' warm') + '" hidden>' + (q.c ? '<span class="hz">' + q.c + '</span>' : '') + '<span class="py">' + label(q.k) + '</span></div></div>' +
    '<div id="judge" class="judge off"><button id="btnBad" class="mc-btn jbtn red" type="button" aria-label="没读对"><i class="ic" data-ic="cross"></i></button>' + speakerHTML('btnSpeak') +
    '<button id="btnGood" class="mc-btn jbtn green" type="button" aria-label="读对了"><i class="ic" data-ic="check"></i></button></div>';
  var cr = makeCanvas(); cr.className = 'crack'; $('#mine .face').appendChild(cr);
  $('#mine').addEventListener('pointerdown', function (e) { e.preventDefault(); mine(); });
  $('#btnSpeak').onclick = function () { hear(); };
  $('#btnGood').onclick = function () { judge(true); };
  $('#btnBad').onclick = function () { judge(false); };
}
function mine() {
  var q = G && G.q; if (!q || q.t0 != null || q.mining) return; q.mining = true;
  var b = $('#mine'), cr = $('canvas.crack', b), s = 0;
  SFX.hit(); drawCrack(cr, 0); b.classList.add('hitting');
  var h = setInterval(function () {
    s++; if (s <= 2) { SFX.hit(); drawCrack(cr, s); return; }
    clearInterval(h); SFX.brk(); burst($('.face', b));
    b.classList.add('broken'); var c = $('#card'); c.hidden = false; c.classList.add('pop'); fitCard();
    $('#judge').classList.remove('off'); q.t0 = performance.now();
  }, 70);
}
function fitCard() { var p = $('#card .py'); if (!p) return; p.style.fontSize = ''; var w = $('#card').clientWidth; if (p.offsetWidth > w * .9) p.style.fontSize = Math.floor(parseFloat(getComputedStyle(p).fontSize) * w * .9 / p.offsetWidth) + 'px'; }
function hear() {
  var q = G && G.q; if (!q) return;
  if (q.t === 'f') { speak(q.k).catch(audioErr); return; }
  if (q.t0 == null) return mine();
  if (q.first == null) q.first = performance.now();
  q.heard = true; speak(q.k).catch(audioErr);
}
function audioErr() { toast('读音没加载出来，请检查网络'); }
function requeue(k) { if (G.mode !== 'place' && G.extra < 4) { G.queue.splice(Math.min(G.pos + 3, G.queue.length), 0, k); G.extra++; G.total++; } }
function judge(ok) {
  var q = G && G.q; if (!q || q.done || q.t0 == null) return; q.done = true;
  var rt = (q.first || performance.now()) - q.t0, fast = ok && !q.heard && rt <= FAST_MS;
  var res = record(q.k, ok, rt, fast); noteChar(q.c, q.k, ok);
  if (G.mode === 'place') S.place.res.push([q.k, ok ? 1 : 0, Math.round(q.heard ? 99999 : rt)]);
  logTime(); $('#judge').classList.add('off');
  var card = $('#card');
  if (ok) {
    G.ok++; if (res.after > res.before) G.ups.push([q.k, res.after]); if (q.c) G.learned.push([q.c, q.k]);
    card.classList.add('good'); SFX.gem(); if (res.after > res.before && res.after >= 2) SFX.up();
    finishQ(fast ? 'done' : 'ok', card, 650);
  } else {
    card.classList.add('bad'); SFX.bonk(); requeue(q.k);
    finishQ('miss', card, 0, true);
  }
}
// 记下这一题的格子，物品飞进快捷栏；listen=true 时先播标准音再走
function finishQ(mark, fromEl, wait, listen) {
  save(); var slot = $$('#hotbar .slot')[G.marks.length];
  flyItem(fromEl, MARK_TEX[mark](), slot, function () { G.marks.push(mark); renderProgress(); });
  if (listen) {
    var go = false, nx = function () { if (!go) { go = true; advance(); } };
    speak(G.q.k).then(function (r) { setTimeout(nx, r.dur + 900); }).catch(function () { setTimeout(nx, 1200); });
    setTimeout(nx, 4500);
  } else setTimeout(advance, wait);
}
function flyItem(fromEl, tex, slot, cb) {
  if (!fromEl || !slot) { cb(); return; }
  var r = rect(fromEl), t = rect(slot), g = el('img', 'drop-gem'); g.src = tex;
  var x0 = r.left + r.width / 2 - 32, y0 = r.top + r.height / 2 - 32; g.style.left = x0 + 'px'; g.style.top = y0 + 'px'; $('#fx').appendChild(g);
  var a = g.animate([{ transform: 'translate(0,0) scale(.3)' }, { transform: 'translate(0,-60px) scale(1.15)', offset: .3 },
    { transform: 'translate(' + (t.left + t.width / 2 - 32 - x0) + 'px,' + (t.top + t.height / 2 - 32 - y0) + 'px) scale(.6)' }], { duration: 620, easing: 'ease-in-out', fill: 'forwards' });
  a.onfinish = function () { g.remove(); cb(); };
}
function renderFind(q, st) {
  st.innerHTML = '<div class="find-prompt">' + speakerHTML('btnSpeak') + '<span class="py-plate">' + label(q.k) + '</span></div><div id="ores" class="ores"></div><div class="ledge" aria-hidden="true"></div>';
  var box = $('#ores'), seed = rnd(1e6), names = shuffle(ORE_NAMES.slice());
  q.opts.forEach(function (o, i) {
    var b = el('button', 'ore'); b.type = 'button'; b.style.setProperty('--d', (i * .37) + 's');
    b.innerHTML = '<span class="face" style="background-image:url(' + oreTex(names[i], seed + i) + ')"></span><span class="lab hz">' + o.c + '</span>';
    var cr = makeCanvas(); cr.className = 'crack'; $('.face', b).appendChild(cr);
    b.addEventListener('pointerdown', function (ev) { ev.preventDefault(); pickChar(i, b); });
    box.appendChild(b);
  });
  $('#btnSpeak').onclick = function () { hear(); };
  setTimeout(function () { if (G && G.q === q) { q.t0 = performance.now(); speak(q.k).catch(audioErr); } }, 450);
}
function pickChar(i, btn) {
  var q = G && G.q; if (!q || q.done) return;
  if (q.t0 == null) q.t0 = performance.now();
  var o = q.opts[i], rt = performance.now() - q.t0;
  if (o.right) {
    q.done = true; var first = !q.wrong, fast = first && rt <= FAST_MS, res = null;
    if (first) { res = record(q.k, true, rt, fast); G.ok++; if (res.after > res.before) G.ups.push([q.k, res.after]); if (G.mode === 'place') S.place.res.push([q.k, 1, Math.round(rt)]); }
    logTime();
    breakOre(btn, function () {
      if (res && res.after > res.before && res.after >= 2) SFX.up();
      finishQ(first ? (fast ? 'done' : 'ok') : 'miss', $('.face', btn), 900);
    });
    speak(q.k).catch(function () {});
  } else {
    SFX.bonk(); btn.classList.remove('wrong'); void btn.offsetWidth; btn.classList.add('wrong');
    var ck = q.k + '>' + o.k; S.conf[ck] = (S.conf[ck] || 0) + 1;
    if (!q.wrong) {
      q.wrong = true; record(q.k, false, rt, false);
      if (G.mode === 'place') S.place.res.push([q.k, 0, Math.round(rt)]); else requeue(q.k);
      logTime(); save();
    }
    setTimeout(function () {
      $$('#ores .ore').forEach(function (b, j) { if (q.opts[j].right) b.classList.add('hintme'); else b.classList.add('dim'); });
      speak(q.k).catch(function () {});
    }, 380);
  }
}
function advance() {
  G.pos++;
  if (G.mode === 'place') { S.place.idx++; if (S.place.idx >= S.place.list.length) finishPlacement(); save(); }
  setTimeout(nextQ, 120);
}
function logTime() { var q = G ? G.q : A && A.q; if (!q) return; var t = today(); var dt = Math.min(30000, performance.now() - (q.lastLog || q.shown)); q.lastLog = performance.now(); t.sec += dt / 1000; }
function rect(e) { return e.getBoundingClientRect(); }
function burst(face, n) {
  var r = rect(face), fx = $('#fx') || document.body, tex = face.style.backgroundImage;
  for (var i = 0; i < (n || 22); i++) {
    var f = el('i', 'frag'); f.style.left = (r.left + r.width / 2) + 'px'; f.style.top = (r.top + r.height / 2) + 'px';
    f.style.backgroundImage = tex; f.style.backgroundSize = (r.width / 3) + 'px'; f.style.backgroundPosition = (rnd(16) * 7) + 'px ' + (rnd(16) * 7) + 'px';
    var sz = 10 + rnd(10); f.style.width = f.style.height = sz + 'px'; fx.appendChild(f);
    var dx = (Math.random() - .5) * r.width * 1.6, dy = -Math.random() * r.height * .9 - 30;
    f.animate([{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: 'translate(' + dx + 'px,' + dy + 'px) rotate(' + rnd(360) + 'deg)', opacity: 1, offset: .45 },
      { transform: 'translate(' + dx * 1.25 + 'px,' + (dy + r.height * 1.1 + 120) + 'px) rotate(' + rnd(720) + 'deg)', opacity: 0 }], { duration: 820, easing: 'cubic-bezier(.2,.6,.5,1)' }).onfinish = (function (n) { return function () { n.remove(); }; })(f);
  }
}
function breakOre(btn, cb) {
  var cr = $('canvas.crack', btn), st = 0;
  $$('#ores .ore').forEach(function (b) { if (b !== btn) b.classList.add('dim'); });
  SFX.hit(); drawCrack(cr, 0);
  var h = setInterval(function () {
    st++; if (st <= 2) { SFX.hit(); drawCrack(cr, st); return; }
    clearInterval(h); SFX.brk(); SFX.gem(); burst($('.face', btn)); btn.classList.add('broken'); cb();
  }, 80);
}
function finishPlacement() {
  S.place.done = true; S.place.date = Date.now();
  var by = { i: {}, f: {}, t: {} };
  S.place.res.forEach(function (r) {
    var s = SYL[r[0]]; if (!s) return;
    [['i', s.i || '∅'], ['f', s.f], ['t', s.t]].forEach(function (p) { var m = by[p[0]][p[1]] || (by[p[0]][p[1]] = { n: 0, ok: 0, slow: 0 }); m.n++; if (r[1]) { m.ok++; if (r[2] > FAST_MS) m.slow++; } });
  });
  var weak = { i: [], f: [], t: [] };
  ['i', 'f', 't'].forEach(function (d) { Object.keys(by[d]).forEach(function (k) { var m = by[d][k]; if (m.ok / m.n < .8 || m.slow / Math.max(1, m.ok) > .5) weak[d].push(d === 't' ? +k : (k === '∅' ? '' : k)); }); });
  S.weak = weak; newOrder = null;
}
function marksRow(marks) { return '<div class="up-slots">' + marks.map(function (mk) { return slotHTML(MARK_TEX[mk]()); }).join('') + '</div>'; }
function learnedHTML(list) {
  if (!list.length) return '';
  var seen = {}, cards = list.filter(function (x) { if (seen[x[0]]) return false; seen[x[0]] = 1; return true; }).slice(0, 12);
  return '<div class="learned">' + cards.map(function (x) { return '<button class="hz-card" type="button" data-k="' + x[1] + '"><span class="hz">' + x[0] + '</span><span class="py">' + label(x[1]) + '</span></button>'; }).join('') + '</div>';
}
function bindLearned(root) { $$('.hz-card', root).forEach(function (b) { b.onclick = function () { speak(b.dataset.k).catch(audioErr); }; }); }
function endRound() {
  save();
  var m = G.mode; show('result'); $('#btnAgain .lbl').textContent = '再来一局';
  $('#resIcon').style.backgroundImage = 'url(' + spriteURL('diamond', 2) + ')';
  var up = $('#resUp'); up.innerHTML = '';
  if (m === 'place' && !S.place.done) {
    $('#resTitle').textContent = '休息一下！';
    up.innerHTML = segDots(Math.ceil(S.place.idx / PLACE_SEG), Math.ceil(S.place.list.length / PLACE_SEG)) + marksRow(G.marks) + learnedHTML(G.learned);
    $('#btnAgain .lbl').textContent = '继续摸底'; bindLearned(up); G = null; return;
  }
  if (m === 'place') {
    $('#resTitle').textContent = '摸底完成！';
    var w = S.weak, names = [].concat(w.i.filter(Boolean), w.f.map(finName)).slice(0, 12);
    up.innerHTML = marksRow(G.marks) + (names.length ? '<p class="res-note">先多练：<span class="py">' + names.join('  ') + '</span>' + (w.t.length ? '　' + w.t.map(function (t) { return TONE_NAME[t]; }).join(' ') : '') + '</p>' : '');
  } else {
    $('#resTitle').textContent = G.ok === G.total ? '全对，太棒了！' : '挖完啦！';
    up.innerHTML = marksRow(G.marks);
    if (G.ups.length) {
      var grid = el('div', 'up-slots ups');
      G.ups.forEach(function (u, i) { var c = el('div', 'up-slot', '<i style="background-image:url(' + blockTex(u[1]) + ')"></i><span>' + label(u[0]) + '</span>'); c.style.animationDelay = (i * .08) + 's'; grid.appendChild(c); });
      up.appendChild(grid);
    }
    if (G.ups.some(function (u) { return u[1] >= 2; })) SFX.up();
  }
  up.insertAdjacentHTML('beforeend', learnedHTML(G.learned)); bindLearned(up);
  G = null;
}

/* ========== 气球闯关 ========== */
var A = null, lastGame = 'practice';
var ARC_PER = 6, ARC_TIME = [10, 8.5, 7.5, 6.5, 5.5, 4.8, 4.2], ARC_MAX_MS = 270000;
var BALLOON_COL = [['#ef5b4c', '#b83226'], ['#ffd23f', '#c99a0e'], ['#5fcf4a', '#2f8d22'], ['#4aa8ff', '#1f6fc2'], ['#b874ff', '#7b3bc4'], ['#ff9a3c', '#c8661a']];
function balloonURL(i) {
  var k = 'bal' + i; if (texCache[k]) return texCache[k];
  var c = makeCanvas(), g = c.getContext('2d'), save = [SPR_COL.b, SPR_COL.B]; SPR_COL.b = BALLOON_COL[i][0]; SPR_COL.B = BALLOON_COL[i][1];
  drawStr(g, SPR.balloon); SPR_COL.b = save[0]; SPR_COL.B = save[1];
  return (texCache[k] = c.toDataURL());
}
function arcadeQueue() {
  var d = dayNum(), c = KEYS.filter(function (k) { return chInfo(k).z; });
  var score = function (k) { var x = S.items[k]; if (!x || !x.n) return 2 + SYL[k].r / 400; if (x.lv >= 3) return (x.due || 0) <= d ? 1 : 6; return x.lv === 2 ? .5 : 0; };
  c.sort(function (a, b) { return score(a) - score(b) + (Math.random() - .5) * 1.5; });
  return c.slice(0, 60);
}
function startArcade() {
  ctx(); lastGame = 'arcade';
  A = { level: 1, inLevel: 0, hearts: 3, start: performance.now(), ok: 0, n: 0, learned: [], queue: arcadeQueue(), qi: 0, col: rnd(6) };
  show('arcade'); renderArc(); resetHero(true); setTimeout(nextBalloon, 600);
}
function renderArc() {
  $('#arcLevel').innerHTML = '<span class="lv-badge">' + A.level + '</span>' + '<span class="lv-dots">' + Array.from({ length: ARC_PER }, function (_, i) { return '<i class="' + (i < A.inLevel ? 'done' : '') + '"></i>'; }).join('') + '</span>';
  var h = ''; for (var i = 0; i < 3; i++) h += '<i class="ic' + (i < A.hearts ? '' : ' lost') + '" style="background-image:url(' + spriteURL('heart') + ')"></i>'; $('#hearts').innerHTML = h;
}
function resetHero(instant) {
  var hero = $('#hero'); hero.className = 'hero'; hero.style.transition = 'none'; hero.style.transform = ''; hero.style.top = '';
  $('.hero-balloon', hero).src = balloonURL(A.col); $('.hero-balloon', hero).style.transform = '';
  if (!instant) { hero.classList.add('enter'); }
}
function nextBalloon() {
  if (!A) return;
  if (A.hearts <= 0 || A.level > ARC_TIME.length || performance.now() - A.start > ARC_MAX_MS) return endArcade();
  var k, opts = null;
  while (!opts && A.qi < A.queue.length) { k = A.queue[A.qi++]; opts = findTask(k); }
  if (!opts) { A.queue = arcadeQueue(); A.qi = 0; return nextBalloon(); }
  var T = ARC_TIME[A.level - 1], q = A.q = { k: k, opts: opts, t0: null, done: false, wrong: false, shown: performance.now(), T: T };
  $('#arcPy').textContent = label(k); $('#arcPy').classList.remove('pop'); void $('#arcPy').offsetWidth; $('#arcPy').classList.add('pop');
  var box = $('#balloons'); box.innerHTML = '';
  var cols = shuffle([0, 1, 2, 3, 4, 5].filter(function (c) { return c !== A.col; }));
  opts.forEach(function (o, i) {
    var b = el('button', 'balloon'); b.type = 'button'; b.dataset.col = cols[i];
    b.style.setProperty('--i', i); b.style.setProperty('--y', [8, 0, 12, 4][i] + '%');
    b.innerHTML = '<img src="' + balloonURL(cols[i]) + '" alt=""><span class="hz">' + o.c + '</span><i class="string"></i>';
    b.addEventListener('pointerdown', function (e) { e.preventDefault(); pickBalloon(i, b); });
    box.appendChild(b);
  });
  var hero = $('#hero'); void hero.offsetWidth;
  hero.style.transition = 'top ' + T + 's linear';
  hero.classList.add('drift'); $('.hero-balloon', hero).style.transition = 'transform ' + T + 's linear'; $('.hero-balloon', hero).style.transform = 'scale(.72)';
  var bar = $('#arcTimer'); bar.style.transition = 'none'; bar.style.width = '100%'; void bar.offsetWidth; bar.style.transition = 'width ' + T + 's linear'; bar.style.width = '0%';
  setTimeout(function () { if (A && A.q === q) { q.t0 = performance.now(); speak(k).catch(function () {}); } }, 350);
  q.timer = setTimeout(function () { arcTimeout(q); }, T * 1000 + 350);
  loadBuf(k).catch(function () {});
}
function stopDrift() { var hero = $('#hero'), cs = getComputedStyle(hero); hero.style.transition = 'none'; hero.style.top = cs.top; var hb = $('.hero-balloon', hero), t = getComputedStyle(hb).transform; hb.style.transition = 'none'; hb.style.transform = t; var bar = $('#arcTimer'); bar.style.width = getComputedStyle(bar).width; bar.style.transition = 'none'; }
function pickBalloon(i, b) {
  var q = A && A.q; if (!q || q.done || b.classList.contains('popped')) return;
  if (q.t0 == null) q.t0 = performance.now();
  var o = q.opts[i], rt = performance.now() - q.t0;
  if (o.right) {
    q.done = true; clearTimeout(q.timer); stopDrift();
    var first = !q.wrong;
    if (first) { var res = record(q.k, true, rt, rt <= FAST_MS); A.ok++; A.learned.push([o.c, q.k]); if (res.after > res.before && res.after >= 2) SFX.up(); }
    A.n++; logTime(); save(); SFX.gem(); speak(q.k).catch(function () {});
    jumpTo(b, function () { A.col = +b.dataset.col; A.inLevel++; levelCheck(); });
  } else {
    popBalloon(b); SFX.pop();
    if (!q.wrong) { q.wrong = true; record(q.k, false, rt, false); S.conf[q.k + '>' + o.k] = (S.conf[q.k + '>' + o.k] || 0) + 1; loseHeart(); logTime(); save(); }
    if (A.hearts <= 0) { q.done = true; clearTimeout(q.timer); stopDrift(); showRight(q); setTimeout(endArcade, 1800); }
  }
}
function showRight(q) { $$('#balloons .balloon').forEach(function (b, j) { if (q.opts[j].right) b.classList.add('hintme'); else if (!b.classList.contains('popped')) b.classList.add('dim'); }); speak(q.k).catch(function () {}); }
function loseHeart() { A.hearts--; renderArc(); var hs = $$('#hearts .ic'); var h = hs[A.hearts]; if (h) { h.classList.add('lose'); } }
function arcTimeout(q) {
  if (!A || A.q !== q || q.done) return; q.done = true;
  if (!q.wrong) { record(q.k, false, q.T * 1000, false); loseHeart(); }
  A.n++; logTime(); save();
  var hero = $('#hero'); stopDrift(); SFX.pop(); hero.classList.add('fall'); popAt($('.hero-balloon', hero), A.col);
  showRight(q);
  setTimeout(function () { if (!A) return; if (A.hearts <= 0) return endArcade(); A.col = rnd(6); resetHero(); renderArc(); setTimeout(nextBalloon, 700); }, 2200);
}
function popAt(img, col) {
  var r = rect(img), fx = $('#fx2');
  for (var i = 0; i < 14; i++) {
    var f = el('i', 'frag'); f.style.background = BALLOON_COL[col][i % 2]; f.style.left = (r.left + r.width / 2) + 'px'; f.style.top = (r.top + r.height * .4) + 'px'; fx.appendChild(f);
    var a = Math.PI * 2 * i / 14, d = 60 + rnd(50);
    f.animate([{ transform: 'translate(0,0)', opacity: 1 }, { transform: 'translate(' + Math.cos(a) * d + 'px,' + (Math.sin(a) * d + 40) + 'px) scale(.5)', opacity: 0 }], { duration: 600, easing: 'ease-out' }).onfinish = (function (n) { return function () { n.remove(); }; })(f);
  }
}
function popBalloon(b) { popAt($('img', b), +b.dataset.col); b.classList.add('popped'); }
function jumpTo(b, cb) {
  var hero = $('#hero'), hr = rect(hero), br = rect($('img', b));
  var dx = br.left + br.width / 2 - (hr.left + hr.width / 2), dy = br.bottom + 6 - hr.top - hr.height * .42;
  $$('#balloons .balloon').forEach(function (x) { if (x !== b) x.classList.add('away'); });
  hero.classList.add('jump');
  var a = hero.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(' + dx * .5 + 'px,' + (Math.min(dy, 0) - 90) + 'px)', offset: .5 }, { transform: 'translate(' + dx + 'px,' + dy + 'px)' }], { duration: 560, easing: 'ease-in-out', fill: 'forwards' });
  a.onfinish = function () {
    // 抓住新气球，一起飘回起点
    b.classList.add('caught');
    setTimeout(function () {
      hero.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' }).onfinish = function () {
        a.cancel(); b.remove(); resetHero(); hero.getAnimations().forEach(function (x) { x.cancel(); }); cb();
      };
    }, 380);
  };
}
function levelCheck() {
  renderArc();
  if (A.inLevel >= ARC_PER) {
    A.level++; A.inLevel = 0; S.arcade = S.arcade || { best: 0, runs: 0 }; S.arcade.best = Math.max(S.arcade.best, A.level - 1); save();
    if (A.level <= ARC_TIME.length) { SFX.up(); flash('第 ' + A.level + ' 关'); }
    setTimeout(function () { renderArc(); nextBalloon(); }, 1100);
  } else setTimeout(nextBalloon, 350);
}
function endArcade() {
  if (!A) return; var a = A; clearTimeout(a.q && a.q.timer); A = null;
  S.arcade = S.arcade || { best: 0, runs: 0 }; S.arcade.runs++; S.arcade.best = Math.max(S.arcade.best, a.level - (a.inLevel ? 0 : 1)); save();
  show('result'); $('#btnAgain .lbl').textContent = '再飞一次';
  $('#resIcon').style.backgroundImage = 'url(' + balloonURL(a.col) + ')';
  var done = a.level > ARC_TIME.length;
  $('#resTitle').textContent = done ? '全部通关！' : '飞到第 ' + a.level + ' 关！';
  var up = $('#resUp');
  up.innerHTML = '<div class="arc-sum"><span class="lv-badge big">' + Math.min(a.level, ARC_TIME.length) + '</span><span class="hearts-left">' +
    [0, 1, 2].map(function (i) { return '<i class="ic' + (i < a.hearts ? '' : ' lost') + '" style="background-image:url(' + spriteURL('heart') + ')"></i>'; }).join('') + '</span></div>' + learnedHTML(a.learned);
  bindLearned(up);
}
function flash(t) { var e = el('div', 'streak', t); document.body.appendChild(e); setTimeout(function () { e.remove(); }, 950); }

/* ========== 爸爸抽查 ========== */
var O = null;
function startOral() {
  ctx();
  var practiced = KEYS.filter(function (k) { return S.items[k] && S.items[k].n > 0; });
  var w = practiced.map(function (k) { var x = S.items[k]; return { k: k, s: Math.random() * (1 + x.lv) + (Date.now() - (x.last || 0) < 864e5 ? .5 : 0) }; })
    .sort(function (a, b) { return b.s - a.s; }).map(function (o) { return o.k; });
  var list = w.slice(0, 10);
  if (list.length < 10) list = list.concat(newList().slice(0, 10 - list.length));
  O = { list: shuffle(list), i: 0, ok: 0 };
  var od = $('#oralDone'); if (od) od.remove();
  show('oral'); oralCard();
}
function oralCard() {
  if (O.i >= O.list.length) {
    save(); $('#oralCard').innerHTML = '<span class="sign-done">读对 ' + O.ok + ' / ' + O.list.length + '</span>';
    $('#oralCount').textContent = ''; $('#oralOk').hidden = $('#oralBad').hidden = $('#oralListen').hidden = true;
    var b = $('#oralDone') || el('button', 'mc-btn wide primary', '<i class="ic" data-ic="house"></i>回首页'); b.id = 'oralDone'; drawIcons(b); b.onclick = function () { b.remove(); show('home'); }; $('.oral-btns').appendChild(b); return;
  }
  $('#oralOk').hidden = $('#oralBad').hidden = $('#oralListen').hidden = false;
  var k = O.list[O.i]; $('#oralCard').textContent = label(k); $('#oralCount').textContent = (O.i + 1) + ' / ' + O.list.length;
}
function oralMark(ok) {
  var k = O.list[O.i], r = S.oral[k] || (S.oral[k] = { ok: 0, bad: 0 }), t = today();
  t.oq++; if (ok) { r.ok++; t.oc++; O.ok++; } else {
    r.bad++; var x = it(k); x.st = 0; if (x.lv >= 2) { x.lv = 1; delete x.gd; delete x.due; } x.ob = (x.ob || 0) + 1;
  }
  r.last = Date.now(); O.i++; save(); ok ? SFX.gem() : SFX.bonk(); oralCard();
}

/* ========== 拼音地图 ========== */
function baseLevel(b) { var m = 3; b.t.forEach(function (t) { m = Math.min(m, lv(b.b + t)); }); return m; }
function renderMap() {
  var c = counts(), full = BASES.filter(function (b) { return baseLevel(b) === 3; }).length;
  var names = ['石头', '铁', '金', '钻石'];
  $('#mapStats').innerHTML = '<div class="ms-slots">' + [3, 2, 1, 0].map(function (l) { return '<div class="ms-item">' + slotHTML(blockTex(l), c[l]) + '<span>' + names[l] + '</span></div>'; }).join('') + '</div>' +
    '<div class="ms-prog"><div class="ms-label">钻石 <b>' + c[3] + '</b> / ' + TOTAL + '　·　整个音节全钻石 <b>' + full + '</b> / ' + BASES.length + '</div><div class="xp"><i style="width:' + (100 * c[3] / TOTAL).toFixed(1) + '%"></i></div></div>';
  var grid = $('#mapGrid'); grid.innerHTML = '';
  INI_ALL.forEach(function (ini) {
    var bs = BASES.filter(function (b) { return b.i === ini; }); if (!bs.length) return;
    var row = el('div', 'mrow'), h = el('div', 'ini' + (ini ? '' : ' zero'), ini || 'a o e');
    var cells = el('div', 'cells'); row.appendChild(h); row.appendChild(cells);
    bs.forEach(function (b) {
      var L = baseLevel(b), cl = el('button', 'cell lv' + L); cl.type = 'button';
      cl.style.backgroundImage = 'url(' + blockTex(L) + ')';
      cl.innerHTML = '<span class="t">' + b.b.replace(/v/g, 'ü') + '</span><span class="pips">' + b.t.map(function (t) { return '<b class="lv' + lv(b.b + t) + '"></b>'; }).join('') + '</span>';
      cl.onclick = function () { baseModal(b); };
      cells.appendChild(cl);
    });
    grid.appendChild(row);
  });
}
function avg(a) { return a && a.length ? a.reduce(function (s, x) { return s + x; }, 0) / a.length : null; }
function baseModal(b) {
  var box = el('div');
  box.appendChild(el('h3', 'modal-title', '<span class="py">' + b.b.replace(/v/g, 'ü') + '</span>' + (b.w ? '<small>整体认读</small>' : '')));
  var names = ['石头', '铁', '金', '钻石'];
  b.t.forEach(function (t) {
    var k = b.b + t, x = S.items[k] || { n: 0, c: 0, st: 0, lv: 0, rt: [] }, a = avg(x.rt);
    var row = el('div', 'tone-row');
    row.innerHTML = '<span class="lvl" style="background-image:url(' + blockTex(x.lv) + ')"></span><span class="py">' + label(k) + '</span><span class="meta">' + names[x.lv] +
      (x.n ? '　答 ' + x.n + ' 次，对 ' + x.c + ' 次' + (a ? '，平均 ' + (a / 1000).toFixed(1) + ' 秒' : '') : '　还没练') + '<br>' + (chInfo(k).z ? '认识的字：<b class="hz">' + chInfo(k).z + '</b>　' : '') + (chInfo(k).u ? '新字：<b class="hz">' + chInfo(k).u + '</b>' : (chInfo(k).z ? '' : '例字：' + (SYL[k].c || ''))) + '</span>';
    var p = el('button', 'mc-btn icon', '<i class="ic" data-ic="note"></i>'); drawIcons(p); p.onclick = function () { speak(k).catch(function () { toast('读音没加载出来'); }); };
    row.appendChild(p); box.appendChild(row);
  });
  modal(box);
}

/* ========== 家长页 ========== */
function compStats() {
  var by = { i: {}, f: {}, t: {} };
  KEYS.forEach(function (k) {
    var x = S.items[k]; if (!x || !x.n) return; var s = SYL[k];
    [['i', s.i || '零声母'], ['f', finName(s.f)], ['t', TONE_NAME[s.t]]].forEach(function (p) {
      var m = by[p[0]][p[1]] || (by[p[0]][p[1]] = { n: 0, c: 0, rt: [] }); m.n += x.n; m.c += x.c; m.rt = m.rt.concat(x.rt);
    });
  });
  return by;
}
function renderParent() {
  var c = counts(), d = dayNum(), t = S.days[d] || { sec: 0, q: 0, c: 0 };
  var allRt = []; KEYS.forEach(function (k) { var x = S.items[k]; if (x) allRt = allRt.concat(x.rt); });
  var a = avg(allRt), body = $('#parentBody'); body.innerHTML = '';
  var p1 = el('div', 'panel');
  p1.innerHTML = '<h3>进度</h3><div class="kpis">' +
    '<div class="kpi">' + slotHTML(blockTex(3)) + '<span>钻石·已掌握</span><b>' + c[3] + ' / ' + TOTAL + '</b></div><div class="kpi">' + slotHTML(blockTex(2)) + '<span>金·等隔天复查</span><b>' + c[2] + '</b></div>' +
    '<div class="kpi">' + slotHTML(blockTex(1)) + '<span>铁·答对过</span><b>' + c[1] + '</b></div><div class="kpi plain"><span>今天练习</span><b>' + Math.round(t.sec / 60) + ' 分钟</b></div>' +
    '<div class="kpi plain"><span>今天答题</span><b>' + t.q + '（对 ' + t.c + '）</b></div><div class="kpi plain"><span>平均反应</span><b>' + (a != null ? (a / 1000).toFixed(1) + ' 秒' : '-') + '</b></div></div>' +
    '<p class="small" style="margin-top:8px">三种玩法都记到同一张拼音地图上：<b>拼音认字</b>（一个多半不认识的常用字，下面标着拼音，孩子自己读出来，可以点小喇叭听录音对照，再自己点勾或叉）、<b>按音找字</b>（看拼音、听读音，从 4 个读音或字形相近的字里点出对的）、<b>气球闯关</b>（只用按音找字，一关比一关快）。' +
    '每局前两题是只有拼音的热身。录音只是参考，不当裁判；爸爸抽查读错会把这个音节退回铁。</p><p class="small">掌握标准：同一个带调音节连续 3 次「又快又对」变成金（看到题目后 3 秒内答对；自评时先点了喇叭再判对的不算快），第二天以后再答对变成钻石。答错退回铁。</p>' +
    (S.legacy ? '<p class="small">第一版「听音选拼音」的旧记录换算不了新的掌握度，已经原样保存在导出文件的 legacy 字段里。</p>' : '');
  body.appendChild(p1);
  // 认字和闯关
  var cs = Object.keys(S.chars || {}), cOk = cs.filter(function (ch) { return S.chars[ch].c > 0; });
  var pA = el('div', 'panel');
  pA.innerHTML = '<h3>认字和闯关</h3><p>拼音认字见过 ' + cs.length + ' 个新字，自己读对过 ' + cOk.length + ' 个。' + (cOk.length ? '<br><span class="hz-list">' + cOk.slice(-40).join(' ') + '</span>' : '') + '</p>' +
    '<p>气球闯关玩过 ' + (S.arcade.runs || 0) + ' 次，最远到第 ' + (S.arcade.best || 0) + ' 关。</p><p class="small">认字只用最常用的 1000 个字里、他课本字表（一年级和二年级上册）以外的字，没有合适的字的音节只做纯拼音热身；按音找字的正确答案只用课本里学过的字。</p>';
  body.appendChild(pA);
  // 14 天
  var p2 = el('div', 'panel'), bars = '', mx = 1;
  for (var i = 13; i >= 0; i--) { var r = S.days[d - i]; mx = Math.max(mx, r ? r.sec / 60 : 0); }
  for (i = 13; i >= 0; i--) { var r2 = S.days[d - i], m = r2 ? r2.sec / 60 : 0; bars += '<div style="height:' + (100 * m / mx) + '%" title="' + Math.round(m) + ' 分钟"><span>' + dayStr(d - i) + '</span></div>'; }
  p2.innerHTML = '<h3>最近 14 天练习分钟</h3><div class="days">' + bars + '</div><div style="height:22px"></div>'; body.appendChild(p2);
  // 薄弱
  var st = compStats(), rows = [];
  ['i', 'f', 't'].forEach(function (dname) { Object.keys(st[dname]).forEach(function (k) { var m = st[dname][k]; if (m.n >= 4) rows.push({ k: k, d: dname, acc: m.c / m.n, rt: avg(m.rt), n: m.n }); }); });
  rows.sort(function (x, y) { return (x.acc - y.acc) || ((y.rt || 0) - (x.rt || 0)); });
  var p3 = el('div', 'panel');
  p3.innerHTML = '<h3>最需要练的部分</h3>' + (rows.length ? '<table><tr><th>部分</th><th>正确率</th><th>平均用时</th><th>次数</th></tr>' + rows.slice(0, 10).map(function (r) {
    return '<tr><td class="py">' + r.k + '</td><td>' + Math.round(r.acc * 100) + '%</td><td>' + (r.rt ? (r.rt / 1000).toFixed(1) + ' 秒' : '-') + '</td><td>' + r.n + '</td></tr>';
  }).join('') + '</table>' : '<p class="small">练几局以后这里会显示。</p>');
  if (S.place && S.place.done && S.weak) p3.innerHTML += '<p class="small">摸底时没答好或偏慢：' + S.weak.i.filter(Boolean).concat(S.weak.f.map(finName)).join(' ') + (S.weak.t.length ? '，' + S.weak.t.map(function (x) { return TONE_NAME[x]; }).join(' ') : '') + '</p>';
  body.appendChild(p3);
  // 混淆
  var conf = Object.keys(S.conf).map(function (k) { return [k, S.conf[k]]; }).sort(function (x, y) { return y[1] - x[1]; }).slice(0, 12);
  var p4 = el('div', 'panel');
  p4.innerHTML = '<h3>找字时常混的音</h3>' + (conf.length ? '<table><tr><th>要找的音</th><th>点成了读这个音的字</th><th>次数</th></tr>' + conf.map(function (c2) {
    var parts = c2[0].split('>'), w = parts[1].charAt(0) === '*' ? parts[1].slice(1) + '（错误写法）' : (SYL[parts[1]] ? label(parts[1]) : parts[1]);
    return '<tr><td class="py">' + (SYL[parts[0]] ? label(parts[0]) : parts[0]) + '</td><td class="py">' + w + '</td><td>' + c2[1] + '</td></tr>';
  }).join('') + '</table>' : '<p class="small">还没有。</p>');
  body.appendChild(p4);
  // 口读
  var oral = Object.keys(S.oral), ok = 0, bad = 0, badList = [];
  oral.forEach(function (k) { ok += S.oral[k].ok; bad += S.oral[k].bad; if (S.oral[k].bad) badList.push(k); });
  var p5 = el('div', 'panel');
  p5.innerHTML = '<h3>爸爸抽查</h3><p>一共抽查 ' + (ok + bad) + ' 次，读对 ' + ok + ' 次。' + (badList.length ? '读错过：<span class="py">' + badList.slice(0, 20).map(label).join('　') + '</span>' : '') + '</p><p class="small">读错的音节会退回铁，重新练。</p>';
  body.appendChild(p5);
  // 设置
  var p6 = el('div', 'panel');
  p6.innerHTML = '<h3>设置和数据</h3><label>每局题数 <select id="setSize"><option>10</option><option>15</option><option>20</option></select></label>' +
    '<div class="row-btns"><button class="mc-btn" id="rePlace">重新摸底</button><button class="mc-btn" id="exp">导出进度</button><label class="mc-btn">导入进度<input id="imp" type="file" accept="application/json" hidden></label><button class="mc-btn red" id="reset">清空进度</button></div>' +
    '<p class="small">进度只存在这台设备的浏览器里，不用登录。换设备时先导出、再导入。</p>';
  body.appendChild(p6);
  $('#setSize').value = String(S.settings.size || 10);
  $('#setSize').onchange = function (e) { S.settings.size = +e.target.value; save(); toast('每局 ' + S.settings.size + ' 题'); };
  $('#rePlace').onclick = function () { S.place = null; save(); startRound('place'); };
  $('#exp').onclick = function () { var blob = new Blob([JSON.stringify(S)], { type: 'application/json' }); var u = URL.createObjectURL(blob), l = el('a'); l.href = u; l.download = 'pinyin-progress-' + new Date().toISOString().slice(0, 10) + '.json'; l.click(); setTimeout(function () { URL.revokeObjectURL(u); }, 1000); };
  $('#imp').onchange = function (e) { var f = e.target.files[0]; if (!f) return; f.text().then(function (t) { var o = JSON.parse(t); if (!o || !o.items) throw 0; S = o; save(); newOrder = null; toast('已导入'); renderParent(); }).catch(function () { toast('文件不对'); }); };
  $('#reset').onclick = function () { if (confirm('确定清空全部进度？')) { S = blank(); save(); newOrder = null; toast('已清空'); renderParent(); } };
  // 出处
  var ex = window.PY.excludedVerify, p7 = el('div', 'panel');
  p7.innerHTML = '<h3>读音和资料出处</h3><div class="small">' +
    '<p>音节表：依据《通用规范汉字字典》（2013）读音，取自 Unicode Unihan 数据库的 kTGHZ2013 字段，覆盖《通用规范汉字表》8105 字，共 ' + TOTAL + ' 个带调音节、' + BASES.length + ' 个音节。</p>' +
    '<p>真人录音：绝大多数来自 <a href="https://github.com/hugolpz/audio-cmn" target="_blank" rel="noopener">audio-cmn</a> 音节录音，朗读者 Chen Wang，许可 <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noopener">CC BY-SA</a>，项目整理 Hugo Lopez（PLIDAM, INALCO）。' +
    'jù、gāng 来自 Wikimedia Commons Shtooka 项目（朗读者 Wei Gao，北京；<a href="https://creativecommons.org/licenses/by/2.0/fr/deed.en" target="_blank" rel="noopener">CC BY 2.0 FR</a>），rèn 来自 Wikimedia Commons（朗读者 Yue Tan；<a href="https://creativecommons.org/licenses/by-sa/3.0/us/" target="_blank" rel="noopener">CC BY-SA 3.0 US</a>）。' +
    '字库：读音取自 Unihan 的 kTGHZ2013（《通用规范汉字字典》），多音字只在常用读音占九成以上时才用（依据 kHanyuPinlu 频次），字形相近的干扰字依据 kPhonetic 声旁分组，常用字范围依据 kTGH（《通用规范汉字表》一级字）。' +
    '本站对录音做了裁静音和音量统一，改动后的音频同样按 CC BY-SA 提供。</p>' +
    '<p>每个录音都用两套语音识别和声调曲线分析做了自动核对。以下音节没通过核对，暂时不出题：<span class="py" style="font-size:15px">' + Object.keys(ex).map(function (k) { return mark(k.slice(0, -1), +k.slice(-1)); }).join('　') + '</span>。轻声、ê、m、n、ng 等叹词音节也不在题库里。</p>' +
    '<p>拼音字体：基于 SIL 的 Andika 字体做了子集，改名为 LuccaPinyin，许可 <a href="fonts/OFL.txt" target="_blank" rel="noopener">SIL Open Font License 1.1</a>。界面像素字体：<a href="https://github.com/TakWolf/fusion-pixel-font" target="_blank" rel="noopener">Fusion Pixel Font</a>（TakWolf），做了子集并改名为 LuccaPixel，许可 <a href="fonts/OFL-fusion.txt" target="_blank" rel="noopener">SIL Open Font License 1.1</a>。像素图案和音效都由本页程序生成，与 Mojang 无关。</p></div>';
  body.appendChild(p7);
  var back = el('a', 'site-link', '← 回到 lucca.top'); back.href = 'https://www.lucca.top/'; body.appendChild(back);
}

/* ========== 启动 ========== */
/* ========== 怎么玩（图示 + 语音） ========== */
var HOW = {
  practice: '先点矿石，把它挖开。看着拼音，大声读出来。想对照，就点音符听一听。读对了点绿色的勾，没读对点红色的叉。看到一排字的时候，听读音，点出对的字。',
  arcade: '看拼音，听读音。在小人掉下去之前，点中写着对的字的气球，就能跳上新气球。'
};
function sayHow(kind) {
  try {
    if (!window.speechSynthesis) return;
    var u = new SpeechSynthesisUtterance(HOW[kind]); u.lang = 'zh-CN'; u.rate = .95;
    var v = speechSynthesis.getVoices().filter(function (x) { return /^zh(-|_)?(CN|Hans)?/i.test(x.lang); })[0]; if (v) u.voice = v;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  } catch (e) {}
}
function stopHow() { try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) {} }
function howHTML(kind) {
  var ic = function (n) { return '<i class="ic" data-ic="' + n + '"></i>'; }, ar = '<b class="arrow">→</b>';
  if (kind === 'arcade') return '<div class="how-row"><span class="how-py">mā ' + ic('note') + '</span>' + ar + '<img class="how-bal" src="' + balloonURL(3) + '"><img class="how-bal" src="' + balloonURL(1) + '"><img class="how-bal" src="' + balloonURL(2) + '">' + ar + '<img class="how-hero" src="' + spriteURL('hero') + '"></div>';
  return '<div class="how-row"><span class="how-ore" style="background-image:url(' + oreTex('gold', 9) + ')"></span>' + ar + '<span class="how-card"><b class="hz">晴</b><b class="py">qíng</b></span>' + ar + ic('talk') + ic('note') + ar + '<span class="how-yes">' + ic('check') + '</span><span class="how-no">' + ic('cross') + '</span></div>' +
    '<div class="how-row"><span class="how-py">mā ' + ic('note') + '</span>' + ar + '<span class="how-ch">马</span><span class="how-ch ok">妈</span><span class="how-ch">骂</span>' + ar + ic('pick') + '</div>';
}
function howModal(kind, buttons) {
  var box = el('div', 'intro');
  box.innerHTML = howHTML(kind) + '<div class="intro-btns"></div>';
  var hear = el('button', 'mc-btn icon how-say', '<i class="ic" data-ic="note"></i>'); hear.setAttribute('aria-label', '听说明'); hear.onclick = function () { sayHow(kind); };
  box.insertBefore(hear, box.firstChild);
  (buttons || []).forEach(function (b) { $('.intro-btns', box).appendChild(b); });
  drawIcons(box); modal(box); sayHow(kind);
}
function init() {
  load(); paintWorld(); drawSprites(document); drawIcons(document); pickCursor();
  $('#orePile').innerHTML = ['diamond', 'gold', 'iron', 'emerald', 'redstone'].map(function (n, i) { return '<i style="background-image:url(' + oreTex(n, 11 + i) + ')"></i>'; }).join('');
  $('#heroKid').src = spriteURL('hero');
  $('#homeBalloon').src = balloonURL(0); $('#homeKid').src = spriteURL('hero'); $('#homeBalloonIc').src = balloonURL(0);
  $('#btnPlay').onclick = function () {
    ctx();
    if (!S.place) {
      var go = el('button', 'mc-btn wide primary', '<i class="ic" data-ic="pick"></i>开始摸底'), skip = el('button', 'mc-btn subtle', '跳过摸底');
      go.onclick = function () { stopHow(); closeModal(); startRound('place'); };
      skip.onclick = function () { stopHow(); closeModal(); S.place = { list: [], idx: 0, done: true, res: [], skipped: true }; save(); startRound('srs'); };
      howModal('practice', [go, skip]); return;
    }
    startRound(S.place.done ? 'srs' : 'place');
  };
  $('#btnArcade').onclick = function () {
    ctx();
    if (!S.arcade.runs) { var go = el('button', 'mc-btn wide primary', '<i class="ic" data-ic="pick"></i>出发'); go.onclick = function () { stopHow(); closeModal(); startArcade(); }; howModal('arcade', [go]); return; }
    startArcade();
  };
  $('#btnHelp').onclick = function () { howModal('practice'); };
  $('#btnArcHelp').onclick = function () { howModal('arcade'); };
  $('#btnMap').onclick = function () { show('map'); };
  $('#btnParent').onclick = function () { show('parent'); };
  $('#btnOralHome').onclick = startOral; $('#btnOral').onclick = startOral;
  $('#btnAgain').onclick = function () { if (lastGame === 'arcade') startArcade(); else startRound(S.place && !S.place.done ? 'place' : 'srs'); };
  $('#btnResMap').onclick = function () { show('map'); };
  $('#btnResHome').onclick = function () { show('home'); };
  var stopAll = function () { if (speaking) try { speaking.stop(); } catch (e) {} stopHow(); };
  $('#btnQuit').onclick = function () { if (G && G.mode === 'place') save(); G = null; stopAll(); show('home'); };
  $('#btnArcQuit').onclick = function () { if (A) { clearTimeout(A.q && A.q.timer); save(); } A = null; stopAll(); show('home'); };
  $('#arcSpeak').onclick = function () { if (A && A.q) speak(A.q.k).catch(audioErr); };
  $('#oralOk').onclick = function () { oralMark(true); };
  $('#oralBad').onclick = function () { oralMark(false); };
  $('#oralListen').onclick = function () { speak(O.list[O.i]).catch(function () {}); };
  $$('[data-go]').forEach(function (b) { b.onclick = function () { show(b.dataset.go); }; });
  $('#modal').addEventListener('click', function (e) { if (e.target.id === 'modal' || e.target.closest('.modal-x')) { stopHow(); closeModal(); } });
  window.addEventListener('resize', function () { if (cur === 'play') fitCard(); });
  document.addEventListener('keydown', function (e) {
    if (!$('#modal').hidden) return;
    var n = +e.key;
    if (cur === 'arcade' && A && A.q) { if (n >= 1 && n <= 4) { var bb = $$('#balloons .balloon')[n - 1]; if (bb) pickBalloon(n - 1, bb); } if (e.key === ' ') { e.preventDefault(); speak(A.q.k).catch(function () {}); } return; }
    if (cur !== 'play' || !G || !G.q) return;
    if (G.q.t === 'f') { if (n >= 1 && n <= 4) { var b = $$('#ores .ore')[n - 1]; if (b) pickChar(n - 1, b); } if (e.key === ' ') { e.preventDefault(); hear(); } return; }
    if (e.key === ' ') { e.preventDefault(); if (G.q.t0 == null) mine(); else hear(); }
    if (e.key === 'ArrowRight' || e.key === 'Enter') judge(true);
    if (e.key === 'ArrowLeft') judge(false);
  });
  document.addEventListener('visibilitychange', function () { if (document.hidden) save(); });
  window.__pinyin = { S: function () { return S; }, SYL: SYL, KEYS: KEYS, label: label, distractors: distractors, buildRound: buildRound, buildPlacement: buildPlacement, record: record,
    G: function () { return G; }, A: function () { return A; }, findTask: findTask, newChar: newChar, chInfo: chInfo, hasReading: hasReading };
  show('home');
}
init();
})();
