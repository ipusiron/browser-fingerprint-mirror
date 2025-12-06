<!--
---
id: day077
slug: browser-fingerprint-mirror

title: "Browser Fingerprint Mirror"

subtitle_ja: "ブラウザ指紋ミラー"
subtitle_en: "Visualize your browser's fingerprint like a digital mirror"

description_ja: "ブラウザーが公開する環境情報（UA、解像度、言語、タイムゾーン、Canvas/WebGL/Audio指紋など）を可視化し、ユニーク度スコアを算出する教育用ツール"
description_en: "An educational web tool that visualizes browser fingerprinting information (UA, resolution, language, timezone, Canvas/WebGL/Audio fingerprints, etc.) and calculates a uniqueness score"

category_ja:
  - プライバシー
  - Webセキュリティ
  - ブラウザ指紋
category_en:
  - Privacy
  - Web Security
  - Browser Fingerprinting

difficulty: 2

tags:
  - browser
  - fingerprinting
  - privacy
  - security
  - education
  - visualization
  - javascript
  - canvas
  - webgl
  - audio

repo_url: "https://github.com/ipusiron/browser-fingerprint-mirror"
demo_url: "https://ipusiron.github.io/browser-fingerprint-mirror/"

hub: true
---
-->

# Browser Fingerprint Mirror - ブラウザ指紋ミラー

![GitHub Repo stars](https://img.shields.io/github/stars/ipusiron/browser-fingerprint-mirror?style=social)
![GitHub forks](https://img.shields.io/github/forks/ipusiron/browser-fingerprint-mirror?style=social)
![GitHub last commit](https://img.shields.io/github/last-commit/ipusiron/browser-fingerprint-mirror)
![GitHub license](https://img.shields.io/github/license/ipusiron/browser-fingerprint-mirror)
[![GitHub Pages](https://img.shields.io/badge/demo-GitHub%20Pages-blue?logo=github)](https://ipusiron.github.io/browser-fingerprint-mirror/)

**Day077 - 生成AIで作るセキュリティツール100**

ブラウザーは、ユーザーが特別な操作をしなくても多くの環境変数を公開しています。

**Browser Fingerprint Mirror（ブラウザ指紋ミラー）** は、それらを取得して可視化することで「どのような情報が指紋として利用され得るか」を理解する助けとなります。

- 「こんなに情報が抜かれるの？」という **意外性** を体験できる  
- 匿名モードやVPNを使っても隠せない情報があることを **実感** できる  
- 指紋情報の **限界**（単独では個人特定できないが、組合せで識別精度が上がる）を理解できる 

---

## 🌐 デモページ

👉 **[https://ipusiron.github.io/browser-fingerprint-mirror/](https://ipusiron.github.io/browser-fingerprint-mirror/)**

ブラウザーで直接お試しいただけます。

---

## 📸 スクリーンショット

>![詳細＋分析モードでユニーク度スコアを計算](assets/screenshot.png)
>*詳細＋分析モードでユニーク度スコアを計算*

---

## 🔍 ブラウザーの環境変数

### 主な環境変数と内容
- **User-Agent / UA-CH**
  使用しているブラウザー名・バージョン、OS の種類を識別可能。
- **IPv4/IPv6アドレス**
  パブリックIPアドレス（外部API経由で取得）。
- **ISP/プロバイダー情報**
  インターネットサービスプロバイダーの組織名やASN情報。
- **画面解像度 / devicePixelRatio**
  利用端末のディスプレイ情報を反映。端末の種類や DPI を推測できる。
- **言語設定（navigator.language / navigator.languages）**
  ブラウザの優先言語リスト。居住地域やユーザー属性の推定に利用可能。
- **タイムゾーン（Intl.DateTimeFormat）**
  端末の設定タイムゾーンや UTC との差分。地域推定に直結。
- **Cookie / Do Not Track 設定**
  プライバシー指向の設定状況を把握可能。
- **ハードウェア特性**
  CPU コア数（hardwareConcurrency）、メモリ容量（deviceMemory）、タッチ操作の有無（maxTouchPoints）など。
- **ストレージ可否**
  LocalStorage / SessionStorage / IndexedDB が利用可能かどうか。
- **メディアクエリ結果**
  ダークモードや reduced motion の設定など、ユーザー体験関連の設定。
- **WebGL / Canvas / Audio 指紋**
  グラフィック・描画・音声処理のわずかな差を利用して、端末固有の特性を抽出可能。
- **プラグイン情報**
  インストールされているブラウザープラグインの一覧。

### 意義
- これらの変数は単独では個人を特定できない場合が多いが、**組み合わせることで高い識別精度** を持つ。
- ユーザーが「環境変数が公開されていること」を実感することで、**匿名化やプライバシー保護の限界** を理解できる。
- 本ツールは収集した値を **クライアントサイドで表示するだけ** であり、外部に送信することはない（IP/ISP情報のみ外部API経由で取得）。  

---

## 🎛️ 機能とモード

本ツールには以下の3つのモードが用意されています。

### 1. シンプルモード
基本的な環境情報を5つのグループに分けて見やすく表示します。

- **🖥️ ブラウザー・システム**: ブラウザ、OS、画面解像度
- **🌐 ネットワーク**: IPv4/IPv6アドレス、ISP/プロバイダー情報（外部API経由）
- **🌍 地域・言語**: 言語設定、タイムゾーン
- **⚙️ ハードウェア**: タッチ対応、CPUコア数、メモリ容量
- **🔒 プライバシー設定**: Cookie、Do Not Track

### 2. 詳細・分析モード
詳細な指紋情報を収集し、環境のユニーク度を数値化します。

- すべての環境変数を網羅的に収集（Canvas/WebGL/Audio指紋、プラグイン情報等）
- **ユニーク度スコア（0〜100）** を計算して表示
- JSON形式でデータをコピー可能

### 3. 座学モード
ブラウザー指紋の仕組みと対策をアコーディオン形式で解説します。

- 📚 ブラウザー指紋（Browser Fingerprinting）とは
- 🔍 なぜ指紋情報が問題なのか
- 🛡️ 対策方法
- ⚖️ 指紋情報の限界
- 📖 参考リンク（外部ツール・リソース）

### その他の機能

- **ダーク/ライトモード切替**: テーマボタンで表示モードを切り替え可能（設定はlocalStorageに保存）
- **レスポンシブデザイン**: モバイル・デスクトップ両対応
- **セキュリティ対策**: CSP設定、XSS対策、外部リンクのnoopener/noreferrer指定

---

## 📊 ユニーク度スコア

「詳細＋分析モード」では、収集した環境変数の組み合わせから **ユニーク度スコア（0〜100）** を算出します。

### スコアの意味

- **値が高いほど環境が珍しい（ユニーク）** ことを示します
- **ユニークさが高い = 個人を識別されやすい** という関係があります
  - スコアが高い環境は「他のユーザーと異なる特徴が多い」ため、トラッキング業者が同一ユーザーを追跡しやすくなります
  - 逆にスコアが低い環境は「よくある構成」であり、多数のユーザーに紛れることができます

**重要**: ここでの「識別」は、**「同じブラウザ環境を使っている人物を追跡できる」という意味**であり、**住所や本名などの個人情報が直接漏洩するわけではありません**。ただし、複数サイトでの閲覧履歴を紐付けられたり、「前回訪問したユーザー」として認識されたりする可能性が高まります。過剰に恐れる必要はありませんが、トラッキングの仕組みを理解することは重要です。

### 計算アルゴリズム

本ツールでは、以下の要素を組み合わせてスコアを計算しています（簡易的なヒューリスティック手法）。

| 要素 | 配点 | 加点条件 |
|------|------|----------|
| **言語設定** | 10点 | 設定言語の数が多いほど加点 |
| **画面解像度・DPR** | 15点 | 一般的な解像度から離れるほど加点 |
| **タイムゾーン** | 8点 | 文字列の複雑さで加点 |
| **ハードウェア** | 15点 | CPUコア数・メモリ容量・タッチ対応の組み合わせ |
| **WebGL情報** | 18点 | ベンダー・レンダラー情報の複雑さで加点 |
| **Canvas/Audio指紋** | 24点 | 取得できた場合に各12点 |
| **DNT/Cookie設定** | 10点 | プライバシー保護設定を有効にしている場合に加点 |
| **プラグイン** | 10点 | インストール数に応じて加点 |
| **ISP/ネットワーク** | 8点 | ISP情報の複雑さで加点 |

**合計118点満点を100点満点に正規化**して表示します。

#### IPアドレス自体をスコアに含めない理由

本ツールでは、**IPアドレス自体はユニーク度スコアの計算に含めていません**。その理由は以下の通りです：

- **頻繁に変動する**: モバイル通信、VPN接続、ルーター再起動などでIPアドレスは容易に変わるため、永続的な識別には適さない
- **プライバシー配慮**: IPアドレスは準個人情報として扱われる場合があり、ブラウザ指紋（Browser Fingerprinting）の本質である「ブラウザ環境の特徴」とは性質が異なる
- **教育的意図**: 本ツールの目的は「ブラウザが公開する環境情報」の可視化であり、ネットワーク層の情報は別の問題領域

ただし、**ISP（インターネットサービスプロバイダー）の種類**は比較的安定しており、「大手キャリア」「地方ISP」「企業専用回線」などの違いが識別精度に影響するため、スコアに含めています。

### 注意点

- このスコアはローカル環境での簡易推定であり、厳密な統計データに基づくものではありません
- 実際のトラッキング精度は、複数サイト間でのデータ連携や機械学習モデルの利用によってさらに高まる可能性があります
- スコアが低くても、他の識別手段（ログイン情報・Cookie・行動履歴など）と組み合わせれば個人特定は可能です

---

## ⚠️ 注意・免責

- 本ツールは **クライアントサイドのみ** で動作し、収集データを外部送信しません。
- IPv4/IPv6/ISP情報の取得には外部API（ipify.org、ipapi.co）を使用しています。
  - **ipapi.co**は無料プランで月1,000リクエストまでの制限があり、超過するとレート制限エラー（429）が発生します。
  - レート制限対策として、取得した情報は **localStorage に5分間キャッシュ** されます。頻繁なリロードでもAPI呼び出しを抑制します。
- 本ツールは教育・デモ目的であり、トラッキングや商用利用を推奨するものではありません。  

---

## 📁 ディレクトリー構成

```
browser-fingerprint-mirror/
├── .gitignore              # Git除外設定
├── .nojekyll               # GitHub Pages用ファイル
├── AGENTS.md               # 開発ガイド（Codex CLI用）
├── CLAUDE.md               # 開発ガイド（Claude Code用）
├── LICENSE                 # MITライセンス
├── README.md               # プロジェクト説明（本ファイル）
├── index.html              # メインHTML
├── script.js               # JavaScriptロジック（指紋収集・UI制御）
├── style.css               # スタイルシート（ダーク/ライトモード対応）
└── assets/                 # スクリーンショット等の画像ファイル
    └── screenshot.png      # デモ画像
```

---

## 📄 ライセンス

MIT License – 詳細は [LICENSE](LICENSE) を参照してください。

---

## 🛠 このツールについて

本ツールは、「生成AIで作るセキュリティツール100」プロジェクトの一環として開発されました。
このプロジェクトでは、AIの支援を活用しながら、セキュリティに関連するさまざまなツールを100日間にわたり制作・公開していく取り組みを行っています。

プロジェクトの詳細や他のツールについては、以下のページをご覧ください。

🔗 [https://akademeia.info/?page_id=42163](https://akademeia.info/?page_id=42163)
