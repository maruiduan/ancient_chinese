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
function buildRound(flt) {
  var size = S.settings.size || 10, d = dayNum(), all = flt ? KEYS.filter(flt) : KEYS;
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
  var work = learning.slice(0, 6);
  if (work.length < 6) work = work.concat(pickNew(Math.min(4, 6 - work.length), work, flt));
  // 正在学的里虚词太少时，补一个虚词音节进来（让一局里有三成左右是虚词）
  var fwN = work.filter(isFw).length;
  if (fwN < 2 && work.length >= 4) { var more = learning.slice(6).filter(isFw).concat(newList().filter(function (k) { return isFw(k) && (!flt || flt(k)); })).filter(function (k) { return work.indexOf(k) < 0; }); if (more.length) work[work.length - 1] = more[0]; }
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
  return out.length ? out : shuffle(all.slice()).slice(0, size);
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
  if (id === 'home') renderHome(); if (id === 'map') renderMap(); if (id === 'parent') renderParent(); if (id === 'camp') renderCampMap();
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
  var info = chInfo(k), z = info.z; if (!z) return null;
  var fw = info.fw, target = fw && Math.random() < .8 ? pick(fw.split('')) : pick(z.split('')), used = {}, out = []; used[target] = 1;
  // 干扰字只用他认识的字（课本字表 + 常用虚词），按读音相近程度排好；任何读音含目标音节的字已在字库里排除，这里再查一遍
  function add(c, ck) { if (!c || used[c] || out.length >= 3 || hasReading(c, k)) return false; used[c] = 1; out.push({ c: c, k: ck }); return true; }
  var x = info.x || [], top = shuffle(x.slice(0, 7));
  top.forEach(function (p) { add(p[0], p[1]); });
  for (var i = 7; i < x.length && out.length < 3; i++) add(x[i][0], x[i][1]);
  if (out.length < 3) return null;
  return shuffle([{ c: target, k: k, right: true, fw: !!(fw && fw.indexOf(target) >= 0) }].concat(out));
}
/* 拼音分类：整体认读、三拼、前后鼻韵母、复韵母、单韵母（两拼） */
var ZT = 'zhi chi shi ri zi ci si yi wu yu ye yue yuan yin yun ying'.split(' ');
var CAT_NAME = { zt: '整体认读', sp: '三拼音节', nasal: '前后鼻韵母', fu: '复韵母', dan: '单韵母两拼', fw: '虚词小词' };
function cat(k) {
  var s = SYL[k], f = s.f;
  if (ZT.indexOf(s.b) >= 0) return 'zt';
  var three = ['ia', 'ua', 'uo', 'iao', 'uai', 'ian', 'uan', 'van', 'iang', 'uang', 'iong'].indexOf(f) >= 0;
  if (three && s.i && s.i !== 'y' && s.i !== 'w') return 'sp';
  if (/n$|ng$/.test(f)) return 'nasal';
  if (three || ['ai', 'ei', 'ui', 'ao', 'ou', 'iu', 'ie', 've', 'er'].indexOf(f) >= 0) return 'fu';
  return 'dan';
}
function isFw(k) { return !!chInfo(k).fw; }
// 每局新音节按这个顺序轮换分类：虚词约三成，三拼和整体认读多一些
var CAT_TURN = ['fw', 'sp', 'zt', 'fw', 'nasal', 'sp', 'fu', 'fw', 'zt', 'dan'];
function pickNew(n, taken, flt) {
  var pool = newList().filter(function (k) { return taken.indexOf(k) < 0 && (!flt || flt(k)); }), out = [];
  S.catTurn = S.catTurn || 0;
  for (var tries = 0; out.length < n && pool.length && tries < 30; tries++) {
    var c = CAT_TURN[S.catTurn % CAT_TURN.length]; S.catTurn++;
    var hit = pool.filter(function (k) { return c === 'fw' ? isFw(k) : cat(k) === c && !isFw(k); })[0];
    if (hit) { out.push(hit); pool.splice(pool.indexOf(hit), 1); }
  }
  while (out.length < n && pool.length) out.push(pool.shift());
  return out;
}
function noteChar(c, k, ok) { if (!c) return; S.chars = S.chars || {}; var x = S.chars[c] || (S.chars[c] = { k: k, n: 0, c: 0 }); x.n++; if (ok) x.c++; x.last = Date.now(); }

/* ========== 练习：拼音认字 + 按音找字 ========== */
var G = null; // 当前一局
function speakerHTML(id) { return '<button id="' + id + '" class="speaker" type="button" aria-label="听一听"><span class="waves"><i></i><i></i><i></i></span><canvas width="16" height="16" data-sprite="noteblock"></canvas></button>'; }
function startRound(mode, only) {
  ctx();
  var q;
  if (mode === 'place') {
    if (!S.place || S.place.done) S.place = { list: buildPlacement(), idx: 0, done: false, res: [] };
    q = S.place.list.slice(S.place.idx, S.place.idx + PLACE_SEG); // 每段 10 题，做完就休息
  } else q = buildRound(only === 'p' ? function (k) { return !!chInfo(k).z; } : null);
  G = { only: only || null, seenW: {}, startIdx: mode === 'place' ? S.place.idx : 0, mode: mode, queue: q, pos: 0, total: q.length, ups: [], extra: 0, marks: [], ok: 0, learned: [], lastT: null };
  lastGame = only === 'p' ? 'pick' : 'practice'; show('play');
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
  var wt = function (pr) { var ws = WBYK[k]; if (G.mode === 'place' || !ws || Math.random() >= pr) return null; var w = pick(ws); return wordTask(w); };
  if (G.only === 'p') {
    var w0 = wt(.6) || (Math.random() < .3 ? wordTask(pickWord(null, G.seenW)) : null); // 看图选拼音：我的世界词语
    if (w0) { G.seenW[w0.word.w] = 1; return { t: 'i', word: w0.word, opts: w0.opts }; }
    var p0 = pickTask(k); if (p0) return { t: 'p', c: p0.c, opts: p0.opts }; var f0 = findTask(k); return f0 ? { t: 'f', opts: f0 } : { t: 'w' }; }
  if (G.mode === 'srs' && G.pos < 2 && G.pos < G.total - 4) return { t: 'w' }; // 热身：只读拼音
  var w1 = wt(.35) || (G.mode !== 'place' && Math.random() < .12 ? wordTask(pickWord(null, G.seenW)) : null); if (w1) { G.seenW[w1.word.w] = 1; return { t: 'i', word: w1.word, opts: w1.opts }; }
  var f = findTask(k), c = newChar(k), pk = Math.random() < .4 ? pickTask(k) : null;
  if (pk) return { t: 'p', c: pk.c, opts: pk.opts }; // 看字选拼音
  if (f && isFw(k)) return { t: 'f', opts: f }; // 虚词：用按音找字练
  if (f && c) return (G.lastT === 'f' ? Math.random() < .75 : Math.random() < .25) ? { t: 'r', c: c } : { t: 'f', opts: f };
  if (f) return { t: 'f', opts: f };
  if (c) return { t: 'r', c: c };
  return { t: 'w' };
}
function nextQ() {
  if (G.pos >= G.queue.length) return endRound();
  var k = G.queue[G.pos], T = taskFor(k); G.lastT = T.t;
  var q = G.q = { k: k, t: T.t, c: T.c || (T.word ? T.word.w : null), word: T.word || null, opts: T.opts || null, t0: null, first: null, heard: false, done: false, wrong: false, shown: performance.now() };
  var st = $('#stage'); st.className = 'stage task-' + (T.t === 'f' ? 'find' : T.t === 'p' || T.t === 'i' ? 'find pickpy' + (T.t === 'i' ? ' pickword' : '') : 'read');
  if (T.t === 'f' || T.t === 'p' || T.t === 'i') renderFind(q, st); else renderRead(q, st);
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
  if (q.t === 'p' || q.t === 'i') return;
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
  flyItem(fromEl, MARK_TEX[mark](), slot, function () { if (!G) return; G.marks.push(mark); renderProgress(); });
  if (listen) {
    var go = false, nx = function () { if (!go) { go = true; advance(); } };
    speakQ(G.q).then(function (r) { setTimeout(nx, r.dur + 900); }).catch(function () { setTimeout(nx, 1200); });
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
  var P = q.t === 'p' || q.t === 'i';
  st.innerHTML = '<div class="find-prompt">' + (q.t === 'i' ? '<span class="pic-plate"><img src="' + WART[q.word.pic]() + '" alt=""><span class="pic-word hz">' + q.word.w + '</span></span>' : P ? '<span class="hz-plate hz">' + q.c + '</span>' : speakerHTML('btnSpeak') + '<span class="py-plate">' + label(q.k) + '</span>') + '</div><div id="ores" class="ores"></div><div class="ledge" aria-hidden="true"></div>';
  var box = $('#ores'), seed = rnd(1e6), names = shuffle(ORE_NAMES.slice());
  q.opts.forEach(function (o, i) {
    var b = el('button', 'ore'); b.type = 'button'; b.style.setProperty('--d', (i * .37) + 's');
    b.innerHTML = '<span class="face" style="background-image:url(' + oreTex(names[i], seed + i) + ')"></span><span class="lab ' + (P ? 'pyo' : 'hz') + '">' + (P ? o.l : o.c) + '</span>';
    var cr = makeCanvas(); cr.className = 'crack'; $('.face', b).appendChild(cr);
    b.addEventListener('pointerdown', function (ev) { ev.preventDefault(); pickChar(i, b); });
    box.appendChild(b);
  });
  if (!P) $('#btnSpeak').onclick = function () { hear(); };
  if (P) fitPy();
  setTimeout(function () { if (G && G.q === q) { q.t0 = performance.now(); if (!P) speak(q.k).catch(audioErr); } }, 450);
}
function fitPy() { fitAll($$('#ores .lab.pyo')); }
function pickChar(i, btn) {
  var q = G && G.q; if (!q || q.done) return;
  if (q.t0 == null) q.t0 = performance.now();
  var o = q.opts[i], rt = performance.now() - q.t0;
  if (o.right) {
    q.done = true; var first = !q.wrong, fast = first && rt <= FAST_MS, res = null;
    if (first && q.word) { recordWord(q, true, o, rt); G.ok++; G.learned.push([q.word.w, q.k, q.word.ks]); $('.pic-plate') && $('.pic-plate').classList.add('said'); }
    else if (first) { res = record(q.k, true, rt, fast); G.ok++; if (res.after > res.before) G.ups.push([q.k, res.after]); if (q.t === 'p') G.learned.push([q.c, q.k]); if (G.mode === 'place') S.place.res.push([q.k, 1, Math.round(rt)]); }
    logTime();
    breakOre(btn, function () {
      if (res && res.after > res.before && res.after >= 2) SFX.up();
      finishQ(first ? (fast ? 'done' : 'ok') : 'miss', $('.face', btn), q.word ? 1500 : 900);
    });
    if (q.word) $('.pic-plate').classList.add('said');
    speakQ(q).catch(function () {});
  } else {
    SFX.bonk(); btn.classList.remove('wrong'); void btn.offsetWidth; btn.classList.add('wrong');
    var ck = (q.word ? q.word.w : q.k) + '>' + (o.k || '*' + o.l); S.conf[ck] = (S.conf[ck] || 0) + 1;
    if (!q.wrong) {
      q.wrong = true; if (q.word) recordWord(q, false, o, rt); else record(q.k, false, rt, false);
      if (G.mode === 'place') S.place.res.push([q.k, 0, Math.round(rt)]); else requeue(q.k);
      logTime(); save();
    }
    setTimeout(function () {
      $$('#ores .ore').forEach(function (b, j) { if (q.opts[j].right) b.classList.add('hintme'); else b.classList.add('dim'); });
      speakQ(q).catch(function () {});
    }, 380);
  }
}
function advance() {
  if (!G) return;
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
function learnedHTML(list, max) {
  if (!list.length) return '';
  var seen = {}, cards = list.filter(function (x) { if (seen[x[0]]) return false; seen[x[0]] = 1; return true; }).slice(0, max || 12);
  return '<div class="learned">' + cards.map(function (x) { return '<button class="hz-card' + (x[2] ? ' word' : '') + '" type="button" data-k="' + x[1] + '"' + (x[2] ? ' data-ks="' + x[2].join(' ') + '"' : '') + '><span class="hz">' + x[0] + '</span><span class="py">' + (x[2] ? wordLabel(x[2]) : label(x[1])) + '</span></button>'; }).join('') + '</div>';
}
function bindLearned(root) { $$('.hz-card', root).forEach(function (b) { b.onclick = function () { (b.dataset.ks ? speakWord(b.dataset.ks.split(' ')) : speak(b.dataset.k)).catch(audioErr); }; }); }
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

/* ========== 像素画：怪物、末影龙、看图用的小图（全部程序绘制，自动描边） ========== */
function pxArt(key, w, h, fn) {
  if (texCache[key]) return texCache[key];
  var grid = [], y, x;
  for (y = 0; y < h; y++) grid.push(new Array(w));
  var P = function (x, y, col) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < w && y < h) grid[y][x] = col; };
  var api = {
    P: P,
    R: function (x, y, rw, rh, col) { for (var j = 0; j < rh; j++) for (var i = 0; i < rw; i++) P(x + i, y + j, typeof col === 'function' ? col(i, j) : col); },
    C: function (cx, cy, r, col) { for (var j = -r; j <= r; j++) for (var i = -r; i <= r; i++) if (i * i + j * j <= r * r + r * .6) P(cx + i, cy + j, col); },
    X: function (cx, cy, r) { for (var j = -r; j <= r; j++) for (var i = -r; i <= r; i++) if (i * i + j * j <= r * r + r * .6) { var xx = Math.round(cx + i), yy = Math.round(cy + j); if (grid[yy]) grid[yy][xx] = undefined; } }
  };
  fn(api);
  var c = makeCanvas(w, h), g = c.getContext('2d');
  for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
    if (grid[y][x]) { g.fillStyle = grid[y][x]; g.fillRect(x, y, 1, 1); }
    else if ((grid[y - 1] && grid[y - 1][x]) || (grid[y + 1] && grid[y + 1][x]) || grid[y][x - 1] || grid[y][x + 1]) { g.fillStyle = '#1d1d1d'; g.fillRect(x, y, 1, 1); }
  }
  return (texCache[key] = c.toDataURL());
}
var ART = {
  zombie: function () { return pxArt('zombie', 18, 18, function (a) { var r = seeded(3); a.R(5, 1, 8, 6, function () { return r() < .2 ? '#4f8f3c' : '#62a84c'; }); a.R(6, 3, 2, 1, '#1d1d1d'); a.R(10, 3, 2, 1, '#1d1d1d'); a.R(7, 5, 4, 1, '#3a6b2c'); a.R(5, 7, 8, 5, '#2fa3b3'); a.R(1, 7, 4, 2, '#62a84c'); a.R(13, 7, 4, 2, '#62a84c'); a.R(5, 12, 3, 5, '#3d4fa3'); a.R(10, 12, 3, 5, '#3d4fa3'); }); },
  skeleton: function () { return pxArt('skeleton', 18, 18, function (a) { a.R(5, 1, 8, 6, '#e6e6e6'); a.R(6, 3, 2, 2, '#3a3a3a'); a.R(10, 3, 2, 2, '#3a3a3a'); a.R(7, 5, 4, 1, '#9a9a9a'); a.R(7, 7, 4, 5, '#cfcfcf'); a.R(6, 8, 6, 1, '#e6e6e6'); a.R(6, 10, 6, 1, '#e6e6e6'); a.R(4, 7, 1, 6, '#cfcfcf'); a.R(13, 7, 1, 6, '#cfcfcf'); a.R(15, 5, 1, 9, '#8a5a2b'); a.R(14, 5, 1, 1, '#8a5a2b'); a.R(14, 13, 1, 1, '#8a5a2b'); a.R(7, 12, 1, 5, '#cfcfcf'); a.R(10, 12, 1, 5, '#cfcfcf'); }); },
  spider: function () { return pxArt('spider', 20, 14, function (a) { a.R(4, 4, 12, 6, '#463c3c'); a.R(6, 3, 8, 5, '#342c2c'); a.R(7, 5, 1, 1, '#ff5a4a'); a.R(12, 5, 1, 1, '#ff5a4a'); a.R(9, 6, 1, 1, '#ff5a4a'); a.R(10, 6, 1, 1, '#ff5a4a'); [[0, 5], [0, 8], [16, 5], [16, 8]].forEach(function (p) { a.R(p[0], p[1], 4, 1, '#342c2c'); }); a.R(1, 10, 2, 3, '#342c2c'); a.R(17, 10, 2, 3, '#342c2c'); a.R(4, 10, 1, 3, '#342c2c'); a.R(15, 10, 1, 3, '#342c2c'); }); },
  creeper: function () { return pxArt('creeper', 14, 20, function (a) { var r = seeded(9), m = function () { return r() < .25 ? '#8fdc6a' : r() < .3 ? '#4f9a37' : '#66c24a'; }; a.R(3, 1, 8, 8, m); a.R(4, 3, 2, 2, '#1d1d1d'); a.R(8, 3, 2, 2, '#1d1d1d'); a.R(6, 5, 2, 1, '#1d1d1d'); a.R(5, 6, 4, 2, '#1d1d1d'); a.R(5, 8, 1, 1, '#1d1d1d'); a.R(8, 8, 1, 1, '#1d1d1d'); a.R(4, 9, 6, 6, m); a.R(2, 15, 4, 4, m); a.R(8, 15, 4, 4, m); }); },
  dragon: function () { return pxArt('dragon', 40, 22, function (a) { a.R(9, 9, 20, 6, '#2e2540'); a.R(10, 15, 3, 4, '#2e2540'); a.R(22, 15, 3, 4, '#2e2540'); a.R(1, 11, 9, 3, '#2e2540'); a.R(0, 10, 2, 2, '#2e2540'); a.R(29, 7, 9, 6, '#2e2540'); a.R(36, 10, 3, 3, '#221b30'); a.R(33, 8, 3, 1, '#d98cff'); a.R(30, 12, 8, 1, '#4a3b63'); a.R(12, 1, 7, 8, '#45386a'); a.R(19, 3, 7, 6, '#45386a'); a.R(13, 2, 1, 6, '#5d4d8a'); a.R(21, 4, 1, 4, '#5d4d8a'); [12, 16, 20, 24].forEach(function (x) { a.R(x, 8, 1, 1, '#6b5a9c'); }); }); },
  arrow: function () { return pxArt('arrow', 18, 6, function (a) { a.R(2, 2, 12, 1, '#8a5a2b'); a.R(14, 1, 2, 3, '#bdbdbd'); a.R(16, 2, 1, 1, '#bdbdbd'); a.R(0, 1, 3, 1, '#f2f2f2'); a.R(0, 3, 3, 1, '#f2f2f2'); }); },
  orb: function () { return pxArt('orb', 10, 10, function (a) { a.C(5, 5, 3, '#b8ff3d'); a.R(4, 3, 2, 2, '#fffbd0'); }); },
  egg: function () { return pxArt('egg', 14, 16, function (a) { a.C(7, 9, 5, '#2b1a3d'); a.R(5, 2, 4, 3, '#2b1a3d'); a.R(4, 4, 6, 2, '#2b1a3d'); a.R(5, 7, 1, 1, '#9b59d9'); a.R(9, 10, 1, 1, '#9b59d9'); a.R(6, 12, 1, 1, '#9b59d9'); a.R(5, 4, 1, 2, '#4a2f66'); }); },
  crystal: function () { return pxArt('crystal', 12, 12, function (a) { a.R(3, 3, 6, 6, '#ff8de0'); a.R(4, 4, 4, 4, '#fff'); a.R(5, 5, 2, 2, '#ff4fc8'); }); },
  house: function () { return pxArt('vhouse', 34, 30, function (a) { var r = seeded(4); a.R(3, 12, 28, 17, function (i, j) { return j % 4 === 3 ? '#8a6236' : r() < .15 ? '#b88a52' : '#c79a5e'; }); a.R(1, 10, 32, 3, '#6b4a26'); for (var j = 0; j < 10; j++) a.R(16 - j - 1, j, 2 * j + 4, 1, j % 3 ? '#9c3b32' : '#b54a3e'); a.R(13, 19, 8, 10, '#5a3c1e'); a.R(19, 24, 1, 1, '#e2c26a'); a.R(5, 16, 5, 5, '#a9dcff'); a.R(24, 16, 5, 5, '#a9dcff'); a.R(7, 16, 1, 5, '#6b4a26'); a.R(26, 16, 1, 5, '#6b4a26'); }); },
  villager: function () { return pxArt('villager', 14, 18, function (a) { a.R(3, 0, 8, 7, '#d9a57a'); a.R(6, 5, 2, 4, '#c58a5e'); a.R(4, 3, 2, 1, '#2f5a24'); a.R(8, 3, 2, 1, '#2f5a24'); a.R(4, 2, 6, 1, '#6b4a26'); a.R(2, 8, 10, 9, '#7a5034'); a.R(3, 10, 8, 3, '#8a6040'); }); },
  pillar: function () { return pxArt('pillar', 12, 40, function (a) { var r = seeded(8); a.R(1, 4, 10, 36, function () { return r() < .3 ? '#2a2233' : '#1c1624'; }); a.R(2, 0, 8, 4, '#ff8de0'); a.R(4, 1, 4, 2, '#fff'); }); },
  // 看图选拼音用的小图
  sun: function () { return pxArt('p_sun', 18, 18, function (a) { a.C(9, 9, 5, '#ffd23f'); a.C(8, 8, 2, '#fff2a0'); [[9, 1], [9, 16], [1, 9], [16, 9], [3, 3], [14, 3], [3, 14], [14, 14]].forEach(function (p) { a.R(p[0], p[1], 1, 1, '#ffb21a'); }); }); },
  moon: function () { return pxArt('p_moon', 18, 18, function (a) { a.C(9, 9, 7, '#fff1a8'); a.X(13, 6, 6); a.R(5, 9, 1, 1, '#e5d27a'); a.R(7, 13, 1, 1, '#e5d27a'); }); },
  star: function () { return pxArt('p_star', 18, 18, function (a) { a.R(8, 1, 2, 16, '#ffd23f'); a.R(1, 8, 16, 2, '#ffd23f'); a.R(6, 5, 6, 8, '#ffd23f'); a.R(5, 6, 8, 6, '#ffd23f'); a.R(8, 6, 2, 2, '#fff6c8'); }); },
  fish: function () { return pxArt('p_fish', 20, 14, function (a) { a.R(5, 4, 10, 6, '#4aa8ff'); a.R(7, 3, 6, 8, '#4aa8ff'); a.R(1, 3, 3, 8, '#2f78bd'); a.R(3, 5, 2, 4, '#2f78bd'); a.R(12, 5, 1, 1, '#1d1d1d'); a.R(8, 7, 4, 1, '#8fd0ff'); a.R(15, 6, 2, 2, '#4aa8ff'); }); },
  flower: function () { return pxArt('p_flower', 16, 20, function (a) { a.R(7, 9, 2, 10, '#3f9a2c'); a.R(9, 13, 3, 2, '#57c23a'); a.C(5, 5, 2, '#ef5b4c'); a.C(11, 5, 2, '#ef5b4c'); a.C(8, 2, 2, '#ef5b4c'); a.C(8, 8, 2, '#ef5b4c'); a.C(8, 5, 2, '#ffd23f'); }); },
  fire: function () { return pxArt('p_fire', 16, 18, function (a) { a.C(8, 12, 5, '#ff7a1a'); a.R(6, 3, 4, 6, '#ff7a1a'); a.R(4, 6, 2, 3, '#ff7a1a'); a.R(10, 5, 2, 4, '#ff7a1a'); a.C(8, 13, 3, '#ffd23f'); a.R(7, 9, 2, 3, '#ffd23f'); a.R(8, 14, 1, 1, '#fff6c8'); }); },
  mountain: function () { return pxArt('p_mountain', 22, 16, function (a) { for (var j = 0; j < 14; j++) { a.R(11 - j, j + 1, 2 * j + 1, 1, j < 4 ? '#ffffff' : '#8b8f99'); } for (j = 0; j < 8; j++) a.R(17 - j, j + 7, 2 * j + 1, 1, '#6d717b'); }); },
  rain: function () { return pxArt('p_rain', 18, 18, function (a) { a.C(6, 6, 4, '#e8eef5'); a.C(11, 5, 5, '#e8eef5'); a.R(3, 7, 13, 3, '#e8eef5'); [[4, 12], [8, 14], [12, 12], [6, 16], [14, 15]].forEach(function (p) { a.R(p[0], p[1], 1, 2, '#3c8fe0'); }); }); },
  cloud: function () { return pxArt('p_cloud', 20, 14, function (a) { a.C(6, 7, 4, '#ffffff'); a.C(12, 5, 5, '#ffffff'); a.R(3, 8, 15, 4, '#ffffff'); a.R(4, 10, 13, 1, '#dfe8f2'); }); },
  water: function () { return pxArt('p_water', 14, 18, function (a) { a.C(7, 11, 5, '#3c8fe0'); a.R(6, 2, 2, 3, '#3c8fe0'); a.R(5, 4, 4, 3, '#3c8fe0'); a.R(4, 6, 6, 2, '#3c8fe0'); a.R(5, 9, 2, 3, '#a9dcff'); }); },
  tree: function () { return pxArt('p_tree', 18, 20, function (a) { var r = seeded(5); a.C(9, 7, 6, function () { return '#4f9a2c'; }); a.R(8, 12, 3, 7, '#8a6236'); a.R(5, 4, 2, 2, '#62b23a'); a.R(11, 8, 2, 2, '#3f8424'); }); },
  heart: function () { return spriteURL('heart'); }
};
// 看图选拼音：图 → 字 → 带调音节（全是课本里的常用字）
var PICS = [['sun', '日', 'ri4'], ['moon', '月', 'yue4'], ['star', '星', 'xing1'], ['fish', '鱼', 'yu2'], ['flower', '花', 'hua1'], ['fire', '火', 'huo3'],
  ['mountain', '山', 'shan1'], ['rain', '雨', 'yu3'], ['cloud', '云', 'yun2'], ['water', '水', 'shui3'], ['tree', '树', 'shu4'], ['heart', '心', 'xin1']].filter(function (p) { return SYL[p[2]]; });

/* ========== 看字选拼音：容易拼错的拼音当干扰项 ========== */
function readLabels(c) { var r = PYC.R[c]; return (r ? r.split(',') : []).map(function (k) { return mark(k.slice(0, -1), +k.slice(-1) % 5); }); }
var SWAP_I = { z: 'zh', zh: 'z', c: 'ch', ch: 'c', s: 'sh', sh: 's', b: 'd', d: 'b', p: 'q', q: 'p', n: 'l', l: 'n', f: 'h', h: 'f' };
var ZERO = { yi: 'i', wu: 'u', yu: 'v', ye: 'ie', yue: 've', yuan: 'van', yin: 'in', yun: 'vn', ying: 'ing', ya: 'ia', yao: 'iao', you: 'iu', yan: 'ian', yang: 'iang', yong: 'iong',
  wa: 'ua', wo: 'uo', wai: 'uai', wei: 'ui', wan: 'uan', wen: 'un', wang: 'uang', weng: 'ueng' };
function pyVariants(k) {
  var s = SYL[k], b = s.b, t = s.t, i = s.i || '', rest = b.slice(i.length), out = [];
  var add = function (b2, t2, w, kind) { if (b2 && b2 !== b || t2 !== t) out.push({ b: b2, t: t2, w: w, kind: kind }); };
  [1, 2, 3, 4].forEach(function (t2) { if (t2 !== t) add(b, t2, 2, 'tone'); });
  if (SWAP_I[i]) add(SWAP_I[i] + rest, t, 3);
  var m = rest.match(/^(.*?)(ng|n)$/); if (m && m[1]) add(i + m[1] + (m[2] === 'n' ? 'ng' : 'n'), t, 3);
  if (i && /^u(ang|an|ai|a|o)$/.test(rest)) { add(i + rest.slice(1), t, 3); if (rest === 'uang') add(i + 'uan', t, 3); }
  if (i && /^i(ang|an|ao|a|ong)$/.test(rest)) add(i + rest.slice(1), t, 2.5);
  if (/^(zh|ch|sh|g|k|h)$/.test(i) && /^(ang|an|ai|a|o)$/.test(rest)) add(i + 'u' + rest, t, 2);
  if (rest === 'ui') add(i + 'iu', t, 3); if (rest === 'iu') add(i + 'ui', t, 3);
  if (rest === 'ie') add(i + 've', t, 3); if (rest === 'ue' && /^[jqx]$/.test(i)) add(i + 'ie', t, 3);
  if (/^[jqx]$/.test(i) && /^u/.test(rest)) add(i + 'v' + rest.slice(1), t, 3);
  if (/^[nl]$/.test(i) && /^v/.test(rest)) add(i + 'u' + rest.slice(1), t, 3);
  if (ZERO[b]) add(ZERO[b], t, 3);
  if (/^(zh|ch|sh|r|z|c|s)$/.test(i) && rest === 'i') add(i + 'e', t, 1.5);
  return out;
}
// 4 个拼音：1 个对的 + 3 个容易混的（最多 1 个只差声调的，尽量让他看拼写）
function pyOptions(k, c) {
  var right = label(k), bad = {}, used = {};
  readLabels(c).forEach(function (l) { bad[l] = 1; }); bad[right] = 1;
  var vs = pyVariants(k).map(function (v) { return { l: mark(v.b, v.t), w: v.w + Math.random() * 1.2, kind: v.kind }; }).filter(function (v) { return !bad[v.l]; });
  vs.sort(function (a, b) { return b.w - a.w; });
  var out = [], tones = 0;
  vs.forEach(function (v) { if (out.length >= 3 || used[v.l]) return; if (v.kind === 'tone' && tones >= 1 && vs.filter(function (x) { return x.kind !== 'tone' && !used[x.l]; }).length) return; used[v.l] = 1; if (v.kind === 'tone') tones++; out.push(v.l); });
  vs.forEach(function (v) { if (out.length < 3 && !used[v.l]) { used[v.l] = 1; out.push(v.l); } });
  if (out.length < 3) return null;
  return shuffle([{ l: right, right: true }].concat(out.map(function (l) { return { l: l }; })));
}
function pickTask(k) {
  var info = chInfo(k); if (!info.z) return null;
  var c = info.fw && Math.random() < .8 ? pick(info.fw.split('')) : pick(info.z.split(''));
  var opts = pyOptions(k, c); return opts ? { c: c, opts: opts } : null;
}

/* ========== 我的世界词语：原创像素图（程序绘制，不用任何官方贴图） ========== */
function px16(key, w, h, fn) { return pxArt('w_' + key, w, h, fn); }
function noisy(seed, cols, p) { var r = seeded(seed); return function () { var x = r(); return x < (p || .25) ? cols[1] : x < (p || .25) * 1.6 && cols[2] ? cols[2] : cols[0]; }; }
var WART = {
  enderman: function () { return px16('enderman', 12, 26, function (a) { a.R(2, 0, 8, 8, '#1c1622'); a.R(3, 4, 2, 1, '#d76bff'); a.R(7, 4, 2, 1, '#d76bff'); a.R(2, 4, 1, 1, '#f3c6ff'); a.R(9, 4, 1, 1, '#f3c6ff'); a.R(3, 8, 6, 7, '#231b2b'); a.R(1, 8, 1, 12, '#1c1622'); a.R(10, 8, 1, 12, '#1c1622'); a.R(4, 15, 1, 11, '#1c1622'); a.R(7, 15, 1, 11, '#1c1622'); }); },
  slime: function () { return px16('slime', 16, 15, function (a) { a.R(1, 1, 14, 13, noisy(21, ['#79d35a', '#93e36f', '#5fb544'])); a.R(3, 4, 3, 3, '#2f6b22'); a.R(10, 4, 3, 3, '#2f6b22'); a.R(3, 4, 1, 1, '#c8f7b0'); a.R(10, 4, 1, 1, '#c8f7b0'); a.R(6, 10, 4, 1, '#2f6b22'); }); },
  bat: function () { return px16('bat', 20, 12, function (a) { a.R(8, 3, 4, 6, '#5a4232'); a.R(8, 1, 1, 2, '#5a4232'); a.R(11, 1, 1, 2, '#5a4232'); a.R(9, 4, 1, 1, '#1d1d1d'); a.R(10, 4, 1, 1, '#1d1d1d'); [[1, 3], [3, 2], [5, 3]].forEach(function (p) { a.R(p[0], p[1], 3, 5, '#3c2c22'); a.R(18 - p[0] - 2, p[1], 3, 5, '#3c2c22'); }); a.R(0, 7, 2, 2, '#3c2c22'); a.R(18, 7, 2, 2, '#3c2c22'); }); },
  cow: function () { return px16('cow', 22, 16, function (a) { a.R(3, 4, 14, 7, '#5a3a22'); a.R(6, 4, 4, 3, '#f2f2f2'); a.R(12, 7, 4, 3, '#f2f2f2'); a.R(4, 9, 3, 2, '#f2f2f2'); a.R(15, 2, 6, 7, '#5a3a22'); a.R(16, 6, 5, 3, '#f0c9b0'); a.R(17, 7, 1, 1, '#1d1d1d'); a.R(19, 7, 1, 1, '#1d1d1d'); a.R(16, 3, 1, 1, '#1d1d1d'); a.R(19, 3, 1, 1, '#1d1d1d'); a.R(15, 1, 1, 1, '#e8e2c8'); a.R(20, 1, 1, 1, '#e8e2c8'); [3, 6, 12, 15].forEach(function (x) { a.R(x, 11, 2, 4, '#3a2616'); }); a.R(9, 11, 3, 1, '#f0a8b8'); }); },
  pig: function () { return px16('pig', 22, 15, function (a) { a.R(3, 4, 14, 7, '#f2a7a7'); a.R(15, 2, 6, 7, '#f2a7a7'); a.R(19, 5, 3, 3, '#e58a90'); a.R(20, 6, 1, 1, '#9a4a50'); a.R(16, 4, 1, 1, '#1d1d1d'); a.R(18, 4, 1, 1, '#ffffff'); a.R(5, 5, 3, 2, '#f8c4c4'); [3, 6, 12, 15].forEach(function (x) { a.R(x, 11, 2, 3, '#e58a90'); }); }); },
  sheep: function () { return px16('sheep', 22, 16, function (a) { a.R(2, 3, 15, 9, noisy(31, ['#f4f4f0', '#ffffff', '#dcdcd6'])); a.R(15, 4, 6, 6, '#bfb3a6'); a.R(16, 6, 1, 1, '#1d1d1d'); a.R(19, 6, 1, 1, '#1d1d1d'); a.R(17, 8, 2, 1, '#f0a8b8'); a.R(15, 3, 6, 1, '#f4f4f0'); [3, 6, 12, 15].forEach(function (x) { a.R(x, 12, 2, 3, '#bfb3a6'); }); }); },
  chicken: function () { return px16('chicken', 14, 16, function (a) { a.R(2, 6, 9, 6, '#f6f6f2'); a.R(7, 1, 5, 7, '#f6f6f2'); a.R(12, 3, 2, 2, '#f2b233'); a.R(11, 5, 1, 2, '#e04a3a'); a.R(9, 3, 1, 1, '#1d1d1d'); a.R(1, 6, 2, 3, '#e8e8e0'); a.R(4, 8, 4, 3, '#dcdcd2'); a.R(5, 12, 1, 3, '#f2b233'); a.R(8, 12, 1, 3, '#f2b233'); }); },
  horse: function () { return px16('horse', 22, 18, function (a) { a.R(2, 6, 14, 6, '#a86a3a'); a.R(14, 1, 4, 8, '#a86a3a'); a.R(17, 2, 4, 4, '#a86a3a'); a.R(19, 5, 2, 2, '#7a4a26'); a.R(17, 3, 1, 1, '#1d1d1d'); a.R(13, 0, 2, 7, '#3a2616'); a.R(0, 6, 2, 5, '#3a2616'); [2, 5, 11, 14].forEach(function (x) { a.R(x, 12, 2, 5, '#8a5430'); a.R(x, 16, 2, 1, '#3a2616'); }); }); },
  wolf: function () { return px16('wolf', 22, 15, function (a) { a.R(3, 4, 12, 6, '#d8d8d4'); a.R(14, 2, 6, 6, '#d8d8d4'); a.R(19, 5, 3, 2, '#bdbdb8'); a.R(21, 5, 1, 1, '#1d1d1d'); a.R(16, 4, 1, 1, '#1d1d1d'); a.R(14, 1, 1, 1, '#bdbdb8'); a.R(18, 1, 1, 1, '#bdbdb8'); a.R(0, 3, 3, 2, '#d8d8d4'); a.R(8, 4, 5, 2, '#bdbdb8'); [4, 7, 11, 13].forEach(function (x) { a.R(x, 10, 1, 4, '#bdbdb8'); }); a.R(14, 8, 3, 1, '#e04a3a'); }); },
  cat: function () { return px16('cat', 20, 14, function (a) { a.R(3, 5, 11, 5, '#f2a23a'); a.R(5, 5, 1, 5, '#c97a1e'); a.R(8, 5, 1, 5, '#c97a1e'); a.R(11, 5, 1, 5, '#c97a1e'); a.R(13, 2, 6, 6, '#f2a23a'); a.R(13, 1, 1, 1, '#f2a23a'); a.R(18, 1, 1, 1, '#f2a23a'); a.R(14, 4, 1, 1, '#2f8a3a'); a.R(17, 4, 1, 1, '#2f8a3a'); a.R(15, 6, 2, 1, '#f0a8b8'); a.R(0, 2, 1, 4, '#f2a23a'); a.R(1, 5, 2, 1, '#f2a23a'); [4, 6, 10, 12].forEach(function (x) { a.R(x, 10, 1, 3, '#c97a1e'); }); }); },
  bee: function () { return px16('bee', 18, 14, function (a) { a.R(6, 1, 4, 3, '#dff4ff'); a.R(10, 1, 4, 3, '#c7e9ff'); a.R(3, 4, 12, 7, '#f6c932'); a.R(6, 4, 2, 7, '#3a2a1a'); a.R(10, 4, 2, 7, '#3a2a1a'); a.R(13, 6, 1, 1, '#1d1d1d'); a.R(1, 7, 2, 1, '#3a2a1a'); }); },
  panda: function () { return px16('panda', 22, 16, function (a) { a.R(2, 5, 13, 7, '#f4f4f0'); a.R(5, 5, 6, 7, '#2a2a2a'); a.R(13, 2, 8, 8, '#f4f4f0'); a.R(13, 1, 2, 2, '#2a2a2a'); a.R(19, 1, 2, 2, '#2a2a2a'); a.R(14, 4, 2, 2, '#2a2a2a'); a.R(18, 4, 2, 2, '#2a2a2a'); a.R(16, 7, 2, 1, '#2a2a2a'); [2, 5, 10, 13].forEach(function (x) { a.R(x, 12, 3, 3, '#2a2a2a'); }); }); },
  gem: function () { return px16('gem', 16, 14, function (a) { a.R(3, 1, 10, 3, '#a8fff4'); a.R(1, 4, 14, 2, '#5ee8d8'); a.R(3, 6, 10, 2, '#3cc8bc'); a.R(5, 8, 6, 2, '#2aa89e'); a.R(7, 10, 2, 2, '#1f8a82'); a.R(5, 2, 2, 1, '#ffffff'); }); },
  emerald: function () { return px16('emerald', 12, 16, function (a) { a.R(4, 0, 4, 2, '#8ff0a0'); a.R(2, 2, 8, 2, '#4fd36a'); a.R(1, 4, 10, 8, '#2fb24c'); a.R(2, 12, 8, 2, '#1f8a3a'); a.R(4, 14, 4, 2, '#17702e'); a.R(3, 4, 2, 6, '#7ae890'); }); },
  redstone: function () { return px16('redstone', 16, 12, function (a) { [[2, 6], [5, 3], [8, 7], [11, 4], [6, 9], [12, 8], [3, 9]].forEach(function (p, i) { a.R(p[0], p[1], 2 + (i % 2), 2, i % 3 ? '#d1281e' : '#ff5a4a'); }); }); },
  sword: function () { return px16('sword', 16, 16, function (a) { for (var i = 0; i < 9; i++) { a.R(5 + i, 9 - i, 2, 2, i < 8 ? '#e6e6ea' : '#ffffff'); a.R(6 + i, 10 - i, 1, 1, '#a8a8b0'); } a.R(2, 9, 6, 2, '#6b4a26'); a.R(4, 7, 2, 6, '#6b4a26'); a.R(1, 12, 3, 3, '#8a6236'); }); },
  pickaxe: function () { return spriteURL('pickaxe'); },
  axe: function () { return px16('axe', 16, 16, function (a) { for (var i = 0; i < 11; i++) a.R(3 + i, 14 - i, 1, 1, '#8a6236'); a.R(9, 1, 5, 6, '#d8d8de'); a.R(8, 2, 1, 4, '#d8d8de'); a.R(13, 2, 2, 3, '#a8a8b0'); }); },
  bow: function () { return px16('bow2', 14, 18, function (a) { for (var t = 0; t <= 32; t++) { var u = t / 32, x = 2 + Math.round(9 * Math.sin(Math.PI * u)), y = 1 + Math.round(15 * u); a.R(x, y, 2, 1, u < .15 || u > .85 ? '#6b4a26' : '#9a6a36'); } a.R(2, 1, 1, 16, '#e6e6e6'); a.R(9, 7, 3, 3, '#5a3c1e'); }); },
  arrowi: function () { return px16('arrowi', 16, 16, function (a) { for (var i = 0; i < 10; i++) a.R(3 + i, 12 - i, 1, 1, '#8a5a2b'); a.R(11, 1, 4, 2, '#bdbdbd'); a.R(13, 1, 2, 4, '#bdbdbd'); a.R(1, 12, 2, 3, '#f2f2f2'); a.R(2, 14, 3, 1, '#f2f2f2'); }); },
  ingot: function () { return px16('ingot', 18, 10, function (a) { a.R(3, 1, 12, 2, '#f4f4f4'); a.R(2, 3, 14, 4, '#d8d8d8'); a.R(1, 7, 16, 2, '#a8a8a8'); }); },
  goldi: function () { return px16('goldi', 18, 10, function (a) { a.R(3, 1, 12, 2, '#fff3a0'); a.R(2, 3, 14, 4, '#f6cf3a'); a.R(1, 7, 16, 2, '#c99a12'); }); },
  coal: function () { return px16('coal', 14, 12, function (a) { a.R(3, 1, 7, 2, '#4a4a4a'); a.R(1, 3, 12, 6, '#2a2a2a'); a.R(3, 9, 8, 2, '#1d1d1d'); a.R(4, 3, 2, 2, '#666'); a.R(9, 6, 1, 1, '#555'); }); },
  mapi: function () { return spriteURL('map'); },
  clock: function () { return px16('clock', 16, 16, function (a) { a.C(8, 8, 6, '#e0b030'); a.C(8, 8, 4, '#bfe8ff'); a.R(4, 9, 9, 3, '#62b23a'); a.R(7, 4, 2, 2, '#fff3a0'); a.R(8, 6, 1, 3, '#3a2a1a'); }); },
  minecart: function () { return px16('minecart', 20, 14, function (a) { a.R(1, 2, 18, 2, '#9a9aa0'); a.R(2, 4, 16, 6, '#6e6e76'); a.R(4, 5, 12, 2, '#55555c'); a.R(3, 10, 4, 3, '#3a3a3a'); a.R(13, 10, 4, 3, '#3a3a3a'); a.R(4, 11, 2, 1, '#777'); a.R(14, 11, 2, 1, '#777'); }); },
  cobble: function () { return blockTex(0); },
  log: function () { return px16('log', 16, 16, function (a) { var r = seeded(41); a.R(0, 0, 16, 16, function (i) { return i % 3 === 0 ? '#5a3c1e' : r() < .2 ? '#7a5430' : '#6b4a26'; }); a.R(3, 3, 10, 10, '#c9a066'); a.R(5, 5, 6, 6, '#b88a52'); a.R(7, 7, 2, 2, '#9c7444'); }); },
  grassb: function () { return grassTex(); },
  cactus: function () { return px16('cactus', 16, 18, function (a) { a.R(5, 0, 6, 18, function (i, j) { return i === 0 || i === 5 ? '#2f7d1b' : j % 4 === 1 && i % 2 ? '#1f5a12' : '#4fa82f'; }); a.R(1, 6, 4, 2, '#4fa82f'); a.R(1, 3, 2, 3, '#4fa82f'); a.R(11, 8, 4, 2, '#4fa82f'); a.R(13, 5, 2, 3, '#4fa82f'); }); },
  tree: function () { return px16('tree2', 18, 22, function (a) { var r = seeded(81); a.R(2, 1, 14, 11, function () { var x = r(); return x < .25 ? '#62b23a' : x < .45 ? '#3f8424' : '#4f9a2c'; }); a.R(0, 4, 18, 6, function () { var x = r(); return x < .25 ? '#62b23a' : x < .45 ? '#3f8424' : '#4f9a2c'; }); a.R(7, 12, 4, 10, function (i, j) { return i === 1 || (j % 3 === 0 && i === 2) ? '#5a3c1e' : '#7a5430'; }); }); },
  flower: function () { return ART.flower(); },
  lava: function () { return px16('lava', 16, 16, function (a) { var r = seeded(51); a.R(0, 0, 16, 16, function (i, j) { var x = r(); return x < .18 ? '#ffd23f' : x < .5 ? '#ff7a1a' : '#e8501a'; }); a.R(3, 4, 4, 1, '#fff6c8'); a.R(9, 10, 3, 1, '#fff6c8'); }); },
  torch: function () { return px16('torch', 8, 18, function (a) { a.R(3, 6, 2, 12, '#8a6236'); a.R(2, 2, 4, 4, '#ffd23f'); a.R(3, 3, 2, 2, '#fff6c8'); a.R(3, 0, 2, 2, '#ff7a1a'); }); },
  bed: function () { return px16('bed', 22, 12, function (a) { a.R(1, 4, 20, 4, '#d33a2f'); a.R(1, 2, 6, 3, '#f4f4f0'); a.R(1, 8, 20, 2, '#b88a52'); a.R(1, 10, 2, 2, '#8a6236'); a.R(19, 10, 2, 2, '#8a6236'); a.R(8, 4, 13, 1, '#e85a4c'); }); },
  door: function () { return px16('door', 12, 22, function (a) { a.R(1, 1, 10, 20, '#a8784a'); a.R(2, 2, 3, 5, '#d8eef8'); a.R(7, 2, 3, 5, '#d8eef8'); a.R(1, 9, 10, 1, '#7a5430'); a.R(1, 15, 10, 1, '#7a5430'); a.R(8, 11, 2, 1, '#3a2a1a'); }); },
  chest: function () { return px16('chest', 18, 15, function (a) { a.R(1, 1, 16, 5, '#b8823a'); a.R(1, 6, 16, 1, '#5a3c1e'); a.R(1, 7, 16, 7, '#a8722e'); a.R(7, 4, 4, 5, '#d8d8de'); a.R(8, 5, 2, 2, '#3a3a3a'); a.R(1, 1, 16, 1, '#d8a050'); }); },
  table: function () { return px16('table', 16, 16, function (a) { a.R(0, 0, 16, 4, function (i) { return i % 4 === 0 ? '#5a3c1e' : '#b88a52'; }); a.R(0, 4, 16, 12, '#9c7444'); a.R(2, 6, 3, 6, '#5a3c1e'); a.R(6, 6, 4, 3, '#c8c8c8'); a.R(11, 6, 3, 6, '#5a3c1e'); a.R(7, 9, 2, 5, '#6b4a26'); a.R(2, 1, 3, 2, '#7a5430'); a.R(10, 1, 4, 2, '#7a5430'); }); },
  furnace: function () { return px16('furnace', 16, 16, function (a) { a.R(0, 0, 16, 16, noisy(61, ['#8a8a8a', '#a0a0a0', '#6e6e6e'])); a.R(3, 3, 10, 2, '#4a4a4a'); a.R(4, 8, 8, 5, '#2a2a2a'); a.R(5, 10, 6, 3, '#ff7a1a'); a.R(6, 11, 4, 1, '#ffd23f'); }); },
  tnt: function () { return px16('tnt', 16, 16, function (a) { a.R(0, 0, 16, 16, function (i) { return i % 4 === 3 ? '#b02a20' : '#d8392c'; }); a.R(0, 5, 16, 6, '#f4f4f0'); a.R(3, 7, 10, 2, '#2a2a2a'); a.R(0, 0, 16, 1, '#8a8a8a'); a.R(0, 15, 16, 1, '#8a8a8a'); }); },
  portal: function () { return px16('portal', 16, 20, function (a) { var r = seeded(71); a.R(0, 0, 16, 20, '#22182e'); a.R(2, 2, 12, 16, function () { var x = r(); return x < .3 ? '#c86bff' : x < .6 ? '#9a3ae0' : '#7a26c0'; }); a.R(1, 0, 1, 20, '#3a2a4e'); a.R(14, 0, 1, 20, '#3a2a4e'); }); },
  house: function () { return ART.house(); },
  apple: function () { return px16('apple', 14, 15, function (a) { a.C(7, 9, 5, '#e0392c'); a.R(3, 8, 2, 2, '#ff8a7a'); a.R(6, 1, 1, 4, '#6b4a26'); a.R(7, 2, 3, 2, '#4fa82f'); }); },
  bread: function () { return px16('bread', 20, 10, function (a) { a.R(2, 2, 16, 6, '#c98a3a'); a.R(4, 1, 12, 1, '#c98a3a'); a.R(1, 4, 18, 3, '#b8782e'); [5, 9, 13].forEach(function (x) { a.R(x, 3, 2, 1, '#f2d08a'); }); }); },
  cake: function () { return px16('cake', 18, 14, function (a) { a.R(1, 3, 16, 4, '#f8f6f0'); a.R(1, 7, 16, 6, '#c98a5a'); a.R(1, 8, 16, 1, '#f8f6f0'); [3, 8, 13].forEach(function (x) { a.R(x, 4, 2, 2, '#e0392c'); }); a.R(8, 0, 2, 3, '#f6c932'); a.R(2, 6, 2, 2, '#f8f6f0'); a.R(11, 6, 2, 3, '#f8f6f0'); }); },
  melon: function () { return px16('melon', 18, 12, function (a) { for (var j = 0; j < 9; j++) a.R(1 + j, 1 + j, 16 - 2 * j, 1, j < 7 ? '#e8463a' : '#f2f2e8'); a.R(1, 0, 16, 1, '#3f9a2c'); [[5, 3], [9, 2], [12, 3], [8, 5]].forEach(function (p) { a.R(p[0], p[1], 1, 1, '#1d1d1d'); }); }); },
  pumpkin: function () { return px16('pumpkin', 16, 15, function (a) { a.R(1, 3, 14, 11, function (i) { return i % 4 === 0 ? '#c86a12' : '#f28a1e'; }); a.R(7, 0, 2, 3, '#4f7a2a'); a.R(4, 6, 2, 2, '#3a2010'); a.R(10, 6, 2, 2, '#3a2010'); a.R(4, 10, 8, 1, '#3a2010'); }); },
  eggw: function () { return px16('eggw', 12, 15, function (a) { a.C(6, 9, 5, '#f6ecd8'); a.R(4, 2, 4, 3, '#f6ecd8'); a.R(3, 5, 6, 2, '#f6ecd8'); a.R(3, 6, 2, 2, '#ffffff'); }); },
  milk: function () { return px16('milk', 16, 16, function (a) { a.R(2, 4, 12, 10, '#c8c8cc'); a.R(3, 5, 10, 3, '#ffffff'); a.R(1, 3, 14, 2, '#9a9aa0'); a.R(4, 0, 8, 1, '#9a9aa0'); a.R(3, 1, 1, 2, '#9a9aa0'); a.R(12, 1, 1, 2, '#9a9aa0'); }); },
  villager: function () { return ART.villager(); }, dragon: function () { return ART.dragon(); }, creeper: function () { return ART.creeper(); },
  zombie: function () { return ART.zombie(); }, skeleton: function () { return ART.skeleton(); }, spider: function () { return ART.spider(); }, fish: function () { return ART.fish(); }
};
// 词表来自 build_chars.py（每个字的读音都核对过）：[词, 带调音节, 图, 类别, 每个字的全部读音]
var WORDS = (PYC.W || []).map(function (w) { return { w: w[0], ks: w[1].split(' '), pic: w[2], cat: w[3], rs: w[4].map(function (r) { return r.split(','); }) }; })
  .filter(function (w) { return WART[w.pic] && w.ks.every(function (k) { return SYL[k]; }); });
var WBYK = {}; WORDS.forEach(function (w) { w.ks.forEach(function (k) { (WBYK[k] = WBYK[k] || []).push(w); }); });
function wordLabel(ks) { return ks.map(label).join(' '); }
// 整词拼音的 4 个选项：每个错的只改一个音节（改成这个音节常见的拼错），而且改出来的不能是这个字的任何读音
function wordOptions(w) {
  var right = wordLabel(w.ks), cand = [];
  w.ks.forEach(function (k, i) {
    var bad = {}; w.rs[i].forEach(function (r) { bad[r] = 1; }); bad[k] = 1;
    pyVariants(k).forEach(function (v) {
      var k2 = v.b + v.t; if (bad[k2]) return;
      var ks2 = w.ks.slice(); var lab = w.ks.map(function (kk, j) { return j === i ? mark(v.b, v.t) : label(kk); }).join(' ');
      cand.push({ l: lab, pos: i, w: v.w + Math.random() * 1.4, tone: v.kind === 'tone' });
    });
  });
  cand.sort(function (a, b) { return b.w - a.w; });
  var out = [], used = {}, posN = {}, tones = 0; used[right] = 1;
  var take = function (c, strict) {
    if (out.length >= 3 || used[c.l]) return;
    if (strict && (c.tone && tones >= 1 || (posN[c.pos] || 0) >= (w.ks.length > 1 ? 1 : 3))) return;
    used[c.l] = 1; out.push(c); posN[c.pos] = (posN[c.pos] || 0) + 1; if (c.tone) tones++;
  };
  cand.forEach(function (c) { take(c, true); }); cand.forEach(function (c) { take(c, false); });
  if (out.length < 3) return null;
  return shuffle([{ l: right, right: true }].concat(out.map(function (c) { return { l: c.l, pos: c.pos }; })));
}
function wordTask(w) { var o = wordOptions(w); return o ? { word: w, opts: o } : null; }
// 连着播一个词的每个音节（每个音节都是核对过的录音）
function speakWord(ks) {
  return Promise.all(ks.map(loadBuf)).then(function (bs) {
    var a = ctx(); if (speaking) { try { speaking.stop(); } catch (e) {} }
    var t = a.currentTime + .03, last = null, sp = $$('.speaker'); sp.forEach(function (e) { e.classList.add('playing'); });
    bs.forEach(function (b) { var s = a.createBufferSource(); s.buffer = b; s.connect(a.destination); s.start(t); t += b.duration + .06; last = s; });
    speaking = last; last.onended = function () { if (speaking === last) { speaking = null; sp.forEach(function (e) { e.classList.remove('playing'); }); } };
    return { start: performance.now(), dur: (t - a.currentTime) * 1000 };
  });
}
function speakQ(q) { return q.word ? speakWord(q.word.ks) : speak(q.k); }
// 记掌握度：答对算这个词每个音节练对一次（不算「快」）；答错只记错在被改的那个音节
function recordWord(q, ok, opt, rt) {
  var w = q.word; S.words = S.words || {}; var x = S.words[w.w] || (S.words[w.w] = { n: 0, c: 0 }); x.n++; if (ok) x.c++;
  if (ok) w.ks.forEach(function (k) { record(k, true, rt, false); });
  else if (opt && opt.pos != null) record(w.ks[opt.pos], false, rt, false);
}
function pickWord(prefer, avoid) {
  var pool = WORDS.filter(function (w) { return !avoid || !avoid[w.w]; }); if (!pool.length) pool = WORDS;
  if (prefer && Math.random() < .65) { var p2 = pool.filter(function (w) { return prefer.indexOf(w.cat) >= 0; }); if (p2.length) pool = p2; }
  // 没见过或常错的词优先
  var sc = function (w) { var x = (S.words || {})[w.w]; return (x ? x.c / (x.n + 1) : -.5) + Math.random() * .8; };
  pool.sort(function (a, b) { return sc(a) - sc(b); });
  return pool[0];
}

/* ========== 冒险：矿洞下潜、守护村庄、末地决战 ========== */
var A = null, lastGame = 'practice';
var CHAPTERS = [
  { id: 1, name: '矿洞下潜', sub: '答对一题挖下一块', n: 12, time: [13, 8], icon: function () { return oreTex('diamond', 5); }, reward: 'diamond', pic: .34, cats: ['b', 'i'] },
  { id: 2, name: '守护村庄', sub: '答对就射箭赶走怪物', n: 10, time: [13, 8], icon: function () { return ART.house(); }, reward: 'orb', pic: .4, cats: ['m', 'a'] },
  { id: 3, name: '末地决战', sub: '答对一题打末影龙一下', n: 10, time: [12, 7.5], icon: function () { return ART.egg(); }, reward: 'egg', pic: .34, cats: ['m', 'i'] }
];
var LAYERS = [['grass', 1], ['dirt', 2], ['stone', 3], ['iron', 2], ['gold', 2], ['diamond', 2]];
function layerTex(name, seed) { return name === 'grass' ? grassTex() : name === 'dirt' ? dirtTex() : name === 'stone' ? blockTex(0) : oreTex(name, seed); }
function campState() { S.camp = S.camp || { done: {}, best: {}, inv: {}, runs: 0 }; return S.camp; }
function campQueue() {
  var d = dayNum(), bonus = { sp: -.7, zt: -.7, nasal: -.35, fu: -.25, dan: 0 };
  var c = KEYS.filter(function (k) { return chInfo(k).z; });
  var score = function (k) { var x = S.items[k], b = (isFw(k) ? -1.1 : 0) + bonus[cat(k)] + (Math.random() - .5) * 1.4; if (!x || !x.n) return 2 + SYL[k].r / 400 + b; if (x.lv >= 3) return ((x.due || 0) <= d ? 1 : 6) + b; return (x.lv === 2 ? .5 : 0) + b; };
  c.sort(function (a, b) { return score(a) - score(b); });
  // 分类轮换：同一类不连着出
  var head = c.slice(0, 60), out = [], last = null;
  while (head.length) { var i = 0; while (i < head.length - 1 && cat(head[i]) === last) i++; out.push(head[i]); last = cat(head[i]); head.splice(i, 1); }
  return out;
}
// 一道冒险题：看字选拼音 / 看图选拼音 / 按音找字
function campQuestion() {
  var r = Math.random();
  A.usedW = A.usedW || {};
  if (r < A.ch.pic && WORDS.length) { var wd = pickWord(A.ch.cats, A.usedW), wo = wd && wordOptions(wd); if (wo) { A.usedW[wd.w] = 1; return { type: 'i', k: wd.ks[0], c: wd.w, word: wd, pic: wd.pic, opts: wo }; } }
  r = A.ch.pic + Math.random() * (1 - A.ch.pic);
  for (var tries = 0; tries < 6; tries++) {
    if (A.qi >= A.queue.length) { A.queue = campQueue(); A.qi = 0; }
    var k = A.queue[A.qi++];
    if (r < A.ch.pic + (1 - A.ch.pic) * .52) { var t = pickTask(k); if (t) return { type: 'p', k: k, c: t.c, opts: t.opts }; }
    var f = findTask(k); if (f) return { type: 'f', k: k, opts: f.map(function (o) { return { l: o.c, right: o.right, k: o.k }; }) };
  }
  return null;
}
function renderCampMap() {
  var st = campState(), box = $('#campNodes'); box.innerHTML = '';
  CHAPTERS.forEach(function (ch, i) {
    var open = i === 0 || st.done[CHAPTERS[i - 1].id], done = st.done[ch.id];
    var b = el('button', 'node' + (open ? '' : ' locked') + (done ? ' done' : ''), '<span class="node-ic" style="background-image:url(' + ch.icon() + ')"></span><span class="node-n">' + ch.id + '</span><span class="node-name">' + ch.name + '</span><span class="node-sub">' + ch.sub + '</span>' +
      (done ? '<span class="node-star" style="background-image:url(' + spriteURL('check') + ')"></span>' : '') + (open ? '' : '<span class="node-lock">锁</span>'));
    b.type = 'button'; b.style.setProperty('--i', i);
    b.onclick = function () { if (!open) { toast('先完成第 ' + (i) + ' 章'); SFX.bonk(); return; } startChapter(ch.id); };
    box.appendChild(b);
  });
  var inv = st.inv, names = { grass: '草方块', dirt: '泥土', stone: '石头', iron: '铁矿', gold: '金矿', diamond: '钻石矿', orb: '经验球', egg: '龙蛋' }, html = '';
  Object.keys(names).forEach(function (n) { var tex = n === 'orb' || n === 'egg' ? ART[n]() : layerTex(n, 3); html += '<span class="slot' + (inv[n] ? '' : ' empty') + '" title="' + names[n] + '"><i style="background-image:url(' + tex + ')"></i>' + (inv[n] ? '<b>' + inv[n] + '</b>' : '') + '</span>'; });
  $('#campInv').innerHTML = html;
}
function startChapter(id) {
  ctx(); lastGame = 'camp';
  var ch = CHAPTERS[id - 1];
  A = { ch: ch, seed: rnd(6), i: 0, hearts: 3, ok: 0, n: 0, learned: [], queue: campQueue(), qi: 0, got: [], start: performance.now(), hp: ch.n };
  show('game'); $('#game').dataset.ch = id; $('#chName').textContent = ch.name;
  buildScene(); renderHud(); setTimeout(nextCampQ, 900);
}
function renderHud() {
  var h = ''; for (var i = 0; i < 3; i++) h += '<i class="ic' + (i < A.hearts ? '' : ' lost') + '" style="background-image:url(' + spriteURL('heart') + ')"></i>'; $('#hearts').innerHTML = h;
  $('#chProg').style.width = (100 * A.i / A.ch.n) + '%';
}
function qTime() { var t = A.ch.time; return t[0] + (t[1] - t[0]) * Math.min(1, A.i / (A.ch.n - 1)); }
function nextCampQ() {
  if (!A) return;
  if (A.hearts <= 0) return endChapter(false);
  if (A.i >= A.ch.n) return endChapter(true);
  var q = campQuestion(); if (!q) return endChapter(true);
  q.T = qTime(); q.shown = performance.now(); q.t0 = null; q.done = false; q.wrong = false; A.q = q;
  var pr = $('#qPrompt'), sp = $('#qSpeak');
  if (q.type === 'f') { pr.className = 'q-prompt py'; pr.innerHTML = label(q.k); sp.hidden = false; }
  else if (q.type === 'p') { pr.className = 'q-prompt hz'; pr.innerHTML = q.c; sp.hidden = true; }
  else { pr.className = 'q-prompt pic'; pr.innerHTML = '<img src="' + WART[q.pic]() + '" alt=""><span class="pic-word hz">' + q.c + '</span>'; sp.hidden = true; }
  pr.classList.add('pop');
  $('#qType').style.backgroundImage = 'url(' + spriteURL(q.type === 'f' ? 'note' : q.type === 'p' ? 'book' : 'map') + ')';
  var box = $('#qOpts'); box.innerHTML = '';
  q.opts.forEach(function (o, i) {
    var b = el('button', 'qopt ' + (q.type === 'f' ? 'hz' : 'py'), '<span class="qk">' + (i + 1) + '</span><span class="ql">' + o.l + '</span>'); b.type = 'button';
    b.style.animationDelay = (i * .05) + 's';
    b.addEventListener('pointerdown', function (e) { e.preventDefault(); campAnswer(i, b); });
    box.appendChild(b);
  });
  fitOpts();
  var bar = $('#qTimer'); bar.style.transition = 'none'; bar.style.width = '100%'; void bar.offsetWidth; bar.style.transition = 'width ' + q.T + 's linear'; bar.style.width = '0%';
  setTimeout(function () { if (A && A.q === q) { q.t0 = performance.now(); if (q.type === 'f') speak(q.k).catch(function () {}); } }, 300);
  q.timer = setTimeout(function () { campTimeout(q); }, q.T * 1000 + 300);
  sceneQ(q);
  (q.word ? q.word.ks : [q.k]).forEach(function (k) { loadBuf(k).catch(function () {}); });
}
function fitAll(ls) { var f = 1e9; ls.forEach(function (l) { l.style.fontSize = ''; }); ls.forEach(function (l) { var w = l.parentNode.clientWidth * .86, cur = parseFloat(getComputedStyle(l).fontSize); f = Math.min(f, l.offsetWidth > w ? Math.floor(cur * w / l.offsetWidth) : cur); }); if (f < 1e9) ls.forEach(function (l) { l.style.fontSize = f + 'px'; }); }
function fitOpts() { fitAll($$('#qOpts .ql')); }
function stopTimer() { var bar = $('#qTimer'); bar.style.width = getComputedStyle(bar).width; bar.style.transition = 'none'; }
function campAnswer(i, b) {
  var q = A && A.q; if (!q || q.done || b.classList.contains('no')) return;
  if (q.t0 == null) q.t0 = performance.now();
  var o = q.opts[i], rt = performance.now() - q.t0;
  if (o.right) {
    q.done = true; clearTimeout(q.timer); stopTimer(); b.classList.add('yes');
    if (!q.wrong && q.word) A.ok++;
    if (!q.wrong && !q.word) { var res = record(q.k, true, rt, rt <= FAST_MS); A.ok++; if (res.after > res.before && res.after >= 2) setTimeout(SFX.up, 500); }
    if (q.word) { if (!q.wrong) recordWord(q, true, o, rt); A.learned.push([q.c, q.k, q.word.ks]); $('#qPrompt').classList.add('said'); } else A.learned.push([q.c || o.l, q.k]);
    A.n++; logTime(); save();
    speakQ(q).catch(function () {});
    A.i++; renderHud();
    sceneHit(q, function () { setTimeout(nextCampQ, 250); });
  } else {
    SFX.bonk(); b.classList.add('no');
    if (q.type === 'f') { var ck = q.k + '>' + o.k; S.conf[ck] = (S.conf[ck] || 0) + 1; } else { var ck2 = (q.word ? q.word.w : q.k) + '>*' + o.l; S.conf[ck2] = (S.conf[ck2] || 0) + 1; }
    if (!q.wrong) { q.wrong = true; if (q.word) recordWord(q, false, o, rt); else record(q.k, false, rt, false); logTime(); save(); sceneMiss(q, false); }
  }
}
function campTimeout(q) {
  if (!A || A.q !== q || q.done) return; q.done = true;
  if (!q.wrong) { if (q.word) recordWord(q, false, null, q.T * 1000); else record(q.k, false, q.T * 1000, false); }
  A.n++; logTime(); save(); if (q.word) $('#qPrompt').classList.add('said');
  $$('#qOpts .qopt').forEach(function (b, j) { if (q.opts[j].right) b.classList.add('show'); else b.classList.add('no'); });
  speakQ(q).catch(function () {});
  sceneMiss(q, true, function () { A.i++; renderHud(); setTimeout(nextCampQ, 600); });
}
function loseHeart() { A.hearts = Math.max(0, A.hearts - 1); renderHud(); var h = $$('#hearts .ic')[A.hearts]; if (h) h.classList.add('lose'); }
function addInv(n) { var st = campState(); st.inv[n] = (st.inv[n] || 0) + 1; A.got.push(n); }
function flyTo(img, from, to, cb) {
  var r = rect(from), t = rect(to), g = el('img', 'drop-gem'); g.src = img; var x0 = r.left + r.width / 2 - 32, y0 = r.top + r.height / 2 - 32; g.style.left = x0 + 'px'; g.style.top = y0 + 'px'; $('#fx3').appendChild(g);
  var a = g.animate([{ transform: 'translate(0,0) scale(.4)' }, { transform: 'translate(0,-50px) scale(1)', offset: .3 }, { transform: 'translate(' + (t.left + t.width / 2 - 32 - x0) + 'px,' + (t.top + t.height / 2 - 32 - y0) + 'px) scale(.55)' }], { duration: 650, easing: 'ease-in-out', fill: 'forwards' });
  a.onfinish = function () { g.remove(); SFX.gem(); to.classList.remove('pop'); void to.offsetWidth; to.classList.add('pop'); if (cb) cb(); };
}
function bagSlot() { var s = $('#bag'); return s; }
function updBag() { var g = A.got, html = ''; g.slice(-9).forEach(function (n) { html += '<span class="slot got"><i style="background-image:url(' + (n === 'orb' || n === 'egg' || n === 'crystal' ? ART[n]() : layerTex(n, 4)) + ')"></i></span>'; }); for (var i = g.slice(-9).length; i < 9; i++) html += '<span class="slot"></span>'; $('#bag').innerHTML = html; }

/* 场景 */
function buildScene() {
  var sc = $('#scene'), id = A.ch.id; sc.className = 'scene ch' + id; sc.innerHTML = '';
  updBag();
  if (id === 1) {
    var col = el('div', 'shaft'); sc.appendChild(col);
    var seq = []; LAYERS.forEach(function (l) { for (var i = 0; i < l[1]; i++) seq.push(l[0]); });
    A.blocks = seq;
    seq.forEach(function (n, i) {
      var row = el('div', 'srow'); row.style.setProperty('--r', i);
      for (var x = 0; x < 7; x++) { var mid = x === 3, side = i === 0 ? 'grass' : i < 3 ? 'dirt' : (function (v) { return v < .07 ? 'iron' : v < .11 ? 'copper' : v < .14 && i > 6 ? 'redstone' : v < .16 && i > 8 ? 'lapis' : 'stone'; })(seeded(i * 13 + x)()); var bl = el('i', 'blk' + (mid ? ' mid' : ''), mid ? '<canvas class="crack" width="16" height="16"></canvas>' : ''); bl.style.backgroundImage = 'url(' + layerTex(mid ? n : side, i * 7 + x) + ')'; row.appendChild(bl); }
      if (i > 1 && i % 3 === 1) { var tc = el('img', 'wtorch'); tc.src = WART.torch(); row.children[i % 2 ? 2 : 4].appendChild(tc); }
      if (i === 5 || i === 9) { var bt = el('img', 'cbat'); bt.src = WART.bat(); row.children[i === 5 ? 5 : 1].appendChild(bt); }
      col.appendChild(row);
    });
    var surf = el('div', 'surface'); [['tree', 'oak'], ['table', 'tbl'], ['chest', 'chs'], ['cow', 'cow'], ['pig', 'pig'], ['flower', 'flw'], ['sheep', 'shp']].forEach(function (d) { var im = el('img', 'sf ' + d[1]); im.src = WART[d[0]](); surf.appendChild(im); }); col.appendChild(surf);
    var bottom = el('div', 'srow bedrock'); for (var x = 0; x < 7; x++) bottom.appendChild(el('i', 'blk bed')); col.appendChild(bottom);
    var hero = el('img', 'miner'); hero.src = spriteURL('hero'); sc.appendChild(hero);
    var pk = el('img', 'pick'); pk.src = spriteURL('pickaxe', 2); sc.appendChild(pk);
    A.depth = 0; placeMiner(true);
    sc.appendChild(el('div', 'depth', '<b id="depthN">0</b> 米'));
  } else if (id === 2) {
    sc.innerHTML = '<i class="moon"></i><i class="stars"></i><div class="hillsb"></div><div class="field"></div><img class="vhouse" src="' + ART.house() + '"><img class="villager" src="' + ART.villager() + '"><img class="roofcat" src="' + WART.cat() + '"><img class="farm hen" src="' + WART.chicken() + '"><img class="farm cw" src="' + WART.cow() + '"><img class="farm shp" src="' + WART.sheep() + '"><img class="ftorch" src="' + WART.torch() + '"><img class="archer" src="' + spriteURL('hero') + '"><i class="fence"></i><div id="mobs" class="mobs"></div>';
  } else {
    sc.innerHTML = '<div class="endland"></div><img class="pillar p1" src="' + ART.pillar() + '"><img class="pillar p2" src="' + ART.pillar() + '"><img class="pillar p3" src="' + ART.pillar() + '">' +
      '<img class="eman e1" src="' + WART.enderman() + '"><img class="eman e2" src="' + WART.enderman() + '"><img class="eportal" src="' + WART.portal() + '">' +
      '<div class="boss"><img id="dragon" class="dragon" src="' + ART.dragon() + '"></div><img class="archer end" src="' + spriteURL('hero') + '"><div class="boss-hp"><span>末影龙</span><div class="hpbar"><i id="hpFill"></i></div></div>';
  }
}
function placeMiner(instant) {
  var sc = $('#scene'), rows = $$('.shaft .srow', sc), r = rows[A.depth]; if (!r) return;
  var b = r.children[3], cell = { width: b.offsetWidth, height: b.offsetHeight }, shaft = $('.shaft', sc);
  // 镜头跟着往下：当前这一层保持在场景偏中间
  var off = Math.max(0, shaft.offsetTop + r.offsetTop - sc.clientHeight * .52);
  shaft.style.transition = instant ? 'none' : 'transform .5s cubic-bezier(.3,1.2,.6,1)'; shaft.style.transform = 'translateY(' + (-off) + 'px)';
  var top = shaft.offsetTop + r.offsetTop - off - cell.height * .8, left = shaft.offsetLeft + b.offsetLeft;
  var m = $('.miner', sc), pk = $('.pick', sc);
  [m, pk].forEach(function (e) { e.style.transition = instant ? 'none' : 'top .45s cubic-bezier(.5,0,.6,1.4)'; });
  m.style.left = (left + cell.width * .1) + 'px'; m.style.top = top + 'px'; m.style.width = m.style.height = (cell.width * .8) + 'px';
  pk.style.left = (left + cell.width * .62) + 'px'; pk.style.top = (top + cell.height * .2) + 'px'; pk.style.width = pk.style.height = (cell.width * .55) + 'px';
}
function sceneQ(q) {
  var id = A.ch.id, sc = $('#scene');
  if (id === 2) {
    var kinds = ['zombie', 'skeleton', 'spider', 'creeper', 'enderman', 'slime'], k = kinds[(A.i + A.seed) % 6];
    var mob = el('img', 'mob ' + k); mob.src = (ART[k] || WART[k])(); $('#mobs').appendChild(mob); q.mob = mob; q.mobKind = k;
    void mob.offsetWidth; mob.style.transition = 'left ' + q.T + 's linear'; mob.classList.add('walk');
  } else if (id === 3) {
    $('#dragon').classList.add('fly');
  }
}
function sceneHit(q, cb) {
  var id = A.ch.id, sc = $('#scene');
  if (id === 1) {
    var row = $$('.shaft .srow', sc)[A.depth], blk = row.children[3], cr = $('canvas', blk), name = A.blocks[A.depth], pk = $('.pick', sc), st = 0;
    pk.classList.add('swing'); SFX.hit(); drawCrack(cr, 0);
    var h = setInterval(function () {
      st++; if (st <= 2) { SFX.hit(); drawCrack(cr, st); return; }
      clearInterval(h); pk.classList.remove('swing'); SFX.brk(); burstAt(blk); blk.classList.add('gone');
      addInv(name); flyTo(layerTex(name, A.depth), blk, $('#bag').children[Math.min(8, A.got.length - 1)], function () { updBag(); });
      A.depth++; $('#depthN').textContent = A.depth * 3;
      if (A.depth < A.blocks.length) placeMiner(); else { var m = $('.miner', sc); m.style.transition = 'top .5s'; m.style.top = (parseFloat(m.style.top) + blk.clientHeight) + 'px'; }
      setTimeout(cb, 520);
    }, 110);
  } else if (id === 2) {
    var mob = q.mob; shootArrow($('.archer', sc), mob, function () {
      mob.style.transition = 'none'; mob.style.left = getComputedStyle(mob).left; mob.classList.add('poof'); burstAt(mob, '#ffffff'); SFX.brk();
      addInv('orb'); flyTo(ART.orb(), mob, $('#bag').children[Math.min(8, A.got.length - 1)], function () { updBag(); });
      setTimeout(function () { mob.remove(); cb(); }, 450);
    });
  } else {
    var dr = $('#dragon'); shootArrow($('.archer', sc), dr, function () {
      dr.classList.remove('hit'); void dr.offsetWidth; dr.classList.add('hit'); setTimeout(function () { dr.classList.remove('hit'); }, 260); SFX.brk(); A.hp--; $('#hpFill').style.width = (100 * A.hp / A.ch.n) + '%';
      burstAt(dr, '#d98cff');
      if (A.i % 3 === 0) { addInv('crystal'); updBag(); }
      setTimeout(cb, 500);
    });
  }
}
function sceneMiss(q, timeout, cb) {
  var id = A.ch.id, sc = $('#scene');
  if (id === 1) {
    if (timeout) { loseHeart(); var m = $('.miner', sc); m.classList.add('ouch'); setTimeout(function () { m.classList.remove('ouch'); }, 500); }
    else { var row = $$('.shaft .srow', sc)[A.depth]; if (row) { row.children[3].classList.add('nope'); setTimeout(function () { row.children[3].classList.remove('nope'); }, 400); } }
    if (cb) setTimeout(function () { if (A) sceneHit(q, cb); }, 1100); // 超时也把这块挖开，钻石层一定挖得到
  } else if (id === 2) {
    var mob = q.mob;
    if (!timeout) { mob.classList.add('hop'); setTimeout(function () { mob.classList.remove('hop'); }, 400); var cur2 = parseFloat(getComputedStyle(mob).left); mob.style.transition = 'none'; mob.style.left = cur2 + 'px'; void mob.offsetWidth; var left = Math.max(0, (performance.now() - q.shown) / 1000); mob.style.transition = 'left ' + Math.max(1.5, q.T - left - 2) + 's linear'; mob.style.left = ''; mob.classList.add('walk'); q.T -= 0; }
    else { loseHeart(); mob.classList.add('boom'); SFX.pop(); burstAt(mob, q.mobKind === 'creeper' ? '#8fdc6a' : '#bbbbbb'); setTimeout(function () { mob.remove(); }, 500); if (cb) setTimeout(cb, 1500); }
  } else {
    if (timeout) { loseHeart(); var dr = $('#dragon'); dr.classList.add('swoop'); setTimeout(function () { dr.classList.remove('swoop'); }, 1100); if (cb) setTimeout(cb, 1500); }
    else { var d2 = $('#dragon'); d2.classList.add('roar'); setTimeout(function () { d2.classList.remove('roar'); }, 500); }
  }
}
function shootArrow(from, to, cb) {
  var a = rect(from), b = rect(to), ar = el('img', 'arrow-fly'); ar.src = ART.arrow(); $('#fx3').appendChild(ar);
  var x0 = a.right - 10, y0 = a.top + a.height * .35, x1 = b.left + b.width * .4, y1 = b.top + b.height * .45, ang = Math.atan2(y1 - y0, x1 - x0) * 180 / Math.PI;
  ar.style.left = x0 + 'px'; ar.style.top = y0 + 'px'; SFX.combo();
  ar.animate([{ transform: 'translate(0,0) rotate(' + ang + 'deg)' }, { transform: 'translate(' + (x1 - x0) + 'px,' + (y1 - y0) + 'px) rotate(' + ang + 'deg)' }], { duration: 320, easing: 'linear', fill: 'forwards' }).onfinish = function () { ar.remove(); cb(); };
}
function burstAt(elm, col) {
  var r = rect(elm), fx = $('#fx3'), tex = col ? null : elm.style.backgroundImage;
  for (var i = 0; i < 16; i++) {
    var f = el('i', 'frag'); f.style.left = (r.left + r.width / 2) + 'px'; f.style.top = (r.top + r.height / 2) + 'px';
    if (tex) { f.style.backgroundImage = tex; f.style.backgroundSize = (r.width / 3) + 'px'; f.style.backgroundPosition = rnd(30) + 'px ' + rnd(30) + 'px'; } else f.style.background = col;
    fx.appendChild(f); var ang = Math.PI * 2 * i / 16, d = 50 + rnd(60);
    f.animate([{ transform: 'translate(0,0)', opacity: 1 }, { transform: 'translate(' + Math.cos(ang) * d + 'px,' + (Math.sin(ang) * d + 60) + 'px) rotate(' + rnd(360) + 'deg)', opacity: 0 }], { duration: 700, easing: 'ease-out' }).onfinish = (function (n) { return function () { n.remove(); }; })(f);
  }
}
function endChapter(win) {
  if (!A) return; var a = A; clearTimeout(a.q && a.q.timer); A = null;
  var st = campState(); st.runs++;
  var reward = a.ch.reward;
  if (win) { st.done[a.ch.id] = (st.done[a.ch.id] || 0) + 1; st.best[a.ch.id] = Math.max(st.best[a.ch.id] || 0, a.hearts); if (reward === 'egg' || reward === 'diamond') { st.inv[reward] = (st.inv[reward] || 0) + (reward === 'egg' ? 1 : 0); } }
  save();
  show('result'); $('#btnAgain .lbl').textContent = win ? '再玩这一章' : '再试一次';
  lastGame = 'camp'; lastChapter = a.ch.id;
  $('#resIcon').style.backgroundImage = 'url(' + (win ? (reward === 'egg' ? ART.egg() : reward === 'orb' ? ART.house() : oreTex('diamond', 5)) : spriteURL('heart')) + ')';
  $('#resTitle').textContent = win ? (a.ch.id === 3 ? '打败末影龙！' : a.ch.id === 2 ? '村庄守住了！' : '挖到钻石了！') : '休息一下，再来！';
  var up = $('#resUp'), next = win && a.ch.id < 3 ? '<p class="res-sub">第 ' + (a.ch.id + 1) + ' 章「' + CHAPTERS[a.ch.id].name + '」开启了</p>' : '';
  up.innerHTML = '<div class="arc-sum"><span class="hearts-left">' + [0, 1, 2].map(function (i) { return '<i class="ic' + (i < a.hearts ? '' : ' lost') + '" style="background-image:url(' + spriteURL('heart') + ')"></i>'; }).join('') + '</span><span class="res-score">答对 <b>' + a.ok + '</b> / ' + a.n + '</span></div>' + next +
    '<div class="up-slots">' + (function () { var c = {}, ord = []; a.got.forEach(function (n) { if (!c[n]) ord.push(n); c[n] = (c[n] || 0) + 1; }); return ord.map(function (n) { return slotHTML(n === 'orb' || n === 'egg' || n === 'crystal' ? ART[n]() : layerTex(n, 4), c[n] > 1 ? c[n] : null); }).join(''); })() + '</div>' + learnedHTML(a.learned, 8);
  bindLearned(up);
  if (win) SFX.up();
}
var lastChapter = 1;

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
    '<p class="small" style="margin-top:8px">所有玩法都记到同一张拼音地图上：<b>拼音认字</b>（一个多半不认识的常用字，下面标着拼音，孩子自己读出来，可以点小喇叭听录音对照，再自己点勾或叉）、<b>按音找字</b>（看拼音、听读音，从 4 个学过的字里点出对的）、<b>看字选拼音</b>（给一个学过的字，从 4 个拼音里点出对的，错的是常见拼错）、<b>冒险闯关</b>（矿洞、守村、末地三章，三种题混着出，有时间条和 3 颗心）。' +
    '每局前两题是只有拼音的热身。录音只是参考，不当裁判；爸爸抽查读错会把这个音节退回铁。</p><p class="small">掌握标准：同一个带调音节连续 3 次「又快又对」变成金（看到题目后 3 秒内答对；自评时先点了喇叭再判对的不算快），第二天以后再答对变成钻石。答错退回铁。</p>' +
    (S.legacy ? '<p class="small">第一版「听音选拼音」的旧记录换算不了新的掌握度，已经原样保存在导出文件的 legacy 字段里。</p>' : '');
  body.appendChild(p1);
  // 拼音分类覆盖
  var cs0 = {}; KEYS.forEach(function (k) { [cat(k)].concat(isFw(k) ? ['fw'] : []).forEach(function (g) { var m = cs0[g] || (cs0[g] = { all: 0, seen: 0, dia: 0, n: 0, c: 0 }); m.all++; var x = S.items[k]; if (x && x.n) { m.seen++; m.n += x.n; m.c += x.c; } if (x && x.lv === 3) m.dia++; }); });
  var pC = el('div', 'panel');
  pC.innerHTML = '<h3>拼音分类</h3><table><tr><th>分类</th><th>带调音节</th><th>练过</th><th>钻石</th><th>正确率</th></tr>' + ['zt', 'sp', 'nasal', 'fu', 'dan', 'fw'].map(function (g) { var m = cs0[g] || { all: 0, seen: 0, dia: 0, n: 0 }; return '<tr><td>' + CAT_NAME[g] + '</td><td>' + m.all + '</td><td>' + m.seen + '</td><td>' + m.dia + '</td><td>' + (m.n ? Math.round(100 * m.c / m.n) + '%' : '-') + '</td></tr>'; }).join('') +
    '</table><p class="small">每局新音节按分类轮换（虚词约三成，三拼和整体认读多一些）。虚词小词一行是按音找字题里的「这、那、哪、在、再、得、地……」等。</p>';
  body.appendChild(pC);
  // 认字和闯关
  var cs = Object.keys(S.chars || {}), cOk = cs.filter(function (ch) { return S.chars[ch].c > 0; });
  var pA = el('div', 'panel');
  pA.innerHTML = '<h3>认字和闯关</h3><p>拼音认字见过 ' + cs.length + ' 个新字，自己读对过 ' + cOk.length + ' 个。' + (cOk.length ? '<br><span class="hz-list">' + cOk.slice(-40).join(' ') + '</span>' : '') + '</p>' +
    (function () { var ws = S.words || {}, seen = Object.keys(ws), n = 0, c = 0; seen.forEach(function (w) { n += ws[w].n; c += ws[w].c; }); return '<p>我的世界词语（看图选拼音）共 ' + WORDS.length + ' 个，见过 ' + seen.length + ' 个' + (n ? '，答对 ' + Math.round(100 * c / n) + '%' : '') + '。</p>'; })() +
    '<p>冒险玩过 ' + campState().runs + ' 次，通关：' + CHAPTERS.map(function (c) { return c.name + (campState().done[c.id] ? ' ✓' : ' -'); }).join('、') + '。</p><p class="small">认字只用最常用的 1000 个字里、他课本字表（一年级和二年级上册）以外的字，没有合适的字的音节只做纯拼音热身；按音找字的 4 个字全部是他认识的字（课本字表加常用虚词），干扰字按读音相近程度挑。</p>';
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
  p4.innerHTML = '<h3>常混的音</h3>' + (conf.length ? '<table><tr><th>要找的音</th><th>点成了</th><th>次数</th></tr>' + conf.map(function (c2) {
    var parts = c2[0].split('>'), w = parts[1].charAt(0) === '*' ? parts[1].slice(1) + '（错误写法）' : (SYL[parts[1]] ? label(parts[1]) : parts[1].replace(/5$/, '（轻声）').replace(/v/g, 'ü'));
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
  camp: '冒险里每一题都有时间。看到字，点出它的拼音；看到图，点出它的拼音；看到拼音、听到读音，就点出对的字。答对了就能挖矿、射箭、打末影龙。',
  pick: '看字，点出它的拼音。小心声调、前鼻音后鼻音、平舌翘舌。'
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
  var pyRow = '<div class="how-row"><span class="how-ch big">双</span>' + ar + '<span class="how-pyo">shuān</span><span class="how-pyo ok">shuāng</span><span class="how-pyo">suāng</span>' + ar + ic('pick') + '</div>';
  if (kind === 'pick') return pyRow;
  if (kind === 'camp') return pyRow + '<div class="how-row"><img class="how-bal" src="' + ART.creeper() + '">' + ar + '<span class="how-pyo ok">kǔ lì pà</span><span class="how-pyo">kǔ lì bà</span>' + ar + '<span class="how-ore" style="background-image:url(' + oreTex('diamond', 5) + ')"></span><img class="how-bal" src="' + ART.zombie() + '"><img class="how-bal wide" src="' + ART.dragon() + '"></div>' +
    '<div class="how-row"><span class="how-py">mā ' + ic('note') + '</span>' + ar + '<span class="how-ch">马</span><span class="how-ch ok">妈</span><span class="how-ch">骂</span></div>';
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
  $('#homeKid').src = spriteURL('hero'); $$('.home-farm img').forEach(function (im) { im.src = WART[im.dataset.a](); }); $('#homeZombie').src = ART.creeper(); $('#advIc').src = ART.egg(); $('#pickIc').src = spriteURL('book');
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
    ctx(); show('camp');
    if (!campState().runs) { var go = el('button', 'mc-btn wide primary', '<i class="ic" data-ic="pick"></i>出发'); go.onclick = function () { stopHow(); closeModal(); }; howModal('camp', [go]); }
  };
  $('#btnPick').onclick = function () {
    ctx();
    if (!S.pickSeen) { S.pickSeen = 1; save(); var go = el('button', 'mc-btn wide primary', '<i class="ic" data-ic="pick"></i>开始'); go.onclick = function () { stopHow(); closeModal(); startRound('srs', 'p'); }; howModal('pick', [go]); return; }
    startRound('srs', 'p');
  };
  $('#btnHelp').onclick = function () { howModal('practice'); };
  $('#btnArcHelp').onclick = function () { howModal('camp'); };
  $('#btnCampHome').onclick = function () { show('home'); };
  $('#btnMap').onclick = function () { show('map'); };
  $('#btnParent').onclick = function () { show('parent'); };
  $('#btnOralHome').onclick = startOral; $('#btnOral').onclick = startOral;
  $('#btnAgain').onclick = function () { if (lastGame === 'camp') startChapter(lastChapter); else if (lastGame === 'pick') startRound('srs', 'p'); else startRound(S.place && !S.place.done ? 'place' : 'srs'); };
  $('#btnResMap').onclick = function () { show('map'); };
  $('#btnResHome').onclick = function () { show(lastGame === 'camp' ? 'camp' : 'home'); };
  var stopAll = function () { if (speaking) try { speaking.stop(); } catch (e) {} stopHow(); };
  $('#btnQuit').onclick = function () { if (G && G.mode === 'place') save(); G = null; stopAll(); show('home'); };
  $('#btnArcQuit').onclick = function () { if (A) { clearTimeout(A.q && A.q.timer); save(); } A = null; stopAll(); show('camp'); };
  $('#qSpeak').onclick = function () { if (A && A.q && A.q.type === 'f') speak(A.q.k).catch(audioErr); };
  $('#oralOk').onclick = function () { oralMark(true); };
  $('#oralBad').onclick = function () { oralMark(false); };
  $('#oralListen').onclick = function () { speak(O.list[O.i]).catch(function () {}); };
  $$('[data-go]').forEach(function (b) { b.onclick = function () { show(b.dataset.go); }; });
  $('#modal').addEventListener('click', function (e) { if (e.target.id === 'modal' || e.target.closest('.modal-x')) { stopHow(); closeModal(); } });
  window.addEventListener('resize', function () { if (cur === 'play') { fitCard(); fitPy(); } if (cur === 'game') { fitOpts(); if (A && A.ch.id === 1) placeMiner(true); } });
  document.addEventListener('keydown', function (e) {
    if (!$('#modal').hidden) return;
    var n = +e.key;
    if (cur === 'game' && A && A.q) { if (n >= 1 && n <= 4) { var bb = $$('#qOpts .qopt')[n - 1]; if (bb) campAnswer(n - 1, bb); } if (e.key === ' ' && A.q.type === 'f') { e.preventDefault(); speak(A.q.k).catch(function () {}); } return; }
    if (cur !== 'play' || !G || !G.q) return;
    if (G.q.t === 'f' || G.q.t === 'p') { if (n >= 1 && n <= 4) { var b = $$('#ores .ore')[n - 1]; if (b) pickChar(n - 1, b); } if (e.key === ' ') { e.preventDefault(); hear(); } return; }
    if (e.key === ' ') { e.preventDefault(); if (G.q.t0 == null) mine(); else hear(); }
    if (e.key === 'ArrowRight' || e.key === 'Enter') judge(true);
    if (e.key === 'ArrowLeft') judge(false);
  });
  document.addEventListener('visibilitychange', function () { if (document.hidden) save(); });
  window.__pinyin = { S: function () { return S; }, SYL: SYL, KEYS: KEYS, label: label, distractors: distractors, buildRound: buildRound, buildPlacement: buildPlacement, record: record,
    G: function () { return G; }, A: function () { return A; }, cat: cat, isFw: isFw, pyOptions: pyOptions, pickTask: pickTask, WORDS: WORDS, WBYK: WBYK, startRound: startRound, taskFor: taskFor, wordOptions: wordOptions, wordLabel: wordLabel, WART: WART, speakWord: speakWord, readLabels: readLabels, campQuestion: function () { return campQuestion(); }, startChapter: startChapter, PICS: PICS, findTask: findTask, newChar: newChar, chInfo: chInfo, hasReading: hasReading };
  show('home');
}
init();
})();
