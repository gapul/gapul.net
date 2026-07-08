// お問い合わせフォームの受け口(Cloudflare Pages Functions)
// Tor遮断 → honeypot → 入力検証 → Turnstile検証 の順で弾き、
// Cloudflare Email Service でメール送信 + ntfy にプッシュ通知する。
//
// 必要な環境変数(CF Pages の Settings → Environment variables):
//   TURNSTILE_SECRET  Turnstile のシークレットキー(必須)
//   CF_ACCOUNT_ID     Cloudflare アカウントID(メール送信用)
//   EMAIL_API_TOKEN   Email Service の送信権限を持つ API トークン
//   EMAIL_FROM        送信元(Email Sending にオンボード済みドメインのアドレス)
//   EMAIL_TO          受信先(自分のメールアドレス)
//   NTFY_URL          例: https://ntfy.gapul.net/contact(任意、プッシュ通知併用)
//   NTFY_TOKEN        ntfy のアクセストークン(tk_...)
// メールと ntfy はどちらか片方でも配送できれば成功扱い。

export async function onRequestPost({ request, env }) {
  const form = await request.formData();
  const back = String(form.get('back') || '/contact/');
  const redirect = (ok) =>
    Response.redirect(new URL(`${back}?${ok ? 'sent' : 'error'}=1`, request.url).toString(), 303);

  // Tor 出口ノード(Cloudflare は国コード T1 として渡してくる)は拒否
  if (request.cf?.country === 'T1') return redirect(false);

  // honeypot: 人間には見えないフィールド。埋まっていたら bot なので成功を装って捨てる
  if (form.get('company')) return redirect(true);

  // 全フィールド必須
  const name = String(form.get('name') || '').trim().slice(0, 200);
  const email = String(form.get('email') || '').trim().slice(0, 200);
  const subject = String(form.get('subject') || '').trim().slice(0, 200);
  const message = String(form.get('message') || '').trim();
  if (!name || !email || !subject || !message || message.length > 5000) return redirect(false);

  // Turnstile 検証
  if (!env.TURNSTILE_SECRET) return redirect(false);
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

  const text = `from: ${name} <${email}>\n\n${message}`;
  let delivered = false;

  // メール送信(Cloudflare Email Service)
  if (env.CF_ACCOUNT_ID && env.EMAIL_API_TOKEN && env.EMAIL_FROM && env.EMAIL_TO) {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/email/sending/send`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.EMAIL_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: env.EMAIL_TO,
          from: env.EMAIL_FROM,
          subject: `[gapul.net] ${subject}`,
          text,
        }),
      },
    );
    delivered = res.ok;
  }

  // ntfy プッシュ通知(件名に日本語が入るためヘッダでなく本文に載せる)
  if (env.NTFY_URL && env.NTFY_TOKEN) {
    const res = await fetch(env.NTFY_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.NTFY_TOKEN}`,
        Title: 'gapul.net contact',
        Tags: 'email',
      },
      body: `subject: ${subject}\n${text}`,
    });
    delivered = delivered || res.ok;
  }

  return redirect(delivered);
}
