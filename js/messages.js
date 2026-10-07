// 画面に出す文言（通常のスクリプト。globalThis.FPMessages に置く）。{name} は値で埋める。
// 静的な文言は index.html の data-i18n から、動的な文言は script.js の t() から引く。日本語と英語は同じキーを持つ
(function (root) {
  'use strict';

  const ja = {
    // ヘッダー・タブ・フッター
    'ui.docTitle': 'Browser Fingerprint Mirror - ブラウザー指紋ミラー',
    'ui.title': 'Browser Fingerprint Mirror（ブラウザー指紋ミラー）',
    'ui.subtitle': 'あなたのブラウザーに「映っている」指紋情報を可視化する',
    'ui.noscript': 'このツールはJavaScriptで動きます。JavaScriptを有効にしてください。',
    'ui.tabsLabel': '表示モード',
    'ui.tabSimple': 'シンプル',
    'ui.tabAdvanced': '詳細・分析',
    'ui.tabLearn': '座学',
    'ui.footerPre': '🔗 GitHubリポジトリーはこちら（',
    'ui.footerPost': '）',
    'theme.toLight': 'ライトモードに切替',
    'theme.toDark': 'ダークモードに切替',
    // シンプル
    'simple.groupSystem': '🖥️ ブラウザー・システム',
    'simple.browser': 'ブラウザー',
    'simple.browserHint': 'UA-CHがあればそれを、無ければUser-Agentから推定',
    'simple.os': 'OS',
    'simple.res': '画面解像度',
    'simple.resHint': 'devicePixelRatioを併記',
    'simple.groupNetwork': '🌐 ネットワーク',
    'simple.ipv4': 'IPv4アドレス',
    'simple.ipv6': 'IPv6アドレス',
    'simple.isp': 'ISP / プロバイダー',
    'simple.ispHint': '組織名とASN',
    'simple.groupLocale': '🌍 地域・言語',
    'simple.lang': '言語',
    'simple.tz': 'タイムゾーン',
    'simple.groupHardware': '⚙️ ハードウェア',
    'simple.hw': 'タッチ/コア数/メモリ',
    'simple.hwValue': 'Touch:{touch} / コア:{cores} / メモリ:{mem}',
    'simple.yes': 'あり',
    'simple.no': 'なし',
    'simple.groupPrivacy': '🔒 プライバシー設定',
    'simple.cookieDnt': 'Cookie / DNT / GPC',
    'simple.cookieOn': 'Cookie: 有効',
    'simple.cookieOff': 'Cookie: 無効',
    'simple.dntOn': 'DNT: 有効',
    'simple.dntOff': 'DNT: 無効',
    'simple.gpcOn': 'GPC: 有効',
    'simple.gpcOff': 'GPC: 無効',
    'simple.gpcNa': 'GPC: 未対応',
    'simple.sourceUaCh': 'UA-CH',
    'simple.sourceUa': 'User-Agent',
    'simple.sourcePlatform': 'navigator.platform',
    'simple.sourceNone': '推定できず',
    // IP の取得（押したときだけ）
    'net.button': 'IPを取得する（外部APIへ接続）',
    'net.note': '押すと ipify.org（IPv4/IPv6）と ipapi.co（ISP）へ接続します。押すまで外部へは何も送りません。ipapi.co の無料枠では問い合わせたIPがログに残ります。結果は5分間ブラウザーに保存します。',
    'net.notFetched': '未取得',
    'net.loading': '取得中…',
    'net.failed': '取得失敗',
    'net.unsupported': '未対応または取得失敗',
    'net.rateLimited': 'レート制限（しばらく待ってから再試行）',
    'net.statusOk': '取得しました（{at}）',
    'net.statusCache': '5分以内の結果を表示しています（{at}）',
    'net.statusFailed': 'ISPの取得に失敗しました（ネットワークまたはAPIの制限）',
    'net.statusRateLimited': 'ipapi.co のレート制限にかかりました。しばらく待ってから再試行してください',
    'net.statusNoisp': 'ISPの情報が応答に含まれていませんでした',
    // 詳細・分析
    'adv.recalc': 'もう一度読む',
    'adv.copy': 'JSONコピー',
    'adv.idLabel': '指紋ID',
    'adv.idDesc': '安定な属性（IPと時刻を除く）を正規化してSHA-256にした先頭16桁。同じ環境なら再読み込みでもシークレットモードでも同じ値になります。',
    'adv.stabilityLabel': 'もう一度読んだ結果',
    'adv.stabilityFirst': '1回目です。「もう一度読む」で同じIDになるか確かめられます',
    'adv.stabilitySame': '{n}回読んで、すべて同じIDでした',
    'adv.stabilityDiff': '{n}回のうち値が変わった属性: {keys}',
    'adv.lastLabel': '前回の訪問',
    'adv.lastNone': '記録なし（このIDを保存しました）',
    'adv.lastSame': '{at} と同じID。Cookieなしでも「同じ環境」と判定できる例です',
    'adv.lastDiff': '{at} とは違うID',
    'adv.lastCleared': '記録を消しました',
    'adv.lastUnavailable': 'ブラウザーに保存できない設定です',
    'adv.clearLast': '前回の記録を消す',
    'adv.protLabel': '保護の検出',
    'adv.protHint': '観測できた事実だけを並べています。ここに出ないものは「検出できなかった」であって「保護がない」ではありません。',
    'adv.attrLabel': '属性の一覧',
    'adv.attrHint': '「研究での識別力」は、2018年の大規模調査（約207万件）でその属性が持っていた情報量（bits）です。あなたの値の珍しさではなく、属性の種類ごとの参考値です。',
    'adv.bits': '研究での識別力',
    'adv.bitsUnit': 'bits',
    'adv.bitsCol': '（{col}の列）',
    'adv.colPc': 'PC',
    'adv.colMobile': 'モバイル',
    'adv.inId': '指紋IDに含む',
    'adv.notInId': '指紋IDに含めない',
    'adv.stability': '安定性',
    'adv.source2018': '出典: Gómez-Boix・Laperdrix・Baudry 2018',
    'stab.hardware': '端末・OSで決まる（変えにくい）',
    'stab.setting': '設定で決まる（変えられる）',
    'stab.version': '更新で変わる',
    'stab.fixedList': '仕様で固定（識別力なし）',
    'stab.volatile': '接続ごとに変わる',
    'attr.ua': 'User-Agent',
    'attr.uaCh': 'UA-CH（低エントロピー）',
    'attr.uaHigh': 'UA-CH（高エントロピー）',
    'attr.platform': 'navigator.platform',
    'attr.screen': '画面',
    'attr.language': '言語',
    'attr.intl': 'ロケール（Intl）',
    'attr.time': 'タイムゾーン',
    'attr.storage': 'ストレージの可否',
    'attr.cookie': 'Cookie',
    'attr.dnt': 'Do Not Track',
    'attr.gpc': 'Global Privacy Control',
    'attr.hardware': 'ハードウェア',
    'attr.media': 'メディアクエリ',
    'attr.webglVendor': 'WebGL vendor',
    'attr.webglRenderer': 'WebGL renderer',
    'attr.canvas': 'Canvasのハッシュ',
    'attr.audio': 'Audioのハッシュ',
    'attr.plugins': 'プラグイン',
    'attr.network': 'ネットワーク（IP/ISP）',
    'attr.networkNotFetched': '未取得（シンプルタブで取得できます）',
    'prot.canvasRandomized.on': 'Canvas: 2回描いてハッシュが違いました＝ランダム化が効いています（BraveやFirefoxのresistFingerprintingなど）',
    'prot.canvasRandomized.off': 'Canvas: 2回描いて同じハッシュ＝ランダム化は検出されませんでした',
    'prot.canvasBlocked.on': 'Canvas: 値を取れませんでした（遮断または未対応）',
    'prot.pluginsFixed.on.standard5': 'プラグイン: 仕様で固定された5件の一覧です。識別には使えません',
    'prot.pluginsFixed.on.empty': 'プラグイン: 空です（PDFを表示しない設定、または固定の仕様）',
    'prot.pluginsFixed.off': 'プラグイン: 固定一覧以外の項目が{detail}件あります',
    'prot.webglMasked.on': 'WebGL: 実名が伏せられています（{detail}）',
    'prot.webglMasked.off': 'WebGL: GPUの実名が見えています',
    'prot.uaReduced.on': 'User-Agent: 削減形式（バージョンが .0.0.0、OSの版が固定）です',
    'prot.uaReduced.off': 'User-Agent: 削減形式ではありません',
    'prot.deviceMemoryHidden.on': 'メモリ量: 公開されていません（FirefoxとSafariは未実装）',
    'prot.deviceMemoryHidden.off': 'メモリ量: {detail}GB（2のべき乗に丸めた値）',
    'prot.dnt.on': 'Do Not Track: 有効',
    'prot.dnt.off': 'Do Not Track: 無効',
    'prot.gpc.on': 'Global Privacy Control: 有効',
    'prot.gpc.off': 'Global Privacy Control: 無効',
    'prot.gpc.na': 'Global Privacy Control: このブラウザーは未対応',
    'prot.tzUtc.on': 'タイムゾーン: UTC（{detail}）。resistFingerprintingの可能性があります（実際にUTC圏の場合もあります）',
    'prot.tzUtc.off': 'タイムゾーン: {detail}',
    'prot.unavailable': '取得できず',
    'toast.copied': '環境情報のJSONをコピーしました',
    'toast.copyFailed': 'コピーできませんでした（クリップボードの権限がないか、file://で開いています）',
    'toast.recalcDone': '読み直しました',
    'privacy.summary': 'プライバシー / 免責',
    'privacy.line1': '収集した値はこのページの中で表示するだけで、サーバーへ送信しません。',
    'privacy.line2': '例外は「IPを取得する」を押したときだけで、ipify.org と ipapi.co に接続します（接続先にはあなたのIPアドレスが渡ります）。',
    'privacy.line3': 'ブラウザーに保存するのは、テーマと言語の選択、前回の指紋ID、5分間のIP情報だけです。',
    'privacy.line4': 'Canvas/WebGL/Audioの値は教育のために表示しています。「研究での識別力」は研究データの参考値で、あなたの珍しさではありません。',
    'learn.heading': '座学',
  };

  const dicts = { ja };
  let current = 'ja';

  function setLanguage(lang) {
    current = dicts[lang] ? lang : 'ja';
    return current;
  }

  function getLanguage() {
    return current;
  }

  function t(key, params) {
    const dict = dicts[current] || ja;
    let s = Object.prototype.hasOwnProperty.call(dict, key) ? dict[key] : (Object.prototype.hasOwnProperty.call(ja, key) ? ja[key] : key);
    if (params) {
      for (const [k, v] of Object.entries(params)) s = s.split('{' + k + '}').join(String(v));
    }
    return s;
  }

  root.FPMessages = { MESSAGES: dicts, t, setLanguage, getLanguage };
})(typeof globalThis !== 'undefined' ? globalThis : this);
