// Steam公式APIが返す動作環境HTMLの解析。
// ネットワークに触らない純粋関数として保ち、固定データでテストできるようにする。

const LABELS = {
  os: ['OS'],
  cpu: ['プロセッサー', 'プロセッサ', 'Processor', 'CPU'],
  memory: ['メモリー', 'メモリ', 'Memory'],
  gpu: ['グラフィック', 'グラフィックス', 'Graphics', 'ビデオカード'],
  storage: ['ストレージ', 'Storage', 'ハードドライブ', 'Hard Drive'],
};

function decodeEntities(s) {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'");
}

function stripTags(s) {
  return decodeEntities(s.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

/**
 * Steamの pc_requirements.minimum / .recommended のHTMLを
 * { os, cpu, memory, gpu, storage, raw } に分解する。
 * 想定する構造: <li><strong>プロセッサー:</strong> Core i5-10400<br></li>
 */
export function parseRequirementsHtml(html) {
  if (!html || typeof html !== 'string') return null;

  const result = { raw: stripTags(html) };

  // <li> 単位で「ラベル: 値」を拾う
  for (const [, inner] of html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)) {
    const m = inner.match(/<strong[^>]*>([\s\S]*?)<\/strong>([\s\S]*)/i);
    if (!m) continue;

    // 「OS *:」のように注記の記号が付くことがあるので落とす
    const label = stripTags(m[1]).replace(/[:：*＊\s]+$/g, '').trim();
    const value = stripTags(m[2]);
    if (!value) continue;

    for (const [key, aliases] of Object.entries(LABELS)) {
      if (aliases.some((a) => label === a || label.startsWith(a))) {
        // 同じラベルが複数回出た場合は最初のものを採用する
        if (result[key] === undefined) result[key] = value;
        break;
      }
    }
  }

  return result;
}

/**
 * 公式の記載に、こちらが保持しているGPU名が含まれているかを緩く判定する。
 * 「GeForce RTX 4070 SUPER」→「4070」「SUPER」のような型番トークンで照合する。
 * 判定はあくまで目安で、最終的な可否は人間が見て決める。
 */
export function gpuTextMatches(officialText, gpuName) {
  if (!officialText || !gpuName) return false;

  // 「RX 5700XT」のように数字と接尾辞が続けて書かれることがあるため、
  // 数字の直後に英字が来る場合は空白を入れて表記を揃える。
  const normalize = (s) =>
    s.toUpperCase().replace(/\s+/g, ' ').replace(/(\d)(?=[A-Z])/g, '$1 ');

  const needle = normalize(gpuName);
  const numbers = needle.match(/\d{3,4}/g) ?? [];
  if (numbers.length === 0) return false;

  const hasSuffix = (text, suffix) => new RegExp(`\\b${suffix}\\b`).test(text);
  const SUFFIXES = ['SUPER', 'TI', 'XT', 'XTX'];

  // 公式の記載は「NVIDIA GeForce RTX 2070 / AMD Radeon RX 5700XT」のように
  // 複数候補が併記されることが多い。候補ごとに区切って判定しないと、
  // 別候補の接尾辞(XTなど)を拾って誤判定する。
  const candidates = normalize(officialText).split(/[\/,、]|\bOR\b|または/);

  return candidates.some((candidate) => {
    if (!numbers.every((n) => candidate.includes(n))) return false;
    return SUFFIXES.every((suffix) => hasSuffix(needle, suffix) === hasSuffix(candidate, suffix));
  });
}
