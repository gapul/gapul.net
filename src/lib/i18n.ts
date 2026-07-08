// UI文言の日英辞書
export type Locale = 'ja' | 'en';

export const STRINGS = {
  ja: {
    description: 'gapul のポートフォリオ。つくったもの、あそんだ記録。',
    tagline: 'つくって、あそぶ。',
    intro:
      '自分のパソコンの環境構築に人生を費しています。その副産物として、ツールやゲーム、ハードウェアなどを作成しています。',
    blogDescription: 'gapul のブログ',
    contactLead: '仕事の相談、作品の感想、なんでもどうぞ。',
    contactName: 'なまえ',
    contactEmail: 'メールアドレス(返信が欲しい場合)',
    contactMessage: 'メッセージ',
    contactSend: '送信 →',
    contactSent: '送信しました。ありがとうございます。',
    contactError: '送信に失敗しました。時間をおいて試すか、メールでどうぞ。',
  },
  en: {
    description: "gapul's portfolio — things made, fun had.",
    tagline: 'Make things, have fun.',
    intro:
      'I spend my life perfecting my computer setup. Tools, games, and hardware come out as byproducts.',
    blogDescription: "gapul's blog",
    contactLead: 'Work inquiries, feedback, anything welcome.',
    contactName: 'Name',
    contactEmail: 'Email (if you want a reply)',
    contactMessage: 'Message',
    contactSend: 'Send →',
    contactSent: 'Sent. Thank you!',
    contactError: 'Failed to send. Please try again later or email me.',
  },
} as const satisfies Record<Locale, Record<string, string>>;

// 対になる言語のパス(トップページ用)
export function altPath(locale: Locale): { locale: Locale; href: string } {
  return locale === 'ja' ? { locale: 'en', href: '/en/' } : { locale: 'ja', href: '/' };
}
