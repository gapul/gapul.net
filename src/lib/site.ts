// サイト全体で使う定数
export const SITE = {
  name: 'gapul',
  title: 'gapul.net',
  description: 'gapul のポートフォリオ。つくったもの、あそんだ記録。',
  url: 'https://gapul.net',
} as const;

export const LINKS = [
  { label: 'GitHub', href: 'https://github.com/gapul', note: 'コードはだいたいここ' },
  { label: 'Matrix', href: 'https://matrix.to/#/@gapul:gapul.net', note: '@gapul:gapul.net' },
  { label: 'Email', href: 'mailto:yuk8337@gmail.com', note: 'yuk8337@gmail.com' },
] as const;
