# ぷかるんゲームプラットフォーム：プラットフォーム設計書

## ステータス

**ドラフト** — 2026年5月7日

---

## 1. ビジョン

紗倉るる + ぷかるんを世界観の主軸にした **Web ゲームプラットフォーム**。
ユーザー（オーナー）が完成したゲームを順次追加していく、シンプルなゲームセンター的体験。

### 1-1. 主体・運営

| 項目 | 内容 |
|------|------|
| オーナー | 1名（プロジェクト発起人） |
| 開発者 | オーナーのみ（第三者投稿は受け付けない） |
| 公開範囲 | ファン限定（URL共有のみ、認証なし） |
| 非営利 | 推し活、収益化はしない |

### 1-2. 世界観

- 紗倉るる・ぷかるんが**プラットフォームのホスト**
- タイトル画面・ゲーム選択画面で立ち絵やアニメーションが登場
- 各ゲームのキャラクターは原則として 紗倉るる・ぷかるん（必要に応じて派生キャラ可）

---

## 2. プラットフォーム構成

### 2-1. 画面遷移

```
[Boot] → [Title]
            ↓
       [GameSelect] ←──┐
            ↓          │
       [個別ゲーム本体] ──┘
            ↓
       [Result]
            ↓
       [Ranking]（個別ゲーム単位）
```

| 画面 | 役割 |
|------|------|
| Boot | アセットロード |
| Title | プラットフォームの顔。立ち絵、ロゴ、「あそぶ」「設定」 |
| GameSelect | リリース済みゲームを一覧表示。各ゲームをカード化 |
| 個別ゲーム本体 | 各ゲームが独自にシーン管理 |
| Result | ゲーム終了後のスコア表示。ランキング登録ボタン |
| Ranking | **ゲームごとに独立**したランキング |
| Settings | プレイヤー名編集、音量 |

### 2-2. 共通モジュール（プラットフォーム層）

| モジュール | 責務 |
|------------|------|
| `SupabaseClient` | Supabase 接続の一元管理 |
| `ScoreService` | スコア送信・取得（`game_id` を引数で受ける） |
| `PlayerNameStore` | プレイヤー名の localStorage 管理、NGワードフィルタ |
| `SoundManager` | BGM・SE の一括制御、音量設定 |
| `GameRegistry` | リリース済みゲーム一覧の定義（カード表示用メタデータ） |
| `UI` | 共通ボタン・モーダル・トースト等 |

### 2-3. ゲームの組み込みインターフェース（叩き台）

```typescript
interface MiniGameDefinition {
  id: string;                       // 'endless_run' 等、Supabase の game_id と一致
  title: string;                    // 「ぷかるんラン」
  description: string;              // 1〜2行の紹介文
  thumbnail: string;                // GameSelect で表示
  status: 'released' | 'coming_soon';
  scenes: Phaser.Scene[];           // ゲーム本体のシーン群
  startSceneKey: string;            // エントリポイント
}
```

GameSelect は `GameRegistry` を参照して、`released` のものだけプレイ可能にする。

---

## 3. ディレクトリ構造（実装方針）

```
src/
  platform/
    scenes/
      Boot.ts
      Title.ts
      GameSelect.ts
      Settings.ts
    services/
      SupabaseClient.ts
      ScoreService.ts
      PlayerNameStore.ts
      SoundManager.ts
    ui/
      Button.ts
      Modal.ts
    registry.ts                # ゲーム一覧
    ngwords.ts                 # NGワード簡易リスト
  games/
    pukarun-run/
      index.ts                 # MiniGameDefinition をエクスポート
      scenes/
        Game.ts
        Result.ts              # ※ Result は共通化候補、当面はゲーム個別
      config.ts
      assets/
  main.ts
```

ゲーム追加時は `src/games/00x-xxx/` を作り、`registry.ts` に `import` を1行追加するだけで一覧に出る、という体験を狙う。

---

## 4. データモデル（Supabase）

### 4-1. テーブル定義

```sql
CREATE TABLE scores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id     TEXT NOT NULL,                       -- 'endless_run' 等
  player_name TEXT NOT NULL,
  score       INTEGER NOT NULL,
  metadata    JSONB,                               -- ゲーム固有の付帯情報
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_scores_game_score ON scores (game_id, score DESC, created_at ASC);
CREATE INDEX idx_scores_created_at ON scores (created_at DESC);
```

- 1テーブルで全ゲームのスコアを管理
- `metadata` にゲーム固有データ（最高コンボ、取得アイテム数など）を JSONB で持たせ、スキーマ拡張を不要に
- ランキング表示は **常に `game_id` で絞り込んで取得**（横断クエリは出さない）

### 4-2. ランキング表示クエリ

```sql
-- ゲームセンター方式：1プレイ1エントリ、同名複数行 OK
SELECT player_name, score, metadata, created_at
FROM scores
WHERE game_id = $1
ORDER BY score DESC, created_at ASC
LIMIT 100;
```

### 4-3. RLS

| 操作 | 許可 |
|------|------|
| INSERT | 誰でも可 |
| SELECT | 誰でも可 |
| UPDATE / DELETE | 不可 |

不正スコア対策は MVP では行わない。問題が発生したら Edge Function でスコア検証を後付けする。

---

## 5. プレイヤー識別

| 項目 | 内容 |
|------|------|
| 認証 | なし |
| 識別子 | プレイヤー名のみ（自由入力、最大16文字） |
| 永続化 | localStorage（`platform.player_name`） |
| NGワード | 簡易リストでクライアント側マッチング、登録時に弾く |
| 同名重複 | 許容（「Player1」が複数存在しうる）|

ゲーム間でプレイヤー名は共有される（プラットフォーム共通）。

---

## 6. ゲーム追加プロセス（オーナーのワークフロー）

新しいゲームを追加するときの想定手順：

1. `src/games/00x-xxx/` ディレクトリ作成
2. ゲーム本体（Phaser シーン）を実装、`MiniGameDefinition` を `index.ts` でエクスポート
3. `src/platform/registry.ts` に登録（`import` 1行）
4. Supabase の `game_id` を新規発行（テーブルは共通なので作業不要）
5. `coming_soon` で先出し → 完成したら `released` に切り替え
6. デプロイ（Cloudflare Pages へ push）

「**ゲーム追加 = 1ディレクトリ + 1行登録**」を維持できる粒度でプラットフォームを保つ。

---

## 7. ゲーム候補（プラットフォームに将来追加）

| # | 仮タイトル | ジャンル | 主な遊び |
|---|------------|----------|----------|
| 001 | ぷかるんラン | エンドレスラン | **Game #1（MVP）**。`games/001-pukarun-run.md` 参照 |
| 002 | （未定） | リズム系 | るるの好きな曲モチーフ、譜面ランダム生成 |
| 003 | （未定） | 育成・収集 | アイテム集め、コスメ要素 |
| 004 | （未定） | パズル | 落ち物 or マッチ3 |

優先度・実装可否は Game #1 リリース後にあらためて検討。

---

## 8. ロードマップ

| フェーズ | 期間 | 内容 |
|----------|------|------|
| Phase 1 | 〜2026年6月初旬 | プラットフォームの最低限のガワ + Game #1（ぷかるんラン）公開 |
| Phase 2 | 6月〜 | ヒアリング反映、バランス調整、本素材差し替え |
| Phase 3 | 以降 | Game #2 着手、プラットフォーム共通機能の拡充 |

Phase 1 のスプリント詳細は `games/001-pukarun-run.md` 参照。

---

## 9. MVP（Phase 1）に含めないもの

- 横断ランキング・実績システム
- ユーザープロフィール・認証
- ゲーム間の連携（共通通貨、引き継ぎ要素など）
- お知らせ／更新履歴ページ
- アクセシビリティ拡張（多言語、色覚対応など）
- 結果画像のシェア機能（X 連携）

これらは将来追加候補。

---

## 10. 未決事項

- プラットフォーム名・ロゴ（仮：「ぷかるん〇〇」？）
- タイトル画面のホスト演出パターン（紗倉るるとぷかるんの掛け合いは入れる？）
- 仮素材の調達方針（フリー素材／AI生成／自作）
- ファン公開チャンネル（Discord、X、配信告知）
- ヒアリング対象ファンの選定とサイクル
- BGM の世界観統一方針（プラットフォーム共通テーマ曲を持つか、ゲームごと自由か）
