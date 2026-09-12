import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRequirementsHtml, gpuTextMatches } from '../src/lib/steam-requirements.js';

// Steamが実際に返す形式に沿った固定データ。日本語ロケール。
const JA_HTML = `<strong>最低:</strong><br><ul class="bb_ul"><li><strong>OS *:</strong> Windows 10 (64bit)<br></li><li><strong>プロセッサー:</strong> Intel Core i5-10400 / AMD Ryzen 5 3600<br></li><li><strong>メモリー:</strong> 16 GB RAM<br></li><li><strong>グラフィック:</strong> NVIDIA GeForce GTX 1660 SUPER (VRAM 6GB)<br></li><li><strong>DirectX バージョン:</strong> 12<br></li><li><strong>ストレージ:</strong> 75 GB 利用可能<br></li></ul>`;

// 英語ロケール、ラベル表記が異なる場合
const EN_HTML = `<strong>Recommended:</strong><br><ul class="bb_ul"><li><strong>Processor:</strong> Intel Core i7-12700<br></li><li><strong>Memory:</strong> 16 GB RAM<br></li><li><strong>Graphics:</strong> NVIDIA GeForce RTX 2060 SUPER<br></li></ul>`;

test('日本語の動作環境を項目ごとに分解できる', () => {
  const r = parseRequirementsHtml(JA_HTML);
  assert.equal(r.cpu, 'Intel Core i5-10400 / AMD Ryzen 5 3600');
  assert.equal(r.memory, '16 GB RAM');
  assert.equal(r.gpu, 'NVIDIA GeForce GTX 1660 SUPER (VRAM 6GB)');
  assert.equal(r.storage, '75 GB 利用可能');
  assert.equal(r.os, 'Windows 10 (64bit)');
});

test('英語ラベルでも分解できる', () => {
  const r = parseRequirementsHtml(EN_HTML);
  assert.equal(r.cpu, 'Intel Core i7-12700');
  assert.equal(r.gpu, 'NVIDIA GeForce RTX 2060 SUPER');
});

test('ラベルの注記記号(OS *)を取り除ける', () => {
  const r = parseRequirementsHtml(`<ul><li><strong>OS *:</strong> Windows 11<br></li></ul>`);
  assert.equal(r.os, 'Windows 11');
});

test('解析できない入力では null を返す', () => {
  assert.equal(parseRequirementsHtml(''), null);
  assert.equal(parseRequirementsHtml(null), null);
});

test('項目が無い場合はそのキーを持たない', () => {
  const r = parseRequirementsHtml(`<ul><li><strong>メモリー:</strong> 8 GB RAM<br></li></ul>`);
  assert.equal(r.memory, '8 GB RAM');
  assert.equal(r.gpu, undefined);
});

test('raw には全文が入る', () => {
  const r = parseRequirementsHtml(JA_HTML);
  assert.ok(r.raw.includes('GTX 1660 SUPER'));
});

test('GPU名の照合: 型番が一致すれば true', () => {
  assert.equal(gpuTextMatches('NVIDIA GeForce GTX 1070 8GB', 'GeForce GTX 1070'), true);
});

test('GPU名の照合: 型番が違えば false', () => {
  assert.equal(gpuTextMatches('NVIDIA GeForce GTX 1070', 'GeForce GTX 1060'), false);
});

test('GPU名の照合: SUPERの有無が食い違えば false', () => {
  // 2060 と 2060 SUPER を取り違えるのが一番ありがちな誤り
  assert.equal(gpuTextMatches('NVIDIA GeForce RTX 2060 SUPER', 'GeForce RTX 2060'), false);
  assert.equal(gpuTextMatches('NVIDIA GeForce RTX 2060', 'GeForce RTX 2060 SUPER'), false);
  assert.equal(gpuTextMatches('NVIDIA GeForce RTX 2060 SUPER', 'GeForce RTX 2060 SUPER'), true);
});

test('GPU名の照合: Tiの有無が食い違えば false', () => {
  assert.equal(gpuTextMatches('GeForce RTX 4060 Ti', 'GeForce RTX 4060'), false);
});

test('GPU名の照合: 複数候補が併記されていても拾える', () => {
  const text = 'NVIDIA GeForce RTX 2070 / AMD Radeon RX 5700XT';
  assert.equal(gpuTextMatches(text, 'GeForce RTX 2070'), true);
  assert.equal(gpuTextMatches(text, 'Radeon RX 5700 XT'), true);
});
