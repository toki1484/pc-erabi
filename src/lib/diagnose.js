// スペック診断のロジック。DOMに依存しない純粋関数として保ち、
// クライアント側とテストの両方から同じコードを使う。

export const RESOLUTIONS = [
  { key: '1080p', label: 'フルHD', detail: '1920×1080', multiplier: 1.0 },
  { key: '1440p', label: 'WQHD', detail: '2560×1440', multiplier: 1.55 },
  { key: '2160p', label: '4K', detail: '3840×2160', multiplier: 2.6 },
];

export const FPS_TARGETS = [
  { key: 60, label: '60fps', detail: '標準的な快適さ', multiplier: 1.0 },
  { key: 120, label: '120fps', detail: '高リフレッシュレート', multiplier: 1.7 },
  { key: 144, label: '144fps', detail: 'competitive向け', multiplier: 2.0 },
];

// 解像度とfpsの倍率は実測ではなく目安。ベンチマークを取得し次第補正する。
const VRAM_ADVICE = { '1080p': 8, '1440p': 12, '2160p': 16 };

function byScoreAsc(a, b) {
  return a.score - b.score;
}

/**
 * 必要スコアを満たす最も安価(=スコアが低い)なGPUを返す。
 * 満たすものが無ければ null。
 */
function pickGpu(gpus, requiredScore) {
  return gpus.slice().sort(byScoreAsc).find((g) => g.score >= requiredScore) ?? null;
}

/**
 * 1段上のGPU(余裕を持たせたい人向け)を返す。
 */
function pickNextUp(gpus, gpu) {
  if (!gpu) return null;
  const sorted = gpus.slice().sort(byScoreAsc);
  const i = sorted.findIndex((g) => g.key === gpu.key);
  return sorted[i + 1] ?? null;
}

function ramAdvice(game, resolution, fps) {
  const base = Math.max(game.recommended.ram ?? 16, 16);
  // 高fpsだけを理由に32GBを勧めない。軽量タイトルでは過剰になるため、
  // 解像度を上げる場合か、タイトル自体が16GB以上を要求する場合に限る。
  const heavyTitle = (game.recommended.ram ?? 0) >= 16;
  if (resolution.key !== '1080p' || (fps.key >= 120 && heavyTitle)) {
    return Math.max(base, 32);
  }
  return base;
}

function cpuAdvice(game, fps) {
  if (fps.key >= 120) {
    return {
      text: `${game.recommended.cpu} より一段上`,
      reason: '高fpsではGPUよりCPUが先に頭打ちになるため、公式推奨より上のCPUを見ておく',
    };
  }
  return { text: game.recommended.cpu, reason: '公式の推奨環境どおりで足りる' };
}

/**
 * 診断本体。
 * @returns {{ok: boolean, ...}} 達成不能な場合は ok:false と理由を返す
 */
export function diagnose({ game, gpus, resolutionKey, fpsKey }) {
  const resolution = RESOLUTIONS.find((r) => r.key === resolutionKey);
  const fps = FPS_TARGETS.find((f) => f.key === Number(fpsKey));
  if (!game || !resolution || !fps) throw new Error('診断に必要な入力が揃っていません');

  const baseGpu = gpus.find((g) => g.key === game.recommended.gpuKey);
  if (!baseGpu) throw new Error(`未定義のGPU: ${game.recommended.gpuKey}`);

  const warnings = [];

  // 上限fpsが決まっているタイトルでは、それ以上を狙っても意味がない
  const capped = game.fpsCap && fps.key > game.fpsCap;
  const effectiveFps = capped
    ? FPS_TARGETS.find((f) => f.key === game.fpsCap) ?? fps
    : fps;
  if (capped) {
    warnings.push(
      `${game.title} はフレームレートが ${game.fpsCap}fps で頭打ちのタイトルです。${fps.key}fps を狙っても表示は変わらないため、${game.fpsCap}fps を前提に計算しました。`
    );
  }

  const requiredScore = Math.round(
    baseGpu.score * resolution.multiplier * effectiveFps.multiplier
  );
  const gpu = pickGpu(gpus, requiredScore);

  if (!gpu) {
    return {
      ok: false,
      reason: `この条件（${game.title} / ${resolution.label} / ${fps.key}fps）は、現行のGPUでは設定を下げずに達成するのが難しい水準です。解像度か目標fpsを一段下げるか、アップスケーリング（DLSS/FSR）の使用を前提にしてください。`,
      requiredScore,
      warnings,
    };
  }

  const headroom = pickNextUp(gpus, gpu);
  const wantVram = VRAM_ADVICE[resolution.key];
  if (gpu.vram < wantVram) {
    warnings.push(
      `${gpu.name} はVRAMが${gpu.vram}GBです。${resolution.label}では${wantVram}GB以上あるとテクスチャ設定を上げやすくなります。`
    );
  }

  return {
    ok: true,
    game,
    resolution,
    fps: effectiveFps,
    requestedFps: fps,
    requiredScore,
    gpu,
    headroom,
    ram: ramAdvice(game, resolution, effectiveFps),
    cpu: cpuAdvice(game, effectiveFps),
    warnings,
    verified: game.verified === true,
  };
}
