'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const game = require('../www/pinyin/game.js');

const EXPECTED = {
  '爱': ['', 'ai', 'ai'],
  '白': ['b', 'ai', 'bai'],
  '来': ['l', 'ai', 'lai'],
  '北': ['b', 'ei', 'bei'],
  '飞': ['f', 'ei', 'fei'],
  '美': ['m', 'ei', 'mei'],
  '水': ['sh', 'ui', 'shui'],
  '对': ['d', 'ui', 'dui'],
  '好': ['h', 'ao', 'hao'],
  '猫': ['m', 'ao', 'mao'],
  '跑': ['p', 'ao', 'pao'],
  '狗': ['g', 'ou', 'gou'],
  '头': ['t', 'ou', 'tou'],
  '走': ['z', 'ou', 'zou'],
  '牛': ['n', 'iu', 'niu'],
  '六': ['l', 'iu', 'liu'],
  '球': ['q', 'iu', 'qiu'],
  '鞋': ['x', 'ie', 'xie'],
  '写': ['x', 'ie', 'xie'],
  '姐': ['j', 'ie', 'jie'],
  '雪': ['x', 'üe', 'xue'],
  '学': ['x', 'üe', 'xue'],
  '月': ['y', 'üe', 'yue'],
  '耳': ['', 'er', 'er'],
  '二': ['', 'er', 'er'],
  '山': ['sh', 'an', 'shan'],
  '门': ['m', 'en', 'men'],
  '心': ['x', 'in', 'xin'],
  '春': ['ch', 'un', 'chun'],
  '裙': ['q', 'ün', 'qun'],
  '云': ['y', 'ün', 'yun'],
  '羊': ['y', 'ang', 'yang'],
  '风': ['f', 'eng', 'feng'],
  '星': ['x', 'ing', 'xing'],
  '红': ['h', 'ong', 'hong'],
  '中': ['zh', 'ong', 'zhong'],
  '鱼': ['y', 'ü', 'yu'],
  '雨': ['y', 'ü', 'yu'],
  '女': ['n', 'ü', 'nü'],
  '绿': ['l', 'ü', 'lü'],
};

test('every lesson uses the school spelling and a real picture', () => {
  assert.equal(game.QUESTIONS.length, Object.keys(EXPECTED).length);
  const got = new Map(game.QUESTIONS.map((question) => [question.hanzi, question]));
  for (const [hanzi, [initial, final, spell]] of Object.entries(EXPECTED)) {
    const question = got.get(hanzi);
    assert.ok(question, hanzi);
    assert.equal(question.initial, initial, hanzi);
    assert.equal(question.final, final, hanzi);
    assert.equal(question.spell, spell, hanzi);
    assert.equal(game.canon(initial + final), spell, hanzi);
    assert.equal(game.accepted(initial + final, question), true, hanzi);
    assert.equal(game.accepted((initial + final).replaceAll('ü', 'v'), question), true, hanzi);
    assert.ok(game.PICS[hanzi], hanzi);
    assert.ok(game.ITEMS[question.item], hanzi);
  }
});

test('j q x y drop the dots; n and l keep them; v is ü', () => {
  assert.equal(game.canon('XUE'), 'xue');
  assert.equal(game.canon('x ve'), 'xue');
  assert.equal(game.canon('xüe'), 'xue');
  assert.equal(game.canon('xve'), 'xue');
  assert.equal(game.canon('xu:e'), 'xue');
  assert.equal(game.canon('YVE'), 'yue');
  assert.equal(game.canon('yüe'), 'yue');
  assert.equal(game.canon('yv'), 'yu');
  assert.equal(game.canon('yü'), 'yu');
  assert.equal(game.canon('yün'), 'yun');
  assert.equal(game.canon('yvn'), 'yun');
  assert.equal(game.canon('qün'), 'qun');
  assert.equal(game.canon('qvn'), 'qun');
  assert.equal(game.canon('nv'), 'nü');
  assert.equal(game.canon('nü'), 'nü');
  assert.equal(game.canon('nu'), 'nu');
  assert.equal(game.canon('lv'), 'lü');
  assert.equal(game.canon('lu'), 'lu');
  assert.equal(game.canon('chün'), 'chün');
  assert.equal(game.canon('chun'), 'chun');
  assert.deepEqual(game.splitPinyin('zhong'), { initial: 'zh', final: 'ong' });
  assert.deepEqual(game.splitPinyin('chun'), { initial: 'ch', final: 'un' });
  assert.deepEqual(game.splitPinyin('shui'), { initial: 'sh', final: 'ui' });
  assert.deepEqual(game.splitPinyin('er'), { initial: '', final: 'er' });
  assert.deepEqual(game.splitPinyin('ai'), { initial: '', final: 'ai' });
  assert.deepEqual(game.splitPinyin('yu'), { initial: 'y', final: 'u' });
  assert.deepEqual(game.splitPinyin('nü'), { initial: 'n', final: 'ü' });
  assert.deepEqual(game.splitPinyin('xue'), { initial: 'x', final: 'ue' });
  assert.deepEqual(game.splitPinyin('sh'), { initial: 'sh', final: '' });
});

test('wrong answers point at the initial or the final and never treat a prefix as finished', () => {
  const wrong = (raw, spell, partialOk) => game.assess(raw, spell, { partialOk: !!partialOk });
  assert.equal(wrong('bai', 'bai').status, 'ok');
  assert.equal(wrong('bao', 'bai').initialWrong, false);
  assert.equal(wrong('bao', 'bai').finalWrong, true);
  assert.equal(wrong('pai', 'bai').initialWrong, true);
  assert.equal(wrong('pai', 'bai').finalWrong, false);
  assert.equal(wrong('pao', 'bai').initialWrong, true);
  assert.equal(wrong('pao', 'bai').finalWrong, true);
  assert.equal(wrong('bai', 'ai').initialWrong, true);
  assert.equal(wrong('bai', 'ai').finalWrong, false);
  assert.equal(wrong('xie', 'xue').finalWrong, true);
  assert.equal(wrong('xve', 'xue').status, 'ok');
  assert.equal(wrong('nu', 'nü').finalWrong, true);
  assert.equal(wrong('nv', 'nü').status, 'ok');
  assert.equal(wrong('chün', 'chun').finalWrong, true);
  assert.equal(wrong('chün', 'chun').initialWrong, false);
  assert.equal(wrong('yün', 'yun').status, 'ok');
  assert.equal(wrong('zong', 'zhong').initialWrong, true);
  assert.equal(wrong('yu', 'yue', true).status, 'partial');
  assert.equal(wrong('y', 'yu', true).status, 'partial');
  assert.equal(wrong('', 'ai').status, 'empty');
});

test('candidate buttons include the answer and no second correct spelling', () => {
  for (const question of game.QUESTIONS) {
    for (let seed = 1; seed <= 24; seed += 1) {
      const options = game.optionsFor(question, game.mulberry32(seed));
      assert.ok(options.initials.includes(question.initial), question.hanzi);
      assert.ok(options.finals.includes(question.final), question.hanzi);
      assert.equal(new Set(options.initials).size, options.initials.length, question.hanzi);
      assert.equal(new Set(options.finals).size, options.finals.length, question.hanzi);
      assert.ok(options.initials.length >= 2 && options.initials.length <= 4, question.hanzi);
      assert.ok(options.finals.length >= 2 && options.finals.length <= 4, question.hanzi);
      for (const final of options.finals) {
        if (final === question.final) continue;
        assert.notEqual(game.canon(question.initial + final), question.spell, question.hanzi + ' ' + final);
      }
      for (const initial of options.initials) {
        if (initial === question.initial) continue;
        assert.notEqual(game.canon(initial + question.final), question.spell, question.hanzi + ' ' + initial);
      }
    }
  }
});

test('the pinyin page keeps the homepage analytics id and does not read the visitor URL', () => {
  const html = fs.readFileSync(path.join(__dirname, '../www/pinyin/index.html'), 'utf8');
  const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].find((match) => match[1].includes('hm.baidu.com/hm.js'))[1];
  const ctx = vm.createContext({
    location: new Proxy({}, { get() { throw new Error('Do not read visitor URL data'); } }),
    document: { createElement: () => ({}), getElementsByTagName: () => [], head: { appendChild() {} } },
  });
  vm.runInContext(script, ctx);
  assert.deepEqual(JSON.parse(JSON.stringify(ctx._hmt)), [['_setAutoPageview', false], ['_trackPageview', '/pinyin/']]);
  assert.match(html, /hm\.baidu\.com\/hm\.js\?b5b9eb7e229dc60c4ebcd43c57100446/);
  assert.match(html, /href="https:\/\/www\.lucca\.top\/"/);
  assert.match(html, /src="game\.js"/);
  assert.match(html, /id="yu"/);
  assert.equal(html.includes('已上线'), false);
  assert.equal(/minecraft/i.test(html), false);
  const source = fs.readFileSync(path.join(__dirname, '../www/pinyin/game.js'), 'utf8');
  assert.equal(/minecraft/i.test(source), false);
  assert.equal(source.includes('已上线'), false);
});
