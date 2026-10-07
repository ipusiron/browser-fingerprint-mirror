import test from 'node:test';
import assert from 'node:assert/strict';
import { read } from './load.js';

const css = read('style.css');

// style.css の :root と [data-theme="light"] から、CSS 変数の色を読む
function readVars(selector) {
  const block = css.match(new RegExp(`${selector}\\{([^}]*)\\}`));
  assert.ok(block, `${selector} の定義が見つからない`);
  const vars = {};
  for (const m of block[1].matchAll(/--([\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g)) vars[m[1]] = m[2];
  return vars;
}

function toRgb(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
}

// WCAG 2.2 の相対輝度
function luminance(rgb) {
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// 画面で実際に重なる組（文字 → 背景）
const PAIRS = [
  ['fg', 'bg'], ['fg', 'card'], ['fg', 'emph'],
  ['muted', 'bg'], ['muted', 'card'],
  ['on-accent', 'accent-weak'], ['on-accent', 'accent-hover'],
  ['accent', 'bg'], ['accent', 'card'],
  ['ok', 'card'], ['warn', 'card'],
];

const dark = readVars(':root');
const light = { ...dark, ...readVars('\\[data-theme="light"\\]') };

for (const [name, vars] of [['ダーク', dark], ['ライト', light]]) {
  test(`${name}の文字と背景が 4.5:1 以上`, () => {
    for (const [fg, bg] of PAIRS) {
      assert.ok(vars[fg], `--${fg} がない`);
      assert.ok(vars[bg], `--${bg} がない`);
      const r = ratio(toRgb(vars[fg]), toRgb(vars[bg]));
      assert.ok(r >= 4.5, `${name}: --${fg} on --${bg} = ${r.toFixed(2)}:1`);
    }
  });

  test(`${name}の noscript（--warn の上の --on-warn）も 4.5:1 以上`, () => {
    const r = ratio(toRgb(vars['on-warn']), toRgb(vars.warn));
    assert.ok(r >= 4.5, `${name}: --on-warn on --warn = ${r.toFixed(2)}:1`);
    assert.match(css, /\.noscript\{[^}]*background:var\(--warn\);color:var\(--on-warn\)/);
  });
}

test('主要な色をハードコードせず変数で指す（アクティブなタブ・主ボタン・リンク・指紋ID）', () => {
  assert.match(css, /\.tab\.active\{[^}]*color:var\(--on-accent\)/);
  assert.match(css, /\.btn\{[^}]*color:var\(--on-accent\)/);
  assert.match(css, /\.btn:hover\{[^}]*background:var\(--accent-hover\)/);
  assert.match(css, /^a\{color:var\(--accent\)\}/m);
  assert.match(css, /\.id\{[^}]*color:var\(--accent\)/);
  assert.doesNotMatch(css, /\.tab\.active\{[^}]*color:#fff/);
  assert.doesNotMatch(css, /\.btn\{[^}]*color:#fff/);
  assert.doesNotMatch(css, /a:hover\{[^}]*color:var\(--accent-weak\)/); // ライトの --accent-weak は白の上で読めない
});

test('フォーカスが見える。動きを減らす設定を尊重する。hidden 属性が効く。100dvh', () => {
  assert.match(css, /:focus-visible\{outline:3px solid var\(--accent\);outline-offset:2px\}/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /\[hidden\]\{display:none !important\}/);
  assert.match(css, /body\{min-height:100dvh\}/);
});

test('タップ領域: タブと主ボタンは 44px 以上', () => {
  assert.match(css, /\.tab\{[^}]*min-height:44px/);
  assert.match(css, /\.btn\{[^}]*min-height:44px/);
  assert.match(css, /\.theme-toggle\{[^}]*min-height:44px/);
});

test('ヘッダーのタイトルは中央（3列の grid）、狭い画面では1列', () => {
  assert.match(css, /\.header-content\{[^}]*grid-template-columns:minmax\(0,1fr\) auto minmax\(0,1fr\)/);
  assert.match(css, /\.header-title\{[^}]*text-align:center/);
  assert.match(css, /@media \(max-width:768px\)\{\s*\.header-content\{grid-template-columns:1fr\}/);
});

test('属性の一覧とカードの grid は幅 320px でも枠からはみ出さない（minmax に min() を使う）', () => {
  assert.match(css, /\.adv-grid\{[^}]*minmax\(min\(300px,100%\),1fr\)/);
  assert.match(css, /\.grid\{[^}]*minmax\(min\(240px,100%\),1fr\)/);
  assert.match(css, /\.adv-grid \.item\{[^}]*min-width:0/);
});

test('比較の入力欄は16px以上。比較の行は狭い画面で1列', () => {
  assert.match(css, /\.cmp-text\{[^}]*font-size:16px/);
  assert.match(css, /\.cmp-row\{[^}]*grid-template-columns:1fr 1fr/);
  assert.match(css, /@media \(max-width:600px\)\{\s*\.cmp-row\{grid-template-columns:1fr\}/);
  assert.match(css, /\.cmp-row\.diff\{border-color:var\(--warn\)\}/);
});

test('トーストの最大幅は CSS 変数（script.js の定数と同じ 300px）', () => {
  assert.match(css, /--toast-max:300px/);
  assert.match(css, /\.toast\{[^}]*max-width:var\(--toast-max\)/);
  assert.match(read('script.js'), /const TOAST_MAX_WIDTH = 300;/);
});
