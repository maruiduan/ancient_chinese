'use strict';

// 拼音矿工。声母 + 韵母，不标声调。
// j q x y 后面的 ü 写成 u；v 和 ü 都算对。n、l 后面的 ü 仍要两点。
(function (root) {
  const INITIALS = ['zh', 'ch', 'sh', 'b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'q', 'x', 'r', 'z', 'c', 's', 'y', 'w'];
  const STORE_KEY = 'lucca-pinyin-miner-v1';

  const COLOR = {
    '.': null,
    k: '#2c241c',
    w: '#fffdf8',
    r: '#ef4d4d',
    R: '#c42b2b',
    g: '#67c85a',
    G: '#2f8f38',
    y: '#ffd23f',
    Y: '#f09a1a',
    b: '#49b4f5',
    B: '#1d6fbf',
    c: '#8ef0ea',
    C: '#149b97',
    n: '#d0924c',
    N: '#8a5528',
    p: '#ff8fb8',
    e: '#e6e0d2',
    d: '#9a9488',
    o: '#ff8a34',
    s: '#ffd0a8',
    m: '#f6f0e4',
  };

  function grid(size, text, label) {
    const rows = text.trim().split(/\s+/);
    if (rows.length !== size) throw new Error(label + ' rows ' + rows.length);
    for (const row of rows) {
      if (row.length !== size) throw new Error(label + ' width ' + row.length + ':' + row);
      for (const ch of row) {
        if (!Object.prototype.hasOwnProperty.call(COLOR, ch)) throw new Error(label + ' color ' + ch);
      }
    }
    return rows;
  }

  function canon(input) {
    let s = String(input || '').trim().toLowerCase().replace(/\s+/g, '');
    s = s.replace(/u:/g, 'ü').replace(/v/g, 'ü');
    s = s.replace(/([jqxy])ü/g, '$1u');
    return s;
  }

  function splitPinyin(canonical) {
    let initial = '';
    for (const ini of INITIALS) {
      if (canonical.startsWith(ini)) {
        initial = ini;
        break;
      }
    }
    return { initial: initial, final: canonical.slice(initial.length) };
  }

  function assess(raw, spell, options) {
    const partialOk = !!(options && options.partialOk);
    const guess = canon(raw);
    if (!guess) return { status: 'empty', initialWrong: false, finalWrong: false };
    if (guess === spell) return { status: 'ok', initialWrong: false, finalWrong: false };
    if (partialOk && spell.startsWith(guess) && guess.length < spell.length) {
      return { status: 'partial', initialWrong: false, finalWrong: false };
    }
    const got = splitPinyin(guess);
    const want = splitPinyin(spell);
    return {
      status: 'wrong',
      initialWrong: got.initial !== want.initial,
      finalWrong: got.final !== want.final,
    };
  }

  function accepted(raw, question) {
    return assess(raw, question.spell, { partialOk: false }).status === 'ok';
  }

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(list, random) {
    const copy = list.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      const swap = copy[i];
      copy[i] = copy[j];
      copy[j] = swap;
    }
    return copy;
  }

  const NEAR_INITIAL = {
    '': ['b', 'm', 'l', 'd'],
    b: ['p', 'm', 'f', 'd'],
    p: ['b', 'm', 'f', 't'],
    m: ['b', 'n', 'f', 'l'],
    f: ['b', 'h', 'p', 'sh'],
    d: ['t', 'b', 'n', 'g'],
    t: ['d', 'n', 'k', 'p'],
    n: ['l', 'm', 'd', 'r'],
    l: ['n', 'm', 'd', 'r'],
    g: ['k', 'h', 'd', 'b'],
    k: ['g', 'h', 't', 'q'],
    h: ['g', 'f', 'k', 'x'],
    j: ['q', 'x', 'zh', 'd'],
    q: ['j', 'x', 'ch', 'g'],
    x: ['j', 'q', 'sh', 'h'],
    zh: ['ch', 'sh', 'z', 'j'],
    ch: ['zh', 'sh', 'c', 'q'],
    sh: ['zh', 'ch', 's', 'x'],
    r: ['l', 'sh', 'zh', 'n'],
    z: ['c', 's', 'zh', 'd'],
    c: ['z', 's', 'ch', 't'],
    s: ['z', 'c', 'sh', 'x'],
    y: ['w', 'l', 'j', 'q'],
    w: ['y', 'm', 'b', 'h'],
  };

  const NEAR_FINAL = {
    ai: ['ei', 'ao', 'an', 'ui'],
    ei: ['ai', 'ui', 'en', 'ie'],
    ui: ['ei', 'iu', 'un', 'ou'],
    ao: ['ou', 'ai', 'ang', 'an'],
    ou: ['ao', 'iu', 'ong', 'ui'],
    iu: ['ui', 'ou', 'ie', 'in'],
    ie: ['üe', 'ei', 'iu', 'in'],
    'üe': ['ie', 'ü', 'ün', 'ei'],
    er: ['en', 'ei', 'e', 'an'],
    an: ['ang', 'en', 'ai', 'in'],
    en: ['an', 'eng', 'ei', 'un'],
    in: ['ing', 'en', 'ün', 'ie'],
    un: ['ün', 'en', 'ui', 'ong'],
    'ün': ['un', 'in', 'üe', 'ü'],
    ang: ['an', 'eng', 'ong', 'ao'],
    eng: ['en', 'ang', 'ing', 'ong'],
    ing: ['in', 'eng', 'ong', 'en'],
    ong: ['eng', 'ang', 'ou', 'un'],
    'ü': ['u', 'üe', 'ün', 'i'],
  };

  const INITIAL_POOL = ['', 'b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'q', 'x', 'zh', 'ch', 'sh', 'r', 'z', 'c', 's', 'y', 'w'];
  const FINAL_POOL = ['ai', 'ei', 'ui', 'ao', 'ou', 'iu', 'ie', 'üe', 'er', 'an', 'en', 'in', 'un', 'ün', 'ang', 'eng', 'ing', 'ong', 'ü', 'u', 'i', 'a', 'e'];

  function pickMany(preferred, backup, count, ok, random) {
    const chosen = [];
    for (const token of shuffle(preferred.filter(ok), random)) {
      if (chosen.length >= count) break;
      chosen.push(token);
    }
    if (chosen.length < count) {
      for (const token of shuffle(backup.filter(ok), random)) {
        if (chosen.includes(token)) continue;
        chosen.push(token);
        if (chosen.length >= count) break;
      }
    }
    return chosen;
  }

  function optionsFor(question, random) {
    const rand = random || Math.random;
    const initials = [question.initial].concat(pickMany(
      NEAR_INITIAL[question.initial] || [],
      INITIAL_POOL,
      3,
      function (token) { return token !== question.initial; },
      rand
    ));
    const finals = [question.final].concat(pickMany(
      NEAR_FINAL[question.final] || [],
      FINAL_POOL,
      3,
      function (token) {
        return token !== question.final && canon(question.initial + token) !== question.spell;
      },
      rand
    ));
    const uniq = function (list) {
      const out = [];
      for (const item of list) if (!out.includes(item)) out.push(item);
      return out;
    };
    return { initials: shuffle(uniq(initials), rand), finals: shuffle(uniq(finals), rand) };
  }

  const ITEM_KEYS = ['apple', 'wood', 'stone', 'iron', 'gold', 'diamond', 'torch', 'grass', 'coal', 'bread', 'book', 'flower', 'bucket', 'feather', 'wool', 'sapling', 'pumpkin', 'star', 'snow', 'egg'];

  const ITEMS = {
    apple: { name: '苹果', pixels: grid(12, `
      ............
      .....gg.....
      ....gGg.....
      ......n.....
      ...rrrrrr...
      ..rrrrrrrr..
      ..rrrwrrrr..
      ..rrrrrrrr..
      ..rRrrrrrr..
      ...rrrrrr...
      ....rrrr....
      ............
    `, 'apple') },
    wood: { name: '木头', pixels: grid(12, `
      ............
      ...nnnnnn...
      ..nNnwNnn...
      ..nNnNnNn...
      ..nnnnnnn...
      ..nNNNNNn...
      ..nNNNNNn...
      ..nNNNNNn...
      ..nNNNNNn...
      ..nnnnnnn...
      ............
      ............
    `, 'wood') },
    stone: { name: '石头', pixels: grid(12, `
      ............
      ...eeeeee...
      ..edddddde..
      .eddeddedde.
      .edddddddde.
      .eeddddddee.
      .eddeddedde.
      .edddddddde.
      ..edddddde..
      ...eeeeee...
      ............
      ............
    `, 'stone') },
    iron: { name: '铁锭', pixels: grid(12, `
      ............
      ............
      ..wwwwwwww..
      .weeeeeeeew.
      .wewwwwweew.
      .weeeeeeeew.
      .wwwwwwwwww.
      ............
      ............
      ............
      ............
      ............
    `, 'iron') },
    gold: { name: '金块', pixels: grid(12, `
      ............
      ............
      ..yyyyyyyy..
      .yYYYYYYYYy.
      .yYyyyyyYYy.
      .yYYYYYYYYy.
      .yyyyyyyyyy.
      ............
      ............
      ............
      ............
      ............
    `, 'gold') },
    diamond: { name: '钻石', pixels: grid(12, `
      ............
      .....cc.....
      ....cCCc....
      ...cCwwCc...
      ..cCwwwwCc..
      ..cCwwwwCc..
      ...cCwwCc...
      ....cCCc....
      .....cc.....
      ............
      ............
      ............
    `, 'diamond') },
    torch: { name: '火把', pixels: grid(12, `
      ............
      .....yy.....
      ....yooy....
      ....yooy....
      .....oo.....
      .....nn.....
      .....nn.....
      .....nn.....
      .....nn.....
      .....Nn.....
      ............
      ............
    `, 'torch') },
    grass: { name: '草方块', pixels: grid(12, `
      .....ww.....
      ....wyyw....
      .gggggggggg.
      gGGGGGGGGGGg
      gGggggggggGg
      .nnnnnnnnnn.
      .nNNnNNnNNn.
      .nnnnnnnnnn.
      .nNnNNnNNnn.
      .nnnnnnnnnn.
      ............
      ............
    `, 'grass') },
    coal: { name: '煤炭', pixels: grid(12, `
      ............
      ....kkkk....
      ...kkddkk...
      ..kkddddkk..
      ..kddkkddk..
      ..kddddddk..
      ..kddkkddk..
      ..kkddddkk..
      ...kkkkkk...
      ............
      ............
      ............
    `, 'coal') },
    bread: { name: '面包', pixels: grid(12, `
      ............
      ...nnnnnn...
      ..nYYYYYYn..
      .nYyyyyyyYn.
      .nYyyyyyyYn.
      .nYYYYYYYYn.
      .nNnnnnnnNn.
      ..nnnnnnnn..
      ............
      ............
      ............
      ............
    `, 'bread') },
    book: { name: '书', pixels: grid(12, `
      ............
      ..bbbbbbb...
      .bwwwwwwbb..
      .bwbbbbwbb..
      .bwwwwwwbb..
      .bwbbbbwbb..
      .bwwwwwwbb..
      .bwbbbbwbb..
      .bwwwwwwbb..
      ..bbbbbbb...
      ............
      ............
    `, 'book') },
    flower: { name: '小花', pixels: grid(12, `
      ............
      ....p.p.....
      ...ppGpp....
      ....pGp.....
      ...ppGpp....
      .....G......
      .....G......
      ....gGg.....
      ...ggggg....
      ............
      ............
      ............
    `, 'flower') },
    bucket: { name: '水桶', pixels: grid(12, `
      ............
      ..b......b..
      ..bb....bb..
      ..bbbbbbbb..
      ...bbbbbb...
      ...bwwwwb...
      ...bwwwwb...
      ...bbbbbb...
      ....bbbb....
      ............
      ............
      ............
    `, 'bucket') },
    feather: { name: '羽毛', pixels: grid(12, `
      ............
      .....ww.....
      ....wyyw....
      ...wywww....
      ..wywwww....
      ...wywww....
      ....wyyw....
      .....ww.....
      ......n.....
      ............
      ............
      ............
    `, 'feather') },
    wool: { name: '羊毛', pixels: grid(12, `
      ............
      ....wwww....
      ..wwwwwwww..
      .wwwewwwww..
      .wwwwwwwww..
      .wwewwweww..
      .wwwwwwwww..
      ..wwwwwwww..
      ....wwww....
      ............
      ............
      ............
    `, 'wool') },
    sapling: { name: '树苗', pixels: grid(12, `
      ............
      .....gg.....
      ....gGGg....
      ...gGGGGg...
      ....gGGg....
      .....nN.....
      .....nN.....
      ....nnNn....
      ...nnnnnn...
      ............
      ............
      ............
    `, 'sapling') },
    pumpkin: { name: '南瓜', pixels: grid(12, `
      ............
      .....gg.....
      ....gGGg....
      ...oooooo...
      ..ookkkooo..
      ..oooooooo..
      ..ookkkooo..
      ..oooooooo..
      ...oooooo...
      ....oooo....
      ............
      ............
    `, 'pumpkin') },
    star: { name: '星星', pixels: grid(12, `
      ............
      .....yy.....
      .....yy.....
      ..yyyyyyyy..
      ...yyyyyy...
      ...y.yy.y...
      ..y..yy..y..
      ............
      ............
      ............
      ............
      ............
    `, 'star') },
    snow: { name: '雪块', pixels: grid(12, `
      ............
      ..wwwwwwww..
      .wcwwwwcwwc.
      .wwwwwwwwww.
      .wcwwcwwwwc.
      .wwwwwwwwww.
      .wcwwwwcwwc.
      .wwwwwwwwww.
      ..wwwwwwww..
      ............
      ............
      ............
    `, 'snow') },
    egg: { name: '蛋', pixels: grid(12, `
      ............
      .....ww.....
      ....wssw....
      ...wssssw...
      ..wssssssw..
      ..wsswsssw..
      ..wssssssw..
      ...wssssw...
      ....wwww....
      ............
      ............
      ............
    `, 'egg') },
  };

  function pic(text, label) {
    return grid(8, text, label);
  }

  const PICS = {
    '爱': pic(`
      .rr..rr.
      rrrrrrrr
      rrrrrrrr
      rrrrrrrr
      .rrrrrr.
      ..rrrr..
      ...rr...
      ........
    `, '爱'),
    '白': pic(`
      ...kk...
      ..kwwk..
      .kwwwkw.
      .kwwwwk.
      .kwwwwk.
      .kwwwkw.
      ..kwwk..
      ...kk...
    `, '白'),
    '来': pic(`
      ...g....
      ...gg...
      ...ggg..
      ggggggg.
      gggggggg
      ...ggg..
      ...gg...
      ...g....
    `, '来'),
    '北': pic(`
      ...yy...
      ..yyyy..
      .yyyyyy.
      ...nn...
      ...nn...
      ...nn...
      ..nnnn..
      .nnnnnn.
    `, '北'),
    '飞': pic(`
      ..bbb...
      .bbbbb..
      bbbybbb.
      .byyyb..
      ..bbb...
      ...b....
      ..bbb...
      ........
    `, '飞'),
    '美': pic(`
      ..p.p...
      .ppGpp..
      ..pGp...
      .ppGpp..
      ...G....
      ...G....
      ..gGg...
      .ggggg..
    `, '美'),
    '水': pic(`
      ...bb...
      ..bbbb..
      ..bbbb..
      .bbbbbb.
      ..bbbb..
      ...bb...
      bbbbbbbb
      .b.b.b.b
    `, '水'),
    '对': pic(`
      .kk..kk.
      kyykkyyk
      kyykkyyk
      .kk..kk.
      ........
      .kk..kk.
      kyykkyyk
      .kk..kk.
    `, '对'),
    '好': pic(`
      ...yy...
      ..yyyy..
      .ykyyky.
      .yyyyyy.
      ..yyyy..
      ..y..y..
      ...yy...
      ........
    `, '好'),
    '猫': pic(`
      g.....g.
      gk...kg.
      gkw.wkg.
      gkwwkkg.
      gkw.wkg.
      gkwwwwg.
      .gkkkkg.
      ..gnng..
    `, '猫'),
    '跑': pic(`
      ..nn....
      .nnnn...
      ..nn....
      .nn.n...
      nn..nn..
      ....n...
      ...nnn..
      ..nn....
    `, '跑'),
    '狗': pic(`
      n.....n.
      nk...kn.
      nkw.wkn.
      nkwwkkn.
      nkw.wkn.
      nkwwwwk.
      .nkkkkn.
      ..nnnn..
    `, '狗'),
    '头': pic(`
      ..kkkk..
      .ksssok.
      kssssssk
      kskssssk
      kssssssk
      .ksssok.
      ..kkkk..
      ...nn...
    `, '头'),
    '走': pic(`
      ...n....
      ...n....
      ..nnn...
      .n.n.n..
      ..n.n...
      .n...n..
      n.....n.
      ........
    `, '走'),
    '牛': pic(`
      n.....n.
      .n...n..
      .kkkkk..
      kwwkwwk.
      kwwwwwwk
      .kwwwwk.
      ..knnk..
      ...nn...
    `, '牛'),
    '六': pic(`
      bb.bb.bb
      bb.bb.bb
      ........
      bb.bb.bb
      bb.bb.bb
      ........
      ........
      ........
    `, '六'),
    '球': pic(`
      ..rrrr..
      .rrrrrr.
      rrwwrrrr
      rrrrrrrr
      rrrrrrrr
      .rrrrrr.
      ..rrrr..
      ........
    `, '球'),
    '鞋': pic(`
      .nn.....
      nnnn....
      nsssn...
      nssssn..
      nsssssn.
      nnnnnnnn
      NNNNNNNN
      ........
    `, '鞋'),
    '写': pic(`
      .....y..
      ....yy..
      ...yy...
      ..yy....
      .nn.....
      nn......
      n.......
      ........
    `, '写'),
    '姐': pic(`
      p.yyyy.p
      .ykssky.
      .ksssssk
      .kskkssk
      .ksssssk
      ..ksssk.
      ...kk...
      ........
    `, '姐'),
    '雪': pic(`
      ...w....
      .w.w.w..
      ..www...
      wwwwwww.
      ..www...
      .w.w.w..
      ...w....
      ........
    `, '雪'),
    '学': pic(`
      .nnnnnn.
      nwwwwwwk
      nwnnnnwk
      nwwwwwwk
      nwnnnnwk
      nwwwwwwk
      .nnnnnn.
      ..n..n..
    `, '学'),
    '月': pic(`
      ...yyyy.
      ..yyyyy.
      .yyyy...
      .yyyy...
      .yyyy...
      .yyyy...
      ..yyyyy.
      ...yyyy.
    `, '月'),
    '耳': pic(`
      .kkkk...
      k....k..
      k.kk.k..
      k.kk.k..
      k....k..
      k.kkkk..
      .kkkk...
      ........
    `, '耳'),
    '二': pic(`
      ........
      kkkkkkk.
      ........
      ........
      kkkkkkk.
      ........
      ........
      ........
    `, '二'),
    '山': pic(`
      ...g....
      ..ggg...
      .ggggg..
      gggggggg
      nnnnnnnn
      NNNNNNNN
      ........
      ........
    `, '山'),
    '门': pic(`
      nnnnnnnn
      nwwwwwwn
      nwwwwkwn
      nwwwwkwn
      nwwwwkwn
      nwwwwkwn
      nnnnnnnn
      ........
    `, '门'),
    '心': pic(`
      .pp..pp.
      pppppppp
      pppppppp
      pppppppp
      .pppppp.
      ..pppp..
      ...pp...
      ........
    `, '心'),
    '春': pic(`
      ...g....
      ..gGg...
      .ggGgg..
      ...G....
      ..gGg...
      ...G....
      ..nnn...
      .nnnnn..
    `, '春'),
    '裙': pic(`
      ...pp...
      ..pppp..
      .pppppp.
      pppppppp
      pppppppp
      .p.pp.p.
      .p....p.
      ........
    `, '裙'),
    '云': pic(`
      ..wwww..
      .wwwwww.
      wwwewww.
      wwwwwwww
      .wwwwww.
      ..wwww..
      ........
      ........
    `, '云'),
    '羊': pic(`
      ..w...w.
      .ww...ww
      ..wwwww.
      .wkwwkw.
      .wwwwww.
      ..wwwww.
      ...nnn..
      ........
    `, '羊'),
    '风': pic(`
      cccccccc
      ..ccc...
      ccccccc.
      ...ccc..
      .cccccc.
      ....cc..
      ..cccc..
      ........
    `, '风'),
    '星': pic(`
      ...yy...
      ...yy...
      yyyyyyyy
      ..yyyy..
      ..y..y..
      .y....y.
      ........
      ........
    `, '星'),
    '红': pic(`
      .rrrrrr.
      rrrrrrrr
      rrRRRRrr
      rrRRRRrr
      rrRRRRrr
      rrrrrrrr
      .rrrrrr.
      ........
    `, '红'),
    '中': pic(`
      kkkkkkkk
      k......k
      k..kk..k
      k.kyyk.k
      k.kyyk.k
      k..kk..k
      k......k
      kkkkkkkk
    `, '中'),
    '鱼': pic(`
      ....bb..
      ..bbbbb.
      bbbbbbbb
      bbwbbbbb
      bbbbbbbb
      ..bbbbb.
      ....bb..
      ........
    `, '鱼'),
    '雨': pic(`
      cccccccc
      ........
      .b.b.b..
      ..b.b.b.
      .b.b.b..
      ..b.b...
      ........
      ........
    `, '雨'),
    '女': pic(`
      k..yy..k
      .kyssok.
      .ksssssk
      .kskkssk
      .ksssssk
      ..ksssk.
      ...kk...
      ........
    `, '女'),
    '绿': pic(`
      ....gg..
      ...gGg..
      ..gGGGg.
      .gGGGGGg
      ..gGGGg.
      ...gGg..
      ....G...
      ...n....
    `, '绿'),
  };

  const QUESTIONS = [
    { hanzi: '爱', initial: '', final: 'ai', spell: 'ai' },
    { hanzi: '白', initial: 'b', final: 'ai', spell: 'bai' },
    { hanzi: '来', initial: 'l', final: 'ai', spell: 'lai' },
    { hanzi: '北', initial: 'b', final: 'ei', spell: 'bei' },
    { hanzi: '飞', initial: 'f', final: 'ei', spell: 'fei', scene: 'sky' },
    { hanzi: '美', initial: 'm', final: 'ei', spell: 'mei' },
    { hanzi: '水', initial: 'sh', final: 'ui', spell: 'shui', scene: 'water' },
    { hanzi: '对', initial: 'd', final: 'ui', spell: 'dui' },
    { hanzi: '好', initial: 'h', final: 'ao', spell: 'hao' },
    { hanzi: '猫', initial: 'm', final: 'ao', spell: 'mao' },
    { hanzi: '跑', initial: 'p', final: 'ao', spell: 'pao' },
    { hanzi: '狗', initial: 'g', final: 'ou', spell: 'gou' },
    { hanzi: '头', initial: 't', final: 'ou', spell: 'tou' },
    { hanzi: '走', initial: 'z', final: 'ou', spell: 'zou' },
    { hanzi: '牛', initial: 'n', final: 'iu', spell: 'niu' },
    { hanzi: '六', initial: 'l', final: 'iu', spell: 'liu' },
    { hanzi: '球', initial: 'q', final: 'iu', spell: 'qiu' },
    { hanzi: '鞋', initial: 'x', final: 'ie', spell: 'xie' },
    { hanzi: '写', initial: 'x', final: 'ie', spell: 'xie' },
    { hanzi: '姐', initial: 'j', final: 'ie', spell: 'jie' },
    { hanzi: '雪', initial: 'x', final: 'üe', spell: 'xue', scene: 'snow' },
    { hanzi: '学', initial: 'x', final: 'üe', spell: 'xue' },
    { hanzi: '月', initial: 'y', final: 'üe', spell: 'yue', scene: 'night' },
    { hanzi: '耳', initial: '', final: 'er', spell: 'er' },
    { hanzi: '二', initial: '', final: 'er', spell: 'er' },
    { hanzi: '山', initial: 'sh', final: 'an', spell: 'shan' },
    { hanzi: '门', initial: 'm', final: 'en', spell: 'men' },
    { hanzi: '心', initial: 'x', final: 'in', spell: 'xin' },
    { hanzi: '春', initial: 'ch', final: 'un', spell: 'chun' },
    { hanzi: '裙', initial: 'q', final: 'ün', spell: 'qun' },
    { hanzi: '云', initial: 'y', final: 'ün', spell: 'yun', scene: 'snow' },
    { hanzi: '羊', initial: 'y', final: 'ang', spell: 'yang' },
    { hanzi: '风', initial: 'f', final: 'eng', spell: 'feng', scene: 'sky' },
    { hanzi: '星', initial: 'x', final: 'ing', spell: 'xing', scene: 'night' },
    { hanzi: '红', initial: 'h', final: 'ong', spell: 'hong' },
    { hanzi: '中', initial: 'zh', final: 'ong', spell: 'zhong' },
    { hanzi: '鱼', initial: 'y', final: 'ü', spell: 'yu', scene: 'water' },
    { hanzi: '雨', initial: 'y', final: 'ü', spell: 'yu', scene: 'water' },
    { hanzi: '女', initial: 'n', final: 'ü', spell: 'nü' },
    { hanzi: '绿', initial: 'l', final: 'ü', spell: 'lü' },
  ];

  QUESTIONS.forEach(function (question, index) {
    question.item = ITEM_KEYS[index % ITEM_KEYS.length];
  });

  const seen = new Set();
  for (const question of QUESTIONS) {
    if (seen.has(question.hanzi)) throw new Error('重复的字 ' + question.hanzi);
    seen.add(question.hanzi);
    if (!PICS[question.hanzi]) throw new Error('缺图 ' + question.hanzi);
    if (!ITEMS[question.item]) throw new Error('缺物品 ' + question.hanzi);
    if (canon(question.initial + question.final) !== question.spell) {
      throw new Error('拼音不一致 ' + question.hanzi);
    }
  }

  function drawSprite(host, rows, scale) {
    host.replaceChildren();
    if (!rows) return;
    const height = rows.length;
    const width = rows[0].length;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('shape-rendering', 'crispEdges');
    svg.style.width = (width * scale) + 'px';
    svg.style.height = (height * scale) + 'px';
    svg.style.display = 'block';
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const fill = COLOR[rows[y][x]];
        if (!fill) continue;
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', String(x));
        rect.setAttribute('y', String(y));
        rect.setAttribute('width', '1');
        rect.setAttribute('height', '1');
        rect.setAttribute('fill', fill);
        svg.appendChild(rect);
      }
    }
    host.appendChild(svg);
  }

  function boot() {
    const $ = function (id) { return document.getElementById(id); };
    const hanzi = $('hanzi');
    const picHost = $('pic');
    const spell = $('spell');
    const partI = $('part-i');
    const partF = $('part-f');
    const msg = $('msg');
    const prize = $('prize');
    const coach = $('coach');
    const initialHost = $('initials');
    const finalHost = $('finals');
    const bag = $('bag');
    const count = $('count');
    const card = $('card');
    const board = $('board');
    const ask = $('ask');
    const stage = $('stage');

    let solved = [];
    let ready = false;
    let current = QUESTIONS[0];
    let mode = 'slots';
    let text = '';
    let slots = { initial: null, final: null };
    let mark = { initial: false, final: false };
    let mistakes = 0;
    let locked = false;
    let epoch = 0;
    let reviewCursor = 0;
    let audioCtx = null;

    function load() {
      try {
        const data = JSON.parse(root.localStorage.getItem(STORE_KEY) || '{}');
        const known = new Set(QUESTIONS.map(function (q) { return q.hanzi; }));
        const list = Array.isArray(data.solved) ? data.solved.filter(function (item) { return known.has(item); }) : [];
        solved = Array.from(new Set(list));
        ready = !!data.ready;
      } catch (err) {
        solved = [];
        ready = false;
      }
    }

    function save() {
      try {
        root.localStorage.setItem(STORE_KEY, JSON.stringify({ solved: solved, ready: ready }));
      } catch (err) { /* 隐私模式里玩完这一局即可 */ }
    }

    function audio() {
      try {
        const Ctx = root.AudioContext || root.webkitAudioContext;
        if (!Ctx) return null;
        if (!audioCtx) audioCtx = new Ctx();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        return audioCtx;
      } catch (err) {
        return null;
      }
    }

    function tone(freq, when, dur, type, vol) {
      try {
        const ctx = audio();
        if (!ctx) return;
        const start = ctx.currentTime + when;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type || 'sine';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(vol, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + dur + 0.03);
      } catch (err) { /* 没有音频也不影响拼字 */ }
    }

    function playTap() { tone(660, 0, 0.07, 'sine', 0.045); }
    function playTry() {
      tone(392, 0, 0.12, 'sine', 0.04);
      tone(330, 0.1, 0.14, 'sine', 0.035);
    }
    function playOk() {
      tone(523, 0, 0.12, 'sine', 0.06);
      tone(659, 0.09, 0.12, 'sine', 0.06);
      tone(784, 0.18, 0.14, 'sine', 0.06);
      tone(1046, 0.28, 0.22, 'triangle', 0.05);
    }
    function playHint() {
      tone(880, 0, 0.1, 'sine', 0.04);
      tone(1174, 0.11, 0.16, 'sine', 0.04);
    }

    function speak(content) {
      try {
        if (!root.speechSynthesis || typeof root.SpeechSynthesisUtterance !== 'function') return;
        const utter = new root.SpeechSynthesisUtterance(content);
        utter.lang = 'zh-CN';
        utter.rate = 0.9;
        root.speechSynthesis.cancel();
        root.speechSynthesis.speak(utter);
      } catch (err) { /* 读不出来就只看亮着的按钮 */ }
    }

    function rawNow() {
      if (mode === 'text') return text;
      if (slots.initial === null && slots.final === null) return '';
      return (slots.initial || '') + (slots.final || '');
    }

    function reducedMotion() {
      return !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }

    function paintBag() {
      const order = [];
      const counts = new Map();
      for (const item of solved) {
        const key = QUESTIONS.find(function (q) { return q.hanzi === item; }).item;
        if (!counts.has(key)) order.push(key);
        counts.set(key, (counts.get(key) || 0) + 1);
      }
      bag.replaceChildren();
      if (!order.length) {
        const empty = document.createElement('p');
        empty.className = 'empty';
        empty.textContent = '拼对就放在这里';
        bag.appendChild(empty);
        return;
      }
      for (const key of order) {
        const slot = document.createElement('div');
        slot.className = 'slot';
        slot.dataset.item = key;
        const icon = document.createElement('div');
        icon.className = 'slot-icon';
        drawSprite(icon, ITEMS[key].pixels, 4);
        const name = document.createElement('div');
        name.className = 'nm';
        name.textContent = ITEMS[key].name;
        slot.append(icon, name);
        if (counts.get(key) > 1) {
          const badge = document.createElement('span');
          badge.className = 'times';
          badge.textContent = String(counts.get(key));
          slot.appendChild(badge);
        }
        bag.appendChild(slot);
      }
    }

    function paint() {
      const pretty = canon(rawNow());
      spell.textContent = pretty || '·';
      spell.classList.toggle('idle', !pretty);
      const parts = splitPinyin(pretty);
      partI.textContent = '声母 ' + (pretty ? (parts.initial || '没有') : '·');
      partF.textContent = '韵母 ' + (pretty && parts.final ? parts.final : '·');
      partI.classList.toggle('bad', mark.initial);
      partF.classList.toggle('bad', mark.final);
      count.textContent = solved.length + ' 个';
      count.setAttribute('aria-label', '已经收集了 ' + solved.length + ' 个');
      for (const btn of initialHost.querySelectorAll('.key')) {
        const token = btn.getAttribute('data-token');
        const on = mode === 'slots' && slots.initial !== null && token === slots.initial;
        btn.classList.toggle('on', on);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        btn.classList.toggle('glow', mistakes >= 3 && token === current.initial);
      }
      for (const btn of finalHost.querySelectorAll('.key')) {
        const token = btn.getAttribute('data-token');
        const on = mode === 'slots' && slots.final !== null && token === slots.final;
        btn.classList.toggle('on', on);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        btn.classList.toggle('glow', mistakes >= 5 && token === current.final);
      }
    }

    function seedFor(question) {
      let seed = 1;
      for (const ch of question.hanzi) seed = (Math.imul(seed, 33) + ch.codePointAt(0)) >>> 0;
      return seed || 1;
    }

    function renderKeys(question) {
      const options = optionsFor(question, mulberry32(seedFor(question)));
      fillKeys(initialHost, options.initials, true);
      fillKeys(finalHost, options.finals, false);
    }

    function fillKeys(host, tokens, isInitial) {
      host.replaceChildren();
      for (const token of tokens) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'key ' + (isInitial ? 'ini' : 'final');
        if (isInitial && token === '') btn.classList.add('none');
        btn.setAttribute('data-token', token);
        const label = isInitial && token === '' ? '没有' : token;
        btn.textContent = label;
        btn.setAttribute('aria-label', (isInitial ? '声母 ' : '韵母 ') + label);
        btn.addEventListener('click', function () {
          if (isInitial) chooseInitial(token);
          else chooseFinal(token);
        });
        host.appendChild(btn);
      }
    }

    function nextUnsolved() {
      const pending = QUESTIONS.find(function (q) { return !solved.includes(q.hanzi); });
      if (pending) return pending;
      const question = QUESTIONS[reviewCursor % QUESTIONS.length];
      reviewCursor = (reviewCursor + 1) % QUESTIONS.length;
      return question;
    }

    function showQuestion(question) {
      current = question;
      mode = 'slots';
      text = '';
      slots = { initial: null, final: null };
      mark = { initial: false, final: false };
      mistakes = 0;
      locked = false;
      board.style.pointerEvents = '';
      prize.hidden = true;
      hanzi.textContent = question.hanzi;
      stage.setAttribute('aria-label', '请拼 ' + question.hanzi);
      drawSprite(picHost, PICS[question.hanzi], 9);
      document.body.dataset.scene = question.scene || 'day';
      renderKeys(question);
      paint();
      coach.hidden = ready || solved.length > 0;
      if (solved.length === QUESTIONS.length) {
        msg.textContent = '都收集到啦';
        msg.className = 'msg ok';
      } else {
        msg.textContent = '';
        msg.className = 'msg';
      }
    }

    function chooseInitial(token) {
      if (locked) return;
      audio();
      playTap();
      mode = 'slots';
      text = '';
      slots.initial = token;
      mark = { initial: false, final: false };
      paint();
      if (slots.final !== null) commit();
    }

    function chooseFinal(token) {
      if (locked) return;
      audio();
      playTap();
      mode = 'slots';
      text = '';
      slots.final = token;
      mark = { initial: false, final: false };
      paint();
      if (slots.initial !== null) commit();
    }

    function typeChar(ch) {
      if (locked) return;
      const glyph = ch === 'v' ? 'ü' : ch;
      if (!/^[a-zü]$/.test(glyph)) return;
      if (mode !== 'text') {
        text = (slots.initial === null && slots.final === null) ? '' : ((slots.initial || '') + (slots.final || ''));
        slots = { initial: null, final: null };
        mode = 'text';
      }
      text += glyph;
      mark = { initial: false, final: false };
      paint();
    }

    function backspace() {
      if (locked) return;
      mark = { initial: false, final: false };
      if (mode === 'text') {
        const chars = Array.from(text);
        chars.pop();
        text = chars.join('');
        if (!text) {
          mode = 'slots';
          slots = { initial: null, final: null };
        }
      } else if (slots.final !== null) {
        slots.final = null;
      } else {
        slots.initial = null;
      }
      if (mistakes < 3) {
        msg.textContent = '';
        msg.className = 'msg';
      }
      paint();
    }

    function clearAll() {
      if (locked) return;
      mode = 'slots';
      text = '';
      slots = { initial: null, final: null };
      mark = { initial: false, final: false };
      if (mistakes < 3) {
        msg.textContent = '';
        msg.className = 'msg';
      }
      paint();
    }

    function wiggle() {
      for (const el of [partI, partF]) {
        if (!el.classList.contains('bad')) continue;
        el.classList.remove('wiggle');
        void el.offsetWidth;
        el.classList.add('wiggle');
      }
    }

    function confetti() {
      if (reducedMotion()) return;
      const colors = ['#ffd23f', '#6dce63', '#49b4f5', '#ff8fb8', '#ff8a34'];
      for (let i = 0; i < 12; i += 1) {
        const bit = document.createElement('i');
        bit.className = 'bit';
        bit.style.left = (8 + Math.random() * 84) + '%';
        bit.style.background = colors[i % colors.length];
        bit.style.animationDelay = (Math.random() * 0.15) + 's';
        card.appendChild(bit);
        root.setTimeout(function () { bit.remove(); }, 800);
      }
    }

    function fly(item) {
      if (reducedMotion() || typeof document.createElement('div').animate !== 'function') return;
      const slot = bag.querySelector('[data-item="' + item + '"]');
      const icon = prize.querySelector('.prize-icon');
      if (!slot || !icon) return;
      const slotLeft = slot.offsetLeft;
      if (slotLeft < bag.scrollLeft || slotLeft > bag.scrollLeft + bag.clientWidth - slot.clientWidth) {
        bag.scrollLeft = Math.max(0, slotLeft - 8);
      }
      const from = icon.getBoundingClientRect();
      const to = slot.getBoundingClientRect();
      const ghost = icon.cloneNode(true);
      ghost.style.position = 'fixed';
      ghost.style.left = from.left + 'px';
      ghost.style.top = from.top + 'px';
      ghost.style.width = from.width + 'px';
      ghost.style.height = from.height + 'px';
      ghost.style.margin = '0';
      ghost.style.zIndex = '40';
      ghost.style.pointerEvents = 'none';
      document.body.appendChild(ghost);
      const anim = ghost.animate([
        { transform: 'translate(0,0) scale(1)' },
        { transform: 'translate(' + (to.left - from.left) + 'px,' + (to.top - from.top) + 'px) scale(.45)' },
      ], { duration: 620, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'forwards' });
      const done = function () { ghost.remove(); };
      if (anim.finished) anim.finished.then(done, done);
      else root.setTimeout(done, 700);
    }

    function succeed() {
      const question = current;
      const fresh = !solved.includes(question.hanzi);
      if (fresh) {
        solved.push(question.hanzi);
        ready = true;
        save();
      }
      coach.hidden = true;
      msg.textContent = '拼对啦';
      msg.className = 'msg ok';
      mark = { initial: false, final: false };
      locked = true;
      board.style.pointerEvents = 'none';
      paint();
      paintBag();
      playOk();
      if (fresh) {
        prize.hidden = false;
        prize.replaceChildren();
        const icon = document.createElement('div');
        icon.className = 'prize-icon';
        drawSprite(icon, ITEMS[question.item].pixels, 6);
        const label = document.createElement('div');
        label.textContent = '得到 ' + ITEMS[question.item].name;
        prize.append(icon, label);
        confetti();
        root.requestAnimationFrame(function () {
          try { fly(question.item); } catch (err) { /* 飞不过去也已经在背包里 */ }
        });
      } else {
        prize.hidden = true;
      }
      const ticket = ++epoch;
      root.setTimeout(function () {
        if (ticket !== epoch) return;
        prize.hidden = true;
        showQuestion(nextUnsolved());
      }, 1200);
    }

    function commit() {
      if (locked) return;
      const result = assess(rawNow(), current.spell, { partialOk: mode === 'text' });
      if (result.status === 'ok') {
        succeed();
        return;
      }
      if (result.status === 'empty') {
        msg.textContent = '先点声母和韵母～';
        msg.className = 'msg retry';
        return;
      }
      if (result.status === 'partial') {
        msg.textContent = '再补一补～';
        msg.className = 'msg retry';
        return;
      }
      mistakes += 1;
      mark = { initial: result.initialWrong, final: result.finalWrong };
      msg.className = 'msg retry';
      if (mistakes >= 5) msg.textContent = '再试试～ 读作 ' + current.spell;
      else if (mistakes >= 3) msg.textContent = current.initial ? ('再试试～ 声母是 ' + current.initial) : '再试试～ 没有声母';
      else msg.textContent = '再试试～';
      if (mistakes === 3) {
        playHint();
        speak(current.hanzi);
      } else playTry();
      paint();
      wiggle();
    }

    function wipe() {
      epoch += 1;
      solved = [];
      ready = false;
      reviewCursor = 0;
      save();
      paintBag();
      showQuestion(QUESTIONS[0]);
    }

    $('back').addEventListener('click', function () { audio(); playTap(); backspace(); });
    $('clear').addEventListener('click', function () { audio(); playTap(); clearAll(); });
    $('yu').addEventListener('click', function () { audio(); playTap(); typeChar('ü'); });
    $('go').addEventListener('click', function () { audio(); commit(); });
    $('reset').addEventListener('click', function () { ask.hidden = false; });
    $('keep').addEventListener('click', function () { ask.hidden = true; });
    $('wipe').addEventListener('click', function () { ask.hidden = true; wipe(); });

    root.addEventListener('keydown', function (event) {
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
      if (!ask.hidden) {
        if (event.key === 'Escape') {
          ask.hidden = true;
          event.preventDefault();
        }
        return;
      }
      if (locked) return;
      if (event.key === 'Backspace') {
        event.preventDefault();
        audio();
        backspace();
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        audio();
        commit();
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        audio();
        clearAll();
        return;
      }
      if (/^[a-z]$/i.test(event.key)) {
        event.preventDefault();
        audio();
        playTap();
        typeChar(event.key.toLowerCase());
      }
    });

    load();
    paintBag();
    showQuestion(nextUnsolved());
  }

  const api = {
    canon: canon,
    splitPinyin: splitPinyin,
    assess: assess,
    accepted: accepted,
    optionsFor: optionsFor,
    mulberry32: mulberry32,
    QUESTIONS: QUESTIONS,
    ITEMS: ITEMS,
    PICS: PICS,
    COLOR: COLOR,
    STORE_KEY: STORE_KEY,
    boot: boot,
  };

  if (typeof module === 'object' && module.exports) module.exports = api;
  root.PinyinMiner = api;
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
