import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { read, core, load } from './load.js';

const C = core();
const { t, setLanguage } = load('js/messages.js').FPMessages;
const readme = read('README.md');
const ROOT = new URL('..', import.meta.url);

const JAPANESE = new RegExp('[' + [[0x3040, 0x30ff], [0x3400, 0x9fff], [0xff00, 0xffef]]
  .map(([a, b]) => String.fromCharCode(a) + '-' + String.fromCharCode(b)).join('') + ']');

function proseLines(text) {
  const out = [];
  let inCode = false;
  for (const line of text.split('\n')) {
    if (line.startsWith('```')) {
      inCode = !inCode;
      continue;
    }
    if (inCode || line.startsWith('|') || line.startsWith('![') || line.startsWith('>![') || line.startsWith('<!--') || line.trim() === '') continue;
    out.push(line);
  }
  return out;
}

test('YAML メタデータの構造と値を保つ', () => {
  const block = readme.match(/^<!--\n---\n([\s\S]*?)\n---\n-->/);
  assert.ok(block, 'HTML コメントで囲んだ YAML がない');
  const yaml = block[1];
  assert.match(yaml, /^id: day077$/m);
  assert.match(yaml, /^slug: browser-fingerprint-mirror$/m);
  assert.match(yaml, /^repo_url: "https:\/\/github\.com\/ipusiron\/browser-fingerprint-mirror"$/m);
  assert.match(yaml, /^demo_url: "https:\/\/ipusiron\.github\.io\/browser-fingerprint-mirror\/"$/m);
  assert.match(yaml, /^hub: true$/m);
  assert.match(yaml, /^difficulty: \d$/m);
  assert.match(yaml, /^subtitle_ja: "ブラウザー指紋ミラー"$/m);
  for (const key of ['category_ja', 'category_en', 'tags']) {
    assert.ok(yaml.match(new RegExp(`^${key}:\\n((?:  - .+\\n)+)`, 'm')), `${key} がブロック形式でない`);
  }
});

test('シリーズ標準の見出しがそろっている', () => {
  for (const h of [
    '# Browser Fingerprint Mirror - ブラウザー指紋ミラー',
    '**Day077 - 生成AIで作るセキュリティツール100**',
    '## 🌐 デモページ',
    '## 📸 スクリーンショット',
    '## 🔍 ブラウザー指紋とは',
    '## ✨ 機能',
    '## 📖 使い方',
    '## 📐 画面構成',
    '## 🔬 技術的な説明',
    '## 🎯 ユースケース',
    '## 🔒 セキュリティとプライバシー',
    '## ⚠️ 注意',
    '## ❓ FAQ',
    '## 🔗 参考・関連ツール',
    '## 📁 ディレクトリー構造',
    '## 🧪 テスト',
    '## 💻 動作環境',
    '## 📄 ライセンス',
    '## 🛠️ このツールについて',
  ]) {
    assert.ok(readme.includes(h), `${h} がない`);
  }
  assert.ok(readme.includes('https://akademeia.info/?page_id=42163'));
  assert.doesNotMatch(readme, /page_id=44607/);
});

test('属性の目録の表は、計算部の ATTRIBUTES と文言の辞書から作った値と一致する', () => {
  setLanguage('ja');
  const rows = [...readme.matchAll(/^\| (.+?) \| (.+?) \| (含む|含めない) \| (—|\d\.\d{3}|\d{2}\.\d{3}) \| (—|\d\.\d{3}|\d{2}\.\d{3}) \| (.+?) \|$/gm)];
  assert.equal(rows.length, C.ATTRIBUTES.length, `目録の行が ${rows.length} 行（期待 ${C.ATTRIBUTES.length}）`);
  C.ATTRIBUTES.forEach((a, i) => {
    const [, name, stab, inId, pc, mobile, attr] = rows[i];
    assert.equal(name, t('attr.' + a.key), `${i}行目の属性名`);
    assert.equal(stab, t('stab.' + a.stability), `${a.key} の安定性`);
    assert.equal(inId, a.inId ? '含む' : '含めない', `${a.key} の指紋ID`);
    assert.equal(pc, a.ref ? a.ref.pc.toFixed(3) : '—', `${a.key} の PC`);
    assert.equal(mobile, a.ref ? a.ref.mobile.toFixed(3) : '—', `${a.key} のモバイル`);
    assert.equal(attr, a.ref ? a.ref.attr : '—', `${a.key} の研究の属性名`);
  });
});

test('研究の表は、計算部の STUDY_TABLE・STUDY_META と一致する（17属性＋H_M・件数・一意率）', () => {
  const fmt = (v) => (v === null ? '—' : v[0].toFixed(3) + '／' + v[1].toFixed(3));
  const rows = [...readme.matchAll(/^\| ([A-Za-z][A-Za-z /-]+?) \| (—|[\d.]+／[\d.]+) \| ([\d.]+／[\d.]+) \| ([\d.]+／[\d.]+) \| ([\d.]+／[\d.]+) \| ([\d.]+／[\d.]+) \|$/gm)];
  assert.equal(rows.length, C.STUDY_TABLE.length, `研究の表が ${rows.length} 行（期待 ${C.STUDY_TABLE.length}）`);
  C.STUDY_TABLE.forEach((r, i) => {
    const [, attr, p2010, a2016, all2018, mobile2018, pc2018] = rows[i];
    assert.equal(attr, r.attr, `${i}行目の属性`);
    assert.equal(p2010, fmt(r.p2010), `${r.attr} 2010`);
    assert.equal(a2016, fmt(r.a2016), `${r.attr} 2016`);
    assert.equal(all2018, fmt(r.all2018), `${r.attr} 2018 全体`);
    assert.equal(mobile2018, fmt(r.mobile2018), `${r.attr} 2018 モバイル`);
    assert.equal(pc2018, fmt(r.pc2018), `${r.attr} 2018 PC`);
  });
  const m = C.STUDY_META;
  const cols = ['p2010', 'a2016', 'all2018', 'mobile2018', 'pc2018'];
  assert.ok(readme.includes('| H_M（すべて一意のとき） | ' + cols.map((c) => m.hm[c].toFixed(3)).join(' | ') + ' |'), 'H_M の行');
  assert.ok(readme.includes('| 指紋の数 | ' + cols.map((c) => m.count[c].toLocaleString('en-US')).join(' | ') + ' |'), '指紋の数の行');
  assert.ok(readme.includes('| 一意な指紋の割合 | ' + cols.map((c) => m.unique[c] + '%').join(' | ') + ' |'), '一意率の行');
});

test('保護の検出の規則の表は7行で、固定プラグインの5件の名前を含む', () => {
  const section = readme.match(/### 保護の検出の規則\n\n([\s\S]*?)\n\n観測できた事実/);
  assert.ok(section, '保護の検出の規則の節がない');
  const rows = section[1].split('\n').filter((l) => l.startsWith('| ') && !l.startsWith('| 項目') && !l.startsWith('|---'));
  assert.equal(rows.length, 7);
  for (const name of C.FIXED_PLUGIN_NAMES) assert.ok(section[1].includes(name), `${name} がない`);
});

test('外部 API は ipify.org だけ（ipapi.co を書かない）。「外部送信しません」と書かない', () => {
  assert.match(readme, /ipify\.org/);
  assert.doesNotMatch(readme, /ipapi/);
  assert.doesNotMatch(readme, /外部送信しません|完全クライアントサイド/);
  for (const f of ['index.html', 'js/messages.js', 'js/fp-collect.js', 'CLAUDE.md', 'AGENTS.md', 'README.en.md']) assert.doesNotMatch(read(f), /ipapi/, f);
});

test('README の画像がすべて実在し、assets/ の PNG は README から参照されているものだけ。1枚ごとにキャプションがある', () => {
  const imgs = [...readme.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map((m) => m[1]);
  const local = imgs.filter((u) => !u.startsWith('http'));
  assert.equal(local.length, 3, `画像の参照が ${local.length} 件`);
  for (const rel of local) assert.ok(fs.existsSync(new URL(rel, ROOT)), `${rel} がない`);
  const pngs = fs.readdirSync(new URL('assets/', ROOT)).filter((f) => f.endsWith('.png'));
  for (const f of pngs) assert.ok(local.includes(`assets/${f}`), `assets/${f} が README から参照されていない`);
  for (const rel of local) {
    const re = new RegExp(`!\\[[^\\]]*\\]\\(${rel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)\\s*\\n>\\s*\\*[^*]+\\*`);
    assert.match(readme, re, `${rel} のキャプションがない`);
  }
  for (const rel of local) {
    const size = fs.statSync(new URL(rel, ROOT)).size;
    assert.ok(size <= 300 * 1024, `${rel} が ${size} バイト（300KB を超える）`);
  }
});

test('ディレクトリー構造に全ファイルが載っていて、全行に説明がある', () => {
  const tree = readme.match(/## 📁 ディレクトリー構造\n\n```\n([\s\S]*?)```/);
  assert.ok(tree, 'ディレクトリー構造がない');
  const lines = tree[1].trim().split('\n');
  for (const line of lines.slice(1)) assert.match(line, / # .+$/, `説明のない行: ${line}`);
  const skip = new Set(['.git', 'node_modules', '.claude']);
  const found = [];
  const walk = (dir, prefix) => {
    for (const entry of fs.readdirSync(new URL(dir, ROOT), { withFileTypes: true })) {
      if (skip.has(entry.name)) continue;
      const rel = prefix + entry.name;
      if (entry.isDirectory()) walk(`${dir}${entry.name}/`, `${rel}/`);
      else found.push(rel);
    }
  };
  walk('', '');
  for (const file of found) assert.ok(lines.some((l) => l.includes(`${path.basename(file)} `)), `ツリーに ${file} がない`);
  for (const line of lines.slice(1)) {
    const name = line.replace(/^[│├└─\s]+/, '').split(/\s+#/)[0].trim();
    if (!name || name.endsWith('/')) continue;
    assert.ok(found.some((f) => path.basename(f) === name), `ツリーの ${name} が実在しない`);
  }
});

// 表記のゆれ。README・index.html・文言の辞書をまとめて見る
const NG = [
  [/サーバ(?![ーイ])/, 'サーバー'],
  [/ユーザ(?![ー])/, 'ユーザー'],
  [/ブラウザ(?![ー])/, 'ブラウザー'],
  [/エディタ(?![ー])/, 'エディター'],
  [/パラメータ(?![ー])/, 'パラメーター'],
  [/フォルダ(?![ー])/, 'フォルダー'],
  [/リポジトリ(?![ー])/, 'リポジトリー'],
  [/ライブラリ(?![ー])/, 'ライブラリー'],
  [/ディレクトリ(?![ー])/, 'ディレクトリー'],
  [/プロバイダ(?![ー])/, 'プロバイダー'],
  [/インターフェース/, 'インターフェイス'],
  [/分かる|分かり|分から/, 'わかる'],
  [/全て/, 'すべて'],
  [/既に/, 'すでに'],
  [/[^。、]無い/, 'ない'],
];

for (const file of ['README.md', 'index.html', 'js/messages.js']) {
  test(`${file} の表記をそろえる`, () => {
    const text = read(file);
    for (const [re, should] of NG) {
      const m = text.match(re);
      assert.equal(m, null, m ? `「${m[0]}」は「${should}」に（${file}）` : '');
    }
  });
}

test('README の本文で、日本語と英数字の間に空白を入れない。文末に「：」を置かない', () => {
  const hits = [];
  for (const line of proseLines(readme)) {
    for (const m of line.matchAll(/[぀-ヿ一-鿿] [A-Za-z0-9(`]|[A-Za-z0-9)`%] [぀-ヿ一-鿿]/g)) hits.push(line.slice(Math.max(0, m.index - 10), m.index + 12));
    if (/：$/.test(line.trim())) hits.push('文末の：: ' + line.trim().slice(-20));
  }
  assert.deepEqual(hits, []);
});

test('README に過去の版との違いを書かない', () => {
  for (const re of [/改修前/, /以前は/, /初期の実装/, /旧バージョン/, /誤りだった/, /以前のような/]) assert.doesNotMatch(readme, re);
});

test('README の箇条書き（- と 1.）はである調（「ます。」「です。」で終わる項目がない）', () => {
  const bullets = proseLines(readme).filter((l) => /^\s*(- |\d+\. )/.test(l));
  assert.ok(bullets.length > 20);
  const bad = bullets.filter((l) => /(です|ます|ません)[。）]?$/.test(l.trim()));
  assert.deepEqual(bad, []);
});

test('README・画面の文言で、ひらく漢字と半角かっこの中の日本語を使わない', () => {
  for (const file of ['README.md', 'index.html', 'js/messages.js']) {
    const text = read(file);
    assert.doesNotMatch(text, /無けれ|無い/, file);
    assert.doesNotMatch(text, /\([぀-ヿ一-鿿]+\)/, `${file}: 半角かっこの中に日本語`);
  }
});

test('関連ツールの名前は各 README の YAML の title どおり', () => {
  assert.ok(readme.includes('Browser Permission Radar（Day092）'));
  assert.ok(JAPANESE.test(readme));
});

// ---- 英語版の README（要約にせず、同じ節をそろえる）

const readmeEn = read('README.en.md');

test('日本語版と英語版で、見出しの数・順・階層がそろっている', () => {
  const levels = (text) => [...text.matchAll(/^(#{1,3}) /gm)].map((m) => m[1].length);
  const ja = levels(readme);
  const en = levels(readmeEn);
  assert.ok(ja.length >= 25, `見出しが ${ja.length} 個しかない`);
  assert.deepEqual(en, ja, `見出しの数か階層が違う（ja ${ja.length} / en ${en.length}）`);
});

test('英語版に日本語の本文が残っていない', () => {
  const body = readmeEn.split('\n').filter((line) => !line.includes('README.md') && !line.includes('日本語')).join('\n');
  const hits = [...body.matchAll(/[぀-ヿ一-鿿]+/g)].map((m) => m[0]);
  assert.deepEqual(hits, [], `日本語が残っている: ${hits.slice(0, 5).join(' / ')}`);
});

test('両方の README が互いにリンクし、YAML メタデータは日本語版だけに置く', () => {
  assert.match(readme, /^\[English\]\(README\.en\.md\) · 日本語$/m);
  assert.match(readmeEn, /^English · \[日本語\]\(README\.md\)$/m);
  assert.doesNotMatch(readmeEn, /^id: day077$/m);
  assert.ok(readmeEn.includes('**Day077 - 100 Security Tools with Generative AI**'));
  assert.ok(readmeEn.includes('https://akademeia.info/?page_id=42163'));
  assert.doesNotMatch(readmeEn, /page_id=44607/);
});

test('英語版の属性の目録は、計算部と英語の辞書から作った値と一致する', () => {
  setLanguage('en');
  const rows = [...readmeEn.matchAll(/^\| (.+?) \| (.+?) \| (included|excluded) \| (—|\d\.\d{3}|\d{2}\.\d{3}) \| (—|\d\.\d{3}|\d{2}\.\d{3}) \| (.+?) \|$/gm)];
  assert.equal(rows.length, C.ATTRIBUTES.length);
  C.ATTRIBUTES.forEach((a, i) => {
    const [, name, stab, inId, pc, mobile, attr] = rows[i];
    assert.equal(name, t('attr.' + a.key), `${i}行目の属性名`);
    assert.equal(stab, t('stab.' + a.stability), `${a.key} の安定性`);
    assert.equal(inId, a.inId ? 'included' : 'excluded', `${a.key} の指紋ID`);
    assert.equal(pc, a.ref ? a.ref.pc.toFixed(3) : '—', `${a.key} の PC`);
    assert.equal(mobile, a.ref ? a.ref.mobile.toFixed(3) : '—', `${a.key} のモバイル`);
    assert.equal(attr, a.ref ? a.ref.attr : '—', `${a.key} の研究の属性名`);
  });
  setLanguage('ja');
});

test('英語版の研究の表も計算部と一致する', () => {
  const fmt = (v) => (v === null ? '—' : v[0].toFixed(3) + '／' + v[1].toFixed(3));
  const rows = [...readmeEn.matchAll(/^\| ([A-Za-z][A-Za-z /-]+?) \| (—|[\d.]+／[\d.]+) \| ([\d.]+／[\d.]+) \| ([\d.]+／[\d.]+) \| ([\d.]+／[\d.]+) \| ([\d.]+／[\d.]+) \|$/gm)];
  assert.equal(rows.length, C.STUDY_TABLE.length);
  C.STUDY_TABLE.forEach((r, i) => {
    const [, attr, p2010, a2016, all2018, mobile2018, pc2018] = rows[i];
    assert.equal(attr, r.attr);
    assert.deepEqual([p2010, a2016, all2018, mobile2018, pc2018], [fmt(r.p2010), fmt(r.a2016), fmt(r.all2018), fmt(r.mobile2018), fmt(r.pc2018)], r.attr);
  });
  const m = C.STUDY_META;
  const cols = ['p2010', 'a2016', 'all2018', 'mobile2018', 'pc2018'];
  assert.ok(readmeEn.includes('| H_M (all unique) | ' + cols.map((c) => m.hm[c].toFixed(3)).join(' | ') + ' |'));
  assert.ok(readmeEn.includes('| Number of fingerprints | ' + cols.map((c) => m.count[c].toLocaleString('en-US')).join(' | ') + ' |'));
  assert.ok(readmeEn.includes('| Share of unique fingerprints | ' + cols.map((c) => m.unique[c] + '%').join(' | ') + ' |'));
  for (const name of C.FIXED_PLUGIN_NAMES) assert.ok(readmeEn.includes(name), name);
});

test('英語版の画像は assets/en/ にあってすべて実在し、assets/en/ の PNG は英語版から参照されているものだけ', () => {
  const imgs = [...readmeEn.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map((m) => m[1]);
  const local = imgs.filter((u) => !u.startsWith('http'));
  assert.equal(local.length, 3);
  for (const rel of local) {
    assert.ok(rel.startsWith('assets/en/'), `英語版は英語の画面を使う: ${rel}`);
    assert.ok(fs.existsSync(new URL(rel, ROOT)), `${rel} がない`);
    assert.ok(fs.statSync(new URL(rel, ROOT)).size <= 300 * 1024, `${rel} が 300KB を超える`);
  }
  const pngs = fs.readdirSync(new URL('assets/en/', ROOT)).filter((f) => f.endsWith('.png'));
  for (const f of pngs) assert.ok(local.includes(`assets/en/${f}`), `assets/en/${f} が英語版から参照されていない`);
});

test('英語版のディレクトリー構造にも全ファイルが載っていて、全行に説明があり、日英で名前がそろう', () => {
  const tree = readmeEn.match(/## 📁 Directory structure\n\n```\n([\s\S]*?)```/);
  assert.ok(tree, '英語版にディレクトリー構造がない');
  const lines = tree[1].trim().split('\n');
  for (const line of lines.slice(1)) assert.match(line, / # .+$/, `説明のない行: ${line}`);
  const jaTree = readme.match(/## 📁 ディレクトリー構造\n\n```\n([\s\S]*?)```/)[1].trim().split('\n');
  const names = (ls) => ls.map((l) => l.replace(/^[│├└─\s]+/, '').split(/\s+#/)[0].trim());
  assert.deepEqual(names(lines), names(jaTree), '日英のツリーのファイル名がそろっていない');
});
