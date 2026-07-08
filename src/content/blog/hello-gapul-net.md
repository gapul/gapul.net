---
title: gapul.net をつくった
description: Astro + Cloudflare Pages でポートフォリオサイトを立てた記録。
pubDate: 2026-07-08
draft: false
---

ポートフォリオサイトを作った。名刺代わりの1ページ + このブログという構成。

技術的には Astro の静的ビルドを Cloudflare Pages で配信している。CSS は Tailwind で、フォントは本文が Zen Kaku Gothic New、ロゴまわりが JetBrains Mono。どちらもセルフホストなので外部サービスへのリクエストは飛ばない。日本語と英語の両方に対応していて、ヘッダーの JP / EN で切り替えられる。

記事は Obsidian で書いている。ノートの frontmatter に `publish: true` を付けてスクリプトを叩くと、wikilink の変換と画像のコピーをしてリポジトリに取り込まれ、push すると自動でデプロイされる仕組み。

お問い合わせフォームは Cloudflare Pages Functions で受けて、自宅サーバーの ntfy 経由でスマホに通知が届く。ちなみにこのドメインの裏では自宅の Matrix サーバーも動いていて、`/.well-known/matrix/*` はこのサイトが静的ファイルとして配信している。

コードは [GitHub](https://github.com/gapul/gapul.net) にある。
