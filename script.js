/* Browser Fingerprint Mirror
 * ブラウザー指紋情報を可視化する教育用ツール
 *
 * 機能：
 * - シンプルモード：基本的な環境情報（ブラウザー、OS、IP、ISP等）を表示
 * - 詳細・分析モード：詳細な指紋情報とユニーク度スコアを計算
 * - 座学モード：ブラウザー指紋の仕組みと対策を解説
 *
 * セキュリティ：
 * - データは外部送信なし（完全クライアントサイド）
 * - IP/ISP情報のみ外部API（ipify.org、ipapi.co）を利用
 */

// DOMセレクタのショートハンド
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

/* ==========================================================================
   タブ切替
   ========================================================================== */
// シンプル/詳細・分析/座学の3つのタブを切り替える
$$('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    // 全てのタブとパネルから active を削除
    $$('.tab').forEach(b => b.classList.remove('active'));
    $$('.panel').forEach(p => p.classList.remove('active'));
    // クリックされたタブとそれに対応するパネルに active を追加
    btn.classList.add('active');
    const id = btn.dataset.tab;
    document.getElementById(id).classList.add('active');
  });
});

/* ==========================================================================
   シンプルモード - 基本情報表示
   ========================================================================== */
// シンプルモードの基本情報を全て取得して表示
async function fillSimple() {
  // User-Agentとプラットフォーム情報を取得
  const ua = navigator.userAgent;
  const uaData = navigator.userAgentData?.brands?.map(b => `${b.brand} ${b.version}`).join(', ');
  const platform = navigator.userAgentData?.platform || navigator.platform || 'unknown';

  // ブラウザーとOSを推測
  const browserGuess = guessBrowser(ua, uaData);
  const osGuess = guessOS(ua, platform);

  // 基本情報を表示
  $('#simple-browser').textContent = browserGuess;
  $('#simple-os').textContent = osGuess;
  $('#simple-lang').textContent = navigator.languages?.join(', ') || navigator.language || '-';
  $('#simple-tz').textContent = Intl.DateTimeFormat().resolvedOptions().timeZone || '-';

  // 画面解像度とデバイスピクセル比
  const dpr = window.devicePixelRatio || 1;
  const res = `${window.screen.width}×${window.screen.height} @${dpr.toFixed(2)}`;
  $('#simple-res').textContent = res;

  // Cookie と Do Not Track 設定
  const cookieEnabled = navigator.cookieEnabled ? 'Cookie: 有効' : 'Cookie: 無効';
  const dnt = navigator.doNotTrack == '1' || window.doNotTrack == '1' ? 'DNT: 有効' : 'DNT: 無効';
  $('#simple-cookie-dnt').textContent = `${cookieEnabled} / ${dnt}`;

  // ハードウェア情報（タッチ対応、CPUコア数、メモリ容量）
  const touch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  const cores = navigator.hardwareConcurrency ?? '?';
  const mem = navigator.deviceMemory ? `${navigator.deviceMemory}GB` : '?';
  $('#simple-hw').textContent = `Touch:${touch ? 'あり' : 'なし'} / コア:${cores} / メモリ:${mem}`;

  // ネットワーク情報（IPv4/IPv6/ISP）を外部APIから取得
  await fetchIPInfo();
}

// 外部API経由でIPアドレスとISP情報を取得
// ipify.org: IPv4/IPv6アドレス取得
// ipapi.co: ISP/組織情報取得
async function fetchIPInfo() {
  const ipv4El = $('#simple-ipv4');
  const ipv6El = $('#simple-ipv6');
  const ispEl = $('#simple-isp');

  try {
    // ローディング表示
    // キャッシュから取得（5分間有効）
    const cacheKey = 'ipinfo_cache';
    const cacheTimeKey = 'ipinfo_cache_time';
    const cacheExpiry = 5 * 60 * 1000; // 5分
    const now = Date.now();
    const cachedTime = localStorage.getItem(cacheTimeKey);
    const cached = localStorage.getItem(cacheKey);

    if (cached && cachedTime && (now - parseInt(cachedTime)) < cacheExpiry) {
      // キャッシュから復元
      const data = JSON.parse(cached);
      ipv4El.textContent = data.ipv4 || '未対応または取得失敗';
      ipv6El.textContent = data.ipv6 || '未対応または取得失敗';
      ispEl.textContent = data.isp || '取得失敗';
      return;
    }

    ipv4El.textContent = '取得中...';
    ipv6El.textContent = '取得中...';
    ispEl.textContent = '取得中...';

    // IPv4とIPv6を並列取得（Promise.allSettledで失敗を許容）
    const [ipv4Data, ipv6Data] = await Promise.allSettled([
      fetch('https://api4.ipify.org?format=json').then(r => r.json()),
      fetch('https://api6.ipify.org?format=json').then(r => r.json())
    ]);

    // IPv4アドレスの処理
    const ipv4 = (ipv4Data.status === 'fulfilled' && ipv4Data.value.ip)
      ? ipv4Data.value.ip
      : '未対応または取得失敗';
    ipv4El.textContent = ipv4;

    // IPv6アドレスの処理（環境によっては未対応）
    const ipv6 = (ipv6Data.status === 'fulfilled' && ipv6Data.value.ip)
      ? ipv6Data.value.ip
      : '未対応または取得失敗';
    ipv6El.textContent = ipv6;

    // ISP/組織情報の取得（レート制限対策：429エラーを考慮）
    let isp = '取得失敗';
    try {
      const geoResponse = await fetch('https://ipapi.co/json/');
      if (geoResponse.ok) {
        const geoData = await geoResponse.json();
        isp = geoData.org || geoData.asn || '-';
      } else if (geoResponse.status === 429) {
        isp = 'レート制限（しばらく待ってから再試行）';
      }
    } catch (err) {
      // CORS/ネットワークエラー時
      isp = '取得失敗（API制限の可能性）';
    }
    ispEl.textContent = isp;

    // キャッシュに保存
    localStorage.setItem(cacheKey, JSON.stringify({ ipv4, ipv6, isp }));
    localStorage.setItem(cacheTimeKey, now.toString());

  } catch (error) {
    console.error('IP情報取得エラー:', error);
    // エラー時のフォールバック処理
    if (ipv4El.textContent === '取得中...') ipv4El.textContent = '取得失敗';
    if (ipv6El.textContent === '取得中...') ipv6El.textContent = '取得失敗';
    if (ispEl.textContent === '取得中...') ispEl.textContent = '取得失敗（API制限の可能性）';
  }
}

/* ==========================================================================
   詳細・分析モード - 詳細な指紋情報とユニーク度スコア
   ========================================================================== */
$('#refresh-adv')?.addEventListener('click', buildAdvanced);
$('#copy-json')?.addEventListener('click', copyAdvancedJSON);

async function buildAdvanced() {
  const data = await collectAll();
  renderAdvanced(data);
  const score = uniquenessScore(data);
  $('#unique-score').textContent = String(score);
  $('#score-desc').textContent = explainScore(score);
}

async function copyAdvancedJSON() {
  const data = await collectAll();
  const text = JSON.stringify(data, null, 2);
  await navigator.clipboard.writeText(text);
  showToast('環境情報のJSONをコピーしました', 'success', $('#copy-json'));
}

function showToast(message, type = '', anchorElement = null) {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;

  if (anchorElement) {
    toast.classList.add('toast-anchored');
    const rect = anchorElement.getBoundingClientRect();
    const maxToastWidth = 320; // keep within viewport
    const left = Math.max(8, Math.min(rect.left, (window.innerWidth - maxToastWidth - 8)));
    toast.style.cssText = `position: fixed; top: ${rect.bottom + 8}px; left: ${left}px;`;
  }

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

/* ---------- コレクション ---------- */
async function collectAll() {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const dpr = window.devicePixelRatio || 1;
  const lang = {
    language: navigator.language,
    languages: navigator.languages || []
  };
  const storage = {
    localStorage: hasLocalStorage(),
    sessionStorage: hasSessionStorage(),
    indexedDB: !!window.indexedDB
  };
  const cookie = navigator.cookieEnabled;
  const dnt = (navigator.doNotTrack == '1' || window.doNotTrack == '1') ? true : false;
  const hw = {
    deviceMemory: navigator.deviceMemory ?? null,
    hardwareConcurrency: navigator.hardwareConcurrency ?? null,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
    touchCapable: ('ontouchstart' in window) || (navigator.maxTouchPoints > 0)
  };
  const screenInfo = {
    width: screen.width, height: screen.height,
    availWidth: screen.availWidth, availHeight: screen.availHeight,
    colorDepth: screen.colorDepth, pixelDepth: screen.pixelDepth,
    devicePixelRatio: dpr
  };
  const ua = {
    userAgent: navigator.userAgent,
    uaDataBrands: navigator.userAgentData?.brands || null,
    uaDataPlatform: navigator.userAgentData?.platform || null,
    platform: navigator.platform || null,
    vendor: navigator.vendor || null
  };
  const time = {
    timezone: tz,
    offsetMin: new Date().getTimezoneOffset()
  };
  const media = {
    prefersColorScheme: getPrefers('(prefers-color-scheme: dark)') ? 'dark' :
                        (getPrefers('(prefers-color-scheme: light)') ? 'light' : 'no-preference'),
    reducedMotion: getPrefers('(prefers-reduced-motion: reduce)') ? 'reduce' : 'no-preference'
  };
  const webgl = getWebGLInfo();
  const canvas = getCanvasHash();
  const audio = await getAudioHash().catch(() => null);

  const fonts = await detectFontSupport(['monospace','serif','sans-serif']); // ダミー例（実フォント同定は難）
  const plugins = getPlugins();
  const network = await getNetworkInfo();

  return {
    timestamp: new Date().toISOString(),
    ua, screen: screenInfo, language: lang, time, storage, cookieEnabled: cookie, doNotTrack: dnt,
    hardware: hw, media, webgl, canvas, audio, fonts, plugins, network
  };
}

/* ---------- レンダリング ---------- */
function renderAdvanced(data) {
  const grid = $('#adv-grid');
  grid.innerHTML = '';
  const entries = [
    ['Timestamp', data.timestamp],
    ['User-Agent', JSON.stringify(data.ua, null, 2)],
    ['Screen', JSON.stringify(data.screen, null, 2)],
    ['Language', JSON.stringify(data.language, null, 2)],
    ['Time / TZ', JSON.stringify(data.time, null, 2)],
    ['Storage', JSON.stringify(data.storage, null, 2)],
    ['Cookie / DNT', JSON.stringify({cookieEnabled:data.cookieEnabled, doNotTrack:data.doNotTrack}, null, 2)],
    ['Hardware', JSON.stringify(data.hardware, null, 2)],
    ['Media Queries', JSON.stringify(data.media, null, 2)],
    ['WebGL', JSON.stringify(data.webgl, null, 2)],
    ['Canvas Hash', data.canvas?.hash || '-'],
    ['Audio Hash', data.audio?.hash || '-'],
    ['Fonts (rough)', JSON.stringify(data.fonts, null, 2)],
    ['Plugins', JSON.stringify(data.plugins, null, 2)],
    ['Network / ISP', JSON.stringify(data.network, null, 2)],
  ];
  for (const [k, v] of entries) {
    const el = document.createElement('div');
    el.className = 'item';
    const keyEl = document.createElement('div');
    keyEl.className = 'k';
    keyEl.textContent = k;
    const valEl = document.createElement('div');
    valEl.className = 'v';
    valEl.textContent = typeof v === 'string' ? v : String(v);
    el.appendChild(keyEl);
    el.appendChild(valEl);
    grid.appendChild(el);
  }
}

/* ---------- ユニーク度スコア（簡易） ---------- */
/* 非厳密。おおまかなヒューリスティックで 0-100 に正規化 */
function uniquenessScore(data){
  let pts = 0;
  let max = 0;

  // 言語（多言語・珍しい言語は重み）
  max += 10;
  const langs = data.language.languages || [];
  pts += Math.min(10, langs.length * 2);

  // 画面解像度 + DPR
  max += 15;
  const sc = data.screen;
  const resKey = `${sc.width}x${sc.height}@${(sc.devicePixelRatio||1).toFixed(2)}`;
  pts += bucketScore(resKey, 15, 8); // 既定解像度からズレるほど加点（雑スコア）

  // タイムゾーン
  max += 8;
  pts += bucketScore(data.time.timezone || '', 8, 6);

  // ハード（コア数・メモリ・タッチ）
  max += 15;
  let hbits = 0;
  if (data.hardware.hardwareConcurrency) hbits += Math.min(8, Math.log2(data.hardware.hardwareConcurrency+1)*3);
  if (data.hardware.deviceMemory) hbits += Math.min(5, data.hardware.deviceMemory);
  if (data.hardware.touchCapable) hbits += 2;
  pts += Math.min(15, hbits);

  // WebGL Renderer/Vendor
  max += 18;
  const glKey = `${data.webgl?.vendor||''}|${data.webgl?.renderer||''}`;
  pts += bucketScore(glKey, 18, 12);

  // Canvas/Audio ハッシュ
  max += 24;
  if (data.canvas?.hash) pts += 12;
  if (data.audio?.hash) pts += 12;

  // Do Not Track / Cookie
  max += 10;
  if (data.doNotTrack) pts += 5;
  if (!data.cookieEnabled) pts += 5;

  // Plugins
  max += 10;
  pts += Math.min(10, (data.plugins?.length || 0) * 2);

  // ISP / Network
  max += 8;
  const ispKey = data.network?.isp || '';
  pts += bucketScore(ispKey, 8, 4);

  const score = Math.round((pts / max) * 100);
  return Math.max(0, Math.min(100, score));
}

function explainScore(s){
  if (s >= 80) return 'かなり珍しい環境（追跡回避は比較的有利だが一意性は高い）';
  if (s >= 60) return 'やや珍しい環境（組合せ次第で識別されやすい）';
  if (s >= 40) return '平均的〜やや一般的（他要素との組合せで識別の余地）';
  return '比較的一般的（単独では識別困難だが組合せで識別され得る）';
}

/* 雑な“バケット一意性”スコア */
function bucketScore(key, max, mid){
  // 文字列長・多様度で適当に加点
  const uniqChars = new Set(String(key)).size;
  const len = String(key).length;
  const rough = Math.min(max, Math.floor(len/4) + Math.floor(uniqChars/3));
  return Math.max(mid ? Math.min(rough, max) : rough, 0);
}

/* ---------- 各種ユーティリティ ---------- */
function guessBrowser(ua, uaData){
  const s = (uaData || ua || '').toLowerCase();
  if (s.includes('edg')) return 'Edge';
  if (s.includes('chrome')) return 'Chrome';
  if (s.includes('firefox')) return 'Firefox';
  if (s.includes('safari')) return 'Safari';
  return 'Unknown';
}
function guessOS(ua, platform){
  const s = (ua + ' ' + platform).toLowerCase();
  if (s.includes('win')) return 'Windows';
  if (s.includes('mac')) return 'macOS';
  if (s.includes('linux')) return 'Linux';
  if (s.includes('android')) return 'Android';
  if (s.includes('iphone') || s.includes('ipad') || s.includes('ios')) return 'iOS/iPadOS';
  return 'Unknown';
}
function getPrefers(q){ return window.matchMedia && window.matchMedia(q).matches; }
function hasLocalStorage(){
  try{ const k='__t'; localStorage.setItem(k,'1'); localStorage.removeItem(k); return true; }catch{ return false; }
}
function hasSessionStorage(){
  try{ const k='__t'; sessionStorage.setItem(k,'1'); sessionStorage.removeItem(k); return true; }catch{ return false; }
}
function getPlugins(){
  try{
    return navigator.plugins ? Array.from(navigator.plugins).map(p => ({name:p.name, filename:p.filename, description:p.description})) : [];
  }catch{ return []; }
}

/* Canvas hash（簡易） */
function getCanvasHash(){
  try{
    const canvas = document.createElement('canvas');
    canvas.width = 240; canvas.height = 60;
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '16px "Arial"';
    ctx.fillStyle = '#f0f';
    ctx.fillRect(0,0,240,60);
    ctx.fillStyle = '#000';
    ctx.fillText('Browser Fingerprint Mirror', 10, 10);
    const data = canvas.toDataURL();
    return { hash: djb2(data).toString(16), sampleLen: data.length };
  }catch{ return null; }
}

/* WebGL vendor/renderer */
function getWebGLInfo(){
  try{
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return null;
    const dbgExt = gl.getExtension('WEBGL_debug_renderer_info');
    const vendor = dbgExt ? gl.getParameter(dbgExt.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
    const renderer = dbgExt ? gl.getParameter(dbgExt.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    return { vendor, renderer, version: gl.getParameter(gl.VERSION) };
  }catch{ return null; }
}

/* AudioContext 指紋（簡易ハッシュ） */
async function getAudioHash(){
  try{
    const ctx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, 44100, 44100);
    const osc = ctx.createOscillator();
    const comp = ctx.createDynamicsCompressor();
    osc.type = 'triangle';
    osc.frequency.value = 440;
    osc.connect(comp);
    comp.connect(ctx.destination);
    osc.start(0);
    const buf = await ctx.startRendering();
    let sum = 0;
    const ch = buf.getChannelData(0);
    for (let i=0; i<ch.length; i+=100) sum += Math.abs(ch[i]);
    const hash = djb2(String(sum));
    return { hash: hash.toString(16) };
  }catch{
    return null;
  }
}

/* フォント（粗い検出：フォールバックの有無のみ） */
async function detectFontSupport(families){
  // 実際の“インストール済みフォント”検出は信頼困難。ここではダミー的にメトリクス差分で判定。
  const base = 'monospace';
  const tester = document.createElement('span');
  tester.style.position = 'absolute';
  tester.style.left = '-9999px';
  tester.style.fontSize = '32px';
  tester.textContent = 'mmmmmmmmmmlli';
  document.body.appendChild(tester);

  const baseW = measureWithFont(tester, base);
  const result = {};
  for(const fam of families){
    result[fam] = measureWithFont(tester, `${fam},${base}`) !== baseW;
  }
  document.body.removeChild(tester);
  return result;

  function measureWithFont(el, fontFamily){
    el.style.fontFamily = fontFamily;
    return el.getBoundingClientRect().width.toFixed(2);
  }
}

/* 文字列ハッシュ（djb2） */
function djb2(str){
  let h = 5381;
  for (let i=0; i<str.length; i++){
    h = ((h<<5) + h) + str.charCodeAt(i);
    h = h & 0xffffffff;
  }
  return h >>> 0;
}

/* ネットワーク情報取得 */
async function getNetworkInfo(){
  // キャッシュから取得（5分間有効）- fetchIPInfoと共有
  const cacheKey = 'ipinfo_cache';
  const cacheTimeKey = 'ipinfo_cache_time';
  const cacheExpiry = 5 * 60 * 1000; // 5分
  const now = Date.now();
  const cachedTime = localStorage.getItem(cacheTimeKey);
  const cached = localStorage.getItem(cacheKey);

  if (cached && cachedTime && (now - parseInt(cachedTime)) < cacheExpiry) {
    // キャッシュから復元
    const data = JSON.parse(cached);
    return {
      isp: data.isp && data.isp !== '取得失敗' && !data.isp.includes('レート制限') ? data.isp : null,
      org: data.isp || null
    };
  }

  try {
    const response = await fetch('https://ipapi.co/json/');
    if (!response.ok) {
      if (response.status === 429) {
        // レート制限エラー
        return { isp: 'レート制限（しばらく待ってから再試行）', org: null };
      }
      return { isp: null, org: null };
    }
    const data = await response.json();
    return {
      isp: data.org || null,
      org: data.asn || null
    };
  } catch {
    return { isp: null, org: null };
  }
}

/* ---------- テーマ切替 ---------- */
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  updateThemeIcon(next);
}

function updateThemeIcon(theme) {
  const icon = $('.theme-icon');
  if (icon) {
    icon.textContent = theme === 'dark' ? '☀️' : '🌙';
  }
}

$('#theme-toggle')?.addEventListener('click', toggleTheme);

/* 初期化 */
window.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  await fillSimple();
  await buildAdvanced();
});
