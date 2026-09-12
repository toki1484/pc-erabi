// データの品質ゲート。
// 「出典を自分の目で確認していない数値を検証済みにしない」という運営ルールを
// 機械的に点検する。verified を true にする判断は運営者のみが行う。
import { readFileSync, readdirSync } from 'node:fs';

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

if (errors.length) {
  console.error(`\nエラー: ${errors.length} 件`);
  errors.forEach((e) => console.error(`  - ${e}`));
  process.exit(1);
}

console.log('\n構造チェック: 問題なし');
