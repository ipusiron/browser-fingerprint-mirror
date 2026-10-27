import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { read } from './load.js';

// theme-init.js を、保存値と OS 設定を差し替えた仮の window で動かし、<html> の data-theme を返す。
// prefers: 'light' | 'dark' | 'none'（OS が好みを示さない）| 'nomatch'（matchMedia がない）
function run({ saved = null, prefers = 'none', storageThrows = false } = {}) {
  const attrs = {};
  const window = {
    localStorage: { getItem: () => { if (storageThrows) throw new Error('blocked'); return saved; } },
    document: { documentElement: { setAttribute: (k, v) => { attrs[k] = v; } } },
  };
  if (prefers !== 'nomatch') {
    window.matchMedia = (q) => ({ matches: q === `(prefers-color-scheme: ${prefers})` });
  }
  vm.runInNewContext(read('js/theme-init.js'), { window });
  return attrs['data-theme'];
}

test('保存値がなければ OS の設定に従う（ライトのときだけライト、それ以外はダーク）', () => {
  assert.equal(run({ prefers: 'light' }), 'light');
  assert.equal(run({ prefers: 'dark' }), 'dark');
  assert.equal(run({ prefers: 'none' }), 'dark');
  assert.equal(run({ prefers: 'nomatch' }), 'dark');
});

test('保存値（theme）は OS の設定より優先する', () => {
  assert.equal(run({ saved: 'light', prefers: 'dark' }), 'light');
  assert.equal(run({ saved: 'dark', prefers: 'light' }), 'dark');
});

test('想定外の保存値は無視して OS の設定に従う', () => {
  assert.equal(run({ saved: 'blue', prefers: 'light' }), 'light');
  assert.equal(run({ saved: 'blue', prefers: 'dark' }), 'dark');
});

test('localStorage が使えなくても落ちず、OS の設定に従う', () => {
  assert.equal(run({ storageThrows: true, prefers: 'light' }), 'light');
});

test('index.html の <head> で、stylesheet のあとに同期で読み込む', () => {
  const html = read('index.html');
  const head = html.slice(0, html.indexOf('</head>'));
  assert.ok(head.includes('<script src="./js/theme-init.js"></script>'), '<head> に theme-init.js がない');
  assert.ok(head.indexOf('style.css') < head.indexOf('js/theme-init.js'));
});

test('保存キーは画面のスクリプトと同じ', () => {
  assert.ok(read('js/theme-init.js').includes("getItem('theme')"));
  assert.ok(read('script.js').includes("const THEME_KEY = 'theme';"));
});
