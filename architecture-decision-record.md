# ミニゲームプロジェクト：技術選定レコード

## ステータス

**決定済み** — 2025年5月7日時点

---

## プロジェクト概要

| 項目 | 内容 |
|------|------|
| ゲーム種別 | 2Dシンプルミニゲーム（図形・スプライト程度の描画） |
| プラットフォーム | Web（ブラウザ） |
| バックエンド要件 | スコア保存、ランキング表示 |
| 予算 | 無料枠を優先、品質面のメリットが大きければ有料も検討 |

---

## 確定した技術構成

| レイヤー | 技術 | 備考 |
|----------|------|------|
| フロントエンド（ゲームエンジン） | **Phaser.js** | 2D Web ゲームの定番。WebGL 描画、物理演算、Tween、パーティクル等を標準搭載 |
| フロントエンド（言語） | **TypeScript** | 型安全で Kotlin/C# 経験者にとって移行しやすい |
| ビルドツール | **Vite** | Phaser 公式テンプレートが Vite ベース |
| ホスティング | **Cloudflare Pages** | 無料・帯域無制限・Brotli 自動圧縮・GitHub 連携自動デプロイ |
| バックエンド（BaaS） | **Supabase** | PostgreSQL ベース。ランキングが SQL で素直に書ける。REST API 直接呼び出し |

---

## 選定の経緯と却下した選択肢

### フロントエンド

**Unity WebGL（却下）**
当初検討していたが、2D シンプルミニゲームに対してオーバースペック。WebGL ビルドの最小成果物が 20〜30MB 程度と大きく、初回ロードが重い。圧縮配信（Brotli/gzip の Content-Encoding ヘッダ制御）に対応しきれない静的ホスティングとの相性も悪い。

**PixiJS（却下）**
描画エンジンとしては高性能だが、ゲームエンジンではないため物理演算・シーン管理・入力管理などを自前で実装する必要がある。ミニゲーム規模でも開発コストが上がる。

**Kaplay / Kaboom.js（却下）**
学習コスト最低だが、元の Kaboom.js は Replit がメンテナンス終了。コミュニティフォークの Kaplay に移行しているが、エコシステムの成熟度やドキュメントの充実度で Phaser に劣る。

**KorGE（Kotlin）（却下）**
Kotlin で書ける利点はあるが、Web ターゲットのエコシステムが小さく、トラブル時の情報が少ないリスクがある。

### ホスティング

**GitHub Pages（却下）**
動作はするが、ビルド自動化に GitHub Actions の手動設定が必要。レスポンスヘッダのカスタマイズ不可。帯域は月 100GB 制限。Cloudflare Pages のほうが機能・パフォーマンスともに上位互換。

**Vercel / Netlify（却下）**
機能は十分だが、ゲームの静的配信にはオーバースペック。帯域は月 100GB 制限で Cloudflare Pages の無制限に劣る。

### バックエンド

**Firebase Firestore（却下）**
「上位N件のスコア」は取得可能だが、「自分の順位」の取得にはドキュメント指向 DB の制約上、集計カウンターの別途管理や Cloud Functions によるバッチ処理が必要。Supabase の SQL ベースのアプローチのほうがランキング機能の実装が素直。

**Azure PlayFab（却下）**
ゲーム特化 BaaS としてリーダーボード機能が組み込みで優秀。ただし Unity SDK ほど JavaScript SDK のドキュメントが充実しておらず、Phaser との組み合わせでは Supabase のほうが情報量・柔軟性で優位。

---

## Cloudflare Pages の詳細

| 項目 | 内容 |
|------|------|
| 料金 | 無料（Free プラン） |
| 帯域 | 無制限 |
| ビルド | 月500回（無料枠） |
| デプロイ | GitHub 連携で push 時自動ビルド・デプロイ |
| CDN | グローバル CDN、Brotli 圧縮自動適用 |
| カスタムドメイン | 対応（SSL 自動） |
| レスポンスヘッダ | `_headers` ファイルでカスタマイズ可能 |

### デプロイフロー

```
GitHub リポジトリに push
  → Cloudflare Pages が検知
  → Vite ビルド実行（pnpm run build）
  → dist/ の成果物を CDN に自動配信
```

---

## Supabase の詳細

| 項目 | 内容 |
|------|------|
| 料金 | 無料（Free プラン） |
| データベース | PostgreSQL 500MB |
| API リクエスト | 無制限 |
| 認証 | 5万 MAU（将来認証を追加する場合） |
| リアルタイム | 対応（将来拡張時に利用可能） |

### スコア保存・ランキング取得の実装イメージ

```sql
-- テーブル定義
CREATE TABLE scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_name TEXT NOT NULL,
  score INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 上位N件のランキング取得
SELECT player_name, score
FROM scores
ORDER BY score DESC
LIMIT 10;

-- 自分の順位取得
SELECT rank
FROM (
  SELECT player_name, RANK() OVER (ORDER BY score DESC) as rank
  FROM scores
) ranked
WHERE player_name = 'target_player';
```

### フロントエンドからの呼び出し（TypeScript）

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://your-project.supabase.co',
  'your-anon-key'
);

// スコア送信
await supabase.from('scores').insert({
  player_name: 'Player1',
  score: 1500,
});

// ランキング取得（上位10件）
const { data } = await supabase
  .from('scores')
  .select('player_name, score')
  .order('score', { ascending: false })
  .limit(10);
```

---

## 参考リポジトリ

| リポジトリ | 用途 |
|------------|------|
| [phaserjs/phaser-by-example](https://github.com/phaserjs/phaser-by-example) | **最重要**。公式書籍連動の教科書リポジトリ。9種のゲーム実装、Vite ビルド |
| [phaserjs/examples](https://github.com/phaserjs/examples) | 2000以上の機能別サンプル集。API リファレンスとして利用 |
| [digitsensitive/phaser3-typescript](https://github.com/digitsensitive/phaser3-typescript) | TypeScript でのゲーム実装パターン集 |
| [pixijs/open-games](https://github.com/pixijs/open-games) | PixiJS の教科書リポジトリ（参考比較用） |
| [ASteinheiser/ts-online-game-template](https://github.com/ASteinheiser/ts-online-game-template) | Phaser + Supabase 統合の実装参考 |

---

## 次のステップ

1. **Phaser プロジェクトの初期セットアップ**：`pnpm create @phaserjs/game@latest` でテンプレート生成（TypeScript + Vite 選択）
2. **Supabase プロジェクト作成**：supabase.com でプロジェクト作成、scores テーブル定義、RLS 設定
3. **Cloudflare Pages 連携**：GitHub リポジトリ作成 → Cloudflare Pages でプロジェクト作成・連携
4. **プロトタイプ開発**：ゲーム本体の基本実装 → スコア送信・ランキング取得の統合

---

## 補足：当初の構成からの変更点

| 項目 | 当初案 | 確定構成 | 変更理由 |
|------|--------|----------|----------|
| フロントエンド | Unity WebGL | Phaser.js + TypeScript | 2Dミニゲームにはオーバースペック、ビルドサイズ・ロード時間の問題 |
| ホスティング | GitHub Pages | Cloudflare Pages | 帯域無制限、自動ビルド、Brotli 圧縮、ヘッダカスタマイズ対応 |
| バックエンド | Firebase | Supabase | ランキング機能が SQL で素直に実装可能、サーバーコード不要 |
