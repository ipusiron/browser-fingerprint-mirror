// Browser Fingerprint Mirror の収集部（通常のスクリプト。globalThis.FPCollect に置く）
// ブラウザーの API から値を集めて、計算部（FPCore）が扱う形のデータにする。画面（DOM の組み立て）は script.js
(function (root) {
  'use strict';

  const C = root.FPCore;
  const nav = root.navigator || {};

  const CACHE_KEY = 'ipinfo_cache';
  const CACHE_TIME_KEY = 'ipinfo_cache_time';
  const CACHE_TTL_MS = 5 * 60 * 1000;
  const URL_V4 = 'https://api4.ipify.org?format=json';
  const URL_V6 = 'https://api6.ipify.org?format=json';
  const HIGH_ENTROPY_HINTS = ['architecture', 'bitness', 'model', 'platformVersion', 'uaFullVersion', 'fullVersionList', 'wow64', 'formFactors'];

  function matches(query) {
    try {
      return Boolean(root.matchMedia && root.matchMedia(query).matches);
    } catch (e) {
      return false;
    }
  }

  // 複数の候補のうち最初に合うものの名前を返す（どれも合わなければ 'none'）
  function firstMatch(candidates) {
    for (const [label, query] of candidates) if (matches(query)) return label;
    return 'none';
  }

  function hasStorage(getStore) {
    try {
      const s = getStore();
      const k = '__bfm_probe';
      s.setItem(k, '1');
      s.removeItem(k);
      return true;
    } catch (e) {
      return false;
    }
  }

  function collectUA() {
    const d = nav.userAgentData;
    const uaData = d ? {
      brands: Array.isArray(d.brands) ? d.brands.map((b) => ({ brand: String(b.brand), version: String(b.version) })) : [],
      mobile: typeof d.mobile === 'boolean' ? d.mobile : null,
      platform: typeof d.platform === 'string' ? d.platform : null,
    } : null;
    return {
      userAgent: String(nav.userAgent || ''),
      platform: typeof nav.platform === 'string' ? nav.platform : null,
      vendor: typeof nav.vendor === 'string' && nav.vendor ? nav.vendor : null,
      uaData,
      uaHigh: null,
    };
  }

  async function collectUAHigh() {
    const d = nav.userAgentData;
    if (!d || typeof d.getHighEntropyValues !== 'function') return null;
    try {
      const h = await d.getHighEntropyValues(HIGH_ENTROPY_HINTS);
      const out = {};
      for (const k of HIGH_ENTROPY_HINTS) if (h[k] !== undefined) out[k] = h[k];
      return out;
    } catch (e) {
      return null;
    }
  }

  function collectScreen() {
    const s = root.screen || {};
    return {
      width: s.width ?? null,
      height: s.height ?? null,
      availWidth: s.availWidth ?? null,
      availHeight: s.availHeight ?? null,
      colorDepth: s.colorDepth ?? null,
      pixelDepth: s.pixelDepth ?? null,
      devicePixelRatio: root.devicePixelRatio || 1,
    };
  }

  function collectLanguage() {
    return {
      language: typeof nav.language === 'string' ? nav.language : null,
      languages: Array.isArray(nav.languages) ? nav.languages.slice() : [],
    };
  }

  function collectIntl() {
    try {
      const o = new Intl.DateTimeFormat().resolvedOptions();
      return { locale: o.locale || null, calendar: o.calendar || null, numberingSystem: o.numberingSystem || null };
    } catch (e) {
      return null;
    }
  }

  function collectTime() {
    let tz = null;
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone || null;
    } catch (e) {
      tz = null;
    }
    return { timezone: tz, offsetMin: new Date().getTimezoneOffset() };
  }

  function collectStorage() {
    return {
      localStorage: hasStorage(() => root.localStorage),
      sessionStorage: hasStorage(() => root.sessionStorage),
      indexedDB: Boolean(root.indexedDB),
    };
  }

  function collectPrivacy() {
    const dnt = nav.doNotTrack === '1' || root.doNotTrack === '1' || nav.msDoNotTrack === '1';
    const gpc = typeof nav.globalPrivacyControl === 'boolean' ? nav.globalPrivacyControl : null;
    return { cookieEnabled: Boolean(nav.cookieEnabled), doNotTrack: dnt, globalPrivacyControl: gpc };
  }

  function collectHardware() {
    const touch = ('ontouchstart' in root) || (Number(nav.maxTouchPoints) > 0);
    return {
      deviceMemory: typeof nav.deviceMemory === 'number' ? nav.deviceMemory : null,
      hardwareConcurrency: typeof nav.hardwareConcurrency === 'number' ? nav.hardwareConcurrency : null,
      maxTouchPoints: typeof nav.maxTouchPoints === 'number' ? nav.maxTouchPoints : 0,
      touchCapable: touch,
    };
  }

  function collectMedia() {
    return {
      prefersColorScheme: firstMatch([['dark', '(prefers-color-scheme: dark)'], ['light', '(prefers-color-scheme: light)']]),
      reducedMotion: matches('(prefers-reduced-motion: reduce)') ? 'reduce' : 'no-preference',
      prefersContrast: firstMatch([['more', '(prefers-contrast: more)'], ['less', '(prefers-contrast: less)']]),
      forcedColors: matches('(forced-colors: active)') ? 'active' : 'none',
      pointer: firstMatch([['fine', '(pointer: fine)'], ['coarse', '(pointer: coarse)']]),
      hover: matches('(hover: hover)') ? 'hover' : 'none',
      colorGamut: firstMatch([['rec2020', '(color-gamut: rec2020)'], ['p3', '(color-gamut: p3)'], ['srgb', '(color-gamut: srgb)']]),
      dynamicRange: matches('(dynamic-range: high)') ? 'high' : 'standard',
    };
  }

  // WebGL: まず RENDERER を読み、総称の値（Chromium の "WebKit WebGL"）のときだけ拡張で実名を取る。
  // Firefox は RENDERER に実名を返し、拡張は deprecated の警告を出す。"Mozilla" は resistFingerprinting の伏せ値なので拡張を呼ばない
  const GENERIC_RENDERERS = ['WebKit WebGL', ''];
  function collectWebGL() {
    try {
      const canvas = root.document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return null;
      let vendor = String(gl.getParameter(gl.VENDOR) || '');
      let renderer = String(gl.getParameter(gl.RENDERER) || '');
      let unmasked = false;
      if (GENERIC_RENDERERS.includes(renderer)) {
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        if (ext) {
          vendor = String(gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) || vendor);
          renderer = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || renderer);
          unmasked = true;
        }
      }
      return { vendor, renderer, version: String(gl.getParameter(gl.VERSION) || ''), unmasked };
    } catch (e) {
      return null;
    }
  }

  // Canvas: 文献（AmIUnique）の標準テストに寄せた描画。パングラムを2書体・2色で、絵文字と色つき矩形を添える
  function drawCanvas() {
    const canvas = root.document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 70;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const text = 'Cwm fjordbank glyphs vext quiz, ' + String.fromCodePoint(0x1f603);
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.font = '11pt Arial';
    ctx.fillText(text, 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.font = '18pt "Times New Roman"';
    ctx.fillText(text, 4, 45);
    ctx.strokeStyle = 'rgb(255, 0, 255)';
    ctx.beginPath();
    ctx.arc(50, 50, 20, 0, Math.PI * 2, true);
    ctx.stroke();
    return canvas.toDataURL();
  }

  function collectCanvas() {
    try {
      const a = drawCanvas();
      const b = drawCanvas();
      if (!a || !b) return null;
      return { hash: C.sha256Hex(a).slice(0, 16), hash2: C.sha256Hex(b).slice(0, 16), sampleLen: a.length };
    } catch (e) {
      return null;
    }
  }

  async function collectAudio() {
    try {
      const Ctx = root.OfflineAudioContext || root.webkitOfflineAudioContext;
      if (!Ctx) return null;
      const ctx = new Ctx(1, 44100, 44100);
      const osc = ctx.createOscillator();
      const comp = ctx.createDynamicsCompressor();
      osc.type = 'triangle';
      osc.frequency.value = 440;
      osc.connect(comp);
      comp.connect(ctx.destination);
      osc.start(0);
      const buf = await ctx.startRendering();
      const ch = buf.getChannelData(0);
      let sum = 0;
      for (let i = 0; i < ch.length; i += 100) sum += Math.abs(ch[i]);
      return { hash: C.sha256Hex(sum.toFixed(6)).slice(0, 16) };
    } catch (e) {
      return null;
    }
  }

  function collectPlugins() {
    let names = [];
    try {
      names = nav.plugins ? Array.from(nav.plugins).map((p) => String(p.name)) : [];
    } catch (e) {
      names = [];
    }
    return { names, count: names.length, pdfViewerEnabled: typeof nav.pdfViewerEnabled === 'boolean' ? nav.pdfViewerEnabled : null };
  }

  // フォント: 候補ごとに3つの基準にフォールバックさせて幅・高さを測り、基準と違えば「入っている」。判定は計算部
  function collectFonts() {
    try {
      const doc = root.document;
      const span = doc.createElement('span');
      span.style.cssText = 'position:absolute;left:-9999px;top:0;font-size:72px;white-space:nowrap;line-height:normal';
      span.textContent = 'mmmmmmmmmmlli' + String.fromCharCode(0x3042, 0x6f22);
      doc.body.appendChild(span);
      const measure = (ff) => {
        span.style.fontFamily = ff;
        const r = span.getBoundingClientRect();
        return [Math.round(r.width * 100) / 100, Math.round(r.height * 100) / 100];
      };
      const baseDims = {};
      for (const b of C.FONT_BASES) baseDims[b] = measure(b);
      const measured = {};
      for (const fam of C.FONT_LIST) {
        measured[fam] = {};
        for (const b of C.FONT_BASES) measured[fam][b] = measure('"' + fam + '",' + b);
      }
      span.remove();
      return C.fontsSummary(C.detectedFonts(baseDims, measured));
    } catch (e) {
      return null;
    }
  }

  // 全部を集める。network は呼び出し側が持っている値をそのまま載せる（ここでは外部へ出ない）
  async function collect(options) {
    const opt = options || {};
    const ua = collectUA();
    ua.uaHigh = await collectUAHigh();
    const audio = await collectAudio();
    return {
      timestamp: new Date().toISOString(),
      ua,
      screen: collectScreen(),
      language: collectLanguage(),
      intl: collectIntl(),
      time: collectTime(),
      storage: collectStorage(),
      privacy: collectPrivacy(),
      hardware: collectHardware(),
      media: collectMedia(),
      webgl: collectWebGL(),
      canvas: collectCanvas(),
      audio,
      plugins: collectPlugins(),
      fonts: collectFonts(),
      network: opt.network || null,
    };
  }

  // IP の取得（ipify.org）。押したときだけ呼ぶ。env = { fetchFn, now, getItem, setItem }
  async function fetchNetwork(env) {
    const cached = C.parseIpCache(env.getItem(CACHE_KEY), env.getItem(CACHE_TIME_KEY), env.now, CACHE_TTL_MS);
    if (cached) return { ...cached, status: 'cache' };
    const json = (url) => env.fetchFn(url).then((r) => (r.ok ? r.json() : null));
    const [v4, v6] = await Promise.allSettled([json(URL_V4), json(URL_V6)]);
    const ipv4 = v4.status === 'fulfilled' ? C.parseIpify(v4.value) : null;
    const ipv6 = v6.status === 'fulfilled' ? C.parseIpify(v6.value) : null;
    const net = { ipv4, ipv6, fetchedAt: env.now, status: ipv4 || ipv6 ? 'ok' : 'failed' };
    if (ipv4 || ipv6) {
      env.setItem(CACHE_KEY, JSON.stringify({ ipv4, ipv6 }));
      env.setItem(CACHE_TIME_KEY, String(env.now));
    }
    return net;
  }

  root.FPCollect = { collect, fetchNetwork, collectUA, collectWebGL, collectCanvas, collectAudio, collectPlugins, collectFonts, CACHE_KEY, CACHE_TIME_KEY, CACHE_TTL_MS };
})(typeof globalThis !== 'undefined' ? globalThis : this);
