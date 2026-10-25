#!/usr/bin/env node
/**
 * 发布三个 npm 包：dsh-fairy-splash、dsh-fairy-voice、dsh-fairy-pack。
 *
 *   node scripts/publish.mjs --pack          # 只打包并检查内容，不发布
 *   node scripts/publish.mjs --publish       # 真正发布（需要先 npm login）
 *   node scripts/publish.mjs --publish --bump patch
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(HERE);
const argv = process.argv.slice(2);
const flag = (k) => argv.includes('--' + k);
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };

const pnpm = process.env.FAIRY_PNPM || 'pnpm';
const order = ['dsh-fairy-splash', 'dsh-fairy-voice', 'dsh-fairy-pack'];
const bump = opt('bump', '');
const publish = flag('publish');

function run(args, cwd) {
  console.log('$ ' + pnpm + ' ' + args.join(' ') + '   (' + cwd + ')');
  execFileSync(pnpm, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
}

for (const name of order) {
  const dir = join(ROOT, 'packages', name);
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  console.log('\n=== ' + pkg.name + '@' + pkg.version + ' ===');
  if (bump) run(['version', bump, '--no-git-tag-version'], dir);
  run(['pack'], dir);
  const tarballs = readdirSync(dir).filter((f) => f.endsWith('.tgz'));
  for (const t of tarballs) console.log('  产物：' + join(dir, t));
  if (publish) {
    run(['publish', '--no-git-checks', '--access', 'public'], dir);
  }
}

if (!publish) {
  console.log('\n只打了包。发布前先 npm login，再运行：');
  console.log('  node scripts/publish.mjs --publish');
}
