#!/usr/bin/env node
/**
 * Fairy Pack 安装器：把 H.D.D. 皮肤、输入区微调、Fairy 语音、Fairy 人格装进本地 DeepSeek Harness。
 *
 *   node install.mjs                    # 安装到 %USERPROFILE%\.dsh
 *   node install.mjs --dry-run          # 只打印计划
 *   node install.mjs --dsh-home <dir>   # 指定 .dsh 目录
 *   node install.mjs --no-persona       # 不覆盖人格
 *   node install.mjs --profile desktop  # 指定 profile
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
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

const dshHome = path.resolve(opt('dsh-home', path.join(os.homedir(), '.dsh')));
const profile = opt('profile', 'desktop');
const profileDir = path.join(dshHome, 'profiles', profile);
const pluginsDir = path.join(dshHome, 'plugins');
const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 13);
const ALL_PACKAGES = ['dsh-agent-md', 'dsh-fairy-splash', 'dsh-fairy-composer', 'dsh-fairy-voice'];
const ONLY = opt('only', '');
const PACKAGES = ONLY === ''
  ? ALL_PACKAGES
  : ALL_PACKAGES.filter((name) => ONLY.split(',').map((s) => s.trim()).includes(name.replace('dsh-', '').replace('fairy-', '')) || ONLY.split(',').map((s) => s.trim()).includes(name));

const say = (...a) => console.log(...a);
const plan = [];
function act(label, fn) { plan.push({ label, fn }); }

say('Fairy Pack 安装器');
say('  行为：' + (dry ? '试运行（不写盘）' : '实际安装'));
say('  .dsh：' + dshHome);
say('  profile：' + profile);
say('');

if (!fs.existsSync(path.join(profileDir, 'package.json'))) {
  console.error('找不到 profile：' + profileDir);
  console.error('确认 DSH 至少启动过一次，或用 --profile <名字> 指定。');
  process.exit(1);
}

// 1. 复制插件包
for (const name of PACKAGES) {
  const src = path.join(HERE, 'packages', name);
  const dst = path.join(pluginsDir, name);
  if (!fs.existsSync(src)) { console.error('安装包缺少 ' + src); process.exit(1); }
  act('复制插件 ' + name + ' -> ' + dst, () => {
    fs.mkdirSync(pluginsDir, { recursive: true });
    fs.rmSync(dst, { recursive: true, force: true });
    fs.cpSync(src, dst, { recursive: true });
  });
  act('链接 ' + name + ' 到 profile 的 node_modules', () => {
    const link = path.join(profileDir, 'node_modules', name);
    fs.mkdirSync(path.dirname(link), { recursive: true });
    fs.rmSync(link, { recursive: true, force: true });
    fs.symlinkSync(dst, link, 'junction');
  });
}

// 2. profile 清单
act('写入 profile 的 package.json（依赖 + bundles）', () => {
  const file = path.join(profileDir, 'package.json');
  const text = fs.readFileSync(file, 'utf8');
  fs.writeFileSync(file + '.bak-fairy-pack-' + stamp, text);
  const pkg = JSON.parse(text);
  pkg.dependencies ??= {};
  for (const name of PACKAGES) {
    const target = path.join(pluginsDir, name).split(path.sep).join('/');
    pkg.dependencies[name] = 'link:' + target;
  }
  pkg.dsh ??= {};
  pkg.dsh.profile ??= {};
  const bundles = pkg.dsh.profile.bundles ?? [];
  for (const name of PACKAGES) if (!bundles.includes(name)) bundles.push(name);
  pkg.dsh.profile.bundles = bundles;
  fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n');
});

// 3. 人格
if (!flag('no-persona')) {
  const persona = path.join(HERE, 'persona', 'Fairy.md');
  const target = path.join(dshHome, 'AGENT.md');
  if (fs.existsSync(persona)) {
    act('写入人格 ' + target + '（旧文件备份为 AGENT.md.bak-fairy-pack-' + stamp + '）', () => {
      if (fs.existsSync(target)) fs.copyFileSync(target, target + '.bak-fairy-pack-' + stamp);
      fs.copyFileSync(persona, target);
    });
  }
}

say('将执行：');
plan.forEach((p, i) => say('  ' + (i + 1) + '. ' + p.label));
say('');

if (dry) { say('试运行结束，未写盘。去掉 --dry-run 才会安装。'); process.exit(0); }
for (const p of plan) p.fn();
say('安装完成。');
say('');
say('下一步：');
say('  0. 只装了 ' + PACKAGES.join(', ') + (ONLY === '' ? '' : '（--only 模式）'));
say('  1. 完全退出 DeepSeek Harness（不是关窗口，是托盘退出）。');
say('  2. 重新打开，新会话界面出现 H.D.D. 核心与开机影片。');
say('  3. 语音首次启动会在后台下载约 1.9 GB 运行时与音色（' + path.join(dshHome, 'fairy-voice', 'service.log') + ' 可看进度）。');
say('     早先装过语音、想改成本地已有的运行时：编辑 ' + path.join(pluginsDir, 'dsh-fairy-voice', 'voice.config.json') + '。');
say('');
say('回滚：node uninstall.mjs');
