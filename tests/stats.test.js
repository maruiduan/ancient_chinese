'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(require('node:path').join(__dirname, '../stats.html'), 'utf8');
function stats() {
  const line = { textContent: '正在读取古文访问量…', style: {} };
  let script, timeout;
  const window = {};
  vm.runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], {
    window, document: { getElementById: () => line, createElement: () => ({}), head: { appendChild: s => script = s } },
    localStorage: { getItem: () => null, setItem() {} },
    setTimeout: fn => { timeout = fn; return 1; }, clearTimeout() {},
  });
  return { line, script, timeout, callback: Object.values(window)[0] };
}
test('statistics provider failures and timeouts never leave a blank page', () => {
  for (const event of ['error', 'timeout']) {
    const t = stats();
    if (event === 'error') t.script.onerror(); else t.timeout();
    assert.match(t.line.textContent, /暂时无法读取/);
  }
});
test('statistics successful response remains visible after timeout', () => {
  const t = stats(); t.callback({ site_pv: 12, site_uv: 3, page_pv: 2 });
  t.timeout();
  assert.equal(t.line.textContent, '古文 · 访问量 10 · 访客 3');
});
test('invalid statistics response produces a readable failure', () => {
  const t = stats(); t.callback({ site_pv: -1, site_uv: 3 });
  assert.match(t.line.textContent, /暂时无法读取/);
});
