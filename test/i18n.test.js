import test from 'node:test';
import assert from 'node:assert/strict';
import { read, load, core } from './load.js';

const C = core();
const { MESSAGES, t, setLanguage, getLanguage } = load('js/messages.js').FPMessages;
const I18N = load('js/i18n.js').FPI18n;
const html = read('index.html');
const JAPANESE = new RegExp('[' + [[0x3000, 0x303f], [0x3040, 0x30ff], [0x3400, 0x9fff], [0xff00, 0xffef]]
  .map(([a, b]) => String.fromCharCode(a) + '-' + String.fromCharCode(b)).join('') + ']');

test('日本語と英語の辞書は同じキーを持ち、置き場所（{name}）もそろう', () => {
  const ja = Object.keys(MESSAGES.ja);
  assert.deepEqual(Object.keys(MESSAGES.en).sort(), [...ja].sort());
  const ph = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
  for (const k of ja) assert.equal(ph(MESSAGES.en[k]), ph(MESSAGES.ja[k]), k);
  assert.ok(ja.length >= 180, String(ja.length));
  const src = read('js/messages.js');
  for (const lang of ['ja', 'en']) {
    const start = src.indexOf(`const ${lang} = {`);
    const block = src.slice(start, src.indexOf('\n  };', start));
    const keys = [...block.matchAll(/^\s+'([\w.]+)':/gm)].map((m) => m[1]);
    assert.equal(new Set(keys).size, keys.length, `${lang} に重複したキーがある`);
    assert.equal(keys.length, ja.length, `${lang} のキーの数`);
  }
});

test('英語の文言に日本語の文字がない（言語の切り替えボタンの「日本語」は例外）', () => {
  for (const [k, v] of Object.entries(MESSAGES.en)) {
    if (k === 'ui.langButton') continue;
    assert.doesNotMatch(v, JAPANESE, k);
  }
  assert.equal(MESSAGES.en['ui.langButton'], '日本語');
  assert.equal(MESSAGES.ja['ui.langButton'], 'EN');
});

test('日本語の文言で、日本語と英数字の間に空白を入れない', () => {
  const hits = [];
  for (const [k, v] of Object.entries(MESSAGES.ja)) {
    for (const m of v.matchAll(/[぀-ヿ一-鿿] [A-Za-z0-9(]|[A-Za-z0-9)%] [぀-ヿ一-鿿]/g)) hits.push(k + ': ' + v.slice(Math.max(0, m.index - 8), m.index + 10));
  }
  assert.deepEqual(hits, []);
});

test('index.html の data-i18n のキーは辞書にあり、書いた日本語は辞書の日本語と同じ', () => {
  const pairs = [...html.matchAll(/data-i18n="([\w.]+)"[^>]*>([^<]*)</g)].map((m) => [m[1], m[2]]);
  assert.ok(pairs.length >= 100, String(pairs.length));
  for (const [k, text] of pairs) {
    assert.ok(k in MESSAGES.ja, `辞書にないキー: ${k}`);
    assert.equal(text.trim(), MESSAGES.ja[k].trim(), k);
  }
  for (const m of html.matchAll(/data-i18n-attr="([^"]+)"/g)) {
    for (const part of m[1].split(';')) assert.ok(part.split(':')[1] in MESSAGES.ja, part);
  }
  // data-i18n の要素の中に data-i18n の要素を入れない（外側を差し替えた時点で内側が消える）
  assert.doesNotMatch(html, /data-i18n="[\w.]+"[^>]*>[^<]*<[a-z]+[^>]*data-i18n=/);
});

test('index.html の表示テキストは、コードと一部の固定語を除いて data-i18n で差し替わる', () => {
  const stripped = html
    .replace(/<pre>[\s\S]*?<\/pre>/g, '')
    .replace(/<code>[\s\S]*?<\/code>/g, '')
    .replace(/<[a-z0-9]+\b[^>]*\bdata-i18n="[\w.]+"[^>]*>[^<]*<\/[a-z0-9]+>/g, '')
    .replace(/\b(placeholder|aria-label|title)="[^"]*"/g, '')
    .replace(/<!--[\s\S]*?-->/g, '');
  const lines = stripped.split('\n').filter((l) => JAPANESE.test(l));
  assert.deepEqual(lines, []);
});

test('t() は言語の辞書から引き、無いキーは日本語かキーそのものを返す。{name} を埋める', () => {
  setLanguage('en');
  assert.equal(getLanguage(), 'en');
  assert.equal(t('ui.tabSimple'), 'Simple');
  assert.equal(t('adv.stabilitySame', { n: 3 }), 'Read 3 times, all with the same ID');
  assert.equal(t('nope.key'), 'nope.key');
  setLanguage('xx');
  assert.equal(getLanguage(), 'ja');
  assert.equal(t('ui.tabSimple'), 'シンプル');
  assert.equal(t('simple.hwValue', { touch: 'x', cores: 4, mem: '8GB' }), 'Touch:x / コア:4 / メモリ:8GB');
});

test('初期の言語: ?lang= → 保存した選択 → ブラウザーの言語（日本語以外は英語）', () => {
  assert.equal(I18N.KEY, 'bfm-lang');
  assert.equal(I18N.initialLanguage('?lang=en', 'ja', ['ja-JP']), 'en');
  assert.equal(I18N.initialLanguage('?x=1&lang=ja', 'en', ['en-US']), 'ja');
  assert.equal(I18N.initialLanguage('?lang=fr', null, ['ja-JP']), 'ja');
  assert.equal(I18N.initialLanguage('', 'en', ['ja-JP']), 'en');
  assert.equal(I18N.initialLanguage('', null, ['ja']), 'ja');
  assert.equal(I18N.initialLanguage('', null, ['fr-FR', 'ja']), 'en');
  assert.equal(I18N.initialLanguage('', 'xx', []), 'en');
});

test('parseSnapshot の error の種類すべてに文言がある', () => {
  for (const code of ['tooLarge', 'json', 'shape']) {
    const key = 'cmp.err' + code.charAt(0).toUpperCase() + code.slice(1);
    assert.ok(key in MESSAGES.ja && key in MESSAGES.en, key);
  }
});

test('script.js が出す動的な文言のキーが両方の辞書にそろう（保護・属性・安定性を含む）', () => {
  const script = read('script.js');
  const used = new Set([...script.matchAll(/\bt\('([\w.]+)'\s*[,)]/g)].map((m) => m[1]));
  for (const a of C.ATTRIBUTES) used.add('attr.' + a.key);
  for (const s of new Set(C.ATTRIBUTES.map((a) => a.stability))) used.add('stab.' + s);
  for (let i = 0; i < 6; i++) used.add('learn.s3.col' + i);
  for (const k of ['canvasRandomized.on', 'canvasRandomized.off', 'canvasBlocked.on', 'pluginsFixed.on.standard5', 'pluginsFixed.on.empty', 'pluginsFixed.off',
    'webglMasked.on', 'webglMasked.off', 'uaReduced.on', 'uaReduced.off', 'deviceMemoryHidden.on', 'deviceMemoryHidden.off', 'dnt.on', 'dnt.off',
    'gpc.on', 'gpc.off', 'gpc.na', 'tzUtc.on', 'tzUtc.off']) used.add('prot.' + k);
  for (const k of ['simple.gpcOn', 'simple.gpcOff', 'simple.gpcNa', 'simple.cookieOn', 'simple.cookieOff', 'simple.dntOn', 'simple.dntOff', 'simple.yes', 'simple.no',
    'theme.toLight', 'theme.toDark', 'net.statusCache', 'net.statusFailed', 'net.statusOk',
    'cmp.errEmpty', 'cmp.errTooLarge', 'cmp.errJson', 'cmp.errShape', 'cmp.errFile', 'cmp.statusCurrent', 'cmp.statusLoaded', 'cmp.statusEmpty']) used.add(k);
  for (const k of used) assert.ok(k in MESSAGES.ja && k in MESSAGES.en, `辞書にないキー: ${k}`);
  assert.ok(used.size >= 60, String(used.size));
});

test('保護の検出のすべての結果に文言がある（detectProtections の key と state の組）', () => {
  const samples = [{}, { canvas: { hash: 'a', hash2: 'b' }, webgl: { vendor: 'Mozilla', renderer: 'Mozilla' }, plugins: { names: C.FIXED_PLUGIN_NAMES }, privacy: { globalPrivacyControl: true, doNotTrack: true }, time: { timezone: 'UTC', offsetMin: 0 } },
    { canvas: { hash: 'a', hash2: 'a' }, webgl: { vendor: 'x', renderer: 'y' }, plugins: { names: ['Flash'] }, hardware: { deviceMemory: 8 }, privacy: { globalPrivacyControl: false } }];
  for (const s of samples) {
    for (const p of C.detectProtections(s)) {
      const base = 'prot.' + p.key + '.' + p.state;
      const key = p.key === 'pluginsFixed' && p.state === 'on' ? base + '.' + p.detail : base;
      assert.ok(key in MESSAGES.ja && key in MESSAGES.en, `文言がない: ${key}`);
    }
  }
});
