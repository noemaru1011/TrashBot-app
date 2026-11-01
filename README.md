# LINE Trash AI

LINEからAIに質問することで、ゴミ出しの日程や分別方法を確認できる個人向けゴミ出し管理システムです。

LINE Messaging APIとGemini APIを利用し、自然言語での質問に応じてゴミ出し情報を取得・回答します。

参考記事(Qiita)
[Qiita](https://qiita.com/ei_1263_/items/590453d836ba9d9c6f66)

## 概要

「明日は何ごみ？」「アイロンは何ごみ？」といった質問をLINEから送信するだけで、AIが登録されているゴミ出し情報を確認して回答します。

曜日や分別ルールを自分で調べたり、カレンダーを確認したりする手間を減らすことを目的としています。

### 主な機能

- **ゴミ出しスケジュールの確認**
  - 今日・明日のゴミ出し予定
  - 指定した曜日のゴミ出し予定
  - 次回のゴミ出し予定
- **ゴミの分別方法の確認**
  - 品目から分別区分を検索
  - 登録されている分別ルールの確認
- **自然言語による問い合わせ**
  - 曜日や品目を指定した質問
  - 曖昧な表現を含む質問への対応

### 利用イメージ

LINEから以下のように質問できます。

| 質問 | 回答イメージ |
| --- | --- |
| 明日は何ごみ？ | 明日は燃えるごみの日です。 |
| 月曜日は何ごみ？ | 月曜日は燃えるごみです。 |
| アイロンは何ごみ？ | 登録されている分別ルールに基づいて回答します。 |
| 次の資源ごみはいつ？ | 次回の資源ごみの日を回答します。 |

※回答は登録されているゴミ出しスケジュール・分別ルールに基づきます。

## システム構成

```text
┌─────────────┐
│   ユーザー   │
└──────┬──────┘
       │
       │ LINEメッセージ
       ▼
┌──────────────────┐
│ LINE Messaging API│
└──────┬───────────┘
       │ Webhook
       ▼
┌──────────────────────┐
│ Cloudflare Workers   │
│                      │
│ ・Webhook受信         │
│ ・署名検証            │
│ ・メッセージ処理       │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Gemini API           │
│                      │
│ ・質問内容の解析       │
│ ・Toolの選択          │
│ ・回答の生成           │
└──────────┬───────────┘
           │ Function Calling
           ▼
┌──────────────────────┐
│ Trash Tools          │
│                      │
│ ・trash_get_schedule │
│ ・trash_get_rules    │
└──────────┬───────────┘
           │
           │ データ取得
           ▼
┌──────────────────────┐
│ GitHub Private Repo  │
│                      │
│ ・ゴミ出しスケジュール │
│ ・分別ルール           │
└──────────────────────┘
           │
           │ Tool Result
           ▼
       Gemini API
           │
           │ 回答生成
           ▼
   Cloudflare Workers
           │
           │ Reply API
           ▼
          LINE
```

## 技術スタック

| 項目 | 技術 |
| --- | --- |
| UI | LINE |
| Messaging API | LINE Messaging API |
| AI | Gemini API |
| 言語 | TypeScript |
| Webフレームワーク | Hono |
| バリデーション | Zod |
| 実行環境 | Cloudflare Workers |
| データ取得 | GitHub API |
| データ形式 | YAML |
| テスト | Vitest |

## 処理の流れ

1. ユーザーがLINEからメッセージを送信
2. LINE Messaging APIからCloudflare WorkersのWebhookにリクエストが届く
3. 署名検証などのリクエストチェックを実施
4. Gemini APIにユーザーのメッセージを渡す
5. Geminiが質問内容に応じて適切なToolを選択
6. ToolがGitHub上のゴミ出し情報を取得
7. 取得した情報をGeminiに返却
8. Geminiが自然言語で回答を生成
9. LINE Reply APIを利用してユーザーに回答

## Function Calling / Tools

Gemini APIのFunction Callingを利用し、ユーザーの質問に応じて適切なToolを実行する構成にしています。

AIに直接GitHub APIを操作させるのではなく、アプリケーション側で定義したToolを通じてデータを取得します。

### Tools

| Tool名 | 説明 |
| --- | --- |
| `trash_get_schedule` | ゴミ出しスケジュールを取得 |
| `trash_get_rules` | ゴミの分別ルールを取得 |

### 役割分担

- **Gemini API**
  - ユーザーの質問内容を解析
  - 実行するToolを選択
  - Toolの実行結果をもとに回答を生成
- **Trash Tools**
  - 入力パラメータの検証
  - 必要なゴミ出し情報の取得
  - Geminiへの実行結果の返却
- **Cloudflare Workers**
  - LINE Webhookの受付
  - Gemini APIとの連携
  - LINEへの返信

## ディレクトリ構造

```text
.
├── src
│   ├── errors
│   │   └── # カスタムエラー
│   │
│   ├── features
│   │   └── trash
│   │       ├── schemas.ts
│   │       ├── tools.ts
│   │       └── tool.test.ts
│   │
│   ├── lib
│   │   ├── __mocks__
│   │   │   └── # Vitest用モック
│   │   │
│   │   ├── gemini
│   │   │   ├── ask.ts
│   │   │   ├── askGemini.test.ts
│   │   │   └── client.ts
│   │   │
│   │   ├── github.ts
│   │   ├── github.test.ts
│   │   └── yaml.ts
│   │
│   ├── middleware
│   │   └── # LINE署名検証
│   │
│   ├── routes
│   │   └── # ルーティング
│   │
│   ├── constants.ts
│   ├── index.ts
│   └── utils.ts
│
├── .gitignore
├── biome.json
├── package.json
├── package-lock.json
├── tsconfig.json
├── vitest.config.ts
├── worker-configuration.d.ts
└── wrangler.toml
```

### ディレクトリの役割

| ディレクトリ | 役割 |
| --- | --- |
| `features/trash` | ゴミ出し機能に関するTool・スキーマ・テスト |
| `lib/gemini` | Gemini APIとの連携 |
| `lib` | GitHub APIやYAMLなどの共通処理 |
| `middleware` | LINE Webhookの署名検証 |
| `routes` | APIルーティング |
| `errors` | カスタムエラー定義 |

## セットアップ

### 前提条件

- Node.js
- npm
- Cloudflareアカウント
- LINE Developersアカウント
- Gemini APIキー
- GitHub Personal Access Token
- ゴミ出し情報を管理するGitHubリポジトリ

### インストール

```bash
npm install
```

### 環境変数・Secretsの設定

以下の情報をCloudflare WorkersのSecretsなどに設定します。

| 変数名 | 説明 |
| --- | --- |
| `LINE_CHANNEL_SECRET` | LINEチャネルシークレット |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINEチャネルアクセストークン |
| `GEMINI_API_KEY` | Gemini APIキー |
| `GITHUB_TOKEN` | GitHubアクセストークン |

※実際の環境変数名は実装に合わせてください。  
※秘密情報をソースコードやGitHubに直接記載しないでください。

### ローカル実行

```bash
npm run dev
```

### テスト

```bash
npm run test
```

### デプロイ

```bash
npx wrangler deploy
```

※利用するnpm scriptsやCloudflare Workersの設定に応じて適宜変更してください。

## セキュリティ

- LINE Webhookの署名検証を実施
- APIキーやアクセストークンはSecretsで管理
- GitHubリポジトリはPrivate Repositoryを利用
- GitHubへのアクセスは必要最小限の権限に制限
