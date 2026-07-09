// curl / wget などターミナルから来た人には ANSI アートの名刺を返す。
// ブラウザには通常の静的ページ(env.ASSETS)をそのまま渡す。

const ESC = '\u001b[';
const R = `${ESC}0m`; // reset
const c = (code, s) => `${ESC}38;5;${code}m${s}${R}`;
const bold = (s) => `${ESC}1m${s}${R}`;

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

const logo = LOGO.map(
  (line, i) => c(LOGO_COLORS[i], line) + c(111, DOT[i]),
).join('\n');

const label = (s) => c(80, s.padEnd(9)); // teal
const muted = (s) => c(245, s);

const CARD = `
${logo}

  ${bold('gapul')} ${muted('—')} つくって、あそぶ。
  ${muted('自分のパソコンの環境構築に人生を費しています。')}

  ${label('web')}https://gapul.net
  ${label('works')}https://gapul.net/works
  ${label('blog')}https://gapul.net/blog
  ${label('rss')}https://gapul.net/rss.xml
  ${label('github')}https://github.com/gapul
  ${label('x')}https://x.com/gapul1729
  ${label('matrix')}@gapul:gapul.net
  ${label('contact')}https://gapul.net/contact

  ${muted('(ブラウザで開くと普通のサイトです)')}
`;

export async function onRequest({ request, env }) {
  const ua = request.headers.get('user-agent') || '';
  if (/\b(curl|wget|httpie|aria2|fetch)\b/i.test(ua)) {
    return new Response(CARD, {
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'public, max-age=3600',
        vary: 'user-agent',
      },
    });
  }
  return env.ASSETS.fetch(request);
}
