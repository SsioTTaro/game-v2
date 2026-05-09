# ぷかるんゲーム

紗倉るる + ぷかるんを世界観の主軸にした Web ゲームプラットフォーム。
プロジェクトの全体像と方針は `CLAUDE.md` および `platform-design.md` を参照。

## 開発

### 前提

- [mise](https://mise.jdx.dev/) を導入済みであること（Node / pnpm のバージョンは `mise.toml` で固定）

### セットアップ

```bash
mise install     # mise.toml に従って node / pnpm を導入
pnpm install     # 依存パッケージをインストール
```

### よく使うコマンド

| コマンド | 用途 |
|----------|------|
| `pnpm dev` | 開発サーバ起動（既定 http://localhost:5173 ） |
| `pnpm build` | `dist/` に本番ビルドを生成 |
| `pnpm preview` | ビルド結果をローカルで確認 |

## ドキュメント

| ファイル | 役割 |
|----------|------|
| `CLAUDE.md` | Claude Code 兼開発者向けプロジェクト案内 |
| `architecture-decision-record.md` | 技術選定の根拠 |
| `platform-design.md` | プラットフォーム層の設計 |
| `games/001-pukarun-run.md` | Game #1（ぷかるんラン）の仕様 |
| `ideas.md` | 構想メモ |
