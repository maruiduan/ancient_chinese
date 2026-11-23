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
var FAST_MS = 2000, STREAK = 3;

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

/* ========== 像素贴图 ========== */
function seeded(seed) { var s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function makeCanvas(n) { var c = document.createElement('canvas'); c.width = c.height = n || 16; return c; }
function px(g, x, y, col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); }
var STONE = ['#7f7f7f', '#8d8d8d', '#747474', '#999999', '#6a6a6a'];
var ORES = {
  diamond: ['#5decf5', '#a6fff5', '#1aaebd'], gold: ['#fcee4b', '#fff6a8', '#c7a20b'], emerald: ['#41f384', '#b6ffd1', '#0f9a3f'],
  redstone: ['#ff2b1c', '#ff8f7d', '#a00e04'], lapis: ['#2f5bd8', '#7fa2ff', '#16307a'], iron: ['#e3c0a0', '#f6e3cf', '#a8805e'], coal: ['#2b2b2b', '#4a4a4a', '#111']
};
var ORE_NAMES = ['diamond', 'gold', 'emerald', 'redstone', 'lapis', 'iron', 'coal'];
function stoneTex(g, rand, pal) {
  pal = pal || STONE;
  for (var y = 0; y < 16; y++) for (var x = 0; x < 16; x++) px(g, x, y, pal[Math.floor(rand() * pal.length)]);
}
var texCache = {};
function oreTex(name, seed) {
  var key = name + seed; if (texCache[key]) return texCache[key];
  var c = makeCanvas(), g = c.getContext('2d'), rand = seeded(seed * 7919 + name.length);
  stoneTex(g, rand);
  var col = ORES[name], clusters = 4 + Math.floor(rand() * 2);
  for (var n = 0; n < clusters; n++) {
    var cx = 1 + Math.floor(rand() * 13), cy = 1 + Math.floor(rand() * 13);
    var pts = [[0, 0], [1, 0], [0, 1], [1, 1], [2, 1], [1, 2]];
    pts.forEach(function (p, i) { if (i < 3 || rand() > .4) { px(g, cx + p[0], cy + p[1], col[i === 0 ? 1 : (rand() > .5 ? 0 : 2)]); } });
  }
  return (texCache[key] = c.toDataURL());
}
function blockTex(level) {
  var key = 'lv' + level; if (texCache[key]) return texCache[key];
  var c = makeCanvas(), g = c.getContext('2d'), rand = seeded(97 + level);
  if (level === 0) stoneTex(g, rand);
  else {
    var pal = level === 1 ? ['#dcdcdc', '#e8e8e8', '#c8c8c8', '#f2f2f2'] : level === 2 ? ['#f9d71c', '#fce95a', '#e8b70a', '#fff3a0'] : ['#4ae8dc', '#8ef6ee', '#29c5bb', '#c9fffa'];
    stoneTex(g, rand, pal);
    g.fillStyle = level === 1 ? '#9a9a9a' : level === 2 ? '#b98a00' : '#168f88';
    g.fillRect(0, 15, 16, 1); g.fillRect(15, 0, 1, 16);
    g.fillStyle = 'rgba(255,255,255,.75)'; g.fillRect(0, 0, 16, 1); g.fillRect(0, 0, 1, 16);
  }
  return (texCache[key] = c.toDataURL());
}
var SPRITES = {
  pickaxe: function (g) {
    var head = [[3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 3], [10, 3], [11, 4], [12, 5], [12, 6], [13, 7], [13, 8], [2, 3], [3, 3], [11, 5], [12, 7]];
    head.forEach(function (p) { px(g, p[0], p[1], '#5decf5'); });
    [[4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [10, 4], [11, 6], [12, 8]].forEach(function (p) { px(g, p[0], p[1], '#1aaebd'); });
    for (var i = 0; i < 9; i++) { px(g, 10 - i, 5 + i, i % 2 ? '#7a5228' : '#9c6b34'); px(g, 11 - i, 5 + i, '#5a3a1a'); }
  },
  diamond: function (g) {
    var rows = ['......xxxx......', '....xxccccxx....', '...xcwwccccbx...', '..xcwwcccccbbx..', '.xcwccccccccbbx.', '.xcccccccccccbx.', 'xcccccccccccccbx', 'xbcccccccccccbbx',
      '.xbccccccccccbx.', '..xbccccccccbx..', '...xbccccccbx...', '....xbccccbx....', '.....xbccbx.....', '......xbbx......', '.......xx.......', '................'];
    var col = { x: '#0d3f45', c: '#4ae8dc', w: '#e8fffd', b: '#1e9e96' };
    rows.forEach(function (r, y) { for (var x = 0; x < 16; x++) if (col[r[x]]) px(g, x, y, col[r[x]]); });
  },
  noteblock: function (g) {
    var rand = seeded(5); stoneTex(g, rand, ['#7b4a2a', '#8a5532', '#6c3f22', '#955f39']);
    g.fillStyle = '#3a2210'; g.fillRect(0, 0, 16, 1); g.fillRect(0, 15, 16, 1); g.fillRect(0, 0, 1, 16); g.fillRect(15, 0, 1, 16);
    g.fillStyle = '#111'; g.fillRect(5, 4, 1, 7); g.fillRect(5, 4, 6, 1); g.fillRect(10, 4, 1, 6); g.fillRect(3, 10, 3, 2); g.fillRect(8, 9, 3, 2);
  },
  creeper: function (g) {
    var rand = seeded(11); stoneTex(g, rand, ['#4fb53a', '#5fc94a', '#3f9a2d', '#79d963']);
    g.fillStyle = '#111'; g.fillRect(3, 4, 3, 3); g.fillRect(10, 4, 3, 3); g.fillRect(6, 8, 4, 3); g.fillRect(5, 10, 2, 3); g.fillRect(9, 10, 2, 3);
  }
};
function drawSprites(root) {
  $$('canvas[data-sprite]', root).forEach(function (c) {
    var g = c.getContext('2d'); g.clearRect(0, 0, 16, 16); SPRITES[c.dataset.sprite](g);
  });
}
function spriteURL(name) { var k = 'sp' + name; if (texCache[k]) return texCache[k]; var c = makeCanvas(); SPRITES[name](c.getContext('2d')); return (texCache[k] = c.toDataURL()); }
function drawCrack(c, stage) {
  var g = c.getContext('2d'); g.clearRect(0, 0, 16, 16); g.fillStyle = 'rgba(0,0,0,.75)';
  var lines = [[[7, 7], [8, 7], [8, 8], [6, 9], [9, 6]], [[5, 5], [10, 10], [4, 10], [11, 4], [3, 8], [12, 8], [8, 3], [8, 12]], [[2, 2], [13, 13], [2, 13], [13, 2], [1, 7], [14, 7], [6, 1], [9, 14], [3, 5], [12, 11]]];
  for (var s = 0; s <= stage; s++) lines[s].forEach(function (p) { g.fillRect(p[0], p[1], 1, 1); g.fillRect(p[0] + (p[0] < 8 ? 1 : -1), p[1], 1, 1); });
}
function pickCursor() {
  var c = makeCanvas(32), g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.scale(2, 2); SPRITES.pickaxe(g);
  document.documentElement.style.setProperty('--pick', 'url(' + c.toDataURL() + ') 4 4');
  var st = document.createElement('style'); st.textContent = '.ore,.mc-btn,.cell,.speaker{cursor:' + 'url(' + c.toDataURL() + ') 4 4, pointer}'; document.head.appendChild(st);
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
    var sp = $('#btnSpeak'); sp.classList.add('playing');
    src.onended = function () { if (speaking === src) { speaking = null; sp.classList.remove('playing'); } };
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
  combo: function () { [784, 988, 1175].forEach(function (f, i) { tone(f, .1, 'triangle', .07, i * .06); }); }
};

/* ========== 存档 ========== */
var KEY = 'lucca-pinyin-v1', S;
function blank() { return { v: 1, items: {}, gems: 0, place: null, weak: null, days: {}, conf: {}, oral: {}, settings: { size: 10 } }; }
function load() { try { S = JSON.parse(localStorage.getItem(KEY)) || blank(); } catch (e) { S = blank(); } if (!S.settings) S.settings = { size: 10 }; ['items', 'days', 'conf', 'oral'].forEach(function (k) { S[k] = S[k] || {}; }); }
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('进度没存上：浏览器存储已满或被禁用'); } }
function it(k) { return S.items[k] || (S.items[k] = { n: 0, c: 0, st: 0, lv: 0, rt: [] }); }
function lv(k) { var x = S.items[k]; return x ? x.lv : 0; }
function today() { var d = dayNum(); var r = S.days[d] || (S.days[d] = { sec: 0, q: 0, c: 0, oq: 0, oc: 0 }); return r; }

/* 掌握度：石头 0 → 铁 1（答对过）→ 金 2（连续 3 次 2 秒内答对）→ 钻石 3（隔天仍答对） */
function record(k, ok, rtMs, mode) {
  var x = it(k), d = dayNum(), before = x.lv;
  x.n++; x.last = Date.now();
  if (ok) {
    x.c++; x.rt.push(Math.round(rtMs)); if (x.rt.length > 6) x.rt.shift();
    var fast = rtMs <= FAST_MS;
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
var PLACE_N = 60;
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
function renderHome() {
  $('#homeGems').textContent = S.gems;
  var c = counts(), h = $('#homeHint');
  if (!S.place || !S.place.done) { $('#btnPlay').textContent = S.place ? '⛏ 继续摸底' : '⛏ 开始挖矿'; h.textContent = S.place ? '摸底做到第 ' + S.place.idx + ' / ' + S.place.list.length + ' 题' : ''; }
  else { $('#btnPlay').textContent = '⛏ 开始挖矿'; h.textContent = '钻石 ' + c[3] + ' · 金 ' + c[2] + ' · 铁 ' + c[1] + '　（共 ' + TOTAL + ' 个带调音节）'; }
}

/* ========== 挖矿 ========== */
var G = null; // 当前一局
function startRound(mode) {
  ctx();
  var q;
  if (mode === 'place') {
    if (!S.place || S.place.done) S.place = { list: buildPlacement(), idx: 0, done: false, res: [] };
    q = S.place.list.slice(S.place.idx);
  } else q = buildRound();
  G = { mode: mode, queue: q, pos: 0, total: q.length, gems: 0, ups: [], combo: 0, extra: 0, marks: [] , ok: 0};
  show('play');
  $('#modeTag').textContent = mode === 'place' ? '摸底：听一听，点出对的拼音' : '';
  renderProgress(); nextQ();
}
function renderProgress() {
  var p = $('#progress'); p.innerHTML = '';
  if (G.mode === 'place') {
    var done = S.place.idx, n = S.place.list.length;
    var pc = (100 * done / n).toFixed(1) + '%';
    p.innerHTML = '<i style="flex:1;background:linear-gradient(90deg,var(--green) ' + pc + ',#fff ' + pc + ')"></i>';
    p.title = done + '/' + n; $('#modeTag').textContent = '摸底 ' + done + ' / ' + n; return;
  }
  for (var i = 0; i < G.total; i++) { var e = el('i'); if (i < G.marks.length) e.className = G.marks[i]; else if (i === G.marks.length) e.className = 'now'; p.appendChild(e); }
}
function nextQ() {
  if (G.pos >= G.queue.length) return endRound();
  var k = G.queue[G.pos], opts = shuffle([{ k: k, l: label(k), right: true }].concat(distractors(k)));
  G.q = { k: k, opts: opts, t0: null, wrong: false, done: false, shown: performance.now() };
  var box = $('#ores'); box.innerHTML = '';
  var seed = rnd(1e6), names = shuffle(ORE_NAMES.slice());
  opts.forEach(function (o, i) {
    var b = el('button', 'ore'); b.type = 'button';
    b.style.backgroundImage = 'url(' + oreTex(names[i], seed + i) + ')';
    b.innerHTML = '<span class="lab">' + o.l + '</span>';
    var cr = makeCanvas(); cr.className = 'crack'; b.appendChild(cr);
    b.addEventListener('pointerdown', function (ev) { ev.preventDefault(); choose(i, b); });
    b.dataset.i = i; box.appendChild(b);
  });
  fitLabels();
  // 预加载下一题
  if (G.queue[G.pos + 1]) loadBuf(G.queue[G.pos + 1]).catch(function () {});
  setTimeout(function () { say(); }, 380);
}
function fitLabels() {
  $$('#ores .ore').forEach(function (b) {
    var w = b.clientWidth, lab = $('.lab', b), fs = Math.min(w * .4, 84);
    lab.style.fontSize = fs + 'px';
    var lw = lab.offsetWidth;
    if (lw > w * .86) lab.style.fontSize = Math.floor(fs * w * .86 / lw) + 'px';
  });
}
if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (cur === 'play') fitLabels(); });
function say() {
  if (!G || !G.q) return;
  var q = G.q;
  clearTimeout(q.fb); q.fb = setTimeout(function () { q.started = true; }, 4000);
  speak(q.k).then(function (r) { q.started = true; if (q.t0 == null) q.t0 = r.start + r.dur; }).catch(function () { q.started = true; toast('读音没加载出来，请检查网络后点「再听」'); });
}
function rect(e) { return e.getBoundingClientRect(); }
function choose(i, btn) {
  var q = G.q; if (!q || q.done || !q.started) return; // 先听到声音再点
  var o = q.opts[i];
  if (q.t0 == null) q.t0 = performance.now(); // 声音还没响就点了
  var rt = Math.max(0, performance.now() - q.t0);
  if (o.right) {
    q.done = true;
    var first = !q.wrong, res = null;
    if (first) {
      res = record(q.k, true, rt, G.mode); G.ok++;
      var fast = rt <= FAST_MS; G.combo = fast ? G.combo + 1 : 0;
      var g = fast ? 2 : 1; G.gems += g; S.gems += g;
      if (res.after > res.before) G.ups.push([q.k, res.after]);
      if (G.mode === 'place') S.place.res.push([q.k, 1, Math.round(rt)]);
    }
    logTime(); save();
    G.marks.push(first ? 'done' : 'miss');
    breakOre(btn, first ? (rt <= FAST_MS ? 2 : 1) : 0, function () {
      if (first && G.combo >= 3 && G.combo % 3 === 0) { SFX.combo(); flash(G.combo + ' 连击!'); }
      if (res && res.after > res.before && res.after >= 2) SFX.up();
      advance();
    });
  } else {
    SFX.bonk(); btn.classList.remove('wrong'); void btn.offsetWidth; btn.classList.add('wrong');
    if (o.k || o.l) S.conf[q.k + '>' + (o.k || ('*' + o.l))] = (S.conf[q.k + '>' + (o.k || ('*' + o.l))] || 0) + 1;
    if (!q.wrong) {
      q.wrong = true; G.combo = 0; record(q.k, false, rt, G.mode);
      if (G.mode === 'place') S.place.res.push([q.k, 0, Math.round(rt)]);
      else if (G.extra < 4) { G.queue.splice(Math.min(G.pos + 3, G.queue.length), 0, q.k); G.extra++; G.total++; } // 错题过两题再出
      logTime(); save();
    }
    setTimeout(function () {
      $$('#ores .ore').forEach(function (b, j) { if (q.opts[j].right) b.classList.add('hintme'); else b.classList.add('dim'); });
      say();
    }, 420);
  }
}
function advance() {
  G.pos++;
  if (G.mode === 'place') { S.place.idx++; if (S.place.idx >= S.place.list.length) finishPlacement(); save(); }
  renderProgress();
  setTimeout(nextQ, 120);
}
function logTime() { var q = G.q, t = today(); var dt = Math.min(30000, performance.now() - (q.lastLog || q.shown)); q.lastLog = performance.now(); t.sec += dt / 1000; }
function breakOre(btn, gems, cb) {
  var cr = $('canvas.crack', btn), st = 0;
  $$('#ores .ore').forEach(function (b) { if (b !== btn) b.classList.add('dim'); });
  SFX.hit(); drawCrack(cr, 0);
  var h = setInterval(function () {
    st++; if (st <= 2) { SFX.hit(); drawCrack(cr, st); return; }
    clearInterval(h); SFX.brk();
    var r = rect(btn), fx = $('#fx'), tex = btn.style.backgroundImage;
    for (var i = 0; i < 16; i++) {
      var f = el('i', 'frag'); f.style.left = (r.left + r.width / 2) + 'px'; f.style.top = (r.top + r.height / 2) + 'px';
      f.style.backgroundImage = tex; f.style.backgroundSize = (r.width / 3) + 'px'; f.style.backgroundPosition = (rnd(16) * 7) + 'px ' + (rnd(16) * 7) + 'px';
      fx.appendChild(f);
      var dx = (Math.random() - .5) * r.width * 1.8, dy = -Math.random() * r.height * 1.2 - 20;
      f.animate([{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: 'translate(' + dx + 'px,' + dy + 'px) rotate(' + (rnd(360)) + 'deg)', opacity: 1, offset: .45 },
        { transform: 'translate(' + dx * 1.3 + 'px,' + (dy + 260) + 'px) rotate(' + rnd(720) + 'deg)', opacity: 0 }], { duration: 750, easing: 'cubic-bezier(.2,.6,.5,1)' }).onfinish = (function (n) { return function () { n.remove(); }; })(f);
    }
    btn.classList.add('broken');
    if (gems) dropGems(r, gems); else setTimeout(cb, 300);
    if (gems) setTimeout(cb, 820);
  }, 85);
}
function dropGems(r, n) {
  var target = rect($('#gems'));
  for (var i = 0; i < n; i++) (function (i) {
    var g = el('img', 'drop-gem'); g.src = spriteURL('diamond'); var x0 = r.left + r.width / 2 - 28 + (i ? 30 : -6), y0 = r.top + r.height / 2 - 28;
    g.style.left = x0 + 'px'; g.style.top = y0 + 'px'; $('#fx').appendChild(g);
    var tx = target.left - x0, ty = target.top - y0;
    var a = g.animate([{ transform: 'translate(0,0) scale(.4)' }, { transform: 'translate(0,-70px) scale(1.15)', offset: .3 }, { transform: 'translate(0,-10px) scale(1)', offset: .5 },
      { transform: 'translate(' + tx + 'px,' + ty + 'px) scale(.5)', opacity: .9 }], { duration: 760, delay: i * 90, easing: 'ease-in-out', fill: 'forwards' });
    a.onfinish = function () { g.remove(); SFX.gem(); var c = $('#gems').parentNode; c.classList.add('pop'); $('#gems').textContent = S.gems; setTimeout(function () { c.classList.remove('pop'); }, 160); };
  })(i);
}
function flash(t) { var e = el('div', 'streak', t); document.body.appendChild(e); setTimeout(function () { e.remove(); }, 950); }
function finishPlacement() {
  S.place.done = true; S.place.date = Date.now();
  var by = { i: {}, f: {}, t: {} };
  S.place.res.forEach(function (r) {
    var s = SYL[r[0]]; if (!s) return;
    [['i', s.i || '∅'], ['f', s.f], ['t', s.t]].forEach(function (p) { var m = by[p[0]][p[1]] || (by[p[0]][p[1]] = { n: 0, ok: 0, slow: 0 }); m.n++; if (r[1]) { m.ok++; if (r[2] > FAST_MS) m.slow++; } });
  });
  // 每个音节只算第一次作答
  var weak = { i: [], f: [], t: [] };
  ['i', 'f', 't'].forEach(function (d) { Object.keys(by[d]).forEach(function (k) { var m = by[d][k]; if (m.ok / m.n < .8 || m.slow / Math.max(1, m.ok) > .5) weak[d].push(d === 't' ? +k : (k === '∅' ? '' : k)); }); });
  S.weak = weak; newOrder = null;
}
function endRound() {
  save();
  var m = G.mode; show('result');
  $('#resGems').textContent = '+' + G.gems;
  var up = $('#resUp'); up.innerHTML = '';
  if (m === 'place') {
    var res = S.place.res, first = {}, ok = 0, rts = [];
    res.forEach(function (r) { if (first[r[0]] == null) { first[r[0]] = r[1]; if (r[1]) { ok++; rts.push(r[2]); } } });
    var n = Object.keys(first).length; rts.sort(function (a, b) { return a - b; });
    $('#resTitle').textContent = '摸底完成！';
    var w = S.weak, names = [].concat(w.i.filter(Boolean), w.f.map(finName)).slice(0, 12);
    up.innerHTML = '<div class="chip" style="font-family:var(--ui);font-size:20px">答对 ' + ok + ' / ' + n + '　中位用时 ' + (rts.length ? (rts[rts.length >> 1] / 1000).toFixed(1) : '-') + ' 秒</div>' +
      (names.length ? '<div class="chip" style="font-family:var(--ui);font-size:18px">先多练：' + names.join(' ') + (w.t.length ? '　' + w.t.map(function (t) { return TONE_NAME[t]; }).join(' ') : '') + '</div>' : '');
  } else {
    $('#resTitle').textContent = G.ok === G.total ? '全对，太棒了！' : '挖完啦！';
    G.ups.forEach(function (u, i) { var c = el('div', 'chip', '<i class="lv' + u[1] + '"></i>' + label(u[0])); c.style.animationDelay = (i * .07) + 's'; up.appendChild(c); });
    if (G.ups.some(function (u) { return u[1] >= 2; })) SFX.up();
  }
  G = null;
}

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
    save(); $('#oralCard').innerHTML = '<span style="font-family:var(--ui);font-size:30px">读对 ' + O.ok + ' / ' + O.list.length + '</span>';
    $('#oralCount').textContent = ''; $('#oralOk').hidden = $('#oralBad').hidden = $('#oralListen').hidden = true;
    var b = $('#oralDone') || el('button', 'mc-btn big green', '🏠 回首页'); b.id = 'oralDone'; b.onclick = function () { b.remove(); show('home'); }; $('#oral').appendChild(b); return;
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
  $('#mapStats').innerHTML = '<span>💎 钻石 ' + c[3] + ' / ' + TOTAL + '</span><span>金 ' + c[2] + '</span><span>铁 ' + c[1] + '</span><span>石头 ' + c[0] + '</span><span>整个音节全钻石 ' + full + ' / ' + BASES.length + '</span>';
  var grid = $('#mapGrid'); grid.innerHTML = '';
  INI_ALL.forEach(function (ini) {
    var bs = BASES.filter(function (b) { return b.i === ini; }); if (!bs.length) return;
    var row = el('div', 'mrow'), h = el('div', 'ini', ini || 'aoe'); if (!ini) h.style.fontSize = '17px';
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
  box.appendChild(el('h3', '', '<span style="font-family:var(--py);font-size:30px">' + b.b.replace(/v/g, 'ü') + '</span>' + (b.w ? '　<small>整体认读</small>' : '')));
  var names = ['石头', '铁', '金', '钻石'];
  b.t.forEach(function (t) {
    var k = b.b + t, x = S.items[k] || { n: 0, c: 0, st: 0, lv: 0, rt: [] }, a = avg(x.rt);
    var row = el('div', 'tone-row');
    row.innerHTML = '<span class="lvl lv' + x.lv + '"></span><span class="py">' + label(k) + '</span><span class="meta">' + names[x.lv] +
      (x.n ? '　答 ' + x.n + ' 次，对 ' + x.c + ' 次' + (a ? '，平均 ' + (a / 1000).toFixed(1) + ' 秒' : '') : '　还没练') + '<br>例字：' + (SYL[k].c || '') + '</span>';
    var p = el('button', 'mc-btn small', '🔊'); p.onclick = function () { speak(k).catch(function () { toast('读音没加载出来'); }); };
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
    '<div class="kpi">钻石（已掌握）<b>' + c[3] + ' / ' + TOTAL + '</b></div><div class="kpi">金（等隔天复查）<b>' + c[2] + '</b></div>' +
    '<div class="kpi">铁（答对过）<b>' + c[1] + '</b></div><div class="kpi">今天练习<b>' + Math.round(t.sec / 60) + ' 分钟</b></div>' +
    '<div class="kpi">今天答题<b>' + t.q + '（对 ' + t.c + '）</b></div><div class="kpi">平均反应<b>' + (a != null ? (a / 1000).toFixed(1) + ' 秒' : '-') + '</b></div></div>' +
    '<p class="small" style="margin-top:8px">掌握标准：同一个带调音节连续 3 次在 2 秒内答对变成金，第二天以后再答对变成钻石。反应时间从读音播完开始算。答错会退回铁，不扣钻石。</p>';
  body.appendChild(p1);
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
  p4.innerHTML = '<h3>常混的音</h3>' + (conf.length ? '<table><tr><th>听到的</th><th>点成了</th><th>次数</th></tr>' + conf.map(function (c2) {
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
    '<div class="row-btns"><button class="mc-btn small" id="rePlace">重新摸底</button><button class="mc-btn small" id="exp">导出进度</button><label class="mc-btn small">导入进度<input id="imp" type="file" accept="application/json" hidden></label><button class="mc-btn small red" id="reset">清空进度</button></div>' +
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
    '本站对录音做了裁静音和音量统一，改动后的音频同样按 CC BY-SA 提供。</p>' +
    '<p>每个录音都用两套语音识别和声调曲线分析做了自动核对。以下音节没通过核对，暂时不出题：<span class="py" style="font-size:15px">' + Object.keys(ex).map(function (k) { return mark(k.slice(0, -1), +k.slice(-1)); }).join('　') + '</span>。轻声、ê、m、n、ng 等叹词音节也不在题库里。</p>' +
    '<p>拼音字体：基于 SIL 的 Andika 字体做了子集，改名为 LuccaPinyin，许可 <a href="fonts/OFL.txt" target="_blank" rel="noopener">SIL Open Font License 1.1</a>。像素图案和音效都由本页程序生成，与 Mojang 无关。</p></div>';
  body.appendChild(p7);
  var back = el('a', 'back-site', '← 回到 lucca.top'); back.href = 'https://www.lucca.top/'; body.appendChild(back);
}

/* ========== 启动 ========== */
function init() {
  load(); drawSprites(document); pickCursor();
  $('#gems').textContent = S.gems;
  $('#btnPlay').onclick = function () {
    ctx();
    if (!S.place) {
      var box = el('div');
      box.innerHTML = '<h3 style="font-size:24px;margin-bottom:10px">先探一探路</h3><p style="font-size:18px;line-height:1.6">第一次玩先做摸底，' + PLACE_N + ' 题，大约 10 分钟。会挖到钻石，也会找出哪些拼音已经很熟。</p>';
      var go = el('button', 'mc-btn big green', '⛏ 开始摸底'), skip = el('button', 'mc-btn small', '跳过，直接挖');
      go.style.marginTop = '16px'; skip.style.margin = '16px 0 0 10px';
      go.onclick = function () { closeModal(); startRound('place'); };
      skip.onclick = function () { closeModal(); S.place = { list: [], idx: 0, done: true, res: [], skipped: true }; save(); startRound('srs'); };
      box.appendChild(go); box.appendChild(skip); modal(box); return;
    }
    startRound(S.place.done ? 'srs' : 'place');
  };
  $('#btnMap').onclick = function () { show('map'); };
  $('#btnParent').onclick = function () { show('parent'); };
  $('#btnOralHome').onclick = startOral; $('#btnOral').onclick = startOral;
  $('#btnAgain').onclick = function () { startRound(S.place && !S.place.done ? 'place' : 'srs'); };
  $('#btnResMap').onclick = function () { show('map'); };
  $('#btnResHome').onclick = function () { show('home'); };
  $('#btnQuit').onclick = function () { if (G && G.mode === 'place') save(); G = null; if (speaking) try { speaking.stop(); } catch (e) {} show('home'); };
  $('#btnSpeak').onclick = function () { say(); };
  $('#oralOk').onclick = function () { oralMark(true); };
  $('#oralBad').onclick = function () { oralMark(false); };
  $('#oralListen').onclick = function () { speak(O.list[O.i]).catch(function () {}); };
  $$('[data-go]').forEach(function (b) { b.onclick = function () { show(b.dataset.go); }; });
  $('#modal').addEventListener('click', function (e) { if (e.target.id === 'modal' || e.target.closest('.modal-x')) closeModal(); });
  window.addEventListener('resize', fitLabels);
  document.addEventListener('keydown', function (e) {
    if (cur !== 'play' || !G || !G.q) return;
    var n = +e.key; if (n >= 1 && n <= 4) { var b = $$('#ores .ore')[n - 1]; if (b) choose(n - 1, b); }
    if (e.key === ' ') { e.preventDefault(); say(); }
  });
  document.addEventListener('visibilitychange', function () { if (document.hidden) save(); });
  window.__pinyin = { S: function () { return S; }, SYL: SYL, KEYS: KEYS, label: label, distractors: distractors, buildRound: buildRound, buildPlacement: buildPlacement, record: record, G: function () { return G; } };
  show('home');
}
init();
})();
