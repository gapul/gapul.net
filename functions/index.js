// curl / wget などターミナルから来た人には ANSI アートの名刺を返す。
// ブラウザには通常の静的ページ(env.ASSETS)をそのまま渡す。
//
// 名刺の中身はビルド時に src/pages/card.txt.ts がサイトと同じデータから生成する
// (/card.txt)。ここでは User-Agent を見て振り分けるだけ。

const TERMINAL_UA = /\b(curl|wget|httpie|aria2|fetch)\b/i;

export async function onRequest({ request, env }) {
  const ua = request.headers.get('user-agent') || '';
  if (!TERMINAL_UA.test(ua)) {
    return env.ASSETS.fetch(request);
  }
  const card = await env.ASSETS.fetch(new URL('/card.txt', request.url));
  if (!card.ok) {
    return env.ASSETS.fetch(request);
  }
  return new Response(card.body, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=3600',
      vary: 'user-agent',
    },
  });
}
