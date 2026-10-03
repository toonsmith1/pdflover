# PDF Lover

[English](README.md) | [ภาษาไทย](README.th.md) | **日本語**

---

PDF Lover（ピーディーエフ・ラバー）は、お使いの端末内で完結する**ローカルファースト型**のPDFツールボックスです。Python (FastAPI) の高速なバックエンドと、無駄のない洗練されたミニマルなReactブラウザUIを備えています。

一般的なオンラインPDF変換サイトとは異なり、ファイルが外部サーバーにアップロードされることはありません。すべての処理がお使いのPC上で安全に行われるため、機密書類や個人情報も安心して扱えます。（※OCR機能のみTyphoon OCR APIをリモート呼び出し）

---

## 主な機能一覧

### 1. ページ管理・レイアウト (Organize & Layout)
- **PDF結合 (Merge):** 複数のPDFファイルを直感的なドラッグ＆ドロップで1つに結合
- **PDF分割 (Split):** 必要なページ番号（例: `1-3, 5, 8`）を指定して別ファイルに抽出
- **ページ並び替え (Organize):** サムネイルを見ながらページの移動・削除・回転を整理
- **ページ回転 (Rotate):** 文書全体または指定ページを90°・180°・270°回転
- **トリミング (Crop):** 余白や不要な部分を切り抜いて表示領域を調整

### 2. コンテンツ編集・注釈 (Content & Annotation)
- **テキスト追加スタジオ (Add Text Studio):** PDFの上に文字を直接配置できる直感的なキャンバスエディタ。画面移動（Spaceキー／ハンドツール）、拡大縮小、全画面表示、文字色・サイズ変更、レイヤー管理（複製・削除）に対応。
- **メモ＆注釈 (Notes):** 付箋メモや蛍光ペンマーカーでドキュメントにコメントを追加
- **透かし追加 (Watermark):** 社名・機密表示・ステータスなどのテキストや画像スタンプを配置
- **ページ番号 (Page Numbers):** ヘッダーやフッターに連番ノンブルを自動付与
- **電子署名 (Digital Signature):** 手書きサインや印影画像を配置して書類に署名

### 3. ファイル変換・抽出 (Conversion & Extraction)
- **PDF画像化 (PDF to Images):** 各ページを高画質PNG画像としてZIP形式で一括保存
- **画像をPDF化 (Images to PDF):** 複数のPNG/JPEG/WebP画像を1つのPDFドキュメントに変換
- **テキスト抽出 (Extract Text):** 文書内の文字データをテキストファイル（.txt）として抽出
- **表データ抽出 (Extract Table):** PDF内の表構造を認識し、スプレッドシート用にデータ抽出

### 4. 多言語対応とフォント仕様 (Localization & Typography)
- **3言語のUI完全対応 (i18n):** 日本語 (🇯🇵)、英語 (🇬🇧)、タイ語 (🇹🇭) をヘッダーから瞬時に切り替え可能
- **日本語フォント:** PDF 出力の一貫性のため、SIL OFL 1.1 の `Noto Sans JP` を同梱しています。詳細は [fonts/README.md](fonts/README.md) を参照してください。
- **AI インストールガイド:** Claude、Gemini、ChatGPT、Codex 向けの手順は [docs/AI_INSTALL_GUIDE.md](docs/AI_INSTALL_GUIDE.md) を参照してください。
- **法務および第三者通知:** ライセンス、プライバシー、ネットワーク、再配布に関する概要は [docs/LEGAL_AND_THIRD_PARTY.md](docs/LEGAL_AND_THIRD_PARTY.md) を参照してください。
- **タイ語標準フォント:** タイ国家標準フォント `TH Sarabun New` を内蔵し、PyThaiNLPによる声調記号・母音の結合整形に対応
- **英欧標準フォント:** PDF標準の欧文フォント（`Helvetica`, `Times-Roman`, `Courier`）

### Word to PDF の状態

Word to PDF は現在、DOCX の XML を HTML/CSS に変換し、同じ HTML/CSS をプレビューと PDF 生成に使用しています。基本的な文章、スタイル、表、タイ語フォント、セクション余白には対応していますが、Word と完全に同じ改ページにはまだ対応できていません。画像、浮動オブジェクト、テキストボックスの再現も未完成です。

### 5. セキュリティ・プライバシー (Security & Privacy)
- **パスワード設定 (Protect):** 文書を閲覧するための暗号化パスワードを設定
- **パスワード解除 (Unlock):** パスワード保護されたPDFを解除して自由に利用
- **墨消し (Redact):** 個人情報や機密部分を恒久的に黒塗りして不可視化

### 6. 最適化 (Optimization)
- **PDF圧縮 (Compress):** ファイルサイズを軽量化（Ghostscript連携による画像リサンプリング対応）

---

## 動作要件 (Requirements)

- **Python:** 3.11 以上
- **Node.js & npm:** v18 以上 *(ソースコードからReactフロントエンドをビルドする場合のみ必要。ビルド済み `dist/` を含むリリース版ではPythonのみで動作します)*
- **Ghostscript (任意):** スキャンPDFの画像圧縮時に使用 (`sudo apt install ghostscript`)
- **Typhoon OCR APIキー (任意):** リモートOCR機能を利用する場合のみ `.env` に設定

## ネットワークの透明性とプライバシー (Network Transparency & Privacy)

PDF Loverは**ローカルファースト（完全ローカル動作）**として設計されています:

- **端末内処理 100%**: PDFの結合、分割、編集、テキスト挿入、圧縮、暗号化などの操作はすべて、お使いのPC上のPythonプロセスおよびブラウザ内で実行されます。**お客様の文書ファイルが外部サーバーに送信されることは一切ありません。**
- **外部ネットワーク通信の透明性**:
  - **バージョン確認とパートナー枠 (Version Check & Spotlight)**: 新バージョンの確認用JSON（1KB未満）およびおすすめカードのサムネイル取得のために外部CDNへアクセスします。取得データは24時間キャッシュされ、オフライン時は自動的に「Buy Me a Coffee ☕」表示に切り替わります。
  - **Typhoon OCR (任意)**: `.env` にAPIキーを設定し、OCRツールを明示的に実行した場合にのみ、対象ページ画像がSCB 10X Typhoon OCR APIに安全に送信されます。
- **Localhost CSRF保護**: ローカルAPIはOrigin/Refererの厳格な検証と `TrustedHostMiddleware` を備えており、悪意ある外部Webサイトから `127.0.0.1:8000` への不正なクロスオリジンリクエストを完全に遮断します。

---

## クイックスタート (Quick Start)

### AI によるインストール

リポジトリのルートから、Claude、Gemini、ChatGPT、または Codex に次の指示を渡してください。

> [docs/AI_INSTALL_GUIDE.md](docs/AI_INSTALL_GUIDE.md) に従って PDF Lover をインストールしてください。既存の変更を保持し、このマシンに必要なものだけをインストールし、`127.0.0.1:8000` で起動して `/api/health` を確認し、利用できないオプション依存関係を報告してください。

初回インストールは Linux/macOS では `./install.sh`、Windows では `install.bat` を実行し、その後 `./run.sh` または `run.bat` で起動します。

### Windows環境の場合

#### 初回インストールと起動

ソースを clone した場合は、先に Python 3.11 以降をインストールしてから実行します。

```powershell
.\install.bat
.\run.bat
```

#### 更新

ヘッダーに新しいバージョンの表示が出たらクリックして GitHub Release のダウンロードページを開きます。source clone では `./update.sh`（Windows は `update.bat`）を実行してください。最新コードを取得して `dist/` を再構築し、`.env` と仮想環境を保持します。Release パッケージの場合は新しいパッケージで既存フォルダーを置き換え、`.env` と個人データを保持してから再起動します。

`install.bat` は `.venv` の作成、Python パッケージのインストール、`.env` の作成、`dist/` がない場合の React ビルドを行います。`dist/` 付きの Release 版では Node.js/npm は不要です。

1. リポジトリをクローン:
   ```bash
   git clone https://github.com/toonsmith1/pdflover.git
   cd pdflover
   ```

2. スクリプトを実行（ダブルクリックまたはPowerShell）:
   ```powershell
   .\run.bat
   # または
   .\run.ps1
   ```
   *(初回実行時に `.venv` の作成、Python/npmパッケージのインストール、フロントエンドのビルドが自動で行われます)*

3. ブラウザで <http://127.0.0.1:8000> を開きます。

---

### Linux / macOS環境の場合

#### 初回インストールと起動

ソースを clone した場合は、先に Python 3.11 以降をインストールしてから実行します。

```bash
chmod +x install.sh run.sh
./install.sh
./run.sh
```

`install.sh` は `.venv` の作成、Python パッケージのインストール、`.env` の作成、`dist/` がない場合の React ビルドを行います。`dist/` 付きの Release 版では Node.js/npm は不要です。

1. 初回セットアップ:
   ```bash
   git clone https://github.com/toonsmith1/pdflover.git
   cd pdflover
   chmod +x setup.sh run.sh
   ./setup.sh
   ```

2. サーバー起動:
   ```bash
   ./run.sh
   ```

3. ブラウザで <http://127.0.0.1:8000> を開きます。

---

### 手動セットアップ (Manual Setup)

```bash
# 1. Python仮想環境の作成と有効化
python -m venv .venv

# Linux/macOS:
source .venv/bin/activate
# Windows:
.venv\Scripts\activate

pip install -r requirements.txt
cp .env.example .env

# 2. フロントエンドのビルド (React + Vite)
npm install
npm run build

# 3. サーバー起動
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

フロントエンド開発時は、Vite開発サーバー（APIプロキシ対応）を起動できます:
```bash
npm run dev
```

---

## プロジェクト構成

```text
app/
  main.py          FastAPIルーティング & React SPA配信
  config.py        環境変数・設定管理
  pdf_service.py   PDF変換・処理エンジン (pypdf, pikepdf, reportlab, pypdfium2)
  ads_service.py   パートナー製品レコメンド・バナー管理
src/
  components/      React UIコンポーネント (各ツール, カタログ, DropZone, プレビュー)
  i18n/            多言語対応モジュール (日本語・英語・タイ語)
  styles.css       シンプルで洗練されたミニマルデザインシステム
dist/              FastAPIから配信される本番ビルド
tests/             自動テストスイート
```

## ライセンス (License)

現在ライセンスは策定中です。外部公開や商用配布を行う前にご確認ください。
