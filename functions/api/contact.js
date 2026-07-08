// お問い合わせフォームの受け口(Cloudflare Pages Functions)
// Turnstile で認証してから、受信内容を ntfy にプッシュ通知する。
// 必要な環境変数(CF Pages の Settings → Environment variables):
//   NTFY_URL          例: https://ntfy.gapul.net/contact
//   NTFY_TOKEN        ntfy のアクセストークン(tk_...)
//   TURNSTILE_SECRET  Turnstile のシークレットキー

export async function onRequestPost({ request, env }) {
  const form = await request.formData();
  const back = String(form.get('back') || '/contact/');
  const redirect = (ok) =>
    Response.redirect(new URL(`${back}?${ok ? 'sent' : 'error'}=1`, request.url).toString(), 303);

  // honeypot: 人間には見えないフィールド。埋まっていたら bot なので成功を装って捨てる
  if (form.get('company')) return redirect(true);

  const name = String(form.get('name') || '').trim().slice(0, 200);
  const email = String(form.get('email') || '').trim().slice(0, 200);
  const message = String(form.get('message') || '').trim();
  if (!message || message.length > 5000) return redirect(false);
  if (!env.NTFY_URL || !env.NTFY_TOKEN || !env.TURNSTILE_SECRET) return redirect(false);

  // Turnstile 検証
  const token = String(form.get('cf-turnstile-response') || '');
  if (!token) return redirect(false);
  const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: new URLSearchParams({
      secret: env.TURNSTILE_SECRET,
      response: token,
      remoteip: request.headers.get('CF-Connecting-IP') || '',
    }),
  });
  const outcome = await verifyRes.json();
  if (!outcome.success) return redirect(false);

  const body = [`from: ${name || '(名前なし)'}`, email && `email: ${email}`, '', message]
    .filter((line) => line !== false)
    .join('\n');

  const res = await fetch(env.NTFY_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.NTFY_TOKEN}`,
      Title: 'gapul.net contact',
      Tags: 'email',
    },
    body,
  });
  return redirect(res.ok);
}
