// 日付は常にJSTで表示する
const formatter = new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function formatDateJST(date: Date): string {
  return formatter.format(date);
}
