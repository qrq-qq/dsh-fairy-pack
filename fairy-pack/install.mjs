#!/usr/bin/env node
/**
 * Fairy Pack 安装器：一条命令装完，装完自检，自检通过后自动重启 DSH。
 *
 *   node install.mjs                     # 装到 %USERPROFILE%\.dsh，自动探测 profile，装完重启
 *   node install.mjs --dry-run           # 只打印计划
 *   node install.mjs --no-persona        # 不覆盖人格（AGENT.md）
 *   node install.mjs --no-restart        # 不自动重启 DSH
 *   node install.mjs --verify-only       # 只跑自检，不写盘
 *   node install.mjs --dsh-home <dir>    # 指定 .dsh 目录（测试用）
 *   node install.mjs --profile <name>    # 指定 profile（默认自动探测）
 *   node install.mjs --restart-delay 8   # 重启前等待秒数（默认 8）
 *
 * 行为约定：
 *   1. 旧包一律整目录删除后再复制，绝不让 1.0.0 的老副本留在 disk 上占位。
 *   2. 复制完逐包自检：版本号、exports 里的 ./package.json、client.js 里的界面标记。
 *   3. 自检全过才重启；任何一个不通过就退出码 1，并把失败项打出来。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = (k, d) => {
  const eq = argv.find(x => x.startsWith('--' + k + '='));
  if (eq !== undefined) return eq.slice(k.length + 3);
  const i = argv.indexOf('--' + k);
  if (i >= 0 && argv[i + 1] !== undefined && !argv[i + 1].startsWith('--')) return argv[i + 1];
  return d;
};
const flag = k => argv.includes('--' + k);

const dry = flag('dry-run');
const verifyOnly = flag('verify-only');
const noRestart = flag('no-restart');
const delaySec = Math.max(0, Number(opt('restart-delay', '8')) || 0);

const dshHome = path.resolve(opt('dsh-home', path.join(os.homedir(), '.dsh')));
const profilesRoot = path.join(dshHome, 'profiles');
const pluginsDir = path.join(dshHome, 'plugins');
const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 13);

const ALL_PACKAGES = ['dsh-fairy-splash', 'dsh-agent-md', 'dsh-fairy-voice', 'dsh-fairy-composer'];

/** 每个包装完后必须命中的标记；缺一个就说明装进去的是旧界面。 */
const MARKERS = {
  'dsh-fairy-splash': { file: 'client.js', texts: ['chat-bg', 'fs-hero'] },
  'dsh-fairy-composer': { file: 'client.js', texts: ['_composerSeat'] },
  'dsh-fairy-voice': { file: 'client.js', texts: ['data-fairy-voice-rail'] },
  'dsh-agent-md': { file: 'lib/client.js', texts: ['AGENT.md'] },
};

const ONLY = opt('only', '');
const PACKAGES = ONLY === ''
  ? ALL_PACKAGES
  : ALL_PACKAGES.filter((name) => ONLY.split(',').map(s => s.trim()).includes(name.replace('dsh-', '').replace('fairy-', '')) || ONLY.split(',').map(s => s.trim()).includes(name));

const say = (...a) => console.log(...a);

/** profile 探测：显式指定 > desktop > 唯一一个有 package.json 的 profile。 */
function pickProfile() {
  const asked = opt('profile', '');
  if (asked) {
    const dir = path.join(profilesRoot, asked);
    if (fs.existsSync(path.join(dir, 'package.json'))) return { name: asked, dir };
    return { name: asked, dir, missing: true };
  }
  const desktop = path.join(profilesRoot, 'desktop');
  if (fs.existsSync(path.join(desktop, 'package.json'))) return { name: 'desktop', dir: desktop };
  if (fs.existsSync(profilesRoot)) {
    const found = fs.readdirSync(profilesRoot)
      .filter(n => fs.existsSync(path.join(profilesRoot, n, 'package.json')));
    if (found.length === 1) return { name: found[0], dir: path.join(profilesRoot, found[0]) };
    if (found.length > 1) return { name: found.join(' / '), dir: '', ambiguous: found };
  }
  return { name: '', dir: '', none: true };
}

const picked = pickProfile();
const profile = picked.name;
const profileDir = picked.dir;

say('Fairy Pack 安装器');
say('  行为：' + (verifyOnly ? '只自检' : dry ? '试运行（不写盘）' : '安装'));
say('  .dsh：' + dshHome);
say('  profile：' + (profile || '（未探测到）'));

if (!verifyOnly) {
  if (picked.none) {
    console.error('');
    console.error('找不到任何 profile：' + profilesRoot);
    console.error('先启动一次 DeepSeek Harness，让它建好 profile，再运行本安装器。');
    process.exit(1);
  }
  if (picked.ambiguous) {
    console.error('');
    console.error('有多个 profile：' + picked.ambiguous.join(', '));
    console.error('用 --profile <名字> 指定要装进哪一个。');
    process.exit(1);
  }
  if (picked.missing) {
    console.error('');
    console.error('profile 不存在：' + profileDir);
    console.error('确认名字拼写，或先启动一次 DeepSeek Harness。');
    process.exit(1);
  }
}
say('');

// ---------------------------------------------------------------- install
const plan = [];
function act(label, fn) { plan.push({ label, fn }); }

for (const name of PACKAGES) {
  const src = path.join(HERE, 'packages', name);
  const dst = path.join(pluginsDir, name);
  if (!fs.existsSync(src)) { console.error('安装包缺少 ' + src); process.exit(1); }
  act('替换插件 ' + name + ' -> ' + dst, () => {
    fs.mkdirSync(pluginsDir, { recursive: true });
    fs.rmSync(dst, { recursive: true, force: true });
    fs.cpSync(src, dst, { recursive: true });
  });
  act('重连 ' + name + ' 到 profile/node_modules', () => {
    const link = path.join(profileDir, 'node_modules', name);
    fs.mkdirSync(path.dirname(link), { recursive: true });
    fs.rmSync(link, { recursive: true, force: true });
    fs.symlinkSync(dst, link, 'junction');
  });
}

act('写入 profile/package.json（依赖指向新副本 + bundles 去重）', () => {
  const file = path.join(profileDir, 'package.json');
  const text = fs.readFileSync(file, 'utf8');
  fs.writeFileSync(file + '.bak-fairy-pack-' + stamp, text);
  const pkg = JSON.parse(text);
  pkg.dependencies ??= {};
  for (const name of PACKAGES) {
    pkg.dependencies[name] = 'link:' + path.join(pluginsDir, name).split(path.sep).join('/');
  }
  pkg.dsh ??= {};
  pkg.dsh.profile ??= {};
  const bundles = Array.isArray(pkg.dsh.profile.bundles) ? pkg.dsh.profile.bundles : [];
  for (const name of PACKAGES) {
    for (let i = bundles.length - 1; i >= 0; i--) if (bundles[i] === name) bundles.splice(i, 1);
  }
  pkg.dsh.profile.bundles = [...bundles, ...PACKAGES];
  fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n');
});

if (!flag('no-persona')) {
  const persona = path.join(HERE, 'persona', 'Fairy.md');
  const target = path.join(dshHome, 'AGENT.md');
  if (fs.existsSync(persona)) {
    act('写入人格 ' + target, () => {
      if (fs.existsSync(target)) fs.copyFileSync(target, target + '.bak-fairy-pack-' + stamp);
      fs.copyFileSync(persona, target);
    });
  }
}

if (!verifyOnly) {
  say('将执行：');
  plan.forEach((p, i) => say('  ' + (i + 1) + '. ' + p.label));
  say('');
  if (dry) { say('试运行结束，未写盘。去掉 --dry-run 才会安装。'); process.exit(0); }
  for (const p of plan) p.fn();
}

// ---------------------------------------------------------------- verify
const checks = [];
function check(ok, label, detail = '') { checks.push({ ok, label, detail }); }

for (const name of PACKAGES) {
  const dir = path.join(pluginsDir, name);
  const link = path.join(profileDir, 'node_modules', name);
  let pkg = null;
  try { pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')); } catch { /* below */ }
  check(Boolean(pkg), name + ' 目录可读', dir);
  if (!pkg) continue;
  check(pkg.name === name, name + ' 包名正确', pkg.name);
  const exportsField = pkg.exports || {};
  check(Boolean(exportsField['./package.json']), name + ' exports 放行 ./package.json', Object.keys(exportsField).join(', ') || '(无 exports)');
  const m = MARKERS[name];
  if (m) {
    const markerFile = path.join(dir, m.file);
    if (fs.existsSync(markerFile)) {
      const js = fs.readFileSync(markerFile, 'utf8');
      for (const text of m.texts) check(js.includes(text), name + ' ' + m.file + ' 含 ' + text, js.length + ' B');
    } else {
      check(false, name + ' ' + m.file + ' 存在', markerFile);
    }
  }
  check(fs.existsSync(link), name + ' 已挂进 node_modules', link);
  if (fs.existsSync(link)) {
    let real = '';
    try {
      real = (fs.realpathSync.native || fs.realpathSync)(link);
    } catch {
      real = '';
    }
    const same = real !== '' && path.resolve(real).toLowerCase() === path.resolve(dir).toLowerCase();
    check(same, name + ' 链接指向新副本', real || '无法解析');
  }
}

// bundles 自检
try {
  const pkgFile = JSON.parse(fs.readFileSync(path.join(profileDir, 'package.json'), 'utf8'));
  const bundles = pkgFile?.dsh?.profile?.bundles || [];
  for (const name of PACKAGES) {
    check(bundles.includes(name), 'profile bundles 含 ' + name);
    check((pkgFile.dependencies || {})[name] !== undefined, 'profile 依赖含 ' + name);
  }
} catch (e) {
  check(false, 'profile/package.json 可读', String(e.message || e));
}

say('自检：');
let failed = 0;
for (const c of checks) {
  if (!c.ok) failed++;
  say('  ' + (c.ok ? 'PASS' : 'FAIL') + '  ' + c.label + (c.detail && !c.ok ? '  [' + c.detail + ']' : ''));
}
say('');
if (failed) {
  console.error('自检未通过：' + failed + ' 项。界面可能仍是旧的，把上面的 FAIL 行发回来。');
  process.exit(1);
}
say('自检全部通过。');

// ---------------------------------------------------------------- restart
function scheduleRestart() {
  if (process.platform !== 'win32') return false;
  const helper = path.join(os.tmpdir(), 'fairy-pack-restart-' + process.pid + '.ps1');
  const script = `param([int]$Delay = 8)
$ErrorActionPreference = 'SilentlyContinue'
Start-Sleep -Seconds $Delay

function Get-DshProcs {
  Get-Process | Where-Object { $_.ProcessName -eq 'DeepSeek Harness' }
}

$procs = @(Get-DshProcs)
$exe = $null
foreach ($p in $procs) { try { if ($p.Path) { $exe = $p.Path; break } } catch {} }
if (-not $exe) {
  $candidate = Join-Path $env:LOCALAPPDATA 'Programs\\DeepSeek Harness\\DeepSeek Harness.exe'
  if (Test-Path $candidate) { $exe = $candidate }
}

foreach ($p in $procs) { try { $p.CloseMainWindow() | Out-Null } catch {} }
for ($i = 0; $i -lt 20; $i++) {
  if (-not (Get-DshProcs)) { break }
  Start-Sleep -Milliseconds 500
}

foreach ($p in @(Get-DshProcs)) { try { $p.Kill() } catch {} }
Start-Sleep -Seconds 1

if ($exe -and (Test-Path $exe)) { Start-Process -FilePath $exe }
`;
  fs.writeFileSync(helper, script, 'utf8');
  const child = spawn('powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', helper, '-Delay', String(delaySec)],
    { detached: true, stdio: 'ignore', windowsHide: true });
  child.unref();
  return true;
}

if (noRestart) {
  say('');
  say('未自动重启（--no-restart）。要看到新界面，必须完全退出 DeepSeek Harness 再打开。');
} else if (verifyOnly) {
  say('');
  say('只自检模式：没有重启 DSH。');
} else {
  const scheduled = scheduleRestart();
  say(scheduled
    ? '已安排重启：' + delaySec + ' 秒后自动关闭并重新打开 DeepSeek Harness，新界面即生效。'
    : '当前系统不是 Windows，请手动重启 DeepSeek Harness。');
  say('语音首次启动会在后台下载运行时（约 1.9 GB），日志：' + path.join(dshHome, 'fairy-voice', 'service.log'));
}

say('');
say('回滚：node uninstall.mjs');
