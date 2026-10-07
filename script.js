/* Browser Fingerprint Mirror の画面側（DOM の組み立てと操作だけ）
 * 計算は js/fp-core.js（FPCore）、値の収集は js/fp-collect.js（FPCollect）、文言は js/messages.js（FPMessages）
 */
(function () {
  'use strict';

  const C = globalThis.FPCore;
  const COL = globalThis.FPCollect;
  const M = globalThis.FPMessages;
  const I18N = globalThis.FPI18n;
  const t = M.t;

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const LAST_VISIT_KEY = 'bfm-last-visit';
  const THEME_KEY = 'theme';
  const TOAST_MAX_WIDTH = 300;
  const SUN = String.fromCodePoint(0x2600, 0xfe0f);
  const MOON = String.fromCodePoint(0x1f319);
  const MARK_ON = String.fromCodePoint(0x25cf);
  const MARK_OFF = String.fromCodePoint(0x25cb);
  const MARK_NA = String.fromCodePoint(0x2013);
  const TIMES = String.fromCodePoint(0xd7);
  const DASH = String.fromCodePoint(0x2014);
  const SLASH = String.fromCodePoint(0xff0f);

  const state = { data: null, firstData: null, ids: [], network: null, lastVisit: null, building: false, previousVisit: null, netStatus: null };

  /* ---------- localStorage（使えない環境でも落ちない） ---------- */
  function lsGet(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }
  function lsSet(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      return false;
    }
  }
  function lsRemove(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      // 消せなくても続ける
    }
  }

  /* ---------- タブ ---------- */
  const TAB_KEYS = ['simple', 'advanced', 'learn'];

  function selectTab(key, focus) {
    for (const btn of $$('.tab')) {
      const on = btn.dataset.tab === key;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
      btn.tabIndex = on ? 0 : -1;
      if (on && focus) btn.focus();
    }
    for (const panel of $$('.panel')) panel.classList.toggle('active', panel.id === key);
  }

  function initTabs() {
    for (const btn of $$('.tab')) {
      btn.addEventListener('click', () => selectTab(btn.dataset.tab, false));
      btn.addEventListener('keydown', (e) => {
        const i = TAB_KEYS.indexOf(btn.dataset.tab);
        let next = null;
        if (e.key === 'ArrowRight') next = TAB_KEYS[(i + 1) % TAB_KEYS.length];
        else if (e.key === 'ArrowLeft') next = TAB_KEYS[(i - 1 + TAB_KEYS.length) % TAB_KEYS.length];
        else if (e.key === 'Home') next = TAB_KEYS[0];
        else if (e.key === 'End') next = TAB_KEYS[TAB_KEYS.length - 1];
        if (next) {
          e.preventDefault();
          selectTab(next, true);
        }
      });
    }
  }

  /* ---------- テーマ（保存がなければ OS の設定に従う） ---------- */
  function initTheme() {
    const saved = lsGet(THEME_KEY);
    let theme = saved === 'light' || saved === 'dark' ? saved : null;
    if (!theme) theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    applyTheme(theme);
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const btn = $('#theme-toggle');
    if (btn) {
      const icon = btn.querySelector('.theme-icon');
      if (icon) icon.textContent = theme === 'dark' ? SUN : MOON;
      btn.setAttribute('aria-label', t(theme === 'dark' ? 'theme.toLight' : 'theme.toDark'));
    }
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    lsSet(THEME_KEY, next);
  }

  /* ---------- トースト ---------- */
  function showToast(message, type, anchor) {
    const toast = document.createElement('div');
    toast.className = 'toast' + (type ? ' ' + type : '');
    toast.setAttribute('role', 'status');
    toast.textContent = message;
    if (anchor) {
      toast.classList.add('toast-anchored');
      const rect = anchor.getBoundingClientRect();
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - TOAST_MAX_WIDTH - 8));
      toast.style.cssText = 'position: fixed; top: ' + (rect.bottom + 8) + 'px; left: ' + left + 'px;';
    }
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('hide');
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  /* ---------- シンプル ---------- */
  function sourceLabel(source) {
    if (source === 'ua-ch') return t('simple.sourceUaCh');
    if (source === 'ua' || source === 'ua+touch') return t('simple.sourceUa');
    if (source === 'platform') return t('simple.sourcePlatform');
    return t('simple.sourceNone');
  }

  function fillSimple(data) {
    const ua = data.ua || {};
    const os = C.detectOS({ ua: ua.userAgent, chPlatform: ua.uaData && ua.uaData.platform, platform: ua.platform, maxTouchPoints: data.hardware.maxTouchPoints });
    const br = C.detectBrowser({ ua: ua.userAgent, brands: ua.uaData && ua.uaData.brands });
    $('#simple-browser').textContent = br.version ? br.name + ' ' + br.version : br.name;
    $('#simple-os').textContent = os.name;
    $('#simple-os-source').textContent = sourceLabel(os.source);
    const sc = data.screen;
    $('#simple-res').textContent = sc.width + TIMES + sc.height + ' @' + Number(sc.devicePixelRatio).toFixed(2);
    const langs = data.language.languages && data.language.languages.length ? data.language.languages : [data.language.language];
    $('#simple-lang').textContent = langs.filter(Boolean).join(', ') || '-';
    $('#simple-tz').textContent = data.time.timezone || '-';
    const hw = data.hardware;
    $('#simple-hw').textContent = t('simple.hwValue', {
      touch: t(hw.touchCapable ? 'simple.yes' : 'simple.no'),
      cores: hw.hardwareConcurrency === null ? '?' : hw.hardwareConcurrency,
      mem: hw.deviceMemory === null ? '?' : hw.deviceMemory + 'GB',
    });
    const pv = data.privacy;
    const gpc = pv.globalPrivacyControl === true ? 'simple.gpcOn' : pv.globalPrivacyControl === false ? 'simple.gpcOff' : 'simple.gpcNa';
    $('#simple-cookie-dnt').textContent = [t(pv.cookieEnabled ? 'simple.cookieOn' : 'simple.cookieOff'), t(pv.doNotTrack ? 'simple.dntOn' : 'simple.dntOff'), t(gpc)].join(' / ');
    fillNetwork(state.network);
  }

  function fillNetwork(net) {
    const none = t('net.notFetched');
    $('#simple-ipv4').textContent = net ? (net.ipv4 || t('net.unsupported')) : none;
    $('#simple-ipv6').textContent = net ? (net.ipv6 || t('net.unsupported')) : none;
    let isp = none;
    if (net) {
      if (net.isp) isp = net.asn ? net.isp + ' / ' + net.asn : net.isp;
      else if (net.status === 'rateLimited') isp = t('net.rateLimited');
      else isp = t('net.failed');
    }
    $('#simple-isp').textContent = isp;
  }

  function setNetStatus(key, params) {
    state.netStatus = key ? { key, params: params || null } : null;
    $('#net-status').textContent = key ? t(key, params) : '';
  }

  async function onFetchIp() {
    const btn = $('#fetch-ip');
    const status = $('#net-status');
    btn.disabled = true;
    status.textContent = t('net.loading');
    $('#simple-ipv4').textContent = t('net.loading');
    $('#simple-ipv6').textContent = t('net.loading');
    $('#simple-isp').textContent = t('net.loading');
    try {
      const net = await COL.fetchNetwork({ fetchFn: (url) => fetch(url), now: Date.now(), getItem: lsGet, setItem: lsSet });
      state.network = net;
      if (state.data) state.data.network = net;
      fillNetwork(net);
      const at = new Date(net.fetchedAt).toLocaleTimeString();
      if (net.status === 'cache') setNetStatus('net.statusCache', { at });
      else if (net.status === 'rateLimited') setNetStatus('net.statusRateLimited');
      else if (net.status === 'noisp') setNetStatus('net.statusNoisp');
      else if (net.status === 'failed') setNetStatus('net.statusFailed');
      else setNetStatus('net.statusOk', { at });
      renderAttributes();
    } catch (e) {
      state.network = null;
      fillNetwork({ status: 'failed' });
      setNetStatus('net.statusFailed');
    } finally {
      btn.disabled = false;
    }
  }

  /* ---------- 詳細・分析 ---------- */
  function currentId() {
    return state.data ? C.fingerprintId(state.data).id : null;
  }

  function renderId() {
    $('#fp-id').textContent = currentId() || '--';
  }

  function renderStability() {
    const n = state.ids.length;
    const el = $('#fp-stability');
    if (n <= 1) {
      el.textContent = t('adv.stabilityFirst');
      return;
    }
    const diff = C.diffAttributes(state.firstData, state.data);
    if (diff.length === 0 && state.ids.every((id) => id === state.ids[0])) el.textContent = t('adv.stabilitySame', { n });
    else el.textContent = t('adv.stabilityDiff', { n, keys: diff.map((k) => t('attr.' + k)).join(', ') || '-' });
  }

  function readLastVisit() {
    const raw = lsGet(LAST_VISIT_KEY);
    if (!raw) return null;
    try {
      const v = JSON.parse(raw);
      if (v && typeof v.id === 'string' && /^[0-9a-f]{16}$/.test(v.id) && Number.isFinite(v.at)) return { id: v.id, at: v.at };
    } catch (e) {
      // 壊れていれば無いものとして扱う
    }
    return null;
  }

  function renderLastVisit(previous) {
    const el = $('#fp-last');
    const id = currentId();
    if (!previous) {
      el.textContent = state.lastVisit === 'unavailable' ? t('adv.lastUnavailable') : state.lastVisit === 'cleared' ? t('adv.lastCleared') : t('adv.lastNone');
      return;
    }
    const at = new Date(previous.at).toLocaleString();
    el.textContent = previous.id === id ? t('adv.lastSame', { at }) : t('adv.lastDiff', { at });
  }

  function saveLastVisit() {
    const id = currentId();
    if (!id) return;
    if (!lsSet(LAST_VISIT_KEY, JSON.stringify({ id, at: Date.now() }))) {
      state.lastVisit = 'unavailable';
      $('#fp-last').textContent = t('adv.lastUnavailable');
    }
  }

  function clearLastVisit() {
    lsRemove(LAST_VISIT_KEY);
    state.previousVisit = null;
    state.lastVisit = 'cleared';
    $('#fp-last').textContent = t('adv.lastCleared');
    showToast(t('adv.lastCleared'), 'success', $('#clear-last'));
  }

  function protectionText(p) {
    const base = 'prot.' + p.key + '.' + p.state;
    if (p.key === 'pluginsFixed' && p.state === 'on') return t(base + '.' + p.detail);
    return t(base, { detail: p.detail === null || p.detail === undefined ? t('prot.unavailable') : p.detail });
  }

  function renderProtections() {
    const list = $('#prot-list');
    list.textContent = '';
    for (const p of C.detectProtections(state.data)) {
      const li = document.createElement('li');
      li.className = 'prot prot-' + p.state;
      const mark = document.createElement('span');
      mark.className = 'prot-mark';
      mark.setAttribute('aria-hidden', 'true');
      mark.textContent = p.state === 'on' ? MARK_ON : p.state === 'off' ? MARK_OFF : MARK_NA;
      const text = document.createElement('span');
      text.textContent = protectionText(p);
      li.appendChild(mark);
      li.appendChild(text);
      list.appendChild(li);
    }
  }

  function renderAttributes() {
    const grid = $('#adv-grid');
    grid.textContent = '';
    if (!state.data) return;
    const mobile = C.isMobileHint(state.data);
    for (const row of C.attributeRows(state.data, mobile)) {
      const item = document.createElement('div');
      item.className = 'item';
      const k = document.createElement('div');
      k.className = 'k';
      k.textContent = t('attr.' + row.key);
      const v = document.createElement('pre');
      v.className = 'v';
      v.textContent = row.key === 'network' && !row.value ? t('attr.networkNotFetched') : C.formatValue(row.value);
      const meta = document.createElement('div');
      meta.className = 'meta';
      const parts = [t('adv.stability') + ': ' + t('stab.' + row.stability), t(row.inId ? 'adv.inId' : 'adv.notInId')];
      if (row.bits !== null) {
        parts.push(t('adv.bits') + ': ' + C.formatBits(row.bits) + ' ' + t('adv.bitsUnit') + ' ' + t('adv.bitsCol', { col: t(mobile ? 'adv.colMobile' : 'adv.colPc') }));
      }
      meta.textContent = parts.join(' / ');
      item.appendChild(k);
      item.appendChild(v);
      item.appendChild(meta);
      grid.appendChild(item);
    }
  }

  function renderAdvanced(previousVisit) {
    renderId();
    renderStability();
    renderLastVisit(previousVisit);
    renderProtections();
    renderAttributes();
  }

  async function build(first) {
    if (state.building) return null;
    state.building = true;
    const btn = $('#refresh-adv');
    btn.disabled = true;
    try {
      const data = await COL.collect({ network: state.network });
      state.data = data;
      if (first || !state.firstData) state.firstData = data;
      state.ids.push(C.fingerprintId(data).id);
      const previous = first ? readLastVisit() : state.previousVisit;
      if (first) state.previousVisit = previous;
      renderAdvanced(previous);
      if (first) saveLastVisit();
      else showToast(t('toast.recalcDone'), 'success', btn);
      return data;
    } finally {
      state.building = false;
      btn.disabled = false;
    }
  }

  async function copyAdvancedJSON() {
    const btn = $('#copy-json');
    if (!state.data) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(state.data, null, 2));
      showToast(t('toast.copied'), 'success', btn);
    } catch (e) {
      showToast(t('toast.copyFailed'), 'error', btn);
    }
  }

  /* ---------- 座学: 研究の表（計算部の STUDY_TABLE から組み立てる） ---------- */
  function renderStudyTable() {
    const wrap = $('#study-table');
    if (!wrap) return;
    wrap.textContent = '';
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    for (let i = 0; i < 6; i++) {
      const th = document.createElement('th');
      th.scope = 'col';
      th.textContent = t('learn.s3.col' + i);
      headRow.appendChild(th);
    }
    thead.appendChild(headRow);
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    const cols = ['p2010', 'a2016', 'all2018', 'mobile2018', 'pc2018'];
    const fmt = (v) => (v === null ? DASH : v[0].toFixed(3) + SLASH + v[1].toFixed(3));
    const addRow = (cells) => {
      const tr = document.createElement('tr');
      cells.forEach((c, i) => {
        const el = document.createElement(i === 0 ? 'th' : 'td');
        if (i === 0) el.scope = 'row';
        el.textContent = c;
        tr.appendChild(el);
      });
      tbody.appendChild(tr);
    };
    for (const r of C.STUDY_TABLE) addRow([r.attr, ...cols.map((c) => fmt(r[c]))]);
    const m = C.STUDY_META;
    addRow([t('learn.s3.hm'), ...cols.map((c) => m.hm[c].toFixed(3))]);
    addRow([t('learn.s3.count'), ...cols.map((c) => m.count[c].toLocaleString('en-US'))]);
    addRow([t('learn.s3.unique'), ...cols.map((c) => m.unique[c] + '%')]);
    table.appendChild(tbody);
    wrap.appendChild(table);
  }

  /* ---------- 言語 ---------- */
  function rerenderText() {
    applyTheme(document.documentElement.getAttribute('data-theme') || 'dark');
    renderStudyTable();
    if (state.netStatus) setNetStatus(state.netStatus.key, state.netStatus.params);
    if (state.data) {
      fillSimple(state.data);
      renderAdvanced(state.previousVisit);
    }
  }

  function toggleLanguage() {
    const next = M.getLanguage() === 'ja' ? 'en' : 'ja';
    I18N.use(next, document);
    I18N.save(next);
    rerenderText();
  }

  /* ---------- 初期化 ---------- */
  function init() {
    I18N.use(I18N.initialLanguage(location.search, I18N.readSaved(), navigator.languages), document);
    initTheme();
    initTabs();
    renderStudyTable();
    $('#lang-toggle').addEventListener('click', toggleLanguage);
    $('#theme-toggle').addEventListener('click', toggleTheme);
    $('#fetch-ip').addEventListener('click', onFetchIp);
    $('#refresh-adv').addEventListener('click', () => { build(false); });
    $('#copy-json').addEventListener('click', copyAdvancedJSON);
    $('#clear-last').addEventListener('click', clearLastVisit);
    build(true).then((data) => { if (data) fillSimple(data); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  globalThis.FPApp = { state, build, selectTab, fillSimple, renderAttributes };
})();
