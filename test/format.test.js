import test from 'node:test';
import assert from 'node:assert/strict';
import { read } from './load.js';

// 1行に詰め込んだ（minify した）ファイルを見つける。行数の下限も見る
// style.css は1行1規則の書き方なので長い行を許す（それでも 400 文字以内）
const FILES = [
  { path: 'js/fp-core.js', maxLine: 200, minLines: 250 },
  { path: 'js/fp-collect.js', maxLine: 200, minLines: 200 },
  { path: 'js/messages.js', maxLine: 400, minLines: 300 },
  { path: 'js/i18n.js', maxLine: 160, minLines: 40 },
  { path: 'test/i18n.test.js', maxLine: 260, minLines: 80 },
  { path: 'test/readme.test.js', maxLine: 260, minLines: 150 },
  { path: 'script.js', maxLine: 200, minLines: 250 },
  { path: 'style.css', maxLine: 400, minLines: 150 },
  { path: 'index.html', maxLine: 400, minLines: 150 },
  { path: 'test/core.test.js', maxLine: 200, minLines: 250 },
  { path: 'test/html.test.js', maxLine: 220, minLines: 60 },
  { path: 'test/contrast.test.js', maxLine: 200, minLines: 60 },
];

for (const f of FILES) {
  test(`${f.path} が1行に詰め込まれていない`, () => {
    const lines = read(f.path).split('\n').map((l) => l.replace(/\r$/, ''));
    const longest = lines.reduce((a, b) => (a.length > b.length ? a : b), '');
    assert.ok(longest.length <= f.maxLine, `最長 ${longest.length} 文字: ${longest.slice(0, 80)}…`);
    assert.ok(lines.length >= f.minLines, `${lines.length} 行しかない`);
  });
}

const JAPANESE = new RegExp('[' + [[0x3000, 0x303f], [0x3040, 0x30ff], [0x3400, 0x9fff], [0xff00, 0xffef]]
  .map(([a, b]) => String.fromCharCode(a) + '-' + String.fromCharCode(b)).join('') + ']');

function literals(file) {
  const js = read(file);
  const stripped = js
    .split('\n')
    .filter((line) => !line.trim().startsWith('//') && !line.trim().startsWith('*') && !line.trim().startsWith('/*'))
    .map((line) => line.replace(/\/\/[^'"`]*$/, ''))
    .join('\n');
  return [...stripped.matchAll(/(['"`])((?:(?!\1).)*)\1/g)].map((m) => m[2]).filter((v) => JAPANESE.test(v));
}

test('画面・収集・計算のスクリプトに日本語の文字列リテラルを残さない（文言は messages.js に集める）', () => {
  for (const f of ['script.js', 'js/fp-collect.js', 'js/fp-core.js']) {
    assert.deepEqual(literals(f), [], `${f} に日本語の文字列が残っている`);
  }
});

test('計算部は DOM・ブラウザーの API を使わない。収集部と画面は innerHTML を使わない', () => {
  // コメントを除いたコードだけを見る（「windows:」のようなキー名も除く）
  const core = read('js/fp-core.js')
    .split('\n')
    .filter((line) => !line.trim().startsWith('//') && !line.trim().startsWith('*') && !line.trim().startsWith('/*'))
    .map((line) => line.replace(/\/\/.*$/, ''))
    .join('\n');
  for (const token of ['document', 'window', 'localStorage', 'navigator', 'fetch', 'matchMedia']) {
    assert.doesNotMatch(core, new RegExp(`\\b${token}\\b(?!:)`), `計算部に ${token} がある`);
  }
  for (const f of ['script.js', 'js/fp-collect.js']) {
    const src = read(f);
    assert.doesNotMatch(src, /innerHTML|outerHTML|document\.write|eval\(|new Function/, f);
    assert.doesNotMatch(src, /setAttribute\('style'/, f);
  }
  const script = read('script.js');
  for (const fn of ['C.detectOS(', 'C.detectBrowser(', 'C.fingerprintId(', 'C.detectProtections(', 'C.attributeRows(', 'C.diffAttributes(', 'COL.collect(', 'COL.fetchNetwork(']) {
    assert.ok(script.includes(fn), `script.js が ${fn} を使っていない`);
  }
  assert.doesNotMatch(script, /Math\.random/);
});

test('外部への接続は収集部の fetchNetwork だけ。URL は CSP の connect-src と同じ3ホスト', () => {
  const collect = read('js/fp-collect.js');
  const urls = [...collect.matchAll(/https:\/\/[a-z0-9.-]+/g)].map((m) => m[0]);
  assert.deepEqual([...new Set(urls)].sort(), ['https://api4.ipify.org', 'https://api6.ipify.org', 'https://ipapi.co']);
  assert.doesNotMatch(read('script.js'), /https?:\/\//);
  assert.doesNotMatch(read('js/fp-core.js'), /https?:\/\//);
});

test('改行コードは LF（リポジトリーの既定）', () => {
  for (const f of ['js/fp-core.js', 'js/fp-collect.js', 'js/messages.js', 'js/i18n.js', 'script.js', 'style.css', 'index.html', 'README.md', 'README.en.md', 'test/core.test.js']) {
    assert.equal(read(f).includes('\r'), false, `${f} に CR がある`);
  }
});
