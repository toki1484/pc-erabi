// Steam公式APIから各タイトルの動作環境を取得し、src/data/games.json との差分を出す。
//
//   npm run fetch:requirements           差分を表示するだけ
//   npm run fetch:requirements -- --write  取得した公式の記載を data/steam-snapshots/ に保存
//
// games.json は自動で書き換えない。公式の記載とこちらの値を並べて見せるところまでで止め、
// 直すかどうかと verified を立てるかどうかは人間が決める。
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { parseRequirementsHtml, gpuTextMatches } from '../src/lib/steam-requirements.js';

// 既定はSteam公式。テスト時に擬似サーバーへ向けられるよう環境変数で差し替え可能にする。
const API = process.env.STEAM_API_BASE ?? 'https://store.steampowered.com/api/appdetails';
const DELAY_MS = 700; // Steam側への配慮。8件程度なら制限には当たらない
const TIMEOUT_MS = 15000;

const write = process.argv.includes('--write');
const snapshotDir = new URL('../data/steam-snapshots/', import.meta.url);

const games = JSON.parse(readFileSync(new URL('../src/data/games.json', import.meta.url))).games;
const gpus = JSON.parse(readFileSync(new URL('../src/data/gpus.json', import.meta.url))).gpus;
const gpuName = (key) => gpus.find((g) => g.key === key)?.name ?? key;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchRequirements(appId) {
  const url = `${API}?appids=${appId}&l=japanese&cc=jp`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { 'Accept-Language': 'ja,en;q=0.8' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const body = await res.json();
  const entry = body?.[appId];
  if (!entry?.success) throw new Error('Steamが情報を返しませんでした（IDが誤っている可能性）');

  // 情報が無い場合、Steamはオブジェクトではなく空配列を返すことがある
  const req = entry.data?.pc_requirements;
  if (!req || Array.isArray(req)) throw new Error('このタイトルには動作環境の記載がありません');

  return {
    name: entry.data?.name,
    minimum: parseRequirementsHtml(req.minimum),
    recommended: parseRequirementsHtml(req.recommended),
  };
}

function compare(tier, ours, official) {
  const lines = [];
  if (!official) {
    lines.push(`    ${tier}: 公式に記載なし`);
    return { lines, mismatch: false };
  }

  let mismatch = false;

  const ourGpu = gpuName(ours.gpuKey);
  const gpuOk = gpuTextMatches(official.gpu, ourGpu);
  if (!gpuOk) mismatch = true;
  lines.push(`    ${tier} GPU  ${gpuOk ? '一致' : '不一致'}`);
  lines.push(`      公式: ${official.gpu ?? '（記載なし）'}`);
  lines.push(`      手元: ${ourGpu}`);

  const officialRam = Number(official.memory?.match(/(\d+)\s*GB/i)?.[1]);
  if (Number.isFinite(officialRam)) {
    const ramOk = officialRam === ours.ram;
    if (!ramOk) mismatch = true;
    lines.push(`    ${tier} RAM  ${ramOk ? '一致' : '不一致'}  公式 ${officialRam}GB / 手元 ${ours.ram}GB`);
  }

  // CPUは表記の幅が大きく機械判定に向かないため、並べて出すだけにする
  lines.push(`    ${tier} CPU  公式: ${official.cpu ?? '（記載なし）'}`);
  lines.push(`              手元: ${ours.cpu}`);

  return { lines, mismatch };
}

const targets = games.filter((g) => g.steamAppId);
const manual = games.filter((g) => !g.steamAppId);

console.log(`Steamから取得: ${targets.length}件 / 手動確認が必要: ${manual.length}件\n`);

let mismatchCount = 0;
let errorCount = 0;

for (const game of targets) {
  console.log(`■ ${game.title} (appId ${game.steamAppId})`);
  try {
    const official = await fetchRequirements(game.steamAppId);

    for (const [tier, label] of [['minimum', '最低'], ['recommended', '推奨']]) {
      const { lines, mismatch } = compare(label, game[tier], official[tier]);
      lines.forEach((l) => console.log(l));
      if (mismatch) mismatchCount++;
    }

    if (write) {
      mkdirSync(snapshotDir, { recursive: true });
      const snapshot = { gameId: game.id, appId: game.steamAppId, fetchedAt: new Date().toISOString(), official };
      writeFileSync(new URL(`${game.id}.json`, snapshotDir), JSON.stringify(snapshot, null, 2) + '\n');
      console.log(`    → data/steam-snapshots/${game.id}.json に保存`);
    }
  } catch (e) {
    errorCount++;
    console.log(`    取得できませんでした: ${e.message}`);
  }
  console.log('');
  await sleep(DELAY_MS);
}

if (manual.length) {
  console.log('Steam外のタイトル（公式ページを直接確認してください）:');
  for (const g of manual) console.log(`  - ${g.title}: ${g.sourceUrl}`);
  console.log('');
}

console.log(`不一致: ${mismatchCount}件 / 取得失敗: ${errorCount}件`);
if (mismatchCount > 0) {
  console.log('公式の記載を確認し、必要なら src/data/games.json を直してください。');
}
