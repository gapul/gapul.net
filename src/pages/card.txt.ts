// curl / wget 向けの ANSI 名刺(functions/index.js が返す)。
// ビルド時にサイトと同じデータから生成するので、文言・リンク・作品・記事を
// 変えれば次のデプロイで名刺も追従する。手で同期する必要はない。
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { formatDateJST } from '../lib/date';
import { STRINGS } from '../lib/i18n';
import { LINKS, RSS, SITE, fingerprintGroups } from '../lib/site';

const ESC = '\u001b[';
const R = `${ESC}0m`;
const c = (code: number, s: string) => `${ESC}38;5;${code}m${s}${R}`;
const bold = (s: string) => `${ESC}1m${s}${R}`;
const muted = (s: string) => c(245, s);
const label = (s: string) => c(80, s.padEnd(9)); // teal
const heading = (s: string) => `  ${muted('──')} ${c(111, s)}`;

// ロゴの行ごとにブルー→パープルのグラデーション(サイトのアクセントに合わせる)
const LOGO_COLORS = [111, 111, 105, 99, 135, 140];
const LOGO = [
  ' ██████╗  █████╗ ██████╗ ██╗   ██╗██╗       ',
  '██╔════╝ ██╔══██╗██╔══██╗██║   ██║██║       ',
  '██║  ███╗███████║██████╔╝██║   ██║██║       ',
  '██║   ██║██╔══██║██╔═══╝ ██║   ██║██║       ',
  '╚██████╔╝██║  ██║██║     ╚██████╔╝███████╗  ',
  ' ╚═════╝ ╚═╝  ╚═╝╚═╝      ╚═════╝ ╚══════╝  ',
];
// 末尾のピリオド(アクセントカラー固定)
const DOT = ['   ', '   ', '   ', '   ', '██╗', '╚═╝'];

// matrix.to のリンクは ID だけ見せたほうが端末では読みやすい
const display = (href: string) => href.replace('https://matrix.to/#/', '');

export const GET: APIRoute = async () => {
  const t = STRINGS.ja;
  const works = (await getCollection('works')).sort((a, b) => a.data.order - b.data.order);
  const posts = (await getCollection('blog', ({ data }) => !data.draft))
    .sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime())
    .slice(0, 3);

  const lines = [
    '',
    ...LOGO.map((line, i) => c(LOGO_COLORS[i], line) + c(111, DOT[i])),
    '',
    `  ${bold(SITE.name)} ${muted('—')} ${t.tagline}`,
    // 端末の幅に収まるよう、紹介文は文ごとに改行する
    ...t.intro.split(/(?<=。)/).map((s) => `  ${muted(s)}`),
    '',
    `  ${label('web')}${SITE.url}`,
    `  ${label('works')}${SITE.url}/works`,
    `  ${label('blog')}${SITE.url}/blog`,
    `  ${label('rss')}${SITE.url}${RSS.href}`,
    `  ${label('contact')}${SITE.url}/contact`,
    ...LINKS.map((link) => `  ${label(link.label.toLowerCase())}${display(link.href)}`),
    `  ${label('pgp')}${fingerprintGroups()}`,
  ];

  if (works.length > 0) {
    lines.push('', heading('works'));
    for (const w of works) {
      const tags = w.data.tags.length > 0 ? `  ${muted(w.data.tags.join(' · '))}` : '';
      lines.push(`  ${bold(w.data.title)}${tags}`);
    }
  }

  if (posts.length > 0) {
    lines.push('', heading('blog'));
    for (const p of posts) {
      lines.push(`  ${muted(formatDateJST(p.data.pubDate))}  ${p.data.title}`);
    }
  }

  lines.push('', '');
  return new Response(lines.join('\n'), {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
};
