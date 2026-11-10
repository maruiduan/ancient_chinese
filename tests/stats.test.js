'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const html = fs.readFileSync(require('node:path').join(__dirname, '../stats.html'), 'utf8');

test('the old public counter page no longer exposes visit counts', () => {
  assert.equal(html.includes('busuanzi'), false);
  assert.equal(html.includes('访问量'), false);
  assert.equal(html.includes('详细统计'), false);
  assert.equal(html.includes('tongji.baidu.com'), false);
  assert.equal(html.includes('已上线'), false);
  assert.match(html, /href="\/"/);
  assert.match(html, /https:\/\/www\.lucca\.top\//);
  assert.match(html, /<title>古文<\/title>/);
});
