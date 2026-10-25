#!/usr/bin/env node
/**
 * 把 Fairy 核心换成 DSH 的应用图标与托盘图标。
 * 只改安装目录里的两个文件，先备份；客户端升级会覆盖，重跑即可。
 *
 *   node scripts/apply-app-icon.mjs            # 应用
 *   node scripts/apply-app-icon.mjs --restore  # 还原
 *   node scripts/apply-app-icon.mjs --app "<install dir>"
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(HERE);
const ASSETS = path.join(ROOT, 'packages', 'dsh-fairy-splash', 'assets');
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const restore = argv.includes('--restore');

const app = opt('app', path.join(process.env.LOCALAPPDATA || '', 'Programs', 'DeepSeek Harness'));
const resources = path.join(app, 'resources');
if (!fs.existsSync(resources)) {
  console.error('找不到 DSH 安装目录：' + resources);
  console.error('用 --app "<安装目录>" 指定。');
  process.exit(1);
}

const targets = [
  [path.join(ASSETS, 'icon-512.png'), path.join(resources, 'icon.png')],
  [path.join(ASSETS, 'tray.ico'), path.join(resources, 'tray.ico')],
];

if (restore) {
  let n = 0;
  for (const [, dst] of targets) {
    const bak = dst + '.bak-fairy';
    if (fs.existsSync(bak)) { fs.copyFileSync(bak, dst); n += 1; console.log('已还原 ' + dst); }
  }
  if (!n) console.log('没有找到备份。');
  process.exit(0);
}

for (const [src, dst] of targets) {
  if (!fs.existsSync(src)) { console.error('缺少素材：' + src); process.exit(1); }
  if (fs.existsSync(dst) && !fs.existsSync(dst + '.bak-fairy')) fs.copyFileSync(dst, dst + '.bak-fairy');
  fs.copyFileSync(src, dst);
  console.log('已替换 ' + dst + '（' + Math.round(fs.statSync(dst).size / 1024) + ' KB）');
}
console.log('\n完全退出并重启 DeepSeek Harness；任务栏与托盘图标会更新。');
console.log('还原：node scripts/apply-app-icon.mjs --restore');
