import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { core } from './load.js';

const C = core();
const nodeSha = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');

// ---- SHA-256

test('SHA-256 は既知のベクターと一致する', () => {
  assert.equal(C.sha256Hex(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  assert.equal(C.sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.equal(
    C.sha256Hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq'),
    '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
  );
});

test('SHA-256 は Node の crypto と一致する（境界の長さ・非 ASCII・サロゲートペア）', () => {
  const samples = ['', 'a', 'x'.repeat(55), 'y'.repeat(56), 'z'.repeat(63), 'w'.repeat(64), 'v'.repeat(65), 'u'.repeat(1000),
    'ブラウザー指紋ミラー', 'café', String.fromCodePoint(0x1f603) + 'smile', '{"a":1,"b":[true,null]}'];
  for (const s of samples) assert.equal(C.sha256Hex(s), nodeSha(s), JSON.stringify(s).slice(0, 40));
  for (let i = 0; i < 50; i++) {
    const s = crypto.randomBytes(1 + (i * 7) % 300).toString('base64');
    assert.equal(C.sha256Hex(s), nodeSha(s));
  }
});

test('UTF-8 の符号化は TextEncoder と一致する', () => {
  for (const s of ['abc', 'あいう', 'é', String.fromCodePoint(0x1f603), '\u0000x']) {
    assert.deepEqual([...C.utf8Bytes(s)], [...new TextEncoder().encode(s)]);
  }
});

// ---- 正規化した JSON

test('canonicalize はキーを辞書順に並べ、undefined と非有限の数を null にし、配列の順は保つ', () => {
  assert.equal(C.canonicalize({ b: 1, a: [3, { z: null, y: undefined }], c: 'あ' }), '{"a":[3,{"y":null,"z":null}],"b":1,"c":"あ"}');
  assert.equal(C.canonicalize(undefined), 'null');
  assert.equal(C.canonicalize(NaN), 'null');
  assert.equal(C.canonicalize(Infinity), 'null');
  assert.equal(C.canonicalize([2, 1]), '[2,1]');
  assert.equal(C.canonicalize({ a: { d: 1, c: 2 }, b: true }), C.canonicalize({ b: true, a: { c: 2, d: 1 } }));
});

// ---- OS の推定（UA-CH を優先、UA は iPhone/iPad → CrOS → Android → Windows → Macintosh → Linux の順）

const UA = {
  androidChrome: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
  androidFirefox: 'Mozilla/5.0 (Android 14; Mobile; rv:140.0) Gecko/140.0 Firefox/140.0',
  iphoneSafari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  iphoneChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/140.0.0.0 Mobile/15E148 Safari/604.1',
  iphoneFirefox: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/140.0 Mobile/15E148 Safari/605.1.15',
  iphoneEdge: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 EdgiOS/140.0.0.0 Mobile/15E148 Safari/605.1.15',
  ipadDesktop: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  macSafari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  macChrome: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  winChrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  winEdge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0',
  winFirefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0',
  winOpera: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 OPR/125.0.0.0',
  linuxFirefox: 'Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',
  linuxChrome: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  chromeos: 'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  samsung: 'Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/27.0 Chrome/125.0.0.0 Mobile Safari/537.36',
  headless: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/145.0.7632.6 Safari/537.36',
};

test('detectOS: UA 文字列からの推定', () => {
  const os = (ua, extra) => C.detectOS({ ua, ...(extra || {}) }).name;
  assert.equal(os(UA.androidChrome), 'Android');
  assert.equal(os(UA.androidFirefox), 'Android');
  assert.equal(os(UA.samsung), 'Android');
  assert.equal(os(UA.iphoneSafari), 'iOS');
  assert.equal(os(UA.iphoneChrome), 'iOS');
  assert.equal(os(UA.iphoneFirefox), 'iOS');
  assert.equal(os(UA.iphoneEdge), 'iOS');
  assert.equal(os(UA.macSafari), 'macOS');
  assert.equal(os(UA.ipadDesktop, { maxTouchPoints: 5 }), 'iPadOS'); // デスクトップ表示の iPad は Macintosh を名乗る
  assert.equal(os(UA.macChrome, { maxTouchPoints: 0 }), 'macOS');
  assert.equal(os(UA.winChrome), 'Windows');
  assert.equal(os(UA.winFirefox), 'Windows');
  assert.equal(os(UA.linuxFirefox), 'Linux');
  assert.equal(os(UA.linuxChrome), 'Linux');
  assert.equal(os(UA.chromeos), 'ChromeOS');
  assert.equal(os('Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'), 'iPadOS');
  assert.equal(os(''), 'Unknown');
  assert.equal(os('', { platform: 'Win32' }), 'Windows');
  assert.equal(os('', { platform: 'MacIntel' }), 'macOS');
});

test('detectOS: UA-CH の platform があればそれを優先する', () => {
  assert.deepEqual(C.detectOS({ ua: UA.linuxChrome, chPlatform: 'Android' }), { name: 'Android', source: 'ua-ch' });
  assert.deepEqual(C.detectOS({ ua: UA.winChrome, chPlatform: 'Chrome OS' }), { name: 'ChromeOS', source: 'ua-ch' });
  assert.equal(C.detectOS({ ua: UA.winChrome, chPlatform: 'macOS' }).name, 'macOS');
  assert.equal(C.detectOS({ ua: UA.winChrome, chPlatform: 'Unknown' }).name, 'Windows'); // 不明なら UA にフォールバック
  assert.equal(C.detectOS({ ua: UA.winChrome, chPlatform: '' }).source, 'ua');
});

test('detectBrowser: UA 文字列からの推定（iOS の Chrome/Firefox/Edge・Opera・Samsung・Headless を含む）', () => {
  const br = (ua) => C.detectBrowser({ ua });
  assert.deepEqual(br(UA.androidChrome), { name: 'Chrome', version: '140', source: 'ua' });
  assert.deepEqual(br(UA.androidFirefox), { name: 'Firefox', version: '140', source: 'ua' });
  assert.deepEqual(br(UA.iphoneSafari), { name: 'Safari', version: '18', source: 'ua' });
  assert.equal(br(UA.iphoneChrome).name, 'Chrome');
  assert.equal(br(UA.iphoneFirefox).name, 'Firefox');
  assert.equal(br(UA.iphoneEdge).name, 'Edge');
  assert.equal(br(UA.macSafari).name, 'Safari');
  assert.equal(br(UA.macChrome).name, 'Chrome');
  assert.equal(br(UA.winEdge).name, 'Edge');
  assert.equal(br(UA.winFirefox).name, 'Firefox');
  assert.deepEqual(br(UA.winOpera), { name: 'Opera', version: '125', source: 'ua' });
  assert.deepEqual(br(UA.samsung), { name: 'Samsung Internet', version: '27', source: 'ua' });
  assert.equal(br(UA.chromeos).name, 'Chrome');
  assert.equal(br(UA.headless).name, 'Chrome (Headless)');
  assert.deepEqual(br(''), { name: 'Unknown', version: null, source: 'none' });
});

test('detectBrowser: UA-CH の brands を優先し、GREASE を無視し、Chromium だけなら「Chromium」', () => {
  const grease = { brand: 'Not:A-Brand', version: '24' };
  const b = (brands) => C.detectBrowser({ ua: UA.winChrome, brands });
  assert.deepEqual(b([{ brand: 'Chromium', version: '140' }, { brand: 'Google Chrome', version: '140' }, grease]), { name: 'Chrome', version: '140', source: 'ua-ch' });
  assert.equal(b([{ brand: 'Chromium', version: '140' }, { brand: 'Microsoft Edge', version: '140' }, grease]).name, 'Edge');
  assert.equal(b([{ brand: 'Chromium', version: '140' }, { brand: 'Opera', version: '125' }, grease]).name, 'Opera');
  assert.equal(b([{ brand: 'Chromium', version: '140' }, { brand: 'Brave', version: '140' }, grease]).name, 'Brave');
  assert.equal(b([{ brand: 'Chromium', version: '140' }, { brand: 'Vivaldi', version: '7' }]).name, 'Vivaldi');
  assert.equal(b([{ brand: 'Chromium', version: '140' }, { brand: 'Samsung Internet', version: '27' }]).name, 'Samsung Internet');
  assert.equal(b([{ brand: 'Chromium', version: '140' }, { brand: 'Not=A?Brand', version: '99' }]).name, 'Chromium');
  assert.equal(b([{ brand: 'Not;A=Brand', version: '99' }, { brand: 'HeadlessChrome', version: '145' }, { brand: 'Chromium', version: '145' }]).name, 'Chrome (Headless)');
  assert.equal(b([]).source, 'ua'); // brands が空なら UA
  assert.equal(b(null).name, 'Chrome');
});

test('isReducedUA: Chromium の削減された UA（.0.0.0）を見分ける', () => {
  assert.equal(C.isReducedUA(UA.winChrome), true);
  assert.equal(C.isReducedUA(UA.headless), false);
  assert.equal(C.isReducedUA(UA.winFirefox), false);
  assert.equal(C.isReducedUA('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36'), false);
  assert.equal(C.isReducedUA(null), false);
});

// ---- 属性の目録と指紋ID

const sample = () => ({
  timestamp: '2026-10-07T06:00:00.000Z',
  ua: {
    userAgent: UA.winChrome, platform: 'Win32', vendor: 'Google Inc.',
    uaData: { brands: [{ brand: 'Google Chrome', version: '140' }], mobile: false, platform: 'Windows' },
    uaHigh: { platformVersion: '15.0.0' },
  },
  screen: { width: 1920, height: 1080, availWidth: 1920, availHeight: 1040, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 1 },
  language: { language: 'ja-JP', languages: ['ja-JP', 'en'] },
  intl: { locale: 'ja-JP', calendar: 'gregory', numberingSystem: 'latn' },
  time: { timezone: 'Asia/Tokyo', offsetMin: -540 },
  storage: { localStorage: true, sessionStorage: true, indexedDB: true },
  privacy: { cookieEnabled: true, doNotTrack: false, globalPrivacyControl: null },
  hardware: { deviceMemory: 8, hardwareConcurrency: 16, maxTouchPoints: 0, touchCapable: false },
  media: { prefersColorScheme: 'light', reducedMotion: 'no-preference' },
  webgl: { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)', version: 'WebGL 1.0' },
  canvas: { hash: 'aaaaaaaaaaaaaaaa', hash2: 'aaaaaaaaaaaaaaaa', sampleLen: 1234 },
  audio: { hash: 'bbbbbbbbbbbbbbbb' },
  plugins: { names: C.FIXED_PLUGIN_NAMES.slice(), count: 5, pdfViewerEnabled: true },
  network: { ipv4: '192.0.2.10', ipv6: null, fetchedAt: 1, status: 'ok' },
});

test('目録: 20行、研究の参考ビットは 2018 の Table 3 の PC/モバイルの列、IP は指紋IDに入れない', () => {
  assert.equal(C.ATTRIBUTES.length, 20);
  const keys = C.ATTRIBUTES.map((a) => a.key);
  assert.deepEqual(keys, ['ua', 'uaCh', 'uaHigh', 'platform', 'screen', 'language', 'intl', 'time', 'storage', 'cookie', 'dnt', 'gpc',
    'hardware', 'media', 'webglVendor', 'webglRenderer', 'canvas', 'audio', 'plugins', 'network']);
  const byKey = Object.fromEntries(C.ATTRIBUTES.map((a) => [a.key, a]));
  assert.equal(byKey.network.inId, false);
  for (const k of keys.filter((x) => x !== 'network')) assert.equal(byKey[k].inId, true, k);
  // 参考ビットは研究の表（STUDY_TABLE）の 2018 PC/モバイル列と同じ値を指す
  const study = Object.fromEntries(C.STUDY_TABLE.map((r) => [r.attr, r]));
  for (const a of C.ATTRIBUTES) {
    if (!a.ref) continue;
    assert.ok(study[a.ref.attr], `${a.key}: 研究の表に ${a.ref.attr} がない`);
    assert.equal(a.ref.pc, study[a.ref.attr].pc2018[0], `${a.key} PC`);
    assert.equal(a.ref.mobile, study[a.ref.attr].mobile2018[0], `${a.key} mobile`);
  }
  assert.deepEqual(new Set(C.ATTRIBUTES.map((a) => a.stability)), new Set(['version', 'hardware', 'setting', 'fixedList', 'volatile']));
});

test('研究の表: 17属性、H_M と件数と一意率', () => {
  assert.equal(C.STUDY_TABLE.length, 17);
  assert.deepEqual(C.STUDY_META.count, { p2010: 470161, a2016: 118934, all2018: 2067942, mobile2018: 251166, pc2018: 1816776 });
  assert.deepEqual(C.STUDY_META.unique, { p2010: 83.6, a2016: 89.4, all2018: 33.6, mobile2018: 18.5, pc2018: 35.7 });
  assert.equal(C.STUDY_META.hm.all2018, 20.980);
  for (const r of C.STUDY_TABLE) {
    for (const col of ['a2016', 'all2018', 'mobile2018', 'pc2018']) {
      assert.equal(r[col].length, 2, `${r.attr} ${col}`);
      assert.ok(r[col][1] <= 1 && r[col][0] >= 0);
    }
  }
  // 2010 に値がある属性＝Timezone・List of plugins・Available fonts・User-agent・Screen resolution・Cookies enabled
  assert.deepEqual(C.STUDY_TABLE.filter((r) => r.p2010).map((r) => r.attr),
    ['Timezone', 'List of plugins', 'Available fonts', 'User-agent', 'Screen resolution', 'Cookies enabled']);
});

test('attributeRows は目録の順に値を拾い、モバイルなら mobile の列を使う', () => {
  const rows = C.attributeRows(sample(), false);
  assert.equal(rows.length, 20);
  assert.equal(rows[0].key, 'ua');
  assert.equal(rows[0].value, UA.winChrome);
  assert.equal(rows[0].bits, 6.323);
  assert.equal(C.attributeRows(sample(), true)[0].bits, 8.740);
  const canvas = rows.find((r) => r.key === 'canvas');
  assert.equal(canvas.value, 'aaaaaaaaaaaaaaaa');
  assert.equal(canvas.bits, 8.043);
  const audio = rows.find((r) => r.key === 'audio');
  assert.equal(audio.bits, null);
  const missing = C.attributeRows({}, false);
  for (const r of missing) assert.equal(r.value, null, r.key);
});

test('指紋ID: 安定な属性だけから作り、IP・時刻・canvas の2回目の値は影響しない。16桁＋64桁', () => {
  const a = sample();
  const id1 = C.fingerprintId(a);
  assert.match(id1.id, /^[0-9a-f]{16}$/);
  assert.match(id1.full, /^[0-9a-f]{64}$/);
  assert.equal(id1.full.slice(0, 16), id1.id);
  assert.equal(id1.full, nodeSha(id1.input));
  const b = sample();
  b.timestamp = '2030-01-01T00:00:00.000Z';
  b.network = null;
  b.canvas.hash2 = 'zzzz';
  b.canvas.sampleLen = 1;
  assert.equal(C.fingerprintId(b).id, id1.id);
  const c = sample();
  c.time.timezone = 'UTC';
  assert.notEqual(C.fingerprintId(c).id, id1.id);
  const d = sample();
  d.canvas.hash = 'different';
  assert.notEqual(C.fingerprintId(d).id, id1.id);
  // キーの順が違っても同じ ID
  const e = JSON.parse(JSON.stringify(sample()));
  e.screen = { devicePixelRatio: 1, pixelDepth: 24, colorDepth: 24, availHeight: 1040, availWidth: 1920, height: 1080, width: 1920 };
  assert.equal(C.fingerprintId(e).id, id1.id);
  assert.match(C.fingerprintId({}).id, /^[0-9a-f]{16}$/); // 空でも落ちない
});

test('diffAttributes は値の違う属性のキーだけを返す', () => {
  const a = sample();
  const b = sample();
  assert.deepEqual(C.diffAttributes(a, b), []);
  b.time.timezone = 'UTC';
  b.language.languages = ['en'];
  b.network = null;
  assert.deepEqual(C.diffAttributes(a, b), ['language', 'time']);
});

test('isMobileHint: UA-CH の mobile → UA → タッチつき Macintosh', () => {
  const s = sample();
  assert.equal(C.isMobileHint(s), false);
  s.ua.uaData.mobile = true;
  assert.equal(C.isMobileHint(s), true);
  s.ua.uaData = null;
  s.ua.userAgent = UA.iphoneSafari;
  assert.equal(C.isMobileHint(s), true);
  s.ua.userAgent = UA.ipadDesktop;
  s.hardware.maxTouchPoints = 5;
  assert.equal(C.isMobileHint(s), true);
  s.hardware.maxTouchPoints = 0;
  assert.equal(C.isMobileHint(s), false);
  assert.equal(C.isMobileHint({}), false);
});

// ---- 保護の検出

test('detectProtections: 既定の Chromium 相当（何も検出しない）', () => {
  const p = Object.fromEntries(C.detectProtections(sample()).map((x) => [x.key, x]));
  assert.equal(p.canvasRandomized.state, 'off');
  assert.equal(p.pluginsFixed.state, 'on'); // 固定の5件
  assert.equal(p.pluginsFixed.detail, 'standard5');
  assert.equal(p.webglMasked.state, 'off');
  assert.equal(p.uaReduced.state, 'on'); // Chrome/140.0.0.0
  assert.equal(p.deviceMemoryHidden.state, 'off');
  assert.equal(p.dnt.state, 'off');
  assert.equal(p.gpc.state, 'na');
  assert.equal(p.tzUtc.state, 'off');
});

test('detectProtections: Firefox の resistFingerprinting 相当（実測した値）', () => {
  const s = sample();
  s.ua.userAgent = UA.winFirefox;
  s.ua.uaData = null;
  s.canvas = { hash: 'a1', hash2: 'b2', sampleLen: 10 };
  s.webgl = { vendor: 'Mozilla', renderer: 'Mozilla', version: 'WebGL 1.0' };
  s.hardware.deviceMemory = null;
  s.time = { timezone: 'Atlantic/Reykjavik', offsetMin: 0 };
  s.plugins = { names: [], count: 0, pdfViewerEnabled: true };
  s.privacy.globalPrivacyControl = true;
  s.privacy.doNotTrack = true;
  const p = Object.fromEntries(C.detectProtections(s).map((x) => [x.key, x]));
  assert.equal(p.canvasRandomized.state, 'on');
  assert.equal(p.pluginsFixed.detail, 'empty');
  assert.equal(p.webglMasked.state, 'on');
  assert.equal(p.uaReduced.state, 'off');
  assert.equal(p.deviceMemoryHidden.state, 'on');
  assert.equal(p.dnt.state, 'on');
  assert.equal(p.gpc.state, 'on');
  assert.equal(p.tzUtc.state, 'on');
});

test('detectProtections: Canvas が取れない・WebGL が取れない・Safari の Apple GPU・独自のプラグイン', () => {
  const s = sample();
  s.canvas = null;
  s.webgl = null;
  s.plugins = { names: ['Shockwave Flash'], count: 1, pdfViewerEnabled: false };
  const p = Object.fromEntries(C.detectProtections(s).map((x) => [x.key, x]));
  assert.equal(p.canvasBlocked.state, 'on');
  assert.equal(p.webglMasked.detail, 'unavailable');
  assert.equal(p.pluginsFixed.state, 'off');
  const t = sample();
  t.webgl = { vendor: 'Apple Inc.', renderer: 'Apple GPU', version: 'WebGL 1.0' };
  assert.equal(C.detectProtections(t).find((x) => x.key === 'webglMasked').detail, 'Apple GPU');
  // 空でも落ちない。canvas・plugins・webgl・uaReduced・deviceMemory・dnt・gpc・tzUtc の8項目
  assert.deepEqual(C.detectProtections({}).map((p) => p.key),
    ['canvasBlocked', 'pluginsFixed', 'webglMasked', 'uaReduced', 'deviceMemoryHidden', 'dnt', 'gpc', 'tzUtc']);
});

// ---- 外部 API の応答とキャッシュ

test('parseIpify は形を検証する（ISP の API は使わない）', () => {
  assert.equal(C.parseIpify({ ip: '192.0.2.10' }), '192.0.2.10');
  assert.equal(C.parseIpify({ ip: '2001:db8::10' }), '2001:db8::10');
  assert.equal(C.parseIpify({ ip: '<script>' }), null);
  assert.equal(C.parseIpify({ ip: 12 }), null);
  assert.equal(C.parseIpify({ ip: 'abc' }), null); // 区切りがない
  assert.equal(C.parseIpify(null), null);
  assert.equal(C.parseIpapi, undefined);
});

test('parseIpCache: 期限内で形が正しければ返し、壊れていれば null', () => {
  const now = 1_700_000_000_000;
  const ttl = 5 * 60 * 1000;
  const ok = C.parseIpCache(JSON.stringify({ ipv4: '192.0.2.10', ipv6: null, isp: 'ignored' }), String(now - 1000), now, ttl);
  assert.deepEqual(ok, { ipv4: '192.0.2.10', ipv6: null, fetchedAt: now - 1000 }); // 古いキャッシュの isp は捨てる
  assert.equal(C.parseIpCache('{bad', String(now - 1000), now, ttl), null);
  assert.equal(C.parseIpCache(JSON.stringify({ ipv4: '192.0.2.10' }), String(now - ttl), now, ttl), null); // 期限切れ
  assert.equal(C.parseIpCache(JSON.stringify({ ipv4: '192.0.2.10' }), 'abc', now, ttl), null);
  assert.equal(C.parseIpCache(JSON.stringify({ ipv4: '192.0.2.10' }), String(now + 60000), now, ttl), null); // 未来の時刻
  assert.equal(C.parseIpCache('null', String(now - 1), now, ttl), null);
  assert.equal(C.parseIpCache(JSON.stringify({ ipv4: 'nope' }), String(now - 1), now, ttl), null);
  assert.equal(C.parseIpCache(JSON.stringify({ isp: 'only isp' }), String(now - 1), now, ttl), null); // IP が無ければ使わない
  assert.equal(C.parseIpCache(JSON.stringify([1, 2]), String(now - 1), now, ttl), null);
});

// ---- 整形

test('formatValue・formatBits', () => {
  assert.equal(C.formatValue(null), '—');
  assert.equal(C.formatValue(undefined), '—');
  assert.equal(C.formatValue('abc'), 'abc');
  assert.equal(C.formatValue(3), '3');
  assert.equal(C.formatValue(false), 'false');
  assert.equal(C.formatValue({ a: 1 }), '{\n  "a": 1\n}');
  assert.equal(C.formatBits(null), '—');
  assert.equal(C.formatBits(6.323), '6.323');
  assert.equal(C.formatBits(0), '0.000');
});
