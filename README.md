# gapul.net

ポートフォリオサイト。Astro + Tailwind v4 で作った1ページ構成 + ブログ。
Cloudflare Pages でビルド・配信する。デザインは [ghostty.org](https://ghostty.org) 参考のターミナル風。

## 開発

```sh
pnpm install
pnpm dev        # http://localhost:4321
pnpm build      # dist/ に静的ビルド
pnpm preview
```

## 構成

- `src/pages/index.astro` — トップ(hero / works / blog / links)
- `src/pages/blog/` — ブログ一覧・記事(`/rss.xml`, sitemap あり)
- `src/content/blog/*.md` — 記事(content collection)
- `src/content/works/*.yaml` — 作品データ(title / description / tags / repo / order)
- `src/components/Pane.astro` — 四隅 + のボーダーペイン
- `public/.well-known/matrix/` — Matrix federation の well-known 委任(**消さないこと**。
  apex ドメインの Matrix (@gapul:gapul.net) が壊れる。`public/_headers` で
  Content-Type と CORS を付与)

## Obsidian からのブログ公開

vault(`~/Documents/notes`)のノートに frontmatter を付けて:

```yaml
---
publish: true
slug: my-post        # 推奨(URLになる)
title: 記事タイトル    # 省略時はファイル名
description: 概要     # 省略可
pubDate: 2026-07-08  # 省略時はファイル更新日時(JST)
---
```

取り込み(wikilink 変換 + `![[画像]]` のコピー込み):

```sh
pnpm publish:obsidian
git add -A && git commit && git push   # push で自動デプロイ
```

`publish: true` を外して再実行すると記事は取り下げられる(`source: obsidian` の
記事だけが対象。手書きの md は触らない)。

## コンタクトフォーム

`/contact` のフォームは Cloudflare Pages Functions(`functions/api/contact.js`)が受けて
自宅の ntfy にプッシュ通知する。CF Pages の環境変数に以下が必要:

- `NTFY_URL` — 例: `https://ntfy.gapul.net/contact`
- `NTFY_TOKEN` — ntfy のアクセストークン(`tk_...`)

honeypot(company フィールド)で bot は成功を装って捨てる。ローカルの `pnpm dev` では
Functions は動かないので、送信テストはデプロイ後かpreview環境で行う。

## デプロイ

GitHub `gapul/gapul.net` → Cloudflare Pages(build: `pnpm build`, output: `dist`)。
カスタムドメイン: `gapul.net`(apex)。

### 注意: apex ドメイン移行の経緯

2026-07 に apex を CF Tunnel(CT103 Caddy の well-known 配信)から Pages へ切替。
Matrix の well-known は上記の静的ファイルで配信を継続している。
MX/SPF/DKIM レコードには触れないこと(メール転送が生きている)。
