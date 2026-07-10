// Obsidian vault から publish: true のノートをサイトに取り込む
//
// 使い方:
//   pnpm publish:obsidian            # 取り込み + 取り下げノートの削除
//   OBSIDIAN_VAULT=/path/to/vault pnpm publish:obsidian
//
// ブログ記事の frontmatter:
//   publish: true        # 必須。これが無いノートは対象外
//   slug: my-post        # 推奨。URLになる(無ければファイル名から生成)
//   title: 記事タイトル   # 省略時はファイル名
//   description: 概要     # 省略可
//   pubDate: 2026-07-08  # 省略時はファイルの更新日時(JST)
//
// works の frontmatter(type: work を付けると記事でなく作品データになる):
//   publish: true
//   type: work
//   title: 作品名          # 省略時はファイル名
//   description: 一言説明   # 必須
//   descriptionEn: 英語説明 # 省略可
//   tags: [Unity, VRM]     # 省略可
//   repo: https://github.com/...  # 省略可
//   url: https://...        # 省略可(デモ等。repoより優先)
//   order: 1                # 省略可(表示順)
//   ノート本文はサイトには出ない(メモ欄として自由に使える)
//
// 変換(ブログのみ):
//   ![[image.png]]  → 画像を public/blog-assets/<slug>/ へコピーして md 画像に
//   [[Note|表示名]]  → 表示名(対象も公開済みならリンクに)
//   [[Note]]        → Note(同上)

import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';

const VAULT = process.env.OBSIDIAN_VAULT ?? path.join(homedir(), 'Documents', 'notes');
const ROOT = new URL('..', import.meta.url).pathname;
const BLOG_DIR = path.join(ROOT, 'src', 'content', 'blog');
const WORKS_DIR = path.join(ROOT, 'src', 'content', 'works');
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

// 簡易 frontmatter パーサ(key: value の1行形式のみ対応)。raw は元のYAML行
function parseFrontmatter(src) {
  const match = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { fm: {}, raw: [], body: src };
  const fm = {};
  const raw = match[1].split(/\r?\n/);
  for (const line of raw) {
    const kv = line.match(/^(\w[\w-]*):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].replace(/^["']|["']$/g, '').trim();
  }
  return { fm, raw, body: src.slice(match[0].length) };
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

// 対象ノートを収集(type: work は作品データ、それ以外はブログ記事)
const notes = [];
const works = [];
for (const file of vaultFiles.filter((f) => f.endsWith('.md'))) {
  const src = await readFile(file, 'utf8');
  const { fm, raw, body } = parseFrontmatter(src);
  if (fm.publish !== 'true') continue;

  const base = path.basename(file, '.md');
  let slug = fm.slug || slugify(base);
  if (!slug) {
    console.warn(`skip: ${base} — slug を生成できません。frontmatter に slug: を書いてください`);
    continue;
  }

  if (fm.type === 'work') {
    if (!fm.description) {
      console.warn(`skip: ${base} — work には description が必須です`);
      continue;
    }
    works.push({ file, base, slug, fm, raw });
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

// works の書き出し。frontmatter はYAMLなので許可キーの行をそのまま転記する
const WORK_KEYS = /^(title|description|descriptionEn|tags|repo|url|order):/;
await mkdir(WORKS_DIR, { recursive: true });
for (const work of works) {
  const lines = work.raw.filter((line) => WORK_KEYS.test(line));
  if (!work.fm.title) lines.unshift(`title: ${yamlQuote(work.base)}`);
  const yaml = `# generated-from: obsidian\n${lines.join('\n')}\n`;
  await writeFile(path.join(WORKS_DIR, `${work.slug}.yaml`), yaml);
  console.log(`work: ${work.slug} ← ${path.relative(VAULT, work.file)}`);
}

// vault 側で publish を外した work を削除(generated マーカー付きのみ)
const currentWorks = new Set(works.map((w) => `${w.slug}.yaml`));
for (const entry of await readdir(WORKS_DIR)) {
  if (!entry.endsWith('.yaml') || currentWorks.has(entry)) continue;
  const head = await readFile(path.join(WORKS_DIR, entry), 'utf8');
  if (head.startsWith('# generated-from: obsidian')) {
    await rm(path.join(WORKS_DIR, entry));
    console.log(`unpublish work: ${entry}`);
  }
}

console.log(`done: 記事 ${notes.length} 件 / works ${works.length} 件`);
