#!/usr/bin/env node
/** 卸载 Fairy Pack：摘掉 bundles 与依赖、删除插件目录、按需还原人格。 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const argv = process.argv.slice(2);
const opt = (k, d) => {
  const eq = argv.find(x => x.startsWith('--' + k + '='));
  if (eq !== undefined) return eq.slice(k.length + 3);
  const i = argv.indexOf('--' + k);
  if (i >= 0 && argv[i + 1] !== undefined && !argv[i + 1].startsWith('--')) return argv[i + 1];
  return d;
};
const dshHome = path.resolve(opt('dsh-home', path.join(os.homedir(), '.dsh')));
const profile = opt('profile', 'desktop');
const profileDir = path.join(dshHome, 'profiles', profile);
const PACKAGES = ['dsh-agent-md', 'dsh-fairy-splash', 'dsh-fairy-composer', 'dsh-fairy-voice'];

const file = path.join(profileDir, 'package.json');
if (fs.existsSync(file)) {
  const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const name of PACKAGES) {
    delete pkg.dependencies?.[name];
    const b = pkg.dsh?.profile?.bundles;
    if (Array.isArray(b)) pkg.dsh.profile.bundles = b.filter(x => x !== name);
    const link = path.join(profileDir, 'node_modules', name);
    fs.rmSync(link, { recursive: true, force: true });
  }
  fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n');
  console.log('已从 profile 摘除');
}
for (const name of PACKAGES) {
  const dir = path.join(dshHome, 'plugins', name);
  fs.rmSync(dir, { recursive: true, force: true });
  console.log('已删除 ' + dir);
}
const backups = fs.existsSync(dshHome)
  ? fs.readdirSync(dshHome).filter(f => f.startsWith('AGENT.md.bak-fairy-pack-')).sort()
  : [];
if (backups.length) {
  const latest = path.join(dshHome, backups[backups.length - 1]);
  fs.copyFileSync(latest, path.join(dshHome, 'AGENT.md'));
  console.log('人格已还原自 ' + latest);
}
console.log('重启 DeepSeek Harness 生效。');
