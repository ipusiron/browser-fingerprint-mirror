// Browser Fingerprint Mirror の計算部（通常のスクリプト。globalThis.FPCore に置く）
// DOM・ブラウザーの API を使わない純粋関数だけを置く。画面側（script.js）と収集側（js/fp-collect.js）から呼ぶ。
// node --test から同じファイルを読んで検証する。
(function (root) {
  'use strict';

  const VERSION = '2.0.0';

  /* ======================================================================
     SHA-256（純 JS）。文字列を UTF-8 として扱い、16進の小文字で返す
     ====================================================================== */
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  function utf8Bytes(str) {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(str);
    const out = [];
    for (let i = 0; i < str.length; i++) {
      let c = str.codePointAt(i);
      if (c > 0xffff) i++;
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
      else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
    return Uint8Array.from(out);
  }

  const rotr = (x, n) => (x >>> n) | (x << (32 - n));

  function sha256Hex(str) {
    const bytes = utf8Bytes(String(str));
    const bitLen = bytes.length * 8;
    const padLen = ((bytes.length + 1 + 8 + 63) >> 6) << 6;
    const buf = new Uint8Array(padLen);
    buf.set(bytes);
    buf[bytes.length] = 0x80;
    const dv = new DataView(buf.buffer);
    dv.setUint32(padLen - 8, Math.floor(bitLen / 0x100000000), false);
    dv.setUint32(padLen - 4, bitLen >>> 0, false);
    let H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    const W = new Uint32Array(64);
    for (let off = 0; off < padLen; off += 64) {
      for (let i = 0; i < 16; i++) W[i] = dv.getUint32(off + i * 4, false);
      for (let i = 16; i < 64; i++) {
        const s0 = rotr(W[i - 15], 7) ^ rotr(W[i - 15], 18) ^ (W[i - 15] >>> 3);
        const s1 = rotr(W[i - 2], 17) ^ rotr(W[i - 2], 19) ^ (W[i - 2] >>> 10);
        W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
      }
      let [a, b, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) {
        const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        const ch = (e & f) ^ (~e & g);
        const t1 = (h + S1 + ch + K[i] + W[i]) >>> 0;
        const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (S0 + maj) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      H = [a, b, c, d, e, f, g, h].map((v, i) => (H[i] + v) >>> 0);
    }
    return H.map((v) => v.toString(16).padStart(8, '0')).join('');
  }

  /* ======================================================================
     正規化した JSON（キーを辞書順に並べる。undefined は null にする）
     ====================================================================== */
  function canonicalize(value) {
    if (value === undefined || value === null) return 'null';
    if (typeof value === 'number') return Number.isFinite(value) ? JSON.stringify(value) : 'null';
    if (typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']';
    const keys = Object.keys(value).sort();
    return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalize(value[k])).join(',') + '}';
  }

  /* ======================================================================
     OS・ブラウザーの推定。UA Client Hints（UA-CH）があればそれを優先し、無ければ UA 文字列の順で見る
     ====================================================================== */
  const CH_PLATFORMS = {
    windows: 'Windows', macos: 'macOS', android: 'Android', 'chrome os': 'ChromeOS', chromeos: 'ChromeOS',
    linux: 'Linux', ios: 'iOS', ipados: 'iPadOS',
  };

  // 引数: { ua, chPlatform（navigator.userAgentData.platform）, platform（navigator.platform）, maxTouchPoints }
  function detectOS(input) {
    const i = input || {};
    const ua = String(i.ua || '');
    const ch = String(i.chPlatform || '').trim().toLowerCase();
    if (ch && CH_PLATFORMS[ch]) return { name: CH_PLATFORMS[ch], source: 'ua-ch' };
    const touch = Number(i.maxTouchPoints) || 0;
    if (/iPhone|iPod/.test(ua)) return { name: 'iOS', source: 'ua' };
    if (/iPad/.test(ua)) return { name: 'iPadOS', source: 'ua' };
    if (/CrOS/.test(ua)) return { name: 'ChromeOS', source: 'ua' };
    if (/Android/.test(ua)) return { name: 'Android', source: 'ua' };
    if (/Windows/.test(ua)) return { name: 'Windows', source: 'ua' };
    if (/Macintosh|Mac OS X/.test(ua)) return touch > 1 ? { name: 'iPadOS', source: 'ua+touch' } : { name: 'macOS', source: 'ua' };
    if (/Linux|X11/.test(ua)) return { name: 'Linux', source: 'ua' };
    const p = String(i.platform || '');
    if (/^Win/.test(p)) return { name: 'Windows', source: 'platform' };
    if (/^Mac/.test(p)) return { name: 'macOS', source: 'platform' };
    if (/^Linux/.test(p)) return { name: 'Linux', source: 'platform' };
    return { name: 'Unknown', source: 'none' };
  }

  // UA-CH の brands は GREASE（"Not:A-Brand" のような偽の項目）を含むので除く
  const GREASE = /not.?a.?brand/i;
  const CH_BRANDS = [
    ['Microsoft Edge', 'Edge'], ['Opera', 'Opera'], ['Brave', 'Brave'], ['Vivaldi', 'Vivaldi'], ['Samsung Internet', 'Samsung Internet'],
    ['Yandex', 'Yandex Browser'], ['Google Chrome', 'Chrome'], ['HeadlessChrome', 'Chrome (Headless)'], ['Chromium', 'Chromium'],
  ];
  const UA_BROWSERS = [
    [/EdgiOS\/(\d+)/, 'Edge'], [/Edg[A]?\/(\d+)/, 'Edge'], [/OPR\/(\d+)/, 'Opera'], [/Opera[\/ ](\d+)/, 'Opera'],
    [/SamsungBrowser\/(\d+)/, 'Samsung Internet'], [/Vivaldi\/(\d+)/, 'Vivaldi'], [/YaBrowser\/(\d+)/, 'Yandex Browser'],
    [/CriOS\/(\d+)/, 'Chrome'], [/FxiOS\/(\d+)/, 'Firefox'], [/Firefox\/(\d+)/, 'Firefox'], [/HeadlessChrome\/(\d+)/, 'Chrome (Headless)'],
    [/Chrome\/(\d+)/, 'Chrome'], [/Version\/(\d+)[^)]*Safari\//, 'Safari'], [/Safari\/(\d+)/, 'Safari'],
  ];

  // 引数: { ua, brands（[{brand, version}]）}
  function detectBrowser(input) {
    const i = input || {};
    const brands = Array.isArray(i.brands) ? i.brands.filter((b) => b && typeof b.brand === 'string' && !GREASE.test(b.brand)) : [];
    for (const [brand, name] of CH_BRANDS) {
      const hit = brands.find((b) => b.brand === brand);
      if (hit) {
        // Chromium だけのときは「Chromium 系」。Brave・Vivaldi などは brands に自分の名前を載せないことがある
        return { name, version: String(hit.version || '').split('.')[0] || null, source: 'ua-ch' };
      }
    }
    const ua = String(i.ua || '');
    for (const [re, name] of UA_BROWSERS) {
      const m = re.exec(ua);
      if (m) return { name, version: m[1] || null, source: 'ua' };
    }
    return { name: 'Unknown', version: null, source: 'none' };
  }

  // Chromium の削減された UA（バージョンが .0.0.0、OS の版が固定）かどうか
  function isReducedUA(ua) {
    return /Chrome\/\d+\.0\.0\.0/.test(String(ua || ''));
  }

  /* ======================================================================
     属性の目録。行の順・安定性・指紋IDに入れるか・研究で測られた識別力（Gómez-Boix ほか 2018、Table 3）
     bits は PC（1,816,776 件）とモバイル（251,166 件）の列。null は研究が測っていない属性
     ====================================================================== */
  const SOURCE_2018 = 'gomezboix2018';
  const ATTRIBUTES = [
    { key: 'ua', path: ['ua', 'userAgent'], stability: 'version', inId: true, ref: { pc: 6.323, mobile: 8.740, attr: 'User-agent', source: SOURCE_2018 } },
    { key: 'uaCh', path: ['ua', 'uaData'], stability: 'version', inId: true, ref: null },
    { key: 'uaHigh', path: ['ua', 'uaHigh'], stability: 'version', inId: true, ref: null },
    { key: 'platform', path: ['ua', 'platform'], stability: 'hardware', inId: true, ref: { pc: 0.489, mobile: 2.274, attr: 'Platform', source: SOURCE_2018 } },
    { key: 'screen', path: ['screen'], stability: 'hardware', inId: true, ref: { pc: 4.437, mobile: 3.603, attr: 'Screen resolution', source: SOURCE_2018 } },
    { key: 'language', path: ['language'], stability: 'setting', inId: true, ref: { pc: 2.559, mobile: 2.291, attr: 'Content language', source: SOURCE_2018 } },
    { key: 'intl', path: ['intl'], stability: 'setting', inId: true, ref: null },
    { key: 'time', path: ['time'], stability: 'setting', inId: true, ref: { pc: 0.096, mobile: 0.551, attr: 'Timezone', source: SOURCE_2018 } },
    { key: 'storage', path: ['storage'], stability: 'setting', inId: true, ref: { pc: 0.042, mobile: 0.056, attr: 'Use of local/session storage', source: SOURCE_2018 } },
    { key: 'cookie', path: ['privacy', 'cookieEnabled'], stability: 'setting', inId: true, ref: { pc: 0.000, mobile: 0.000, attr: 'Cookies enabled', source: SOURCE_2018 } },
    { key: 'dnt', path: ['privacy', 'doNotTrack'], stability: 'setting', inId: true, ref: { pc: 1.922, mobile: 1.102, attr: 'Do Not Track', source: SOURCE_2018 } },
    { key: 'gpc', path: ['privacy', 'globalPrivacyControl'], stability: 'setting', inId: true, ref: null },
    { key: 'hardware', path: ['hardware'], stability: 'hardware', inId: true, ref: null },
    { key: 'media', path: ['media'], stability: 'setting', inId: true, ref: null },
    { key: 'webglVendor', path: ['webgl', 'vendor'], stability: 'hardware', inId: true, ref: { pc: 1.820, mobile: 2.423, attr: 'WebGL Vendor', source: SOURCE_2018 } },
    { key: 'webglRenderer', path: ['webgl', 'renderer'], stability: 'hardware', inId: true, ref: { pc: 5.278, mobile: 4.172, attr: 'WebGL Renderer', source: SOURCE_2018 } },
    { key: 'canvas', path: ['canvas', 'hash'], stability: 'hardware', inId: true, ref: { pc: 8.043, mobile: 7.930, attr: 'Canvas', source: SOURCE_2018 } },
    { key: 'audio', path: ['audio', 'hash'], stability: 'hardware', inId: true, ref: null },
    { key: 'plugins', path: ['plugins'], stability: 'fixedList', inId: true, ref: { pc: 10.281, mobile: 0.206, attr: 'List of plugins', source: SOURCE_2018 } },
    { key: 'network', path: ['network'], stability: 'volatile', inId: false, ref: null },
  ];

  // 研究の表（座学・README 用）。2010＝Panopticlick（470,161 件）、2016＝AmIUnique（118,934 件）、2018＝全体（2,067,942 件）
  const STUDY_TABLE = [
    { attr: 'Platform', p2010: null, a2016: [2.310, 0.137], all2018: [1.200, 0.057], mobile2018: [2.274, 0.127], pc2018: [0.489, 0.024] },
    { attr: 'Do Not Track', p2010: null, a2016: [0.944, 0.056], all2018: [1.919, 0.091], mobile2018: [1.102, 0.061], pc2018: [1.922, 0.092] },
    { attr: 'Timezone', p2010: [3.040, 0.161], a2016: [3.338, 0.198], all2018: [0.164, 0.008], mobile2018: [0.551, 0.031], pc2018: [0.096, 0.005] },
    { attr: 'List of plugins', p2010: [15.400, 0.817], a2016: [11.060, 0.656], all2018: [9.485, 0.452], mobile2018: [0.206, 0.011], pc2018: [10.281, 0.494] },
    { attr: 'Use of local/session storage', p2010: null, a2016: [0.405, 0.024], all2018: [0.043, 0.002], mobile2018: [0.056, 0.003], pc2018: [0.042, 0.002] },
    { attr: 'Use of an ad blocker', p2010: null, a2016: [0.995, 0.059], all2018: [0.045, 0.002], mobile2018: [0.067, 0.004], pc2018: [0.042, 0.002] },
    { attr: 'WebGL Vendor', p2010: null, a2016: [2.141, 0.127], all2018: [2.282, 0.109], mobile2018: [2.423, 0.135], pc2018: [1.820, 0.088] },
    { attr: 'WebGL Renderer', p2010: null, a2016: [3.406, 0.202], all2018: [5.541, 0.264], mobile2018: [4.172, 0.233], pc2018: [5.278, 0.254] },
    { attr: 'Available fonts', p2010: [13.900, 0.738], a2016: [8.379, 0.497], all2018: [6.904, 0.329], mobile2018: [2.192, 0.122], pc2018: [6.967, 0.335] },
    { attr: 'Canvas', p2010: null, a2016: [8.278, 0.491], all2018: [8.546, 0.407], mobile2018: [7.930, 0.442], pc2018: [8.043, 0.387] },
    { attr: 'Header Accept', p2010: null, a2016: [1.383, 0.082], all2018: [0.729, 0.035], mobile2018: [0.111, 0.006], pc2018: [0.776, 0.037] },
    { attr: 'Content encoding', p2010: null, a2016: [1.534, 0.091], all2018: [0.382, 0.018], mobile2018: [1.168, 0.065], pc2018: [0.153, 0.007] },
    { attr: 'Content language', p2010: null, a2016: [5.918, 0.351], all2018: [2.716, 0.129], mobile2018: [2.291, 0.128], pc2018: [2.559, 0.123] },
    { attr: 'User-agent', p2010: [10.000, 0.531], a2016: [9.779, 0.580], all2018: [7.150, 0.341], mobile2018: [8.740, 0.487], pc2018: [6.323, 0.304] },
    { attr: 'Screen resolution', p2010: [4.830, 0.256], a2016: [4.889, 0.290], all2018: [4.847, 0.231], mobile2018: [3.603, 0.201], pc2018: [4.437, 0.213] },
    { attr: 'List of HTTP headers', p2010: null, a2016: [4.198, 0.249], all2018: [1.783, 0.085], mobile2018: [1.941, 0.108], pc2018: [1.521, 0.073] },
    { attr: 'Cookies enabled', p2010: [0.353, 0.019], a2016: [0.253, 0.015], all2018: [0.000, 0.000], mobile2018: [0.000, 0.000], pc2018: [0.000, 0.000] },
  ];
  const STUDY_META = {
    hm: { p2010: 18.843, a2016: 16.860, all2018: 20.980, mobile2018: 17.938, pc2018: 20.793 },
    count: { p2010: 470161, a2016: 118934, all2018: 2067942, mobile2018: 251166, pc2018: 1816776 },
    unique: { p2010: 83.6, a2016: 89.4, all2018: 33.6, mobile2018: 18.5, pc2018: 35.7 },
  };

  function getPath(obj, path) {
    let v = obj;
    for (const p of path) {
      if (v === null || v === undefined) return null;
      v = v[p];
    }
    return v === undefined ? null : v;
  }

  // 属性の表の行を作る。{ key, value, stability, inId, bits（null か数値）, ref }
  function attributeRows(data, isMobile) {
    const d = data || {};
    return ATTRIBUTES.map((a) => ({
      key: a.key,
      value: getPath(d, a.path),
      stability: a.stability,
      inId: a.inId,
      bits: a.ref ? (isMobile ? a.ref.mobile : a.ref.pc) : null,
      ref: a.ref,
    }));
  }

  /* ======================================================================
     指紋ID: 安定な属性（inId）だけを正規化して SHA-256。IP・時刻・向きは入れない
     ====================================================================== */
  function stableSubset(data) {
    const d = data || {};
    const out = {};
    for (const a of ATTRIBUTES) {
      if (!a.inId) continue;
      const v = getPath(d, a.path);
      out[a.key] = v;
    }
    return out;
  }

  function fingerprintId(data) {
    const input = canonicalize(stableSubset(data));
    const full = sha256Hex(input);
    return { id: full.slice(0, 16), full, input };
  }

  // 2つの収集結果で、値が違う属性のキーを返す（安定性の確認に使う）
  function diffAttributes(a, b) {
    const sa = stableSubset(a);
    const sb = stableSubset(b);
    return Object.keys(sa).filter((k) => canonicalize(sa[k]) !== canonicalize(sb[k]));
  }

  // モバイルかどうかの目安（研究の表の列を選ぶため）。UA-CH の mobile → UA → タッチ
  function isMobileHint(data) {
    const d = data || {};
    const ch = d.ua && d.ua.uaData;
    if (ch && typeof ch.mobile === 'boolean') return ch.mobile;
    const ua = String((d.ua && d.ua.userAgent) || '');
    if (/Mobi|Android|iPhone|iPad/.test(ua)) return true;
    const touch = d.hardware && Number(d.hardware.maxTouchPoints);
    return Boolean(touch > 1 && /Macintosh/.test(ua));
  }

  /* ======================================================================
     保護の検出。観測できた事実だけを返す（推測の判定はしない）
     返り値: [{ key, state: 'on' | 'off' | 'na', detail }]
     ====================================================================== */
  const FIXED_PLUGIN_NAMES = ['PDF Viewer', 'Chrome PDF Viewer', 'Chromium PDF Viewer', 'Microsoft Edge PDF Viewer', 'WebKit built-in PDF'];
  const MASKED_RENDERERS = ['Mozilla', ''];
  const UTC_ZONES = ['UTC', 'Etc/UTC', 'Etc/GMT', 'GMT', 'Atlantic/Reykjavik', 'Africa/Abidjan'];

  function detectProtections(data) {
    const d = data || {};
    const out = [];
    // Canvas: 2回読んで違えばランダム化（Brave の farbling・Firefox の resistFingerprinting）
    if (!d.canvas) out.push({ key: 'canvasBlocked', state: 'on', detail: null });
    else if (d.canvas.hash2 && d.canvas.hash !== d.canvas.hash2) out.push({ key: 'canvasRandomized', state: 'on', detail: null });
    else out.push({ key: 'canvasRandomized', state: 'off', detail: null });
    // プラグイン: 仕様で固定された一覧か（識別力なし）
    const pl = d.plugins || {};
    const names = Array.isArray(pl.names) ? pl.names : [];
    if (names.length === 0) out.push({ key: 'pluginsFixed', state: 'on', detail: 'empty' });
    else if (names.every((n) => FIXED_PLUGIN_NAMES.includes(n))) out.push({ key: 'pluginsFixed', state: 'on', detail: 'standard5' });
    else out.push({ key: 'pluginsFixed', state: 'off', detail: String(names.length) });
    // WebGL: 伏せ値か
    if (!d.webgl) out.push({ key: 'webglMasked', state: 'on', detail: 'unavailable' });
    else if (MASKED_RENDERERS.includes(String(d.webgl.renderer || '')) && MASKED_RENDERERS.includes(String(d.webgl.vendor || ''))) {
      out.push({ key: 'webglMasked', state: 'on', detail: String(d.webgl.renderer || '') });
    } else if (String(d.webgl.renderer || '') === 'Apple GPU') out.push({ key: 'webglMasked', state: 'on', detail: 'Apple GPU' });
    else out.push({ key: 'webglMasked', state: 'off', detail: null });
    // UA の削減（Chromium）
    out.push({ key: 'uaReduced', state: isReducedUA(d.ua && d.ua.userAgent) ? 'on' : 'off', detail: null });
    // メモリ量の非公開（Firefox・Safari は実装していない。Chromium は 2 のべき乗に丸める）
    const mem = d.hardware ? d.hardware.deviceMemory : null;
    out.push({ key: 'deviceMemoryHidden', state: mem === null || mem === undefined ? 'on' : 'off', detail: mem === null || mem === undefined ? null : String(mem) });
    // 追跡拒否の意思表示
    const pv = d.privacy || {};
    out.push({ key: 'dnt', state: pv.doNotTrack === true ? 'on' : 'off', detail: null });
    out.push({ key: 'gpc', state: pv.globalPrivacyControl === true ? 'on' : pv.globalPrivacyControl === false ? 'off' : 'na', detail: null });
    // タイムゾーンが UTC（resistFingerprinting の可能性。実際に UTC 圏のこともある）
    const tz = d.time || {};
    out.push({ key: 'tzUtc', state: tz.offsetMin === 0 && UTC_ZONES.includes(String(tz.timezone || '')) ? 'on' : 'off', detail: tz.timezone || null });
    return out;
  }

  /* ======================================================================
     外部 API（IP）の応答とキャッシュの検証
     ====================================================================== */
  const IP_RE = /^[0-9a-fA-F.:]{2,45}$/;

  function validIp(v) {
    return typeof v === 'string' && IP_RE.test(v) && (v.includes('.') || v.includes(':'));
  }

  // ipify の応答 { ip } → 文字列か null
  function parseIpify(obj) {
    return obj && validIp(obj.ip) ? obj.ip : null;
  }

  // localStorage のキャッシュ（JSON 文字列と保存時刻）を検証して返す。壊れていれば null
  function parseIpCache(json, timeStr, now, ttlMs) {
    const t = Number(timeStr);
    if (!Number.isFinite(t) || !(now - t < ttlMs) || now - t < 0) return null;
    let obj;
    try {
      obj = JSON.parse(String(json));
    } catch (e) {
      return null;
    }
    if (!obj || typeof obj !== 'object') return null;
    const out = {
      ipv4: validIp(obj.ipv4) ? obj.ipv4 : null,
      ipv6: validIp(obj.ipv6) ? obj.ipv6 : null,
      fetchedAt: t,
    };
    if (!out.ipv4 && !out.ipv6) return null;
    return out;
  }

  /* ======================================================================
     表示用の整形（DOM は使わない）
     ====================================================================== */
  function formatValue(v) {
    if (v === null || v === undefined) return '—';
    if (typeof v === 'string') return v;
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    return JSON.stringify(v, null, 2);
  }

  function formatBits(bits) {
    return bits === null || bits === undefined ? '—' : bits.toFixed(3);
  }

  root.FPCore = {
    VERSION, sha256Hex, utf8Bytes, canonicalize, detectOS, detectBrowser, isReducedUA,
    ATTRIBUTES, STUDY_TABLE, STUDY_META, FIXED_PLUGIN_NAMES, attributeRows, stableSubset, fingerprintId, diffAttributes, isMobileHint,
    detectProtections, parseIpify, parseIpCache, validIp, formatValue, formatBits, getPath,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
