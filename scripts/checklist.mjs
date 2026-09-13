// 未確認の記事について、事実確認のチェックリストを出力する。
//
//   npm run checklist
//
// 記事を頭から読み返すのではなく、検証が必要な主張だけを潰せるようにする。
// ボトルネックは執筆ではなく確認であり、ここを短縮しないと本数は増えない。
import { readFileSync, readdirSync } from 'node:fs';

const dir = new URL('../src/content/articles/', import.meta.url);

function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const fm = m[1];

  const scalar = (key) => fm.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))?.[1]?.trim();

  // claims は「- text: / source: / check:」の繰り返し。
  // YAMLライブラリを足さずに済む構造しか使わない前提で、行単位で読む。
  // 正規表現で範囲を切り出す実装は、複数行モードの $ が行末に一致して
  // 1項目目で切れるため使わない。
  const claims = [];
  const lines = fm.split('\n');
  let inClaims = false;
  let current = null;

  const push = () => {
    if (current) claims.push(current);
    current = null;
  };

  for (const line of lines) {
    if (/^claims:\s*$/.test(line)) {
      inClaims = true;
      continue;
    }
    if (!inClaims) continue;

    // インデントのない行が来たら claims ブロックの終わり
    if (line.trim() !== '' && !/^\s/.test(line)) {
      push();
      inClaims = false;
      continue;
    }

    const item = line.match(/^\s*-\s+(\w+):\s*(.*)$/);
    if (item) {
      push();
      current = { [item[1]]: item[2].trim() };
      continue;
    }

    const field = line.match(/^\s+(\w+):\s*(.*)$/);
    if (field && current) current[field[1]] = field[2].trim();
  }
  push();

  return { title: scalar('title'), factChecked: scalar('factChecked') === 'true', claims };
}

const files = readdirSync(dir).filter((f) => f.endsWith('.md'));
const pending = [];

for (const f of files) {
  const fm = parseFrontmatter(readFileSync(new URL(f, dir), 'utf8'));
  if (fm && !fm.factChecked) pending.push({ file: f, ...fm });
}

if (pending.length === 0) {
  console.log('確認待ちの記事はありません。');
  process.exit(0);
}

console.log(`確認待ち: ${pending.length}本\n`);

let noClaims = 0;
for (const a of pending) {
  console.log(`■ ${a.title}`);
  console.log(`  src/content/articles/${a.file}\n`);

  if (a.claims.length === 0) {
    noClaims++;
    console.log('  確認項目が書かれていません。');
    console.log('  → 記事を書いた担当に claims の記入を差し戻してください。\n');
    continue;
  }

  a.claims.forEach((c, i) => {
    console.log(`  [ ] ${i + 1}. ${c.text}`);
    console.log(`      確認: ${c.check}`);
    if (c.source) console.log(`      出典: ${c.source}`);
  });
  console.log('');
  console.log('  すべて確認できたら factChecked: true に変更してください。\n');
}

if (noClaims > 0) {
  console.log(`※ ${noClaims}本に確認項目がありません。確認項目のない記事は公開できません。`);
  process.exit(1);
}
