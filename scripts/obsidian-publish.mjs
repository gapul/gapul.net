// Obsidian vault から publish: true のノートをブログ記事として取り込む
//
// 使い方:
//   pnpm publish:obsidian            # 取り込み + 取り下げノートの削除
//   OBSIDIAN_VAULT=/path/to/vault pnpm publish:obsidian
//
// ノート側の frontmatter:
//   publish: true        # 必須。これが無いノートは対象外
//   slug: my-post        # 推奨。URLになる(無ければファイル名から生成)
//   title: 記事タイトル   # 省略時はファイル名
//   description: 概要     # 省略可
//   pubDate: 2026-07-08  # 省略時はファイルの更新日時(JST)
//
// 変換:
//   ![[image.png]]  → 画像を public/blog-assets/<slug>/ へコピーして md 画像に
//   [[Note|表示名]]  → 表示名(対象も公開済みならリンクに)
//   [[Note]]        → Note(同上)

import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';

const VAULT = process.env.OBSIDIAN_VAULT ?? path.join(homedir(), 'Documents', 'notes');
const ROOT = new URL('..', import.meta.url).pathname;
const BLOG_DIR = path.join(ROOT, 'src', 'content', 'blog');
const ASSETS_DIR = path.join(ROOT, 'public', 'blog-assets');
const SKIP_DIRS = new Set(['.obsidian', '.trash', '.git', 'node_modules', '00_templates']);

// vault 内の全ファイルを列挙(埋め込み解決用に basename → 絶対パスの索引も作る)
async function walkVault(dir, files = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) await walkVault(path.join(dir, entry.name), files);
    } else {
      files.push(path.join(dir, entry.name));
    }
  }
  return files;
}

// 簡易 frontmatter パーサ(key: value の1行形式のみ対応)
function parseFrontmatter(src) {
  const match = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { fm: {}, body: src };
  const fm = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^(\w[\w-]*):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].replace(/^["']|["']$/g, '').trim();
  }
  return { fm, body: src.slice(match[0].length) };
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-_]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function formatDateJST(date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' }).format(date);
}

function yamlQuote(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

const vaultFiles = await walkVault(VAULT);
const byBasename = new Map(vaultFiles.map((f) => [path.basename(f), f]));

// 対象ノートを収集
const notes = [];
for (const file of vaultFiles.filter((f) => f.endsWith('.md'))) {
  const src = await readFile(file, 'utf8');
  const { fm, body } = parseFrontmatter(src);
  if (fm.publish !== 'true') continue;

  const base = path.basename(file, '.md');
  let slug = fm.slug || slugify(base);
  if (!slug) {
    console.warn(`skip: ${base} — slug を生成できません。frontmatter に slug: を書いてください`);
    continue;
  }
  const mtime = (await stat(file)).mtime;
  notes.push({
    file,
    body,
    slug,
    title: fm.title || base,
    description: fm.description,
    pubDate: fm.pubDate || fm.date || formatDateJST(mtime),
    lang: fm.lang === 'en' ? 'en' : undefined,
  });
}

const slugByBasename = new Map(notes.map((n) => [path.basename(n.file, '.md'), n.slug]));

// 変換して書き出し
await mkdir(BLOG_DIR, { recursive: true });
for (const note of notes) {
  let body = note.body;

  // 画像などの埋め込み ![[file]] / ![[file|size]]
  const embeds = [...body.matchAll(/!\[\[([^\]|]+?)(?:\|[^\]]*)?\]\]/g)];
  for (const [raw, target] of embeds) {
    const srcPath = byBasename.get(path.basename(target.trim()));
    if (!srcPath) {
      console.warn(`  ${note.slug}: 埋め込み "${target}" が vault に見つかりません`);
      continue;
    }
    const destDir = path.join(ASSETS_DIR, note.slug);
    await mkdir(destDir, { recursive: true });
    const name = path.basename(srcPath);
    await cp(srcPath, path.join(destDir, name));
    body = body.replaceAll(raw, `![](/blog-assets/${note.slug}/${encodeURIComponent(name)})`);
  }

  // wikilink [[Note|表示名]] / [[Note]] — 公開済みノートならリンク、それ以外はテキスト化
  body = body.replace(/\[\[([^\]|]+?)(?:\|([^\]]*))?\]\]/g, (_, target, alias) => {
    const label = alias || target;
    const slug = slugByBasename.get(path.basename(target.trim(), '.md'));
    return slug ? `[${label}](/blog/${slug}/)` : label;
  });

  const fm = [
    `title: ${yamlQuote(note.title)}`,
    note.description ? `description: ${yamlQuote(note.description)}` : null,
    `pubDate: ${note.pubDate}`,
    note.lang ? `lang: ${note.lang}` : null,
    'source: obsidian',
  ].filter(Boolean);
  await writeFile(
    path.join(BLOG_DIR, `${note.slug}.md`),
    `---\n${fm.join('\n')}\n---\n\n${body.trimStart()}`,
  );
  console.log(`publish: ${note.slug} ← ${path.relative(VAULT, note.file)}`);
}

// vault 側で publish を外した記事を削除(source: obsidian のものだけ)
const current = new Set(notes.map((n) => `${n.slug}.md`));
for (const entry of await readdir(BLOG_DIR)) {
  if (!entry.endsWith('.md') || current.has(entry)) continue;
  const { fm } = parseFrontmatter(await readFile(path.join(BLOG_DIR, entry), 'utf8'));
  if (fm.source === 'obsidian') {
    await rm(path.join(BLOG_DIR, entry));
    await rm(path.join(ASSETS_DIR, entry.replace(/\.md$/, '')), { recursive: true, force: true });
    console.log(`unpublish: ${entry}`);
  }
}

console.log(`done: ${notes.length} 件`);
