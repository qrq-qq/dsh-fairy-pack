#!/usr/bin/env node
/**
 * 把本机这套 GPT-SoVITS 运行时与 Fairy 音色打成可上传的发布件。
 *
 *   node scripts/build-release.mjs --list                 # 只看会打什么、多大
 *   node scripts/build-release.mjs --what model           # 只打模型（~220 MB）
 *   node scripts/build-release.mjs --what runtime         # 只打运行时（~7.5 GB）
 *   node scripts/build-release.mjs                        # 两个都打
 *
 * 产物：<out>/fairy-runtime.zip(.partN)、fairy-model.zip、SHA256SUMS.txt、voice.config.snippet.json
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream, existsSync, mkdirSync, readdirSync, statSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(HERE);
const argv = process.argv.slice(2);
const flag = (k) => argv.includes('--' + k);
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };

const RUNTIME_SRC = opt('runtime-src', 'F:\\Fairy-完整安装包-含插件和语音模型-20261009-插件更新保护版\\Fairy-完整安装包\\voice-runtime');
const MODEL_SRC = opt('model-src', 'F:\\Fairy');
const OUT = opt('out', 'F:\\Fairy\\release');
const WHAT = opt('what', 'all');
const SPLASH_SRC = opt('splash-src', join(ROOT, 'packages', 'dsh-fairy-splash'));
const PART_MB = Number(opt('part-size-mb', '1800'));
const list = flag('list');

const REF = opt('ref', '');
const T2S = 'Fairy-e10.ckpt';
const VITS = 'Fairy_e10_s870.pth';

function human(bytes) { return (bytes / 1073741824).toFixed(2) + ' GB'; }
function treeSize(dir) {
  let n = 0;
  const walk = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) { const p = join(d, e.name); if (e.isDirectory()) walk(p); else n += statSync(p).size; } };
  walk(dir);
  return n;
}
function ps(cmd) { execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', cmd], { stdio: 'inherit' }); }
async function sha256(file) {
  const h = createHash('sha256');
  for await (const chunk of createReadStream(file)) h.update(chunk);
  return h.digest('hex');
}

// ---------- 模型 ----------
async function buildModel() {
  if (!existsSync(MODEL_SRC)) throw new Error('找不到模型目录：' + MODEL_SRC);
  const dir = join(OUT, 'model-src');
  mkdirSync(dir, { recursive: true });
  const refName = REF ? basename(REF) : readdirSync(MODEL_SRC).find((f) => f.toLowerCase().endsWith('.wav'));
  const refPath = REF || (refName ? join(MODEL_SRC, refName) : '');
  for (const [src, dst] of [[join(MODEL_SRC, T2S), T2S], [join(MODEL_SRC, VITS), VITS]]) {
    await pipeline(createReadStream(src), createWriteStream(join(dir, dst)));
  }
  if (refPath === '') {
    console.warn('！没找到参考音频（.wav）。加 --ref "<路径>" 指定，否则模型包只能用于已有参考音频的人。');
  }
  else {
    await pipeline(createReadStream(refPath), createWriteStream(join(dir, 'ref.wav')));
  }
  const refText = refPath === '' ? '' : basename(refPath).replace(/\.wav$/i, '');
  writeFileSync(join(dir, 'fairy-model.json'), JSON.stringify({ t2sWeights: T2S, vitsWeights: VITS, refAudio: 'ref.wav', refText }, null, 2) + '\n');
  const zip = join(OUT, 'fairy-model.zip');
  rmSync(zip, { force: true });
  ps('Compress-Archive -Path "' + dir + '\\*" -DestinationPath "' + zip + '" -Force');
  rmSync(dir, { recursive: true, force: true });
  return zip;
}

// ---------- 运行时 ----------
async function buildRuntime() {
  if (!existsSync(RUNTIME_SRC)) throw new Error('找不到运行目录：' + RUNTIME_SRC);
  const zip = join(OUT, 'fairy-runtime.zip');
  rmSync(zip, { force: true });
  console.log('压缩中（原生 .NET，7.5 GB 大约 20–40 分钟）…');
  // bsdtar 能处理超长路径；.NET 的 CreateFromDirectory 会静默漏掉深层文件
  ps('tar -a -cf "' + zip + '" -C "' + RUNTIME_SRC + '" .');
  // 清单必须在根目录，追加而不是重压
  const P = basename(RUNTIME_SRC).replace(/[^\w.-]/g, '') || 'voice-runtime';
  const manifest = {
    python: P + '/Python310/python.exe',
    apiScript: P + '/GPT-SoVITS/api_v2.py',
    serviceDir: P + '/GPT-SoVITS',
    bertPath: P + '/GPT-SoVITS/GPT_SoVITS/pretrained_models/chinese-roberta-wwm-ext-large',
    hubertPath: P + '/GPT-SoVITS/GPT_SoVITS/pretrained_models/chinese-hubert-base',
    nltkData: P + '/Python310/nltk_data',
    model: { url: '', sha256: '' },
  };
  const tpl = join(OUT, 'fairy-runtime.json');
  writeFileSync(tpl, JSON.stringify(manifest, null, 2) + '\n');
  ps('Add-Type -AssemblyName System.IO.Compression.FileSystem;' +
     '$z=[System.IO.Compression.ZipFile]::Open("' + zip + '","Update");' +
     '$e=$z.CreateEntry("fairy-runtime.json");' +
     '$s=$e.Open();$b=[System.IO.File]::ReadAllBytes("' + tpl + '");$s.Write($b,0,$b.Length);$s.Close();$z.Dispose()');
  rmSync(tpl, { force: true });
  return zip;
}

function split(zip, partBytes) {
  const size = statSync(zip).size;
  if (size <= partBytes) return [];
  const parts = [];
  const total = Math.ceil(size / partBytes);
  const buf = Buffer.allocUnsafe(4 * 1024 * 1024);
  const fd = require('node:fs').openSync(zip, 'r');
  for (let i = 0; i < total; i += 1) {
    const part = zip + '.part' + String(i + 1).padStart(2, '0');
    const out = require('node:fs').openSync(part, 'w');
    let left = Math.min(partBytes, size - i * partBytes);
    let pos = i * partBytes;
    while (left > 0) {
      const n = require('node:fs').readSync(fd, buf, 0, Math.min(buf.length, left), pos);
      require('node:fs').writeSync(out, buf, 0, n);
      pos += n; left -= n;
    }
    require('node:fs').closeSync(out);
    parts.push(part);
  }
  require('node:fs').closeSync(fd);
  return parts;
}

// ---------- 主流程 ----------
const summary = [];
mkdirSync(OUT, { recursive: true });

if (list) {
  const rs = existsSync(RUNTIME_SRC) ? treeSize(RUNTIME_SRC) : 0;
  const ms = existsSync(MODEL_SRC) ? treeSize(MODEL_SRC) : 0;
  console.log(JSON.stringify({
    runtime: { src: RUNTIME_SRC, bytes: rs, human: human(rs), parts: Math.ceil(rs / (PART_MB * 1048576)) },
    model: { src: MODEL_SRC, bytes: ms, human: human(ms) },
    out: OUT, partMB: PART_MB,
  }, null, 2));
  process.exit(0);
}

const built = [];
if (WHAT === 'all' || WHAT === 'splash') {
  const zip = join(OUT, 'fairy-splash.zip');
  rmSync(zip, { force: true });
  ps('Compress-Archive -Path "' + SPLASH_SRC + '\\*" -DestinationPath "' + zip + '" -Force');
  built.push(zip);
}
if (WHAT === 'all' || WHAT === 'model') built.push(await buildModel());
if (WHAT === 'all' || WHAT === 'runtime') built.push(await buildRuntime());

const lines = [];
for (const zip of built) {
  const parts = split(zip, PART_MB * 1048576);
  if (parts.length) { rmSync(zip, { force: true }); }
  for (const f of parts.length ? parts : [zip]) {
    const size = statSync(f).size;
    const hash = await sha256(f);
    lines.push(hash + '  ' + basename(f) + '  ' + size);
    summary.push({ file: basename(f), bytes: size, human: human(size) });
  }
}
writeFileSync(join(OUT, 'SHA256SUMS.txt'), lines.join('\n') + '\n');
writeFileSync(join(OUT, 'voice.config.snippet.json'), JSON.stringify({
  runtime: {
    enabled: true,
    url: ['https://your.host/fairy-runtime.zip.part01', '…；单个文件时写成字符串'],
    sha256: '',
    root: 'C:/Users/<you>/.dsh/fairy-voice/runtime',
    modelRoot: '',
  },
}, null, 2) + '\n');
console.log(JSON.stringify({ out: OUT, files: summary }, null, 1));
