// UI文言の日英辞書
export type Locale = 'ja' | 'en';

export const STRINGS = {
  ja: {
    description: 'gapul のポートフォリオ。つくったもの、あそんだ記録。',
    tagline: 'つくって、あそぶ。',
    intro:
      'インタラクティブな作品とツールをつくっています。プロジェクション、ネイティブアプリ、自宅サーバーまわりなど。',
    blogDescription: 'gapul のブログ',
  },
  en: {
    description: "gapul's portfolio — things made, fun had.",
    tagline: 'Make things, have fun.',
    intro:
      'I make interactive works and tools: projection art, native apps, and homelab stuff.',
    blogDescription: "gapul's blog",
  },
} as const satisfies Record<Locale, Record<string, string>>;

// 対になる言語のパス(トップページ用)
export function altPath(locale: Locale): { locale: Locale; href: string } {
  return locale === 'ja' ? { locale: 'en', href: '/en/' } : { locale: 'ja', href: '/' };
}
