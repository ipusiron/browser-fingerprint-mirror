import test from 'node:test';
import assert from 'node:assert/strict';
import { read } from './load.js';

const html = read('index.html');

test('CSP の meta があり、meta では効かない指定と unsafe-inline を書かない。接続先は IP 取得の3ホストだけ', () => {
  const csp = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/);
  assert.ok(csp, 'CSP の meta がない');
  assert.match(csp[1], /default-src 'self'/);
  assert.match(csp[1], /script-src 'self'/);
  assert.match(csp[1], /style-src 'self';/);
  assert.match(csp[1], /connect-src 'self' https:\/\/api4\.ipify\.org https:\/\/api6\.ipify\.org;/);
  assert.doesNotMatch(csp[1], /ipapi/);
  assert.match(csp[1], /img-src 'self' data:;/);
  assert.match(csp[1], /object-src 'none'/);
  assert.match(csp[1], /base-uri 'none'/);
  assert.match(csp[1], /form-action 'none'/);
  assert.doesNotMatch(csp[1], /frame-ancestors/); // meta では効かない
  assert.doesNotMatch(csp[1], /unsafe-inline|unsafe-eval/);
  assert.doesNotMatch(csp[1], /https:;/); // 任意の https を許さない
  for (const name of ['X-Frame-Options', 'X-Content-Type-Options', 'X-XSS-Protection']) {
    assert.equal(html.includes(name), false, `${name} は meta では効かない`);
  }
});

test('referrer・color-scheme・favicon・noscript・viewport・lang', () => {
  assert.match(html, /<meta name="referrer" content="no-referrer" \/>/);
  assert.match(html, /<meta name="color-scheme" content="dark light" \/>/);
  assert.match(html, /<link rel="icon" href="data:," \/>/);
  assert.match(html, /<noscript><p class="noscript" data-i18n="ui\.noscript">/);
  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1" \/>/);
  assert.match(html, /<html lang="ja">/);
});

test('インラインのイベントハンドラーと style 属性がない', () => {
  assert.doesNotMatch(html, /\son[a-z]+\s*=/i);
  assert.doesNotMatch(html, /\sstyle\s*=\s*"/i);
  assert.doesNotMatch(html, /javascript:/i);
  assert.doesNotMatch(html, /<style/i);
});

test('スクリプトは計算部・収集部・文言・画面の順に読み込む（同一オリジンだけ）', () => {
  const srcs = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
  assert.deepEqual(srcs, ['./js/fp-core.js', './js/fp-collect.js', './js/messages.js', './js/i18n.js', './script.js']);
  assert.doesNotMatch(html, /<script[^>]+src="https?:\/\//);
  assert.doesNotMatch(html, /<link[^>]+href="https?:\/\//);
});

test('タブとパネルが id で結ばれている（role・aria-controls・aria-labelledby・tabindex）', () => {
  const re = /<button class="tab[^"]*" id="tab-btn-(\w+)" type="button" role="tab" data-tab="(\w+)" aria-selected="(true|false)" aria-controls="(\w+)"/g;
  const tabs = [...html.matchAll(re)];
  assert.equal(tabs.length, 3);
  for (const [, btnKey, dataKey, selected, panelKey] of tabs) {
    assert.equal(btnKey, dataKey);
    assert.equal(btnKey, panelKey);
    assert.ok(new RegExp(`<section id="${panelKey}" class="panel[^"]*" role="tabpanel" aria-labelledby="tab-btn-${panelKey}">`).test(html), panelKey);
    if (selected === 'false') assert.ok(new RegExp(`id="tab-btn-${btnKey}"[^>]*tabindex="-1"`).test(html), `${btnKey} に tabindex="-1" がない`);
  }
  assert.match(html, /<nav class="tabs" role="tablist" aria-label="[^"]+" data-i18n-attr="aria-label:ui\.tabsLabel">/);
});

test('主要な要素の id がそろっている', () => {
  assert.match(html, /<button id="lang-toggle" class="lang-toggle" type="button" aria-label="[^"]+" data-i18n="ui\.langButton" data-i18n-attr="aria-label:ui\.langLabel">EN<\/button>/);
  assert.match(html, /<button id="theme-toggle" class="theme-toggle" type="button" aria-label="[^"]+" data-i18n-attr="aria-label:theme\.toLight">/);
  assert.match(html, /<title data-i18n="ui\.docTitle">/);
  const ids = ['theme-toggle', 'lang-toggle', 'simple-browser', 'simple-os', 'simple-os-source', 'simple-res', 'simple-ipv4', 'simple-ipv6', 'simple-lang', 'simple-tz',
    'simple-hw', 'simple-cookie-dnt', 'fetch-ip', 'net-status', 'refresh-adv', 'copy-json', 'fp-id', 'fp-stability', 'fp-last', 'clear-last', 'prot-list', 'adv-grid'];
  for (const id of ids) assert.ok(html.includes(`id="${id}"`), `id="${id}" がない`);
});

test('ボタンは type="button"、知らせの要素は aria-live', () => {
  for (const m of html.matchAll(/<button [^>]*>/g)) assert.match(m[0], /type="button"/, m[0]);
  for (const id of ['net-status', 'fp-stability', 'fp-last', 'prot-list']) {
    assert.ok(new RegExp(`id="${id}"[^>]*aria-live="polite"`).test(html), `${id} に aria-live がない`);
  }
});

test('IP の取得は押したときだけ（ボタンと接続先の説明がある）。ISP の API は使わない', () => {
  assert.match(html, /<button class="btn" id="fetch-ip" type="button" data-i18n="net\.button">/);
  assert.match(html, /data-i18n="net\.note">[^<]*ipify\.org/);
  assert.doesNotMatch(html, /ipapi/);
  assert.doesNotMatch(html, /データは外部送信しません|完全クライアントサイド/);
});

test('外部リンクはすべて rel="noopener noreferrer"。GitHub と参考リンク以外の外部 URL は書かない', () => {
  for (const m of html.matchAll(/<a [^>]*href="https?:\/\/[^"]+"[^>]*>/g)) assert.match(m[0], /rel="noopener noreferrer"/, m[0]);
  assert.match(html, /<a href="https:\/\/github\.com\/ipusiron\/browser-fingerprint-mirror" target="_blank" rel="noopener noreferrer">/);
});

test('ユニーク度スコアの表示を残していない', () => {
  assert.doesNotMatch(html, /unique-score|score-desc|ユニーク度スコア/);
  assert.match(html, /<div class="id" id="fp-id">--<\/div>/);
});
