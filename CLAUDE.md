# CLAUDE.md

このファイルは Claude Code (claude.ai/code) がこのリポジトリで作業する際のガイダンスを提供します。

## プロジェクト概要

`@ecauth/auth-js` は EcAuth のクライアントサイド認証ライブラリ（npm パッケージ）。
WebAuthn（パスキー）の authenticate/register をブラウザ上で実行するためのヘルパーを提供する。

## 技術スタック

- TypeScript (ES2020)
- Vite (ライブラリモード、ESM + UMD 出力)
- Vitest + jsdom (テスト)

## 開発コマンド

```bash
# 依存関係インストール
npm install

# 型チェック
npm run lint

# テスト実行
npm run test

# ビルド
npm run build
```

## ディレクトリ構成

```
ecauth-auth-js/
├── src/
│   ├── index.ts          # エクスポート集約
│   ├── base64url.ts      # Base64URL encode/decode
│   └── webauthn.ts       # WebAuthn authenticate/register
├── tests/
│   ├── base64url.test.ts
│   └── webauthn.test.ts
├── dist/                 # ビルド成果物（gitignore）
│   ├── ecauth-auth.esm.js
│   ├── ecauth-auth.umd.js
│   └── index.d.ts
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

## 利用方法

### UMD（EC-CUBE プラグイン等の `<script>` タグ）

```html
<script src="ecauth-auth.umd.js"></script>
<script>
  EcAuth.webauthn.authenticate({ optionsUrl, verifyUrl, csrfToken });
</script>
```

### ESM（モダンバンドラー）

```javascript
import { webauthn } from '@ecauth/auth-js';
await webauthn.authenticate({ optionsUrl, verifyUrl });
```

## 関連リポジトリ

- [EcAuth](https://github.com/EcAuth/EcAuth) — IdentityProvider メインアプリケーション
- [ec-cube4-ecauth](https://github.com/EcAuth/ec-cube4-ecauth) — EC-CUBE 4系プラグイン（UMD を利用）
- [ec-cube2-ecauth](https://github.com/EcAuth/ec-cube2-ecauth) — EC-CUBE 2系プラグイン

## コーディング規約

- 行末の空白は削除
- 改行コードは LF
