/* LuccaMC — original code-drawn Minecraft-style pixel art.
 * Shared by 拼音闯关 (/pinyin) and 龙语群岛 (/pinyin-fluency).
 * No official Mojang / Minecraft textures.
 */
(function (root) {
'use strict';
var $ = function (s, r) { return (r || document).querySelector(s); };
var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
var _sizes = {};
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

/* ========== 我的世界风格像素画（第二版，全部程序绘制）：按游戏里的比例和标志性特征重画 ========== */
function mcHash(x, y, s) { var h = (x * 374761393 + y * 668265263 + s * 1442695041) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return (h ^ (h >>> 16)) >>> 0; }
function mcCol(c, x, y, s) { return Array.isArray(c) ? c[mcHash(x, y, s) % c.length] : c; }
// 字符画 → 像素图（'.' 透明），数组颜色 = 按位置取的杂色，像游戏贴图的斑驳感
function mcGrid(key, rows, pal, seed) {
  return pxArt('m2_' + key, rows[0].length, rows.length, function (a) {
    rows.forEach(function (r, y) { for (var x = 0; x < r.length; x++) { var ch = r[x]; if (ch !== '.' && pal[ch]) a.P(x, y, mcCol(pal[ch], x, y, seed || 7)); } });
  });
}
function mcDraw(key, w, h, fn) { return pxArt('m2_' + key, w, h, fn); }
// 16×16 方块贴图（canvas），给等轴方块用
var mcTexC = {};
function mcTex(key, fn) {
  if (mcTexC[key]) return mcTexC[key];
  var c = makeCanvas(16, 16), g = c.getContext('2d'), r = seeded(key.length * 977 + key.charCodeAt(0) * 31);
  fn(function (x, y, col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); }, r, function (x, y, w, h, col) { g.fillStyle = col; g.fillRect(x, y, w, h); });
  return (mcTexC[key] = c);
}
function mcPick(r, cols) { return cols[Math.floor(r() * cols.length)]; }
var MT = {
  cobble: function () { return mcTex('cobble', function (P, r) {
    var cs = [[2, 2], [8, 1], [13, 3], [4, 7], [10, 7], [1, 12], [7, 12], [13, 11], [15, 15], [5, 15]], sh = cs.map(function () { return mcPick(r, ['#8b8b8b', '#7a7a7a', '#999999', '#858585']); });
    var cell = function (x, y) { var b = 0, bd = 1e9; cs.forEach(function (c, i) { var dx = Math.min(Math.abs(x - c[0]), 16 - Math.abs(x - c[0])), dy = Math.min(Math.abs(y - c[1]), 16 - Math.abs(y - c[1])), d = dx * dx + dy * dy * 1.3; if (d < bd) { bd = d; b = i; } }); return b; };
    for (var y = 0; y < 16; y++) for (var x = 0; x < 16; x++) { var c = cell(x, y), e = cell((x + 1) % 16, y) !== c || cell(x, (y + 1) % 16) !== c; P(x, y, e ? (r() < .5 ? '#4f4f4f' : '#5e5e5e') : cell((x + 15) % 16, y) !== c || cell(x, (y + 15) % 16) !== c ? '#a8a8a8' : sh[c]); } }); },
  plank: function () { return mcTex('plank', function (P, r) { for (var y = 0; y < 16; y++) for (var x = 0; x < 16; x++) { var row = y >> 2, seam = (x + row * 5) % 16 === 0; P(x, y, y % 4 === 3 || seam ? '#6b5232' : mcPick(r, ['#b8945f', '#ad8a55', '#a07e4b', '#bc9862'])); } }); },
  logSide: function () { return mcTex('logSide', function (P, r) { for (var x = 0; x < 16; x++) { var base = mcPick(r, ['#6b5232', '#5c4529', '#735a38']); for (var y = 0; y < 16; y++) P(x, y, r() < .18 ? '#3f2f1a' : r() < .2 ? '#7d6440' : base); } }); },
  logTop: function () { return mcTex('logTop', function (P, r) { for (var y = 0; y < 16; y++) for (var x = 0; x < 16; x++) { var d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)); P(x, y, d > 6.6 ? mcPick(r, ['#6b5232', '#5c4529']) : Math.round(d) % 2 ? '#b8945f' : '#9c7a48'); } }); },
  grassTop: function () { return mcTex('grassTop', function (P, r) { for (var y = 0; y < 16; y++) for (var x = 0; x < 16; x++) P(x, y, mcPick(r, ['#7cbd4a', '#6aa83c', '#8fce58', '#5e9a34', '#74b444'])); }); },
  dirt: function () { return mcTex('dirt', function (P, r) { for (var y = 0; y < 16; y++) for (var x = 0; x < 16; x++) P(x, y, mcPick(r, ['#8b5e3c', '#7a5232', '#9b6a45', '#6a4628', '#86593a'])); }); },
  grassSide: function () { return mcTex('grassSide', function (P, r) { var d = MT.dirt().getContext('2d'); for (var y = 0; y < 16; y++) for (var x = 0; x < 16; x++) { var px = d.getImageData(x, y, 1, 1).data; P(x, y, 'rgb(' + px[0] + ',' + px[1] + ',' + px[2] + ')'); } for (var x2 = 0; x2 < 16; x2++) { var depth = 3 + (mcHash(x2, 1, 5) % 3); for (var y2 = 0; y2 < depth; y2++) P(x2, y2, mcPick(r, ['#7cbd4a', '#6aa83c', '#5e9a34'])); } }); },
  cactusSide: function () { return mcTex('cactusSide', function (P, r) { for (var y = 0; y < 16; y++) for (var x = 0; x < 16; x++) P(x, y, x === 0 || x === 15 ? '#2a6a1c' : x % 4 === 2 ? '#5aa83a' : mcPick(r, ['#3d8a2a', '#43922e', '#38812a'])); [[2, 3], [6, 9], [10, 4], [13, 12], [5, 14], [9, 1]].forEach(function (p) { P(p[0], p[1], '#1b3d10'); P(p[0], p[1] - 1 < 0 ? 0 : p[1] - 1, '#e6f0c8'); }); }); },
  cactusTop: function () { return mcTex('cactusTop', function (P, r) { for (var y = 0; y < 16; y++) for (var x = 0; x < 16; x++) { var d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)); P(x, y, d > 6.6 ? '#2a6a1c' : d < 2 ? '#7ec65a' : mcPick(r, ['#5aa83a', '#4f9a33'])); } }); },
  lava: function () { return mcTex('lava', function (P, r) { for (var y = 0; y < 16; y++) for (var x = 0; x < 16; x++) { var v = Math.sin(x * .9 + y * .4) + Math.cos(y * .8 - x * .3) + r() * .8; P(x, y, v > 1.4 ? '#ffe36b' : v > .6 ? '#ffa21f' : v > -.4 ? '#f07a12' : '#d4500c'); } }); },
  chestSide: function () { return mcTex('chestSide', function (P, r, R) { R(0, 0, 16, 16, '#3a2410'); for (var y = 1; y < 15; y++) for (var x = 1; x < 15; x++) P(x, y, mcPick(r, ['#a8732e', '#9c6a28', '#b07a32'])); R(1, 5, 14, 1, '#3a2410'); R(1, 6, 14, 1, '#6b4519'); }); },
  chestFront: function () { return mcTex('chestFront', function (P, r, R) { var s = MT.chestSide(); var g = s.getContext('2d'); for (var y = 0; y < 16; y++) for (var x = 0; x < 16; x++) { var d = g.getImageData(x, y, 1, 1).data; P(x, y, 'rgb(' + d[0] + ',' + d[1] + ',' + d[2] + ')'); } R(7, 3, 2, 5, '#c8c8c8'); R(7, 3, 2, 1, '#e8e8e8'); R(7, 7, 2, 1, '#6e6e6e'); }); },
  chestTop: function () { return mcTex('chestTop', function (P, r, R) { R(0, 0, 16, 16, '#3a2410'); for (var y = 1; y < 15; y++) for (var x = 1; x < 15; x++) P(x, y, mcPick(r, ['#b07a32', '#a8732e', '#bc8538'])); }); },
  tableTop: function () { return mcTex('tableTop', function (P, r, R) { var p = MT.plank().getContext('2d'); for (var y = 0; y < 16; y++) for (var x = 0; x < 16; x++) { var d = p.getImageData(x, y, 1, 1).data; P(x, y, 'rgb(' + d[0] + ',' + d[1] + ',' + d[2] + ')'); } R(0, 0, 16, 1, '#4a3218'); R(0, 15, 16, 1, '#4a3218'); R(0, 0, 1, 16, '#4a3218'); R(15, 0, 1, 16, '#4a3218'); R(2, 2, 12, 12, '#c9a66b'); for (var i = 0; i < 4; i++) { R(2 + i * 4, 2, 1, 12, '#5a3c1e'); R(2, 2 + i * 4, 12, 1, '#5a3c1e'); } R(13, 2, 1, 12, '#5a3c1e'); R(2, 13, 12, 1, '#5a3c1e'); }); },
  tableSide: function () { return mcTex('tableSide', function (P, r, R) { var p = MT.plank().getContext('2d'); for (var y = 0; y < 16; y++) for (var x = 0; x < 16; x++) { var d = p.getImageData(x, y, 1, 1).data; P(x, y, 'rgb(' + d[0] + ',' + d[1] + ',' + d[2] + ')'); } R(0, 0, 16, 3, '#8a6236'); R(0, 2, 16, 1, '#4a3218'); R(3, 5, 1, 8, '#5a3c1e'); R(2, 5, 3, 2, '#9a9a9a'); R(10, 5, 4, 1, '#9a9a9a'); R(11, 6, 2, 1, '#9a9a9a'); R(11, 7, 1, 6, '#5a3c1e'); }); },
  stone: function () { return mcTex('stone', function (P, r) { for (var y = 0; y < 16; y++) for (var x = 0; x < 16; x++) P(x, y, mcPick(r, ['#7d7d7d', '#858585', '#747474', '#8e8e8e', '#7d7d7d'])); }); },
  furnaceFront: function () { return mcTex('furnaceFront', function (P, r, R) { for (var y = 0; y < 16; y++) for (var x = 0; x < 16; x++) P(x, y, mcPick(r, ['#7d7d7d', '#858585', '#6e6e6e'])); R(0, 0, 16, 1, '#5a5a5a'); R(2, 2, 12, 3, '#5a5a5a'); R(3, 3, 10, 1, '#3c3c3c'); R(3, 8, 10, 6, '#262626'); R(3, 8, 10, 1, '#5a5a5a'); R(4, 11, 8, 3, '#ff8a1a'); R(5, 12, 6, 2, '#ffd23f'); R(3, 10, 10, 1, '#3c3c3c'); }); },
  furnaceTop: function () { return mcTex('furnaceTop', function (P, r, R) { for (var y = 0; y < 16; y++) for (var x = 0; x < 16; x++) P(x, y, mcPick(r, ['#8e8e8e', '#9a9a9a', '#858585'])); R(0, 0, 16, 1, '#6e6e6e'); R(0, 15, 16, 1, '#6e6e6e'); R(0, 0, 1, 16, '#6e6e6e'); R(15, 0, 1, 16, '#6e6e6e'); }); },
  tntSide: function () { return mcTex('tntSide', function (P, r, R) { for (var y = 0; y < 16; y++) for (var x = 0; x < 16; x++) P(x, y, x % 4 === 3 ? '#a32418' : mcPick(r, ['#db3b2a', '#cf3324'])); R(0, 5, 16, 6, '#f2f2f2'); R(0, 5, 16, 1, '#c8c8c8'); R(0, 10, 16, 1, '#c8c8c8');
    // 白条上的黑字 TNT
    R(1, 6, 3, 1, '#1d1d1d'); R(2, 7, 1, 3, '#1d1d1d'); R(5, 6, 1, 4, '#1d1d1d'); R(8, 6, 1, 4, '#1d1d1d'); R(6, 7, 1, 1, '#1d1d1d'); R(7, 8, 1, 1, '#1d1d1d'); R(10, 6, 3, 1, '#1d1d1d'); R(11, 7, 1, 3, '#1d1d1d'); R(13, 6, 0, 0, '#1d1d1d'); }); },
  tntTop: function () { return mcTex('tntTop', function (P, r, R) { for (var y = 0; y < 16; y++) for (var x = 0; x < 16; x++) P(x, y, x === 0 || y === 0 || x === 15 || y === 15 ? '#b02a1e' : mcPick(r, ['#bdbdbd', '#cacaca', '#b0b0b0'])); R(6, 6, 4, 4, '#8a8a8a'); R(7, 7, 2, 2, '#3a3a3a'); }); },
  pumpkinSide: function () { return mcTex('pumpkinSide', function (P, r) { for (var y = 0; y < 16; y++) for (var x = 0; x < 16; x++) P(x, y, x % 4 === 0 ? '#b0600e' : x % 4 === 2 ? '#f2a03a' : mcPick(r, ['#e38a1d', '#da8119'])); }); },
  pumpkinTop: function () { return mcTex('pumpkinTop', function (P, r, R) { for (var y = 0; y < 16; y++) for (var x = 0; x < 16; x++) { var d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)); P(x, y, Math.round(d) % 3 === 0 ? '#b0600e' : '#e38a1d'); } R(7, 7, 2, 2, '#5a4a1e'); R(7, 6, 2, 1, '#4f7a2a'); }); },
  cakeTop: function () { return mcTex('cakeTop', function (P, r, R) { for (var y = 0; y < 16; y++) for (var x = 0; x < 16; x++) P(x, y, mcPick(r, ['#f8f6f0', '#efece4', '#ffffff'])); [[3, 3], [9, 2], [12, 7], [5, 9], [10, 12], [2, 13]].forEach(function (p) { R(p[0], p[1], 2, 2, '#e0302a'); R(p[0], p[1], 1, 1, '#ff6a5a'); }); }); },
  cakeSide: function () { return mcTex('cakeSide', function (P, r, R) { for (var y = 0; y < 16; y++) for (var x = 0; x < 16; x++) P(x, y, y < 4 ? '#f8f6f0' : y === 4 ? (x % 3 ? '#f8f6f0' : '#b8743f') : y === 9 ? '#f2e2c8' : mcPick(r, ['#b8743f', '#a8683a', '#c27e48'])); }); }
};
// 等轴视角的方块（和物品栏里的方块图标一样：上面最亮，左边中等，右边最暗）
function mcCube(key, top, left, right, hf) {
  var k = 'm2c_' + key; if (texCache[k]) return texCache[k];
  var a = 32, h = Math.round(a * (hf || 1)), W = a * 2, H = a + h, c = makeCanvas(W, H), g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  var t0 = a - h * 0 - (a - h) * 0; var cx = a, top0 = a - Math.round(a * (hf || 1)) > 0 ? 0 : 0;
  var face = function (tex, m, shade) { g.save(); g.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]); g.drawImage(tex, 0, 0); if (shade) { g.fillStyle = 'rgba(0,0,0,' + shade + ')'; g.fillRect(0, 0, 16, 16); } g.restore(); };
  face(top, [a / 16, a / 32, -a / 16, a / 32, cx, top0]);
  face(left, [a / 16, a / 32, 0, h / 16, 0, a / 2], .18);
  face(right, [a / 16, -a / 32, 0, h / 16, a, a], .36);
  // 描一圈深色边
  g.setTransform(1, 0, 0, 1, 0, 0); g.strokeStyle = 'rgba(20,20,20,.85)'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, 1); g.lineTo(W - 1, a / 2); g.lineTo(W - 1, a / 2 + h); g.lineTo(cx, a + h - 1); g.lineTo(1, a / 2 + h); g.lineTo(1, a / 2); g.closePath(); g.stroke();
  g.strokeStyle = 'rgba(20,20,20,.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(1, a / 2); g.lineTo(cx, a); g.lineTo(W - 1, a / 2); g.moveTo(cx, a); g.lineTo(cx, a + h); g.stroke();
  return (texCache[k] = c.toDataURL());
}
var GREEN_CREEPER = ['#5ed14a', '#4bb83b', '#3e9a30', '#5ed14a', '#8be07a', '#4bb83b', '#2f7a25', '#4bb83b', '#b8dcae'];
var MC = {
  villager: function () { return mcGrid('villager', [
    '.SssssssS.', '.ssssssss.', '.sSssssSs.', '.ssssssss.', '.bbbbbbbb.', '.swgssgws.', '.sssnnsss.', '.sssnnsss.', '.SssnnssS.', '.SSsnnsSS.',
    '.rrrNNrrr.', '.rrrrrrrr.', 'AaaaaaaaaA', 'aaakkkkaaa', 'AaakkkkaaA', 'AAAAAAAAAA', '.rrrrrrrr.', '.rRrrrrRr.', '.rrrrrrrr.', '.rRrrrrRr.', '.rrrrrrrr.', '.RrrrrrrR.', '.RRRRRRRR.', '..DD..DD..'],
    { s: ['#bd8f70', '#b88a6c', '#c29474'], S: '#9f7257', b: '#3d2a1e', w: '#ffffff', g: '#2f9e3a', n: '#9c6a4d', N: '#7a4e37', r: ['#6b4b34', '#704f37', '#654630'], R: '#553a28', a: ['#7d5b3f', '#82603f'], A: '#5f432c', k: '#b88a6c', D: '#3d2a1e' }); },
  creeper: function () { var head = ['GGGGGGGG', 'GGGGGGGG', 'GKKGGKKG', 'GKKGGKKG', 'GGGKKGGG', 'GGKKKKGG', 'GGKKKKGG', 'GGKGGKGG', 'hhhhhhhh'], rows = [];
    head.forEach(function (r) { rows.push('.' + r + '.'); });
    for (var i = 0; i < 11; i++) rows.push('.' + (i === 10 ? 'hhhhhhhh' : 'GGGGGGGG') + '.');
    for (var j = 0; j < 6; j++) rows.push(j === 5 ? 'dddd..dddd' : j === 0 ? 'LLLLLLLLLL' : 'LLLL..LLLL');
    return mcGrid('creeper', rows, { G: GREEN_CREEPER, K: '#141414', h: '#3e9a30', L: ['#4bb83b', '#3e9a30', '#5ed14a', '#2f7a25'], d: '#2a5a20' }, 11); },
  zombie: function () { var rows = ['....HHHHHHHH....', '....ZZZZZZZZ....', '....ZZZZZZZZ....', '....ZZZZZZZZ....', '....ZEEZZEEZ....', '....ZZZnnZZZ....', '....ZZmmmmZZ....', '....ZZZZZZZZ....',
    'yyyyCCCCCCCCyyyy', 'ZZZZCCCCCCCCZZZZ', 'ZZZZCCCCCCCCZZZZ', 'hhhhCCCCCCCChhhh'];
    for (var i = 0; i < 8; i++) rows.push('....CCCCCCCC....');
    for (var j = 0; j < 9; j++) rows.push('....PPPppPPP....');
    rows.push('....BBBBBBBB....', '....BBB..BBB....', '....BBB..BBB....');
    return mcGrid('zombie', rows, { H: '#3c5a28', Z: ['#5a8a3c', '#4f7c34', '#649646', '#5a8a3c'], E: '#1e2a16', n: '#3f6129', m: '#3a5524', y: '#77ad55', h: '#3f6129', C: ['#00a8a8', '#009999', '#00b6b6'], P: ['#463aa5', '#3e3393', '#4a3fb0'], p: '#2e2777', B: '#5a5a62' }, 3); },
  skeleton: function () { var rows = ['....WWWWWWWW....', '....WWWWWWWW....', '....WWWWWWWW....', '....WWWWWWWW....', '....WEEWWEEW....', '....WWWnnWWW....', '....WmWmmWmW....', '....WWWWWWWW....',
    '.bWWWWWWWWWWWW..', 'bsWW.dddWWdd.WW.', 'bsWW.WWWWWWW.WW.', 'bsWW.dddWWdd.WW.', 'bsWW.WWWWWWW.WW.', 'bsWW.dddWWdd.WW.', 'bsWW...WW....WW.', 'bsWW...WW....WW.', 'bsWW...WW....WW.', 'bsWW...WW....WW.', 'bsWW.WWWWWW..WW.', 'b.WW.WWWWWW..WW.', 'b...........WW..'];
    for (var i = 0; i < 11; i++) rows.push('.....WW..WW.....');
    rows[20] = 'bb...WW..WW.....';
    return mcGrid('skeleton', rows, { W: ['#c4c4c4', '#b5b5b5', '#cfcfcf', '#bcbcbc'], E: '#3a3a3a', n: '#555555', m: '#4a4a4a', d: '#5e5e5e', b: '#7a5230', s: '#e6e6e6' }, 5); },
  spider: function () { return mcDraw('spider', 28, 14, function (a) {
    // 正面：背后的肚子、8×8 的头、8 只红眼，左右各 4 条腿先伸出再落地
    a.R(9, 0, 10, 4, function (i, j) { return mcCol(['#2e2622', '#352b26', '#28201c'], i, j, 2); });
    var legs = [[3, 0], [5, 2], [7, 4], [9, 6]];
    legs.forEach(function (lg, n) { var c = n % 2 ? '#5d4c41' : '#6e5b4e';
      a.R(lg[1], lg[0], 10 - lg[1], 1, c); a.R(lg[1], lg[0], 1, 14 - lg[0], c);
      a.R(18, lg[0], 10 - lg[1], 1, c); a.R(27 - lg[1], lg[0], 1, 14 - lg[0], c); });
    a.R(10, 2, 8, 8, function (i, j) { return mcCol(['#3b302b', '#45392f', '#352b26', '#4a3d33'], i, j, 4); });
    [[11, 6], [15, 6]].forEach(function (p) { a.R(p[0], p[1], 2, 2, '#b3191b'); a.P(p[0], p[1], '#ff4b45'); });
    [[11, 4], [16, 4], [13, 4], [14, 4], [10, 7], [17, 7]].forEach(function (p) { a.P(p[0], p[1], '#c81e1e'); });
    a.R(12, 9, 4, 1, '#241d1a');
  }); },
  enderman: function () { var rows = [];
    for (var y = 0; y < 8; y++) rows.push(y === 4 ? '.....PpPkkPpP.....' : y === 5 ? '.....qqqKKqqq.....' : '.....KKKKKKKK.....');
    for (var i = 0; i < 12; i++) rows.push('kK...KkKKKKK...kK');
    for (var j = 0; j < 18; j++) rows.push(j < 13 ? 'kK...kK..kK....kK'.slice(0, 17) : '.....kK..kK......');
    rows = rows.map(function (r) { return (r + '..').slice(0, 18); });
    return mcGrid('enderman', rows, { K: ['#161616', '#101010', '#1d1d1d', '#161616'], k: '#2e2e2e', P: '#cc00fa', p: '#f3b8ff', q: '#3a1048' }, 9); },
  dragon: function () { return mcDraw('dragon', 50, 28, function (a) {
    var K = ['#151515', '#1c1c1c', '#121212'], k = '#262626', g = '#4a4a4a', m = '#2b2b2b', mm = '#3a3a3a';
    // 翅膀（骨架 + 膜）
    for (var y = 1; y <= 12; y++) { var xs = 11 + Math.round((y - 1) * 1.1), xe = 36 - Math.round((y - 1) * .7); a.R(xs, y, xe - xs, 1, function (i) { return (i + y) % 5 ? m : mm; }); }
    [[24, 13, 9, 1], [24, 13, 23, 0], [24, 13, 36, 1]].forEach(function (b) { var n = 16; for (var t = 0; t <= n; t++) a.P(b[0] + (b[2] - b[0]) * t / n, b[1] + (b[3] - b[1]) * t / n, g); });
    a.R(14, 13, 20, 7, function (i, j) { return mcCol(K, i, j, 6); }); // 身体
    for (var x = 15; x < 33; x += 3) a.R(x, 11, 1, 2, '#5a5a5a'); // 背上的刺
    a.R(2, 15, 13, 3, function (i, j) { return mcCol(K, i, j, 8); }); a.R(0, 16, 2, 1, k); for (var x2 = 3; x2 < 14; x2 += 3) a.R(x2, 13, 1, 2, '#5a5a5a'); // 尾巴
    a.R(33, 11, 5, 6, function (i, j) { return mcCol(K, i, j, 3); }); a.R(36, 9, 4, 5, function (i, j) { return mcCol(K, i, j, 5); }); // 脖子
    a.R(39, 6, 8, 7, function (i, j) { return mcCol(K, i, j, 1); }); a.R(46, 8, 4, 4, k); a.R(40, 12, 10, 2, k); // 头和长嘴
    a.R(42, 8, 3, 1, '#cc00fa'); a.R(44, 8, 1, 1, '#f3b8ff'); a.R(48, 9, 1, 1, '#5a5a5a'); a.R(40, 4, 1, 2, '#5a5a5a'); a.R(43, 4, 1, 2, '#5a5a5a');
    a.R(16, 20, 3, 5, K[0]); a.R(28, 20, 3, 5, K[0]); a.R(15, 25, 5, 1, k); a.R(27, 25, 5, 1, k);
  }); },
  slime: function () { return mcGrid('slime', ['HHHHHHHHHHHHHH', 'HgggggggggggGH', 'HgIIIIIIIIIIgH', 'HgIIIIIIIIIIgH', 'HgIEEIIIIEEIgH', 'HgIEEIIIIEEIgH', 'HgIIIIIIIIIIgH', 'HgIIIIIIIIIIgH', 'HgIIIIIMIIIIgH', 'HgIIIIIIIIIIgH', 'HgIIIIIIIIIIgH', 'HgggggggggggGH', 'HGGGGGGGGGGGGH', 'HHHHHHHHHHHHHH'],
    { H: '#5fae4a', g: ['#86d46c', '#7cc962', '#90dc76'], G: '#6abb52', I: ['#6abb52', '#62b04b'], E: '#1f3d1a', M: '#1f3d1a' }); },
  bat: function () { return mcDraw('bat', 24, 14, function (a) { var W = '#2f261d', w = '#46382a';
    for (var i = 0; i < 9; i++) { a.R(1 + i, 3 + Math.abs(4 - i) / 2 | 0, 1, 7 - (Math.abs(4 - i) / 2 | 0), i % 3 ? W : w); a.R(22 - i, 3 + Math.abs(4 - i) / 2 | 0, 1, 7 - (Math.abs(4 - i) / 2 | 0), i % 3 ? W : w); }
    a.R(10, 2, 4, 8, '#4c3e30'); a.R(10, 0, 1, 2, '#4c3e30'); a.R(13, 0, 1, 2, '#4c3e30'); a.R(10, 3, 4, 3, '#6b5848'); a.R(10, 4, 1, 1, '#111'); a.R(13, 4, 1, 1, '#111'); }); },
  cow: function () { return mcDraw('cow', 26, 19, function (a) { var K = ['#3b2f25', '#33281f', '#42352a'], W = '#e8e8e8';
    a.R(2, 5, 17, 9, function (i, j) { return mcCol(K, i, j, 1); }); a.R(4, 6, 5, 3, W); a.R(11, 9, 6, 3, W); a.R(15, 5, 3, 2, W); a.R(2, 11, 2, 2, W);
    a.R(18, 2, 8, 8, function (i, j) { return mcCol(K, i, j, 2); }); a.R(23, 3, 3, 6, W); a.R(23, 7, 3, 3, '#b8b0a8'); a.R(24, 8, 1, 1, '#3a3a3a'); a.R(21, 4, 1, 1, '#111'); a.R(22, 4, 1, 1, W);
    a.R(19, 0, 1, 2, '#d8d4c8'); a.R(18, 1, 1, 1, '#d8d4c8'); a.R(23, 0, 1, 2, '#d8d4c8'); a.R(24, 1, 1, 1, '#d8d4c8'); a.R(17, 3, 1, 2, '#2a211a');
    [3, 7, 13, 16].forEach(function (x) { a.R(x, 14, 3, 4, K[0]); a.R(x, 17, 3, 1, '#1d1d1d'); }); a.R(9, 14, 3, 1, '#e6a0a8'); }); },
  pig: function () { return mcDraw('pig', 24, 16, function (a) { var P = ['#f0a8a5', '#eba09d', '#f4b2ae'];
    a.R(2, 4, 15, 8, function (i, j) { return mcCol(P, i, j, 3); }); a.R(2, 11, 15, 1, '#d98a88'); a.R(15, 2, 7, 8, function (i, j) { return mcCol(P, i, j, 4); });
    a.R(21, 5, 3, 3, '#e8858d'); a.R(22, 6, 1, 1, '#8c3c45'); a.R(23, 6, 1, 1, '#8c3c45'); a.R(17, 4, 1, 1, '#ffffff'); a.R(18, 4, 1, 1, '#111'); a.R(15, 2, 1, 2, '#e59591');
    [3, 6, 11, 14].forEach(function (x) { a.R(x, 12, 3, 4, '#e59591'); a.R(x, 15, 3, 1, '#c4706d'); }); }); },
  sheep: function () { return mcDraw('sheep', 26, 19, function (a) { var W = ['#f2f2f2', '#e6e6e6', '#ffffff', '#dcdcdc'];
    a.R(2, 3, 17, 11, function (i, j) { return mcCol(W, i, j, 5); }); a.R(17, 4, 7, 7, '#c9b29b'); a.R(17, 3, 7, 2, function (i, j) { return mcCol(W, i, j, 6); }); a.R(16, 4, 2, 7, function (i, j) { return mcCol(W, i, j, 7); });
    a.R(21, 6, 1, 1, '#ffffff'); a.R(22, 6, 1, 1, '#111'); a.R(23, 9, 1, 1, '#e8a0a8'); a.R(22, 9, 1, 1, '#a08872');
    [3, 7, 13, 16].forEach(function (x) { a.R(x, 14, 3, 2, function (i, j) { return mcCol(W, i, j, 8); }); a.R(x, 16, 3, 3, '#c9b29b'); }); }); },
  chicken: function () { return mcDraw('chicken', 15, 17, function (a) { var W = ['#f6f6f2', '#ececE6', '#ffffff'];
    a.R(2, 7, 9, 6, function (i, j) { return mcCol(W, i, j, 9); }); a.R(7, 1, 5, 8, function (i, j) { return mcCol(W, i, j, 10); }); a.R(12, 3, 3, 2, '#f2a72b'); a.R(12, 5, 2, 2, '#e0302a'); a.R(10, 3, 1, 1, '#111');
    a.R(3, 8, 5, 4, '#dcdcd4'); a.R(0, 6, 2, 4, '#e8e8e2'); a.R(5, 13, 1, 3, '#f2a72b'); a.R(8, 13, 1, 3, '#f2a72b'); a.R(4, 16, 3, 1, '#f2a72b'); a.R(7, 16, 3, 1, '#f2a72b'); }); },
  horse: function () { return mcDraw('horse', 26, 21, function (a) { var B = ['#8a5a33', '#80522e', '#93613a'];
    a.R(2, 7, 16, 7, function (i, j) { return mcCol(B, i, j, 11); }); a.R(15, 3, 5, 7, function (i, j) { return mcCol(B, i, j, 12); }); a.R(18, 1, 7, 5, function (i, j) { return mcCol(B, i, j, 13); });
    a.R(22, 3, 3, 3, '#6e4628'); a.R(24, 4, 1, 1, '#2a1a0e'); a.R(20, 2, 1, 1, '#111'); a.R(18, 0, 1, 1, '#80522e'); a.R(20, 0, 1, 1, '#80522e');
    a.R(15, 0, 2, 9, '#3d2715'); a.R(0, 7, 2, 9, '#3d2715');
    [3, 6, 14, 17].forEach(function (x) { a.R(x, 14, 2, 6, '#7a4c2a'); a.R(x, 19, 2, 1, '#2a1a0e'); }); }); },
  wolf: function () { return mcDraw('wolf', 24, 16, function (a) { var G = ['#d6d6d6', '#cacaca', '#e0e0e0'];
    a.R(3, 5, 11, 5, function (i, j) { return mcCol(G, i, j, 14); }); a.R(12, 3, 4, 8, '#e4e4e4'); a.R(15, 2, 6, 6, function (i, j) { return mcCol(G, i, j, 15); });
    a.R(21, 4, 3, 3, '#bdbdbd'); a.R(23, 4, 1, 1, '#1d1d1d'); a.R(17, 3, 1, 1, '#1d1d1d'); a.R(15, 0, 2, 2, '#bdbdbd'); a.R(19, 0, 2, 2, '#bdbdbd');
    a.R(0, 3, 4, 2, '#cacaca'); a.R(0, 2, 2, 1, '#cacaca'); [4, 7, 11, 13].forEach(function (x) { a.R(x, 10, 2, 5, '#bdbdbd'); }); }); },
  cat: function () { return mcDraw('cat', 24, 15, function (a) { var O = '#e0a24a';
    a.R(3, 6, 13, 5, O); [5, 8, 11, 14].forEach(function (x) { a.R(x, 6, 1, 3, '#a86d24'); }); a.R(4, 10, 11, 1, '#f2dcb0');
    a.R(15, 3, 7, 6, O); a.R(15, 2, 2, 1, O); a.R(20, 2, 2, 1, O); a.R(16, 3, 1, 1, '#a86d24'); a.R(20, 3, 1, 1, '#a86d24'); a.R(17, 5, 1, 1, '#2f8a3a'); a.R(20, 5, 1, 1, '#2f8a3a'); a.R(21, 7, 2, 2, '#f2dcb0'); a.R(22, 7, 1, 1, '#e07a8a');
    a.R(0, 2, 1, 5, O); a.R(1, 6, 2, 1, O); a.R(0, 2, 1, 1, '#a86d24'); [4, 6, 12, 14].forEach(function (x) { a.R(x, 11, 1, 3, O); }); }); },
  fish: function () { return mcDraw('fish', 20, 13, function (a) {
    a.R(5, 3, 11, 7, '#c6a37b'); a.R(7, 2, 7, 1, '#8f6f4a'); a.R(5, 3, 11, 2, '#8f6f4a'); a.R(6, 8, 9, 2, '#e6d1b0'); a.R(16, 4, 2, 5, '#c6a37b'); a.R(14, 5, 1, 1, '#1d1d1d');
    a.R(1, 2, 2, 9, '#8f6f4a'); a.R(3, 4, 2, 5, '#a8865c'); a.R(9, 1, 3, 1, '#8f6f4a'); a.R(9, 10, 2, 1, '#8f6f4a'); }); },
  bee: function () { return mcDraw('bee', 20, 15, function (a) {
    a.R(4, 0, 5, 4, 'rgba(220,240,255,.95)'); a.R(9, 0, 4, 3, 'rgba(200,230,250,.95)');
    a.R(3, 4, 14, 8, '#f2c22c'); a.R(7, 4, 2, 8, '#4a2e12'); a.R(11, 4, 2, 8, '#4a2e12'); a.R(14, 5, 3, 6, '#f2c22c'); a.R(15, 6, 2, 2, '#1d1d1d'); a.R(15, 6, 1, 1, '#3a3aa0');
    a.R(16, 2, 1, 2, '#1d1d1d'); a.R(18, 2, 1, 2, '#1d1d1d'); a.R(1, 8, 2, 1, '#9a9a9a'); [6, 10, 13].forEach(function (x) { a.R(x, 12, 1, 2, '#1d1d1d'); }); }); },
  panda: function () { return mcDraw('panda', 26, 18, function (a) { var W = '#f2f2ee', K = '#262626';
    a.R(2, 4, 16, 9, W); a.R(7, 4, 6, 9, K); a.R(16, 2, 9, 9, W); a.R(16, 1, 2, 2, K); a.R(23, 1, 2, 2, K); a.R(18, 4, 2, 3, K); a.R(22, 4, 2, 3, K); a.R(19, 5, 1, 1, '#ffffff'); a.R(22, 5, 1, 1, '#ffffff'); a.R(20, 8, 2, 1, K);
    [2, 5, 12, 15].forEach(function (x) { a.R(x, 13, 3, 4, K); }); }); },
  // ===== 物品图标（像物品栏里的斜放物品） =====
  gem: function () { return mcGrid('gem', ['.....LLLLLL.....', '....WWLLLLLL....', '...WLLMMMMLLL...', '..LLMMMMMMMMLL..', '.MMMMMMMMMMMMMM.', '.DDDDDDDDDDDDDD.', '..DMMMMMMMMMMD..', '...DMMMMMMMMD...', '....DMMMMMMD....', '.....DMMMMD.....', '......DMMD......', '.......DD.......'],
    { W: '#ffffff', L: '#a1fbe8', M: ['#4aedd9', '#3fe0cd'], D: '#20a898' }); },
  emerald: function () { return mcGrid('emerald', ['....LL....', '...LLMM...', '..LLMMMM..', '.LLMMMMDD.', 'LWMMMMMDDD', 'LWMMMMMDDD', 'LWMMMMMDDD', 'LLMMMMMDDD', 'LLMMMMMDDD', '.LMMMMMDD.', '..MMMMDD..', '...MMDD...', '....DD....'],
    { W: '#e6fff0', L: '#7af2a6', M: ['#17dd62', '#20d066'], D: '#0c9e3f' }); },
  redstone: function () { return mcGrid('redstone', ['......rr........', '.....rRRr..r.....', '..r..RRRr.rRr...', '.rRr.rRR..RRRr..', '.RRRr.r..rRRRR..', '..rR...rRRrRr...', '.....rRRRRR.....', '..rRRRRRRRRRr...', '.rRRRRDDRRRRRr..', 'rRRRDDDDDDRRRRr.', '.rrRRRRRRRRRrr..'],
    { r: '#ff2a1a', R: ['#c60000', '#d41010', '#b00000'], D: '#8a0000' }); },
  sword: function () { return mcDraw('sword', 16, 16, function (a) {
    for (var t = 0; t < 10; t++) { var x = 5 + t, y = 10 - t; a.P(x, y, t > 8 ? '#e6fffb' : '#33ebcb'); a.P(x + 1, y, '#c9fff6'); a.P(x, y + 1, '#1aa192'); }
    a.P(15, 0, '#c9fff6'); [[2, 8], [3, 9], [4, 10], [6, 12], [7, 13], [5, 11]].forEach(function (p) { a.P(p[0], p[1], '#0e6b60'); });
    [[4, 12], [3, 13], [2, 14]].forEach(function (p) { a.P(p[0], p[1], '#6b4a26'); a.P(p[0] + 1, p[1], '#4a3218'); }); a.P(1, 15, '#0e6b60'); a.P(1, 14, '#0e6b60'); }); },
  pickaxe: function () { return mcDraw('pickaxe', 16, 16, function (a) {
    for (var t = 0; t < 11; t++) { a.P(2 + t, 14 - t, t % 2 ? '#8a6236' : '#6b4a26'); a.P(3 + t, 14 - t, '#4a3218'); }
    [[3, 2], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 2], [12, 2], [13, 3], [13, 4], [14, 4], [14, 5], [14, 6], [14, 7], [14, 8], [14, 9], [13, 10]].forEach(function (p, i) { a.P(p[0], p[1], i < 3 || i > 15 ? '#1aa192' : '#33ebcb'); });
    [[4, 2], [5, 2], [6, 2], [9, 2], [10, 2], [12, 3], [13, 5], [13, 6], [13, 8]].forEach(function (p) { a.P(p[0], p[1], '#a1fbe8'); }); }); },
  axe: function () { return mcDraw('axe', 16, 16, function (a) {
    for (var t = 0; t < 12; t++) { a.P(2 + t, 15 - t, t % 2 ? '#8a6236' : '#6b4a26'); a.P(3 + t, 15 - t, '#4a3218'); }
    a.R(7, 1, 4, 2, '#e6e6e6'); a.R(6, 3, 5, 2, '#d0d0d0'); a.R(6, 5, 4, 2, '#bcbcbc'); a.R(7, 7, 2, 1, '#a0a0a0'); a.R(11, 2, 2, 3, '#bcbcbc'); a.R(7, 1, 1, 1, '#ffffff'); }); },
  bow: function () { return mcDraw('bow', 16, 16, function (a) {
    for (var t = 0; t <= 11; t++) a.P(3 + t, 13 - t, '#dcdcdc');
    [[2, 13], [2, 12], [2, 11], [2, 10], [3, 9], [3, 8], [4, 7], [4, 6], [5, 5], [6, 4], [7, 4], [8, 3], [9, 3], [10, 2], [11, 2], [12, 2], [13, 2]].forEach(function (p, i) { a.P(p[0], p[1], i > 5 && i < 9 ? '#4a3218' : '#8a5a2b'); a.P(p[0] + 1, p[1] + 1, i > 5 && i < 9 ? '#3a2410' : '#6b4520'); });
    a.P(3, 14, '#6b4520'); a.P(14, 2, '#6b4520'); }); },
  arrowi: function () { return mcDraw('arrowi', 16, 16, function (a) {
    for (var t = 0; t < 10; t++) a.P(3 + t, 12 - t, '#8a6236');
    a.R(12, 1, 3, 1, '#9a9a9a'); a.R(13, 1, 2, 3, '#9a9a9a'); a.P(14, 1, '#cfcfcf'); a.P(12, 3, '#6e6e6e');
    [[1, 12], [2, 13], [1, 14], [3, 14], [2, 15], [4, 13]].forEach(function (p, i) { a.P(p[0], p[1], i % 2 ? '#f2f2f2' : '#bdbdbd'); }); }); },
  ingot: function () { return mcGrid('ingot', ['....TTTTTTTTT...', '...TtttttttttE..', '..TtttttttttEE..', '.FFFFFFFFFFEEE..', '.FfffffffffEE...', '.FfffffffffE....', '.FFFFFFFFFF.....'], { T: '#ffffff', t: '#e2e2e2', F: '#c8c8c8', f: '#b0b0b0', E: '#8a8a8a' }); },
  goldi: function () { return mcGrid('goldi', ['....TTTTTTTTT...', '...TtttttttttE..', '..TtttttttttEE..', '.FFFFFFFFFFEEE..', '.FfffffffffEE...', '.FfffffffffE....', '.FFFFFFFFFF.....'], { T: '#fffbd0', t: '#fce55a', F: '#f2c22c', f: '#dca51a', E: '#a87a0a' }); },
  coal: function () { return mcGrid('coal', ['...KKKKK....', '..KKLKKKKK..', '.KLLKKKKKKK.', '.KKKKKKLKKK.', 'KKKKKKKKKKKK', 'KKKLKKKKKKKK', 'KKKKKKKKKLKK', '.KKKKKKKKKK.', '.KKKKLKKKK..', '..KKKKKKK...'], { K: ['#2a2a2a', '#1e1e1e', '#333333'], L: '#6a6a6a' }); },
  mapi: function () { return mcGrid('mapi', ['BBBBBBBBBBBBBB', 'BppppppppppppB', 'BpggggwwwgggpB', 'BpgggwwwwggypB', 'BpggwwwwgggypB', 'BpgggwwggGgypB', 'BpggggggGGgypB', 'BpgGgggGGggypB', 'BpgGGgggggyypB', 'BpggggrgggyypB', 'BpggggggggggpB', 'BppppppppppppB', 'BBBBBBBBBBBBBB'],
    { B: '#8a6236', p: '#e8d6a8', g: '#7cbd4a', G: '#4f8a2c', w: '#4a8cd8', y: '#d8c070', r: '#e0302a' }); },
  clock: function () { return mcGrid('clock', ['....GGGGGG....', '..GGssssssGG..', '.GssssyysssG..', '.GsssyYYysssG.', 'GssssyYYyssssG', 'GsssssyysssssG', 'GsssssKKsssssG', 'GdddddKddddddG', 'GddddddddddddG', '.GddggggggddG.', '.GdggggggggdG.', '..GGddddddGG..', '....GGGGGG....'],
    { G: ['#e0b030', '#c8961e'], s: '#8fd0ff', y: '#ffe36b', Y: '#fff6c8', K: '#3a2a1a', d: '#5a3c1e', g: '#4f9a2c' }); },
  minecart: function () { return mcGrid('minecart', ['LLLLLLLLLLLLLLLLLLLL', 'LMMMMMMMMMMMMMMMMMML', 'LMDDDDDDDDDDDDDDDDML', 'LMDDDDDDDDDDDDDDDDML', 'MMMMMMMMMMMMMMMMMMMM', 'MmmmmmmmmmmmmmmmmmmM', 'MmmmmmmmmmmmmmmmmmmM', 'MMMMMMMMMMMMMMMMMMMM', '..WWWW........WWWW..', '..WwwW........WwwW..', '..WWWW........WWWW..'],
    { L: '#b8b8be', M: '#8a8a92', D: '#4a4a50', m: '#76767e', W: '#2a2a2a', w: '#6a6a6a' }); },
  cobble: function () { return mcCube('cobble', MT.cobble(), MT.cobble(), MT.cobble()); },
  log: function () { return mcCube('log', MT.logTop(), MT.logSide(), MT.logSide()); },
  grassb: function () { return mcCube('grass', MT.grassTop(), MT.grassSide(), MT.grassSide()); },
  cactus: function () { return mcCube('cactus', MT.cactusTop(), MT.cactusSide(), MT.cactusSide()); },
  lava: function () { return mcCube('lava', MT.lava(), MT.lava(), MT.lava()); },
  chest: function () { return mcCube('chest', MT.chestTop(), MT.chestFront(), MT.chestSide(), .88); },
  table: function () { return mcCube('table', MT.tableTop(), MT.tableSide(), MT.tableSide()); },
  furnace: function () { return mcCube('furnace', MT.furnaceTop(), MT.furnaceFront(), MT.stone()); },
  tnt: function () { return mcCube('tnt', MT.tntTop(), MT.tntSide(), MT.tntSide()); },
  pumpkin: function () { return mcCube('pumpkin', MT.pumpkinTop(), MT.pumpkinSide(), MT.pumpkinSide()); },
  cake: function () { return mcCube('cake', MT.cakeTop(), MT.cakeSide(), MT.cakeSide(), .5); },
  tree: function () { return mcDraw('tree', 20, 24, function (a) { var Lv = ['#4f9a2c', '#3f8424', '#5fae36', '#468f28', '#2f6a1c'];
    a.R(3, 0, 14, 4, function (i, j) { return mcCol(Lv, i, j, 21); }); a.R(1, 3, 18, 8, function (i, j) { return mcCol(Lv, i, j, 22); }); a.R(3, 11, 14, 3, function (i, j) { return mcCol(Lv, i, j, 23); });
    a.R(8, 14, 4, 10, function (i, j) { return i === 0 ? '#4a3820' : j % 3 === 1 && i === 2 ? '#4a3820' : '#6b5232'; }); a.R(0, 6, 1, 3, '#3f8424'); a.R(19, 5, 1, 3, '#3f8424'); }); },
  flower: function () { return mcGrid('flower', ['....rRr.....', '...rRRRr....', '..rRRDRRr...', '..RRDDDRR...', '...rRRRr....', '....RRr.....', '.....g......', '.l...g......', '.ll..g..l...', '..ll.g.ll...', '...lggll....', '.....g......', '.....g......', '.....g......'],
    { r: '#ff4b3a', R: ['#e0302a', '#c81e1e'], D: '#3a1a10', g: '#3f8424', l: '#5fae36' }); },
  torch: function () { return mcGrid('torch', ['..YY..', '.YWWY.', '.OYYO.', '..OO..', '..bb..', '..bB..', '..bB..', '..bB..', '..bB..', '..bB..', '..bB..', '..bB..'], { Y: '#ffd23f', W: '#fffbe0', O: '#ff8a1a', b: '#8a6236', B: '#5a3c1e' }); },
  bed: function () { return mcGrid('bed', ['.WWWWWRRRRRRRRRRRRR.', 'WWWWWWRRRRRRRRRRRRRR', 'WwwwwwRrrrrrrrrrrrrR', 'PPPPPPPPPPPPPPPPPPPP', 'PpppppppppppppppppPP', 'P.P..............P.P'],
    { W: '#f6f6f2', w: '#dcdcd6', R: '#d33a2f', r: '#a8261e', P: '#b8945f', p: '#8a6236' }); },
  door: function () { var rows = ['BBBBBBBBBBBB', 'BpgggBBgggpB', 'BpgggBBgggpB', 'BpgggBBgggpB', 'BBBBBBBBBBBB']; for (var i = 0; i < 15; i++) rows.push(i === 6 ? 'BpppppppppkB' : i % 5 === 4 ? 'BBBBBBBBBBBB' : 'BpPppPppPppB'); rows.push('BBBBBBBBBBBB');
    return mcGrid('door', rows, { B: '#6b4a26', p: '#b8945f', P: '#a07e4b', g: '#cfe8f4', k: '#3a2a1a' }); },
  apple: function () { return mcGrid('apple', ['......bg....', '......bggg..', '..RRR.bRRR..', '.RWRRRRRRRR.', 'RWRRRRRRRRrR', 'RRRRRRRRRRrR', 'RRRRRRRRRrrR', 'RRRRRRRRRrrR', '.RRRRRRRrrR.', '.RRRRRRrrRR.', '..RRR..RRR..'],
    { R: ['#e0302a', '#d42a24'], r: '#a01c18', W: '#ffb0a8', b: '#5a3c1e', g: '#4fa82f' }); },
  bread: function () { return mcGrid('bread', ['.........LLLL...', '......LLLLLLLL..', '....LLlLLLlLLBB.', '..LLLlLLLlLLLBB.', '.LLlLLLlLLLLBBB.', 'LLLLLLLLLLLBBB..', 'LLLLLLLLLBBBB...', '.BBLLLLBBBBB....', '..BBBBBBBB......'],
    { L: '#d9a24a', l: '#f2d08a', B: '#a8722e' }); },
  melon: function () { return mcGrid('melon', ['GgggggggggggggggG', '.wwwwwwwwwwwwwww.', '.RRRRRRRRRRRRRRR.', '..RRKRRRRRKRRRR..', '...RRRRRKRRRRR...', '....RRKRRRRRR....', '.....RRRRKRR.....', '......RRRRR......', '.......RRR.......', '........R........'], { G: '#2f7a25', g: '#4fa82f', w: '#d8f0b0', R: ['#e8463a', '#f05a4a'], K: '#1d1d1d' }); },
  eggw: function () { return mcGrid('eggw', ['....EEEE....', '...EEEEEE...', '..EWEEEEEE..', '..EWEEEEsE..', '.EEEEEEEEEE.', '.EEsEEEEEEE.', '.EEEEEEEsEE.', '.EEEEEEEEEE.', '.EEEEsEEEEE.', '..EEEEEEEE..', '...EEEEEE...'], { E: ['#f2e2c2', '#ecdab8'], W: '#ffffff', s: '#c9a878' }); },
  milk: function () { return mcGrid('milk', ['....HHHHHH....', '...H......H...', '..H........H..', 'LLLLLLLLLLLLLL', 'LWWWWWWWWWWWWL', 'LWWWWWWWWWWWWL', '.MMMMMMMMMMMM.', '.MmMMMMMMMMMM.', '..MMMMMMMMMM..', '..MmMMMMMMMM..', '...MMMMMMMM...'], { H: '#8a8a8a', L: '#d0d0d4', W: '#ffffff', M: '#a8a8ae', m: '#c8c8cc' }); },
  portal: function () { var rows = []; for (var y = 0; y < 22; y++) { var r = ''; for (var x = 0; x < 16; x++) r += x < 2 || x > 13 || y < 2 || y > 19 ? 'O' : 'p'; rows.push(r); }
    return mcGrid('portal', rows, { O: ['#1a1024', '#22162e', '#130b1b', '#2c1d3b'], p: ['#9a3ae0', '#7a26c0', '#b25cf2', '#c97bff', '#8a30d0'] }, 13); },
  house: function () { return ART.house(); }
};
Object.keys(MC).forEach(function (k) { if (k !== 'house') WART[k] = MC[k]; });
['zombie', 'skeleton', 'spider', 'creeper', 'dragon', 'villager'].forEach(function (k) { ART[k] = MC[k]; });

/* ---- 末地：更像游戏里的末影龙、黑曜石柱、末地水晶、返回传送门、龙蛋 ---- */
function mcPoly(a, pts, col) { // 扫描线填多边形
  var ys = pts.map(function (p) { return p[1]; }), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
  for (var y = y0; y <= y1; y++) { var xs = []; for (var i = 0; i < pts.length; i++) { var p = pts[i], q = pts[(i + 1) % pts.length]; if ((p[1] <= y + .5 && q[1] > y + .5) || (q[1] <= y + .5 && p[1] > y + .5)) xs.push(p[0] + (y + .5 - p[1]) * (q[0] - p[0]) / (q[1] - p[1])); }
    xs.sort(function (m, n) { return m - n; }); for (var k = 0; k + 1 < xs.length; k += 2) for (var x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) a.P(x, y, typeof col === 'function' ? col(x, y) : col); }
}
function mcLine(a, x0, y0, x1, y1, col, th) { var n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2 || 1; for (var t = 0; t <= n; t++) { var x = x0 + (x1 - x0) * t / n, y = y0 + (y1 - y0) * t / n; a.P(x, y, col); if (th) a.P(x, y + 1, col); } }
MC.dragon = function () { return mcDraw('dragon3', 76, 42, function (a) {
  // 黑色鳞片：深浅两种格子 + 杂色
  var sc = function (x, y) { var h = mcHash(x, y, 31) % 9; return ((x >> 1) + (y >> 1)) % 3 === 0 ? (h < 3 ? '#363636' : '#2e2e2e') : (h < 2 ? '#262626' : h < 5 ? '#1f1f1f' : '#191919'); };
  var spike = '#4b4b4b', spk = function (x, y, h) { a.R(x, y - h, 1, h, spike); a.P(x + 1, y - 1, '#3a3a3a'); };
  var memF = function (x, y) { return (x + y) % 6 ? '#3e3a42' : '#47424c'; }, memN = function (x, y) { return mcHash(x, y, 5) % 7 ? '#57525c' : '#615b66'; };
  // 远处那只翅膀（暗一点，在身体后面）
  mcPoly(a, [[44, 19], [52, 3], [64, 1], [60, 6], [61, 10], [56, 12], [55, 16], [50, 19]], memF);
  mcLine(a, 44, 19, 52, 3, '#141414', 1); mcLine(a, 52, 3, 64, 1, '#141414'); mcLine(a, 52, 3, 60, 7, '#141414'); mcLine(a, 52, 3, 56, 13, '#141414');
  // 长尾巴：一节一节往左，末端微微上翘，背上一排刺
  for (var i = 0; i < 9; i++) { var tx = 24 - i * 3, ty = 22 + (i < 6 ? 0 : i - 5) * -1 + (i > 2 && i < 6 ? 1 : 0), th = i < 3 ? 4 : i < 6 ? 3 : 2; a.R(tx - 2, ty, 4, th, sc); spk(tx, ty, i < 5 ? 2 : 1); }
  // 身体
  a.R(22, 17, 24, 11, sc); a.R(24, 28, 20, 1, '#151515');
  for (var s = 23; s < 46; s += 3) spk(s, 17, 3);
  // 后腿（粗）和前腿，灰色爪子
  a.R(25, 27, 5, 6, sc); a.R(26, 33, 4, 4, sc); a.R(25, 37, 6, 2, '#2a2a2a'); a.P(24, 38, '#6a6a6a'); a.P(31, 38, '#6a6a6a'); a.P(28, 38, '#6a6a6a');
  a.R(40, 27, 4, 5, sc); a.R(41, 32, 3, 4, sc); a.R(40, 36, 5, 2, '#2a2a2a'); a.P(39, 37, '#6a6a6a'); a.P(45, 37, '#6a6a6a');
  // 长脖子一节节往右上
  [[44, 17], [47, 15], [50, 13], [53, 11], [56, 10]].forEach(function (p) { a.R(p[0], p[1], 5, 7, sc); spk(p[0] + 2, p[1], 2); });
  // 头：方头 + 长嘴 + 下颚，鼻孔，两只角，紫眼睛
  a.R(59, 7, 9, 9, sc); a.R(67, 10, 9, 5, sc); a.R(62, 15, 14, 2, '#141414'); a.R(63, 17, 11, 1, '#262626');
  a.R(70, 9, 2, 1, '#3a3a3a'); a.R(73, 9, 2, 1, '#3a3a3a'); a.P(74, 11, '#0c0c0c');
  a.R(60, 4, 1, 3, spike); a.R(60, 3, 1, 1, '#6a6a6a'); a.R(63, 4, 1, 3, spike); a.R(63, 3, 1, 1, '#6a6a6a');
  a.R(62, 10, 4, 2, '#b300e6'); a.R(63, 10, 2, 1, '#e080ff'); a.P(65, 11, '#f6d0ff');
  // 近处的大翅膀：骨架 + 灰色翼膜，后缘一段段凹进去
  mcPoly(a, [[36, 19], [42, 3], [28, 0], [24, 4], [18, 5], [19, 9], [14, 11], [19, 14], [26, 18]], memN);
  mcLine(a, 36, 19, 42, 3, '#141414', 1); mcLine(a, 42, 3, 28, 0, '#141414', 1);
  mcLine(a, 42, 3, 18, 5, '#1c1c1c'); mcLine(a, 42, 3, 14, 11, '#1c1c1c'); mcLine(a, 42, 3, 26, 18, '#1c1c1c');
  a.R(41, 2, 3, 3, '#262626'); a.P(28, 0, '#6a6a6a');
}); };
ART.dragon = MC.dragon; WART.dragon = MC.dragon;
// 黑曜石柱：深紫黑 + 一点紫色闪点，一格格的接缝
ART.pillar = function () { return mcDraw('obsid', 12, 60, function (a) { a.R(0, 0, 12, 60, function (i, j) { var h = mcHash(i, j, 3) % 23; return j % 12 === 11 ? '#0d0a14' : h === 0 ? '#6c3fa0' : h < 3 ? '#3b2752' : h < 9 ? '#1b1325' : h < 15 ? '#140e1c' : '#221830'; }); }); };
// 末地水晶：外面两层会转的玻璃框，里面粉紫色的小方块，下面一块基岩 + 火
ART.crystalCage = function () { return mcDraw('ccage', 16, 16, function (a) { a.R(0, 0, 16, 1, '#f2f2ff'); a.R(0, 15, 16, 1, '#c9c6d6'); a.R(0, 0, 1, 16, '#e6e4f2'); a.R(15, 0, 1, 16, '#c9c6d6'); [[3, 3], [11, 4], [5, 11], [12, 12], [8, 7]].forEach(function (p) { a.P(p[0], p[1], 'rgba(255,255,255,.55)'); }); a.R(1, 1, 2, 2, '#ffffff'); a.R(13, 13, 2, 2, '#a9a6b8'); }); };
ART.crystalCore = function () { return mcDraw('ccore', 8, 8, function (a) { a.R(0, 0, 8, 8, function (i, j) { return (i + j) % 4 === 0 ? '#ffd2f3' : (i * 3 + j) % 5 === 0 ? '#c42e9e' : mcCol(['#ff6fd2', '#ff86da', '#f05cc4'], i, j, 9); }); a.R(1, 1, 2, 1, '#ffffff'); }); };
ART.crystalBase = function () { return mcDraw('cbase', 16, 14, function (a) {
  [[3, 0], [7, 1], [11, 0]].forEach(function (f, n) { a.R(f[0], f[1] + 1, 2, 5, '#ff9a1f'); a.R(f[0] + (n % 2), f[1], 1, 2, '#ffd23f'); a.R(f[0], f[1] + 4, 2, 2, '#ffe36b'); });
  a.R(1, 6, 14, 8, function (i, j) { return mcCol(['#4a4a4a', '#6e6e6e', '#2e2e2e', '#878787', '#575757'], i, j, 4); }); }); };
ART.crystal = function () { return mcDraw('crysIcon', 16, 16, function (a) { a.R(0, 0, 16, 1, '#f2f2ff'); a.R(0, 15, 16, 1, '#c9c6d6'); a.R(0, 0, 1, 16, '#e6e4f2'); a.R(15, 0, 1, 16, '#c9c6d6');
  a.R(4, 4, 8, 8, function (i, j) { return (i + j) % 4 === 0 ? '#ffd2f3' : (i * 3 + j) % 5 === 0 ? '#c42e9e' : mcCol(['#ff6fd2', '#ff86da', '#f05cc4'], i, j, 9); }); a.R(5, 5, 2, 1, '#ffffff'); }); };
// 龙蛋：黑色，带紫色斑点
ART.egg = function () { return mcGrid('degg', ['.....KKKK.....', '....KKKKKK....', '...KKpKKKKK...', '..KKKKKKKpKK..', '..KpKKKKKKKK..', '.KKKKKKpKKKKK.', '.KKKpKKKKKKpK.', 'KKKKKKKKKKKKKK', 'KpKKKKKKpKKKKK', 'KKKKKpKKKKKKpK', 'KKKKKKKKKKKKKK', '.KKpKKKKKpKKK.', '.KKKKKKKKKKKK.', '..KKKKpKKKK...', '....KKKKKK....'], { K: ['#120d18', '#1a1222', '#0e0a12', '#221830'], p: ['#7a3fbf', '#9b59d9', '#5c2c96'] }, 4); };
// 返回传送门：基岩围成的井，黑色星空门面，中间基岩柱上插 4 支火把
ART.exitPortal = function () { return mcDraw('exitp', 44, 24, function (a) {
  var bd = function (i, j) { return mcCol(['#4a4a4a', '#6e6e6e', '#2e2e2e', '#878787', '#575757', '#3a3a3a'], i + 50, j, 6); };
  a.R(0, 18, 44, 6, bd); a.R(0, 14, 5, 4, bd); a.R(39, 14, 5, 4, bd); a.R(5, 16, 34, 2, function (i, j) { var h = mcHash(i, j, 77) % 17; return h === 0 ? '#56e0c8' : h === 1 ? '#c58bff' : h === 2 ? '#e8f8ff' : h < 6 ? '#0d1b20' : '#05080c'; });
  a.R(20, 0, 4, 16, bd); [[18, 5], [24, 5]].forEach(function (t) { a.R(t[0], t[1], 2, 1, '#8a6236'); a.P(t[0] + (t[0] < 20 ? 0 : 1), t[1] - 1, '#ffd23f'); a.P(t[0] + (t[0] < 20 ? 0 : 1), t[1] - 2, '#fff2a8'); });
}); };
ART.endermanBlock = function () { return mcCube('grassE', MT.grassTop(), MT.grassSide(), MT.grassSide()); };


function _urlFor(name) {
  var fn = (MC && MC[name]) || (ART && ART[name]) || (WART && WART[name]);
  if (typeof fn === 'function') return fn();
  if (typeof spriteURL === 'function' && ((SPRITES && SPRITES[name]) || (SPR && SPR[name]))) {
    try { return spriteURL(name); } catch (e) {}
  }
  return '';
}
function art(name) { return _urlFor(name); }
function wordPic(key) { return (WART && WART[key]) ? WART[key]() : ''; }
function pictureFor(text) {
  if (!text) return '';
  var t = String(text).replace(/\s+/g, '');
  if (WORD_PICS[t]) return wordPic(WORD_PICS[t]);
  if (t.length > 1 && WORD_PICS[t.slice(0, 1)]) return wordPic(WORD_PICS[t.slice(0, 1)]);
  // also try each character
  for (var i = 0; i < t.length; i++) {
    if (WORD_PICS[t[i]]) return wordPic(WORD_PICS[t[i]]);
  }
  return '';
}
function zoneIcon(kind) {
  var map = ZONE_ICONS;
  return art(map[kind] || map.home || 'house');
}
var ZONE_ICONS = {
  forest: 'tree', farm: 'cow', crystal: 'crystal', mine: 'pickaxe', desert: 'cactus',
  snow: 'cloud', market: 'villager', library: 'mapi', workshop: 'table',
  redstone: 'redstone', garden: 'flower', harbor: 'fish', nether: 'lava',
  fortress: 'house', end: 'enderman', dragon: 'dragon', home: 'house'
};
var CAMP_ICONS = {
  lanterns: 'torch', orchard: 'tree', fountain: 'crystal',
  dragonBanner: 'dragon', eggGarden: 'egg', watchtower: 'house'
};
function campIcon(id) { return art(CAMP_ICONS[id] || id); }
function hotbarIcon(id) {
  var map = { map: 'mapi', atlas: 'gem', review: 'crystal', camp: 'house', stars: 'diamond' };
  return art(map[id] || id);
}
/* hanzi (or word) → WART/ART key. Art metadata only; not a question bank. */
var WORD_PICS = {"村民": "villager", "末影龙": "dragon", "苦力怕": "creeper", "僵尸": "zombie", "骷髅": "skeleton", "蜘蛛": "spider", "末影人": "enderman", "史莱姆": "slime", "蝙蝠": "bat", "牛": "cow", "猪": "pig", "羊": "sheep", "鸡": "chicken", "马": "horse", "狼": "wolf", "猫": "cat", "鱼": "fish", "蜜蜂": "bee", "熊猫": "panda", "钻石": "gem", "绿宝石": "emerald", "红石": "redstone", "剑": "sword", "镐": "pickaxe", "铁斧": "axe", "弓": "bow", "箭": "arrowi", "铁": "ingot", "金": "goldi", "煤": "coal", "地图": "mapi", "时钟": "clock", "矿车": "minecart", "圆石": "cobble", "原木": "log", "草方块": "grassb", "仙人掌": "cactus", "树": "tree", "花": "flower", "岩浆": "lava", "火把": "torch", "床": "bed", "门": "door", "宝箱": "chest", "工作台": "table", "熔炉": "furnace", "炸药": "tnt", "传送门": "portal", "小屋": "house", "苹果": "apple", "面包": "bread", "蛋糕": "cake", "西瓜": "melon", "南瓜": "pumpkin", "鸡蛋": "eggw", "牛奶": "milk"};

function bindWordPics(entries) {
  // entries: [{w, pic}] or [word, pic]
  (entries || []).forEach(function (e) {
    var w = e.w || e[0], pic = e.pic || e[1];
    if (!w || !pic) return;
    WORD_PICS[w] = pic;
    if (w.length === 1) WORD_PICS[w] = pic;
  });
}

function listNames(obj) { return obj ? Object.keys(obj) : []; }

root.LuccaMC = {
  version: 1,
  seeded: seeded,
  makeCanvas: makeCanvas,
  px: px,
  spriteURL: spriteURL,
  drawSprites: drawSprites,
  drawIcons: drawIcons,
  drawCrack: drawCrack,
  pickCursor: pickCursor,
  paintWorld: paintWorld,
  oreTex: oreTex,
  ORE_NAMES: ORE_NAMES,
  blockTex: blockTex,
  grassTex: grassTex,
  dirtTex: dirtTex,
  plankTex: plankTex,
  ART: ART,
  WART: WART,
  MC: MC,
  MT: MT,
  SPRITES: SPRITES,
  art: art,
  wordPic: wordPic,
  pictureFor: pictureFor,
  zoneIcon: zoneIcon,
  campIcon: campIcon,
  hotbarIcon: hotbarIcon,
  ZONE_ICONS: ZONE_ICONS,
  CAMP_ICONS: CAMP_ICONS,
  WORD_PICS: WORD_PICS,
  bindWordPics: bindWordPics,
  names: function () {
    var s = {};
    listNames(SPRITES).concat(listNames(ART), listNames(WART), listNames(MC)).forEach(function (k) { s[k] = 1; });
    return Object.keys(s);
  }
};
})(typeof window !== 'undefined' ? window : this);
