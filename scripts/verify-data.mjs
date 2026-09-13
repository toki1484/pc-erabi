// データの品質ゲート。
// 「出典を自分の目で確認していない数値を検証済みにしない」という運営ルールを
// 機械的に点検する。verified を true にする判断は運営者のみが行う。
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const games = JSON.parse(readFileSync(new URL('../src/data/games.json', import.meta.url))).games;
const gpus = JSON.parse(readFileSync(new URL('../src/data/gpus.json', import.meta.url))).gpus;
const gpuKeys = new Set(gpus.map((g) => g.key));

const errors = [];
const unverified = [];

for (const g of games) {
  for (const tier of ['minimum', 'recommended']) {
    const key = g[tier]?.gpuKey;
    if (!key) errors.push(`${g.id}: ${tier}.gpuKey がありません`);
    else if (!gpuKeys.has(key)) errors.push(`${g.id}: ${tier}.gpuKey "${key}" は gpus.json に未定義です`);
  }
  if (!g.sourceUrl) errors.push(`${g.id}: sourceUrl がありません（出典なしのデータは載せない）`);
  if (g.verified !== true) unverified.push(g);
}

console.log(`タイトル数: ${games.length} / GPU定義: ${gpus.length}`);
console.log(`公開可(検証済み): ${games.length - unverified.length} 件`);

if (unverified.length) {
  console.log(`\n要確認: ${unverified.length} 件`);
  console.log('公式ページで最低/推奨環境を確認し、一致していれば verified を true にしてください。\n');
  for (const g of unverified) {
    console.log(`  [ ] ${g.title}`);
    console.log(`      最低  : ${g.minimum.gpuKey} / ${g.minimum.cpu} / RAM ${g.minimum.ram}GB`);
    console.log(`      推奨  : ${g.recommended.gpuKey} / ${g.recommended.cpu} / RAM ${g.recommended.ram}GB`);
    console.log(`      出典  : ${g.sourceUrl}`);
    if (g.crossChecked) console.log(`      補足  : ${g.crossChecked}`);
  }
}

// 記事の事実確認状況も同じ場所で点検する
const articleDir = new URL('../src/content/articles/', import.meta.url);
let articles = [];
try {
  articles = readdirSync(articleDir).filter((f) => f.endsWith('.md'));
} catch {
  // 記事ディレクトリがまだ無い場合は何もしない
}

const uncheckedArticles = articles.filter((f) => {
  const body = readFileSync(new URL(f, articleDir), 'utf8');
  return !/^factChecked:\s*true\s*$/m.test(body);
});

console.log(`\n記事: ${articles.length} 本 / 公開可(確認済み): ${articles.length - uncheckedArticles.length} 本`);
if (uncheckedArticles.length) {
  console.log('\n未確認の記事（本番ビルドには含まれない）:');
  for (const f of uncheckedArticles) {
    const body = readFileSync(new URL(f, articleDir), 'utf8');
    const title = body.match(/^title:\s*(.+)$/m)?.[1] ?? f;
    console.log(`  [ ] ${title}`);
    console.log(`      ファイル: src/content/articles/${f}`);
  }
  console.log('\n内容を読んで事実を確認したら factChecked を true にしてください。');
}

// 記事どうしのリンクが、本番で切れないかを点検する。
// 未確認の記事は本番ビルドに含まれないため、そこへのリンクはリンク切れになる。
// 本数が増えるほど起きやすい事故なので、機械で検出する。
const published = new Set();
const slugOf = (f) => f.replace(/\.md$/, '');
for (const f of articles) {
  const body = readFileSync(new URL(f, articleDir), 'utf8');
  if (/^factChecked:\s*true\s*$/m.test(body)) published.add(slugOf(f));
}

const linkProblems = [];
for (const f of articles) {
  const body = readFileSync(new URL(f, articleDir), 'utf8');
  const isPublished = published.has(slugOf(f));
  for (const [, slug] of body.matchAll(/\]\(\/articles\/([^/)#]+)\/?[^)]*\)/g)) {
    if (!articles.includes(`${slug}.md`)) {
      linkProblems.push(`${f} → /articles/${slug}/ : リンク先の記事が存在しません`);
    } else if (isPublished && !published.has(slug)) {
      linkProblems.push(`${f} → /articles/${slug}/ : リンク先が未確認のため、本番でリンク切れになります`);
    }
  }
}

if (linkProblems.length) {
  console.log(`\n記事間リンクの問題: ${linkProblems.length}件`);
  linkProblems.forEach((l) => console.log(`  - ${l}`));
  console.log('\nリンク先を先に公開するか、リンクを外してください。');
} else if (articles.length) {
  console.log('\n記事間リンク: 問題なし');
}

// ASPの審査では、運営者情報・プライバシーポリシー・広告表記と、
// 連絡手段の明示を求められることが多い。提携申請の前に足りないものを出す。
const requiredPages = [
  ['src/pages/about.astro', '運営者情報'],
  ['src/pages/privacy.astro', 'プライバシーポリシー'],
  ['src/pages/disclaimer.astro', '免責事項・広告表記'],
];
const notReady = [];
for (const [path, label] of requiredPages) {
  if (!existsSync(new URL(`../${path}`, import.meta.url))) {
    notReady.push(`${label}のページがありません（${path}）`);
  }
}
const config = readFileSync(new URL('../src/config.ts', import.meta.url), 'utf8');
if (/contactEmail:\s*''/.test(config)) {
  notReady.push("連絡先が未設定です（src/config.ts の contactEmail）。サイト用のアドレスを設定してください");
}

if (notReady.length) {
  console.log(`\nASP申請前に必要なもの: ${notReady.length}件`);
  notReady.forEach((l) => console.log(`  - ${l}`));
} else {
  console.log('\nASP申請の前提: 問題なし');
}

if (errors.length) {
  console.error(`\nエラー: ${errors.length} 件`);
  errors.forEach((e) => console.error(`  - ${e}`));
  process.exit(1);
}

console.log('\n構造チェック: 問題なし');
