# PDF Lover

[English](README.md) | [ภาษาไทย](README.th.md) | **日本語**

---

PDF Lover（ピーディーエフ・ラバー）は、お使いの端末内で完結する**ローカルファースト型**のPDFツールボックスです。Python (FastAPI) の高速なバックエンドと、無印良品（Muji）にインスパイアされたミニマルで落ち着いたReactブラウザUIを備えています。

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
- **テキスト追加 (Add Text):** PDFの上に文字を直接配置（日本語・タイ語・Unicodeフォント完全対応）
- **メモ＆注釈 (Notes):** 付箋メモや蛍光ペンマーカーでドキュメントにコメントを追加
- **透かし追加 (Watermark):** 社名・機密表示・ステータスなどのテキストや画像スタンプを配置
- **ページ番号 (Page Numbers):** ヘッダーやフッターに連番ノンブルを自動付与
- **電子署名 (Digital Signature):** 手書きサインや印影画像を配置して書類に署名

### 3. ファイル変換・抽出 (Conversion & Extraction)
- **PDF画像化 (PDF to Images):** 各ページを高画質PNG画像としてZIP形式で一括保存
- **画像をPDF化 (Images to PDF):** 複数のPNG/JPEG/WebP画像を1つのPDFドキュメントに変換
- **テキスト抽出 (Extract Text):** 文書内の文字データをテキストファイル（.txt）として抽出
- **表データ抽出 (Extract Table):** PDF内の表構造を認識し、スプレッドシート用にデータ抽出

### 4. セキュリティ・プライバシー (Security & Privacy)
- **パスワード設定 (Protect):** 文書を閲覧するための暗号化パスワードを設定
- **パスワード解除 (Unlock):** パスワード保護されたPDFを解除して自由に利用
- **墨消し (Redact):** 個人情報や機密部分を恒久的に黒塗りして不可視化

### 5. 最適化 (Optimization)
- **PDF圧縮 (Compress):** ファイルサイズを軽量化（Ghostscript連携による画像リサンプリング対応）

---

## 動作要件 (Requirements)

- **Python:** 3.11 以上
- **Node.js & npm:** v18 以上 (Reactフロントエンドのビルド用)
- **Ghostscript (任意):** スキャンPDFの画像圧縮時に使用 (`sudo apt install ghostscript`)
- **Typhoon OCR APIキー (任意):** リモートOCR機能を利用する場合のみ `.env` に設定

---

## クイックスタート (Quick Start)

### Windows環境の場合

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
  styles.css       Mujiスタイルのミニマルデザインシステム
dist/              FastAPIから配信される本番ビルド
tests/             自動テストスイート
```

## ライセンス (License)

現在ライセンスは策定中です。外部公開や商用配布を行う前にご確認ください。
